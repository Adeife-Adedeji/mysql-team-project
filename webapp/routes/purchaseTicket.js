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

    let membershipId = req.session.user.membershipId ?? null;
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
        ${renderFlash(req)}
        <form method="post" action="/purchase-ticket" class="form-grid">
          <label>Visit Date
            <input type="date" name="visit_date" required min="${today}">
          </label>
          <label>Ticket Type
            <select name="ticket_type" required>
              <option value="">— Select —</option>
              <option value="General Admission">General Admission ($20.00)</option>
              <option value="Senior">Senior 65+ ($15.00)</option>
              <option value="Child">Child under 12 ($10.00)</option>
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

    let pricePerTicket;
    switch (ticketType) {
      case "General Admission": pricePerTicket = 20.00; break;
      case "Senior": pricePerTicket = 15.00; break;
      case "Child": pricePerTicket = 10.00; break;
      default:
        setFlash(req, "Invalid ticket type selected.");
        return res.redirect("/purchase-ticket");
    }

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
        [ticketResult.insertId, ticketType, quantity, pricePerTicket, exhibitionId || null],
      );

      await connection.commit();
      setFlash(req, `Ticket purchase completed. Confirmation #${ticketResult.insertId}.`);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    res.redirect("/purchase-ticket");
  }));

  app.get("/sell-ticket", requireLogin, allowRoles(["admissions", "employee"]), asyncHandler(async (req, res) => {
  const [exhibitions] = await pool.query(
  "SELECT Exhibition_ID, Exhibition_Name FROM Exhibition ORDER BY Exhibition_Name"
);
  const cart = req.session.ticketCart || [];


  const tickets = [
    { Ticket_Type_ID: 1, Name: "General Admission", Price: 20 },
    { Ticket_Type_ID: 2, Name: "Senior", Price: 15 },
    { Ticket_Type_ID: 3, Name: "Child", Price: 10 }
  ];

  res.send(renderPage({
    title: "Sell Tickets",
    user: req.session.user,
    content: `
<h1>Sell Admission Tickets</h1>

${renderFlash(req)}


 <form method="post" action="/sell-ticket/add" class="form-grid">

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

${cart.length === 0 ? "<p>No tickets added yet</p>" : `
  ${cart.map(item => `
    <div style="display:flex; justify-content:space-between;">
      <span>${item.name} x ${item.qty}</span>
      <span>$${(item.price * item.qty).toFixed(2)}</span>
    </div>
  `).join("")}

  <hr>

  <h3>Total: $${cart.reduce((sum, item) => sum + item.price * item.qty, 0).toFixed(2)}</h3>

  <form method="post" action="/sell-ticket/checkout">
  <button class="button">Process Sale</button>
  </form>
`}
`
  }));
}));

app.post("/sell-ticket/add", requireLogin, allowRoles(["admissions", "employee"]), asyncHandler(async (req, res) => {

  const { ticket_type_id, quantity, visit_date} = req.body;
  req.session.visitDate = visit_date;

  let ticket;

  if (ticket_type_id == 1) ticket = { Name: "General Admission", Price: 20 };
  else if (ticket_type_id == 2) ticket = { Name: "Senior", Price: 15 };
  else if (ticket_type_id == 3) ticket = { Name: "Child", Price: 10 };

  if (!req.session.ticketCart) {
    req.session.ticketCart = [];
  }

  const existing = req.session.ticketCart.find(t => t.id == ticket_type_id);

  if (existing) {
    existing.qty += Number(quantity);
  } else {
    req.session.ticketCart.push({
      id: ticket_type_id,
      name: ticket.Name,
      price: ticket.Price,
      qty: Number(quantity)
    });
  }

  res.redirect("/sell-ticket");
}));

app.post("/sell-ticket/checkout", requireLogin, allowRoles(["admissions", "employee"]), asyncHandler(async (req, res) => {

  const cart = req.session.ticketCart || [];
  const visit_date = req.session.visitDate;
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

  const [result] = await pool.query(
  "INSERT INTO Ticket (Purchase_type, Purchase_Date, Visit_Date) VALUES ('In-Person', CURRENT_DATE, ?)",
  [visit_date]
  );

  const saleId = result.insertId;

  for (let item of cart) {
    await pool.query(
      `INSERT INTO ticket_line 
       (Ticket_ID, Ticket_Type, Quantity, Price_per_ticket)
       VALUES (?, ?, ?, ?)`,
      [saleId, item.name, item.qty, item.price]
    );
  }

  req.session.ticketCart = [];

  setFlash(req, "Ticket sale completed!");
  res.redirect("/sell-ticket");
}));

}
module.exports = { registerPurchaseTicketRoutes };