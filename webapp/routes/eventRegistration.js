const {
  asyncHandler,
  escapeHtml,
  formatDateInput,
  formatDisplayDate,
  renderFlash,
  renderPage,
  requireLogin,
  setFlash,
  allowRoles
} = require("../helpers");

function registerEventRegistrationRoutes(app, { pool }) {
  app.get("/add-event-registration", requireLogin, allowRoles(["employee", "supervisor"]), asyncHandler(async (req, res) => {
    const [events] = await pool.query(
      "SELECT event_ID, event_Name FROM Event ORDER BY start_Date DESC"
    );
    const [members] = await pool.query(
      "SELECT Membership_ID, First_Name, Last_Name FROM Membership"
    );
    const [tickets] = await pool.query(
      "SELECT Ticket_ID FROM Ticket ORDER BY Ticket_ID DESC"
    );
    const [registrations] = await pool.query(`
      SELECT er.Event_Registration_ID, er.Registration_Date,
             ev.event_Name, m.First_Name, m.Last_Name, er.Ticket_ID
      FROM event_registration er
      JOIN Event ev ON er.Event_ID = ev.event_ID
      JOIN Membership m ON er.Membership_ID = m.Membership_ID
      ORDER BY er.Registration_Date DESC
    `);

    let editReg = null;
    if (req.query.edit_id) {
      const [rows] = await pool.query(
        "SELECT * FROM event_registration WHERE Event_Registration_ID = ?",
        [req.query.edit_id]
      );
      editReg = rows[0] || null;
    }

    const regRows = registrations.map((reg) => `
      <tr>
        <td>${reg.Event_Registration_ID}</td>
        <td>${escapeHtml(reg.event_Name)}</td>
        <td>${escapeHtml(reg.First_Name)} ${escapeHtml(reg.Last_Name)}</td>
        <td>#${reg.Ticket_ID}</td>
        <td>${formatDisplayDate(reg.Registration_Date)}</td>
        <td class="actions">
          <form method="get" action="/add-event-registration" class="inline-form">
            <input type="hidden" name="edit_id" value="${reg.Event_Registration_ID}">
            <button class="link-button" type="submit">Edit</button>
          </form>
          <form method="post" action="/delete-event-registration" class="inline-form" onsubmit="return confirm('Delete this registration?');">
            <input type="hidden" name="registration_id" value="${reg.Event_Registration_ID}">
            <button class="link-button danger" type="submit">Delete</button>
          </form>
        </td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Manage Event Registrations",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>${editReg ? "Edit Registration" : "Add Event Registration"}</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-event-registration" class="form-grid">
          ${editReg ? `<input type="hidden" name="registration_id" value="${editReg.Event_Registration_ID}">` : ""}
          <label>Event
            <select name="event_id" required>
              <option value="">Select Event</option>
              ${events.map((ev) => `
                <option value="${ev.event_ID}" ${editReg && editReg.Event_ID === ev.event_ID ? "selected" : ""}>
                  ${escapeHtml(ev.event_Name)}
                </option>
              `).join("")}
            </select>
          </label>
          <label>Member
            <select name="membership_id" required>
              <option value="">Select Member</option>
              ${members.map((m) => `
                <option value="${m.Membership_ID}" ${editReg && editReg.Membership_ID === m.Membership_ID ? "selected" : ""}>
                  ${escapeHtml(m.First_Name)} ${escapeHtml(m.Last_Name)}
                </option>
              `).join("")}
            </select>
          </label>
          <label>Ticket
            <select name="ticket_id" required>
              <option value="">Select Ticket</option>
              ${tickets.map((t) => `
                <option value="${t.Ticket_ID}" ${editReg && editReg.Ticket_ID === t.Ticket_ID ? "selected" : ""}>
                  Ticket #${t.Ticket_ID}
                </option>
              `).join("")}
            </select>
          </label>
          <label>Registration Date
            <input type="date" name="registration_date" value="${editReg ? formatDateInput(editReg.Registration_Date) : ""}" required>
          </label>
          <button class="button" type="submit">${editReg ? "Update Registration" : "Add Registration"}</button>
        </form>
      </section>
      <section class="card narrow">
        <h2>Current Registrations</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Event</th>
              <th>Member</th>
              <th>Ticket</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${regRows || '<tr><td colspan="6">No registrations found.</td></tr>'}
          </tbody>
        </table>
      </section>
    `,
    }));
  }));

  app.post("/add-event-registration", requireLogin, allowRoles(["employee", "supervisor"]), asyncHandler(async (req, res) => {
    const id = req.body.registration_id || null;
    const {
      event_id: eventId,
      membership_id: membershipId,
      ticket_id: ticketId,
      registration_date: registrationDate,
    } = req.body;

    if (!eventId || !membershipId || !ticketId || !registrationDate) {
      setFlash(req, "All fields are required.");
      return res.redirect("/add-event-registration");
    }

    if (id) {
      await pool.query(
        `UPDATE event_registration
         SET Event_ID = ?, Membership_ID = ?, Ticket_ID = ?, Registration_Date = ?
         WHERE Event_Registration_ID = ?`,
        [eventId, membershipId, ticketId, registrationDate, id]
      );
      setFlash(req, "Registration updated successfully.");
    } else {
      await pool.query(
        `INSERT INTO event_registration (Event_ID, Membership_ID, Ticket_ID, Registration_Date)
         VALUES (?, ?, ?, ?)`,
        [eventId, membershipId, ticketId, registrationDate]
      );
      setFlash(req, "Registration added successfully.");
    }

    res.redirect("/add-event-registration");
  }));

  app.post("/delete-event-registration", requireLogin, allowRoles(["employee", "supervisor"]), asyncHandler(async (req, res) => {
    const idToDelete = req.body.registration_id;

    if (!idToDelete) {
      setFlash(req, "Error: No registration ID provided.");
      return res.redirect("/add-event-registration");
    }

    await pool.query(
      "DELETE FROM event_registration WHERE Event_Registration_ID = ?",
      [idToDelete]
    );
    setFlash(req, "Registration deleted successfully.");
    res.redirect("/add-event-registration");
  }));
}

module.exports = { registerEventRegistrationRoutes };