const {
  asyncHandler,
  escapeHtml,
  formatDisplayDate,
  renderFlash,
  renderPage,
  requireLogin,
  setFlash,
  allowRoles
} = require("../helpers");

function registerPurchaseTicketRoutes(app, { pool }) {
  app.get("/purchase-ticket", requireLogin, allowRoles(["user"]), asyncHandler(async (req, res) => {
    const [exhibitions] = await pool.query(
      "SELECT Exhibition_ID, Exhibition_Name FROM Exhibition ORDER BY Exhibition_Name",
    );
    const cart = req.session.ticketCart || [];
    let membershipId = req.session.user.membershipId ?? null;
    const discount = 0.2; 

    if (membershipId !== null) {
      const [memberRows] = await pool.query(
        "SELECT Membership_ID FROM Membership WHERE Membership_ID = ?",
        [membershipId],
      );
      if (memberRows.length === 0) membershipId = null;
    }

    const [recentTickets] = membershipId
      ? await pool.query(
          `SELECT Ticket_ID, Purchase_Date, Visit_Date, Payment_method
           FROM Ticket
           WHERE Membership_ID = ?
           ORDER BY Purchase_Date DESC, Ticket_ID DESC
           LIMIT 5`,
          [membershipId],
        )
      : [[]];

    const today = new Date().toISOString().split("T")[0];

    const ticketRows = recentTickets.map((ticket) => `
      <tr>
        <td>#${ticket.Ticket_ID}</td>
        <td>${formatDisplayDate(ticket.Purchase_Date)}</td>
        <td>${formatDisplayDate(ticket.Visit_Date)}</td>
        <td>${escapeHtml(ticket.Payment_method || "N/A")}</td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Purchase Tickets",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <p class="eyebrow">Member Portal</p>
        <h1>Purchase Tickets</h1>
        <p class="dashboard-note">Use one form to complete a ticket purchase instead of creating ticket records manually.</p>
        <p style="color:green; font-weight:bold;">✨ 20% Member Discount will be applied automatically!</p>
        ${renderFlash(req)}
        <form method="post" action="/purchase-ticket" class="form-grid">
          <label>Visit Date
            <input type="date" name="visit_date" required min="${today}">
          </label>
          <label>Ticket Type
            <select name="ticket_type" required>
              <option value="">— Select —</option>
              <option value="General Admission">General Admission (<s>$20.00</s> → $16.00)</option>
              <option value="Senior">Senior 65+ (<s>$15.00</s> → $12.00)</option>
              <option value="Child">Child under 12 (<s>$10.00</s> → $8.00)</option>
            </select>
          </label>
          <label>Quantity
            <input type="number" name="quantity" min="1" value="1" required>
          </label>
          <label>Payment Method
            <select name="payment_method" required>
              <option value="Credit Card">Credit Card</option>
              <option value="Debit Card">Debit Card</option>
              <option value="Cash">Cash</option>
            </select>
          </label>
          <label>Exhibition
            <select name="exhibition_id">
              <option value="">General Admission</option>
              ${exhibitions.map((exhibition) => `<option value="${exhibition.Exhibition_ID}">${escapeHtml(exhibition.Exhibition_Name)}</option>`).join("")}
            </select>
          </label>
          <button class="button" type="submit">Complete Purchase</button>
        </form>
      </section>
      <section class="card narrow">
        <h2>Recent Purchases</h2>
        <table>
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Purchase Date</th>
              <th>Visit Date</th>
              <th>Payment</th>
            </tr>
          </thead>
          <tbody>
            ${ticketRows || '<tr><td colspan="4">No ticket purchases found for this member.</td></tr>'}
          </tbody>
        </table>
      </section>
    `,
    }));
  }));

  app.post("/purchase-ticket", requireLogin, allowRoles(["user"]), asyncHandler(async (req, res) => {
    const {
      visit_date: visitDate,
      ticket_type: ticketType,
      quantity,
      payment_method: paymentMethod,
      exhibition_id: exhibitionId,
    } = req.body;

    if (!visitDate || !ticketType || !quantity || !paymentMethod) {
      setFlash(req, "All purchase fields are required.");
      return res.redirect("/purchase-ticket");
    }

    const discount = 0.2;
    let basePrice;
    switch (ticketType) {
      case "General Admission": basePrice = 20.00; break;
      case "Senior": basePrice = 15.00; break;
      case "Child": basePrice = 10.00; break;
      default:
        setFlash(req, "Invalid ticket type selected.");
        return res.redirect("/purchase-ticket");
    }

    const finalPrice = basePrice * (1 - discount);

    const membershipId = req.session.user.membershipId ?? null;
    if (membershipId === null) {
      setFlash(req, "No membership found for your account. Please contact staff.");
      return res.redirect("/purchase-ticket");
    }
    const [memberRows] = await pool.query(
      "SELECT Membership_ID FROM Membership WHERE Membership_ID = ?",
      [membershipId],
    );
    if (memberRows.length === 0) {
      setFlash(req, "Your membership record could not be found. Please log out and log back in, or contact staff.");
      return res.redirect("/purchase-ticket");
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [ticketResult] = await connection.query(
        `INSERT INTO Ticket (Purchase_type, Purchase_Date, Visit_Date, Payment_method, Membership_ID)
         VALUES ('Online', CURRENT_DATE, ?, ?, ?)`,
        [visitDate, paymentMethod, membershipId],
      );

      await connection.query(
        `INSERT INTO ticket_line (Ticket_ID, Ticket_Type, Quantity, Price_per_ticket, Exhibition_ID)
         VALUES (?, ?, ?, ?, ?)`,
        [ticketResult.insertId, ticketType, quantity, finalPrice, exhibitionId || null],
      );

      await connection.commit();
      setFlash(req, `Ticket purchase completed. Confirmation #${ticketResult.insertId}. Total: $${(finalPrice * quantity).toFixed(2)}`);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    res.redirect("/purchase-ticket");
  }));

  app.get("/sell-ticket", requireLogin, allowRoles(["admissions", "employee", "supervisor"]), asyncHandler(async (req, res) => {
        const tickets = [
      { Ticket_Type_ID: 1, Name: "General Admission", Price: 20 },
      { Ticket_Type_ID: 2, Name: "Senior", Price: 15 },
      { Ticket_Type_ID: 3, Name: "Child", Price: 10 }
    ];
    const cart = req.session.ticketCart || [];
    const [[todayTotals]] = await pool.query(`
          SELECT COUNT(DISTINCT t.Ticket_ID) AS total_sales,
          COALESCE(SUM(tl.Quantity * tl.Price_per_ticket), 0) AS total_revenue
          FROM Ticket t
          JOIN ticket_line tl ON t.Ticket_ID = tl.Ticket_ID
          WHERE t.Purchase_Date = CURDATE()
          `);
  const membershipId = req.session.membershipId || null;
  let discount = 0;

    if (membershipId) {
      discount = 0.2;
    }

    const [exhibitions] = await pool.query(
      "SELECT Exhibition_ID, Exhibition_Name FROM Exhibition ORDER BY Exhibition_Name"
    );

    const [members] = await pool.query(
      "SELECT Membership_ID, First_Name, Last_Name FROM Membership ORDER BY Last_Name, First_Name"
    );

  res.send(renderPage({
    title: "Sell Tickets",
    user: req.session.user,
    content: `
    <section class="card narrow">
    ${renderFlash(req)}
      <form method="post" action="/sell-ticket/add" class="form-grid">
        <label>Membership (optional)
          <select name="membership_id">
            <option value="">— None / Non-Member —</option>
            ${members.map(m => `
              <option value="${m.Membership_ID}" ${req.session.membershipId == m.Membership_ID ? 'selected' : ''}>
                ID: ${m.Membership_ID} - ${escapeHtml(m.First_Name)} ${escapeHtml(m.Last_Name)}
              </option>
            `).join("")}
          </select>
        </label>
    <label>Visit Date
    <input type="date" name="visit_date" required>
  </label>
  <label>Ticket Type
    <select name="ticket_type_id" required>
      ${tickets.map(t => `
        <option value="${t.Ticket_Type_ID}">
          ${t.Name} ($${t.Price})
        </option>
      `).join("")}
    </select>
  </label>

  <label>Quantity
    <input type="number" name="quantity" min="1" required>
  </label>

  <label>Exhibition
  <select name="exhibition_id">
    <option value="">General Admission</option>
    ${exhibitions.map(ex => `
      <option value="${ex.Exhibition_ID}">
        ${escapeHtml(ex.Exhibition_Name)}
      </option>
    `).join("")}
  </select>
</label>

  <label>Visitor Email (optional)
    <input type="email" name="email">
  </label>

  <label>Visitor Phone (optional)
    <input type="text" name="phone">
  </label>

  <button class="button" type="submit">Add Ticket</button>
</form>

<hr>

<h2>Current Order</h2>
${discount > 0 ? "<p style='color:green; font-weight:bold;'>✔ 20% Member Discount Applied</p>" : ""}

${cart.length === 0 ? "<p>No tickets added yet</p>" : `
  ${cart.map(item => {
  const finalPrice = item.price * (1 - discount);

  return `
    <div style="display:flex; justify-content:space-between;">
      <span>${item.name} x ${item.qty}</span>
      <span>$${(finalPrice * item.qty).toFixed(2)}</span>
    </div>
  `;
    }).join("")}

  <hr>

  <h3>Total: $${cart.reduce((sum, item) => {
  const finalPrice = item.price * (1 - discount);
  return sum + finalPrice * item.qty;
}, 0).toFixed(2)}</h3>

  <form method="post" action="/sell-ticket/checkout">
  <button class="button">Process Sale</button>
  </form>
`}
    `,
    }));
  }));

app.get("/ticket-sales", requireLogin, allowRoles(["admissions", "employee", "supervisor"]), asyncHandler(async (req, res) => {

  const [[todayTotals]] = await pool.query(`
    SELECT COUNT(DISTINCT t.Ticket_ID) AS total_sales,
           COALESCE(SUM(tl.Quantity * tl.Price_per_ticket), 0) AS total_revenue
    FROM Ticket t
    JOIN ticket_line tl ON t.Ticket_ID = tl.Ticket_ID
    WHERE t.Purchase_Date = CURDATE()
  `);

  res.send(renderPage({
    title: "Ticket Sales",
    user: req.session.user,
    content: `
      <section class="card narrow">
        <h1>Today's Ticket Sales</h1>

        <div style="display:flex; gap:2rem; margin-top:1rem;">
          <div style="background:#f0f7ff; padding:1rem; border-radius:8px; text-align:center;">
            <div style="font-size:2rem; font-weight:bold;">${todayTotals.total_sales}</div>
            <div>Tickets Sold</div>
          </div>

          <div style="background:#f0fff4; padding:1rem; border-radius:8px; text-align:center;">
            <div style="font-size:2rem; font-weight:bold;">$${Number(todayTotals.total_revenue).toFixed(2)}</div>
            <div>Revenue</div>
          </div>
        </div>
      </section>
    `
  }));
}));



app.post("/sell-ticket/add", requireLogin, allowRoles(["admissions", "employee", "supervisor"]), asyncHandler(async (req, res) => {
    const { ticket_type_id, quantity, visit_date, membership_id, email, phone } = req.body;

      req.session.visitDate = visit_date;
      let validMembership = null;
      if (membership_id) {
        const [rows] = await pool.query(
          "SELECT Membership_ID FROM Membership WHERE Membership_ID = ?",
          [membership_id]
        );

        if (rows.length > 0) {
          validMembership = membership_id;
        }
      }
      req.session.membershipId = validMembership;
      req.session.visitorEmail = email || null;
      req.session.visitorPhone = phone || null;
    let ticket;
    if (ticket_type_id == 1) ticket = { Name: "General Admission", Price: 20 };
    else if (ticket_type_id == 2) ticket = { Name: "Senior", Price: 15 };
    else if (ticket_type_id == 3) ticket = { Name: "Child", Price: 10 };

    if (!req.session.ticketCart) {
      req.session.ticketCart = [];
    }

    const exhibitionId = req.body.exhibition_id || null;

    const existing = req.session.ticketCart.find(t => t.id == ticket_type_id && t.exhibitionId == exhibitionId);
    if (existing) {
      existing.qty += Number(quantity);
    } else {
      req.session.ticketCart.push({
        id: ticket_type_id,
        name: ticket.Name,
        price: ticket.Price,
        qty: Number(quantity),
        exhibitionId: exhibitionId
      });
    }

    res.redirect("/sell-ticket");
  }));

  app.post("/sell-ticket/checkout", requireLogin, allowRoles(["admissions", "employee", "supervisor"]), asyncHandler(async (req, res) => {
    const cart = req.session.ticketCart || [];
    const visit_date = req.session.visitDate;
    let membershipId = req.session.membershipId || null;
    const email = req.session.visitorEmail || null;
    const phone = req.session.visitorPhone || null;
    let discount = 0;

    if (membershipId) {
      const [rows] = await pool.query(
        "SELECT Membership_ID FROM Membership WHERE Membership_ID = ?",
        [membershipId]
      );
      if (rows.length > 0) {
        discount = 0.2;
      } else {
        membershipId = null;
      }
    }

    if (cart.length === 0) {
      setFlash(req, "No tickets in order.");
      return res.redirect("/sell-ticket");
    }

    let employeeId = req.session.user.employeeId;
    if (!employeeId) {
      const [rows] = await pool.query(
        "SELECT Employee_ID FROM Employee WHERE Email = ?",
        [req.session.user.email]
      );
      employeeId = rows[0]?.Employee_ID;
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.query(
        "INSERT INTO Ticket (Purchase_type, Purchase_Date, Visit_Date, Membership_ID, Email, Phone_number, Payment_method) VALUES ('In-Person', CURRENT_DATE, ?, ?, ?, ?, 'Cash')",
        [visit_date, membershipId, email, phone]
      );

      const saleId = result.insertId;

      for (let item of cart) {
        const finalPrice = item.price * (1 - discount);
        await connection.query(
          `INSERT INTO ticket_line
           (Ticket_ID, Ticket_Type, Quantity, Price_per_ticket, Exhibition_ID)
           VALUES (?, ?, ?, ?, ?)`,
          [saleId, item.name, item.qty, finalPrice, item.exhibitionId || null]
        );
      }

      await connection.commit();
      setFlash(req, "Ticket sale completed!");
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    req.session.ticketCart = [];
    req.session.visitorEmail = null;
    req.session.visitorPhone = null;
    req.session.membershipId = null;
    req.session.visitDate = null;

    res.redirect("/dashboard");
  }));
}

module.exports = { registerPurchaseTicketRoutes };