const {
  asyncHandler,
  escapeHtml,
  formatDateInput,
  formatDisplayDate,
  renderFlash,
  renderPage,
  requireLogin,
  setFlash,
  allowRoles,
  logTriggerViolation
} = require("../helpers");

function registerAdmissionRoutes(app, { pool }) {
  app.get("/sell-ticket", requireLogin, allowRoles(["admissions", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    const [exhibitions] = await pool.query(
      "SELECT Exhibition_ID, Exhibition_Name, Starting_Date, Ending_Date FROM Exhibition WHERE Ending_Date >= CURDATE() ORDER BY Starting_Date"
    );
    const [recentTickets] = await pool.query(`
      SELECT t.Ticket_ID, t.Purchase_Date, t.Visit_Date, t.Email, t.Phone_Number,
             tl.Ticket_Type, tl.Quantity, tl.Price_per_ticket, e.Exhibition_Name
      FROM Ticket t
      JOIN ticket_line tl ON t.Ticket_ID = tl.Ticket_ID
      LEFT JOIN Exhibition e ON tl.Exhibition_ID = e.Exhibition_ID
      ORDER BY t.Ticket_ID DESC
      LIMIT 30
    `);

    // Daily ticket summary — totals and breakdown by type for today
    const [[todayTotals]] = await pool.query(`
      SELECT COUNT(*) AS total_tickets, COALESCE(SUM(tl.Quantity * tl.Price_per_ticket), 0) AS total_revenue
      FROM ticket_line tl
      JOIN Ticket t ON tl.Ticket_ID = t.Ticket_ID
      WHERE t.Purchase_Date = CURDATE()
    `);
    const [todayBreakdown] = await pool.query(`
      SELECT tl.Ticket_Type, SUM(tl.Quantity) AS total_qty,
             SUM(tl.Quantity * tl.Price_per_ticket) AS revenue
      FROM ticket_line tl
      JOIN Ticket t ON tl.Ticket_ID = t.Ticket_ID
      WHERE t.Purchase_Date = CURDATE()
      GROUP BY tl.Ticket_Type
      ORDER BY revenue DESC
    `);

    // Check membership by email if query param provided
    let memberCheckResult = null;
    const checkEmail = req.query.check_email?.trim();
    if (checkEmail) {
      const [rows] = await pool.query(
        `SELECT Membership_ID, First_Name, Last_Name, Email, Phone_Number, Date_Joined, Date_Exited
         FROM Membership WHERE Email = ?`,
        [checkEmail]
      );
      memberCheckResult = rows[0] || null;
    }

    const ticketRows = recentTickets.map((row) => `
      <tr>
        <td>#${row.Ticket_ID}</td>
        <td>${escapeHtml(row.Ticket_Type)}</td>
        <td>${row.Quantity}</td>
        <td>$${Number(row.Price_per_ticket).toFixed(2)}</td>
        <td>${escapeHtml(row.Exhibition_Name || "General Admission")}</td>
        <td>${formatDisplayDate(row.Visit_Date)}</td>
        <td>${escapeHtml(row.Email || row.Phone_Number || "—")}</td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Sell Admission Tickets",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <p class="eyebrow">Admissions Desk</p>
        <h2>Today's Ticket Summary</h2>
        <div style="display:flex; gap:2rem; margin-bottom:1rem;">
          <div style="background:#f0f7ff; padding:1rem 1.5rem; border-radius:8px; text-align:center;">
            <div style="font-size:2rem; font-weight:bold;">${todayTotals.total_tickets}</div>
            <div style="color:#555; font-size:0.9rem;">Tickets Sold Today</div>
          </div>
          <div style="background:#f0fff4; padding:1rem 1.5rem; border-radius:8px; text-align:center;">
            <div style="font-size:2rem; font-weight:bold;">$${Number(todayTotals.total_revenue).toFixed(2)}</div>
            <div style="color:#555; font-size:0.9rem;">Revenue Today</div>
          </div>
        </div>
        ${todayBreakdown.length ? `
        <table>
          <thead><tr><th>Ticket Type</th><th>Qty Sold</th><th>Revenue</th></tr></thead>
          <tbody>
            ${todayBreakdown.map(r => `
              <tr>
                <td>${escapeHtml(r.Ticket_Type)}</td>
                <td>${r.total_qty}</td>
                <td>$${Number(r.revenue).toFixed(2)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>` : `<p style="color:#888;">No tickets sold today yet.</p>`}
      </section>

      <section class="card narrow">
        <h2>Check Membership</h2>
        <form method="get" action="/sell-ticket" class="form-grid" style="margin-bottom:1rem;">
          <label>Member Email
            <input type="email" name="check_email" value="${escapeHtml(checkEmail || "")}" placeholder="e.g. member@email.com">
          </label>
          <button class="button" type="submit">Check</button>
        </form>
        ${checkEmail ? `
          ${memberCheckResult ? (() => {
            const expired = memberCheckResult.Date_Exited && new Date(memberCheckResult.Date_Exited) < new Date();
            const statusColor = expired ? "#c0392b" : "#27ae60";
            const statusLabel = expired ? "Expired" : "Active";
            return `
              <div style="border:1px solid #ddd; border-radius:8px; padding:1rem;">
                <p><strong>Name:</strong> ${escapeHtml(memberCheckResult.First_Name)} ${escapeHtml(memberCheckResult.Last_Name)}</p>
                <p><strong>Email:</strong> ${escapeHtml(memberCheckResult.Email || "—")}</p>
                <p><strong>Phone:</strong> ${escapeHtml(memberCheckResult.Phone_Number || "—")}</p>
                <p><strong>Member Since:</strong> ${formatDisplayDate(memberCheckResult.Date_Joined)}</p>
                <p><strong>Status:</strong> <span style="color:${statusColor}; font-weight:bold;">${statusLabel}</span>
                  ${expired ? `(expired ${formatDisplayDate(memberCheckResult.Date_Exited)})` : ""}
                </p>
              </div>`;
          })() : `<p style="color:#c0392b;">No membership found for <strong>${escapeHtml(checkEmail)}</strong>.</p>`}
        ` : ""}
      </section>

      <section class="card narrow">
        <p class="eyebrow">Admissions Desk</p>
        <h1>Sell Admission Tickets</h1>
        ${renderFlash(req)}
        <form method="post" action="/sell-ticket" class="form-grid">
          <label>Visit Date
            <input type="date" name="visit_date" required>
          </label>
          <label>Ticket Type
            <select name="ticket_type" required onchange="
              const prices = { Adult: '20.00', Child: '10.00', Senior: '15.00', Student: '12.00', Member: '0.00' };
              document.getElementById('ticket-price').value = prices[this.value] || '';
            ">
              <option value="">— Select —</option>
              <option value="Adult">Adult ($20.00)</option>
              <option value="Child">Child under 12 ($10.00)</option>
              <option value="Senior">Senior 65+ ($15.00)</option>
              <option value="Student">Student with ID ($12.00)</option>
              <option value="Member">Member ($0.00)</option>
            </select>
          </label>
          <label>Quantity
            <input type="number" name="quantity" min="1" value="1" required>
          </label>
          <label>Price per Ticket ($)
            <input type="number" step="0.01" id="ticket-price" name="price" readonly
              style="background:#f5f5f5; cursor:not-allowed;" placeholder="Auto-filled by ticket type">
          </label>
          <label>Exhibition
            <select name="exhibition_id">
              <option value="">General Admission</option>
              ${exhibitions.map((ex) => `<option value="${ex.Exhibition_ID}">${escapeHtml(ex.Exhibition_Name)}</option>`).join("")}
            </select>
          </label>
          <label>Visitor Email (optional)
            <input type="email" name="email" placeholder="visitor@email.com">
          </label>
          <label>Visitor Phone (optional)
            <input type="tel" name="phone" placeholder="e.g. 7135550100">
          </label>
          <button class="button" type="submit">Process Sale</button>
        </form>
      </section>
      <section class="card narrow">
        <h2>Recent Ticket Sales</h2>
        <table>
          <thead>
            <tr>
              <th>Ticket #</th>
              <th>Type</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Exhibition</th>
              <th>Visit Date</th>
              <th>Contact</th>
            </tr>
          </thead>
          <tbody>
            ${ticketRows || '<tr><td colspan="7">No recent sales.</td></tr>'}
          </tbody>
        </table>
      </section>
    `,
    }));
  }));

  app.post("/sell-ticket", requireLogin, allowRoles(["admissions", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    const { visit_date: visitDate, ticket_type: ticketType, quantity, price, exhibition_id: exhibitionId, email, phone } = req.body;

    if (!visitDate || !ticketType || !quantity || !price) {
      setFlash(req, "Please fill in all required fields.");
      return res.redirect("/sell-ticket");
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.query(
        `INSERT INTO Ticket (Purchase_type, Purchase_Date, Visit_Date, Email, Phone_Number)
         VALUES (?, CURDATE(), ?, ?, ?)`,
        ["Walk-in", visitDate, email || null, phone || null]
      );
      const newTicketId = result.insertId;
      await connection.query(
        `INSERT INTO ticket_line (Ticket_ID, Ticket_Type, Quantity, Price_per_ticket, Exhibition_ID)
         VALUES (?, ?, ?, ?, ?)`,
        [newTicketId, ticketType, quantity, price, exhibitionId || null]
      );
      await connection.commit();
      setFlash(req, `Sale recorded — Ticket #${newTicketId} issued.`);
    } catch (err) {
      await connection.rollback();
      if (err.sqlState === "45000") {
        await logTriggerViolation(pool, req, err.sqlMessage);
        setFlash(req, err.sqlMessage);
      } else {
        throw err;
      }
    } finally {
      connection.release();
    }

    res.redirect("/sell-ticket");
  }));
  
  app.get("/add-ticket", requireLogin, allowRoles(["supervisor", "employee"]), asyncHandler(async (req, res) => {
    const [tickets] = await pool.query(
      "SELECT Ticket_ID, Purchase_type, Purchase_Date, Visit_Date, Email, Phone_Number FROM Ticket ORDER BY Ticket_ID DESC"
    );

    let editTicket = null;
    if (req.query.edit_id) {
      const [rows] = await pool.query(
        "SELECT * FROM Ticket WHERE Ticket_ID = ?",
        [req.query.edit_id],
      );
      editTicket = rows[0] || null;
    }

    const ticketRows = tickets.map((ticket) => `
      <tr>
        <td>${ticket.Ticket_ID}</td>
        <td>${escapeHtml(ticket.Purchase_type || "N/A")}</td>
        <td>${formatDisplayDate(ticket.Purchase_Date)}</td>
        <td>${formatDisplayDate(ticket.Visit_Date)}</td>
        <td>${escapeHtml(ticket.Email || "N/A")}</td>
        <td>${escapeHtml(ticket.Phone_Number || "N/A")}</td>
        <td class="actions">
          <form method="get" action="/add-ticket" class="inline-form">
            <input type="hidden" name="edit_id" value="${ticket.Ticket_ID}">
            <button class="link-button" type="submit">Edit</button>
          </form>
          <form method="post" action="/delete-ticket" class="inline-form" onsubmit="return confirm('Delete this ticket record?');">
            <input type="hidden" name="ticket_id" value="${ticket.Ticket_ID}">
            <button class="link-button danger" type="submit">Delete</button>
          </form>
        </td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Ticket Records",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>${editTicket ? "Edit Ticket Record" : "Ticket Records"}</h1>
        ${renderFlash(req)}
        <form id="ticket-form" method="post" action="/add-ticket" class="form-grid">
          ${editTicket ? `<input type="hidden" name="ticket_id" value="${editTicket.Ticket_ID}">` : ""}
          <label>Purchase Type
            <input type="text" name="type" value="${editTicket ? escapeHtml(editTicket.Purchase_type || "") : ""}" required>
          </label>
          <label>Purchase Date
            <input type="date" name="purchase_date" value="${editTicket ? formatDateInput(editTicket.Purchase_Date) : ""}" required>
          </label>
          <label>Visit Date
            <input type="date" name="visit_date" value="${editTicket ? formatDateInput(editTicket.Visit_Date) : ""}" required>
          </label>
          <label>Phone
            <input type="tel" name="phone" value="${editTicket ? escapeHtml(editTicket.Phone_Number || "") : ""}">
          </label>
          <label>Email
            <input type="email" name="email" value="${editTicket ? escapeHtml(editTicket.Email || "") : ""}">
          </label>
          <button class="button" type="submit">${editTicket ? "Update Ticket" : "Add Ticket"}</button>
        </form>
      </section>
      <section class="card narrow">
        <h2>All Ticket Records</h2>
        <table>
          <thead>
            <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Purchased</th>
                <th>Visit</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${ticketRows || '<tr><td colspan="7">No tickets found.</td></tr>'}
            </tbody>
          </table>
      </section>
    `,
    }));
  }));

  app.post("/add-ticket", requireLogin, allowRoles(["supervisor", "employee"]), asyncHandler(async (req, res) => {
    const ticketId = req.body.ticket_id || null;
    const {
      type,
      purchase_date: purchaseDate,
      visit_date: visitDate,
      email,
      phone,
    } = req.body;

    if (!phone && !email) {
      setFlash(req, "Please enter either Phone or Email.");
      return res.redirect("/add-ticket");
    }

    if (ticketId) {
      await pool.query(
        `UPDATE Ticket
         SET Purchase_type = ?, Purchase_Date = ?, Visit_Date = ?, Email = ?, Phone_Number = ?
         WHERE Ticket_ID = ?`,
        [type, purchaseDate, visitDate, email || null, phone || null, ticketId],
      );
      setFlash(req, "Ticket updated successfully.");
    } else {
      await pool.query(
        `INSERT INTO Ticket (Purchase_type, Purchase_Date, Visit_Date, Email, Phone_Number)
         VALUES (?, ?, ?, ?, ?)`,
        [type, purchaseDate, visitDate, email || null, phone || null],
      );
      setFlash(req, "Ticket added successfully.");
    }

    res.redirect("/add-ticket");
  }));

  app.post("/delete-ticket", requireLogin, allowRoles(["supervisor", "employee"]), asyncHandler(async (req, res) => {
    const idToDelete = req.body.ticket_id;

    if (!idToDelete) {
      setFlash(req, "Error: No ticket ID provided.");
      return res.redirect("/add-ticket");
    }

    await pool.query("DELETE FROM ticket_line WHERE Ticket_ID = ?", [idToDelete]);
    await pool.query("DELETE FROM Ticket WHERE Ticket_ID = ?", [idToDelete]);
    setFlash(req, "Ticket record deleted.");
    res.redirect("/add-ticket");
  }));

  app.get("/add-ticket-line", requireLogin, allowRoles(["supervisor", "employee"]), asyncHandler(async (req, res) => {
    const [tickets] = await pool.query("SELECT Ticket_ID FROM Ticket ORDER BY Ticket_ID DESC");
    const [exhibitions] = await pool.query("SELECT Exhibition_ID, Exhibition_Name FROM Exhibition");
    const [lines] = await pool.query(`
      SELECT tl.Ticket_ID, tl.Ticket_Type, tl.Quantity, tl.Price_per_ticket, e.Exhibition_Name
      FROM ticket_line tl
      LEFT JOIN Exhibition e ON tl.Exhibition_ID = e.Exhibition_ID
      ORDER BY tl.Ticket_ID DESC
    `);
    let editLine = null;

    if (req.query.edit_ticket && req.query.edit_type) {
      const [rows] = await pool.query(
        "SELECT * FROM ticket_line WHERE Ticket_ID = ? AND Ticket_Type = ?",
        [req.query.edit_ticket, req.query.edit_type],
      );
      editLine = rows[0] || null;
    }

    const lineRows = lines.map((line) => `
      <tr>
        <td>#${line.Ticket_ID}</td>
        <td>${escapeHtml(line.Ticket_Type)}</td>
        <td>${line.Quantity}</td>
        <td>$${Number(line.Price_per_ticket).toFixed(2)}</td>
        <td>${escapeHtml(line.Exhibition_Name || "General")}</td>
        <td class="actions">
          <form method="get" action="/add-ticket-line" class="inline-form">
            <input type="hidden" name="edit_ticket" value="${line.Ticket_ID}">
            <input type="hidden" name="edit_type" value="${line.Ticket_Type}">
            <button class="link-button" type="submit">Edit</button>
          </form>
          <form method="post" action="/delete-ticket-line" class="inline-form" onsubmit="return confirm('Remove this line item?');">
            <input type="hidden" name="ticket_id" value="${line.Ticket_ID}">
            <input type="hidden" name="ticket_type" value="${line.Ticket_Type}">
            <button class="link-button danger" type="submit">Delete</button>
          </form>
        </td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Ticket Line Items",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>Ticket Line Items</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-ticket-line" class="form-grid">
          ${editLine ? 
            `<input type="hidden" name="original_type" value="${editLine.Ticket_Type}">`
            : ""}
          <label>Ticket
            <select name="ticket_id">
              ${tickets.map((t) => `<option value="${t.Ticket_ID}" ${editLine && editLine.Ticket_ID === t.Ticket_ID ? "selected" : ""}>#${t.Ticket_ID}</option>`).join("")}
            </select>
          </label>
          <label>Ticket Type
            <select name="ticket_type" required>
              <option value="">— Select —</option>
              <option value="General Admission" ${editLine && editLine.Ticket_Type === "General Admission" ? "selected" : ""}>General Admission ($20.00)</option>
              <option value="Senior" ${editLine && editLine.Ticket_Type === "Senior" ? "selected" : ""}>Senior 65+ ($15.00)</option>
              <option value="Child" ${editLine && editLine.Ticket_Type === "Child" ? "selected" : ""}>Child under 12 ($10.00)</option>
            </select>
          </label>
          <label>Quantity
            <input type="number" name="quantity"
            value="${editLine ? editLine.Quantity : ""}" required>
          </label>
          <label>Exhibition
            <select name="exhibition_id">
              <option value="">General Admission</option>
              ${exhibitions.map((ex) => `<option value="${ex.Exhibition_ID}" ${editLine && editLine.Exhibition_ID === ex.Exhibition_ID ? "selected" : ""}>${escapeHtml(ex.Exhibition_Name)}</option>`).join("")}
            </select>
          </label>
          <button class="button" type="submit">${editLine ? "Update Line" : "Add Line"}</button>
        </form>
      </section>
      <section class="card narrow">
        <h2>Existing Line Items</h2>
        <table>
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Type</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Exhibition</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${lineRows || '<tr><td colspan="6">No lines found.</td></tr>'}
          </tbody>
        </table>
      </section>
    `,
    }));
  }));

  app.post("/add-ticket-line", requireLogin, allowRoles(["supervisor", "employee"]), asyncHandler(async (req, res) => {
    const {
      ticket_id: ticketId,
      ticket_type: ticketType,
      quantity,
      exhibition_id: exhibitionId,
      original_type
    } = req.body;

    if (!ticketId || !ticketType || !quantity) {
      setFlash(req, "All fields are required.");
      return res.redirect("/add-ticket-line");
    }

    let pricePerTicket;
    switch (ticketType) {
      case "General Admission": pricePerTicket = 20.00; break;
      case "Senior": pricePerTicket = 15.00; break;
      case "Child": pricePerTicket = 10.00; break;
      default:
        setFlash(req, "Invalid ticket type selected.");
        return res.redirect("/add-ticket-line");
    }

    if (original_type) {
      await pool.query(
        `UPDATE ticket_line
        SET Ticket_Type = ?, Quantity = ?, Price_per_ticket = ?, Exhibition_ID = ?
        WHERE Ticket_ID = ? AND Ticket_Type = ?`,
        [ticketType, quantity, pricePerTicket, exhibitionId || null, ticketId, original_type],
      );
      setFlash(req, "Ticket line updated.");
    } else {
      try {
        await pool.query(
          `INSERT INTO ticket_line (Ticket_ID, Ticket_Type, Quantity, Price_per_ticket, Exhibition_ID)
          VALUES (?, ?, ?, ?, ?)`,
          [ticketId, ticketType, quantity, pricePerTicket, exhibitionId || null],
        );
        setFlash(req, "Ticket line added.");
      } catch (err) {
        if (err.sqlState === "45000") {
          await logTriggerViolation(pool, req, err.sqlMessage);
          setFlash(req, err.sqlMessage);
        } else {
          throw err;
        }
      }
    }

    res.redirect("/add-ticket-line");
  }));

  app.post("/delete-ticket-line", requireLogin, allowRoles(["supervisor", "employee"]), asyncHandler(async (req, res) => {
    const { ticket_id: ticketId, ticket_type: ticketType } = req.body;

    await pool.query(
      "DELETE FROM ticket_line WHERE Ticket_ID = ? AND Ticket_Type = ?",
      [ticketId, ticketType],
    );
    setFlash(req, "Line removed.");
    res.redirect("/add-ticket-line");
  }));
}

module.exports = { registerAdmissionRoutes };