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
    const [recentTickets] = await pool.query(
      `SELECT Ticket_ID, Purchase_Date, Visit_Date, Payment_method
       FROM Ticket
       WHERE Membership_ID = ?
       ORDER BY Purchase_Date DESC, Ticket_ID DESC
       LIMIT 5`,
      [req.session.user.membershipId || 0],
    );

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
            <input type="date" name="visit_date" required>
          </label>
          <label>Select Tickets
            <select name="ticket_type" required>
              <option value="General Admission">General Admission</option>
              <option value="Student">Student</option>
              <option value="Child">Child</option>
              <option value="Senior">Senior</option>
            </select>
          </label>
          <label>Quantity
            <input type="number" name="quantity" min="1" value="1" required>
          </label>
          <label>Price Per Ticket
            <input type="number" step="0.01" name="price" min="0" value="20.00" required>
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
      price,
      payment_method: paymentMethod,
      exhibition_id: exhibitionId,
    } = req.body;

    if (!visitDate || !ticketType || !quantity || !price || !paymentMethod) {
      setFlash(req, "All purchase fields are required.");
      return res.redirect("/purchase-ticket");
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [ticketResult] = await connection.query(
        `INSERT INTO Ticket (Purchase_type, Purchase_Date, Visit_Date, Payment_method, Membership_ID)
         VALUES ('Online', CURRENT_DATE, ?, ?, ?)`,
        [visitDate, paymentMethod, req.session.user.membershipId || null],
      );

      await connection.query(
        `INSERT INTO ticket_line (Ticket_ID, Ticket_Type, Quantity, Price_per_ticket, Exhibition_ID)
         VALUES (?, ?, ?, ?, ?)`,
        [ticketResult.insertId, ticketType, quantity, price, exhibitionId || null],
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
}

module.exports = { registerPurchaseTicketRoutes };