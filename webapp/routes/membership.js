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

function registerMembershipRoutes(app, { pool }) {
  app.get("/add-membership", requireLogin, allowRoles(["admissions", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    const [members] = await pool.query(
      "SELECT Membership_ID, First_Name, Last_Name, Email, Phone_Number, Date_Joined FROM Membership ORDER BY Membership_ID DESC"
    );

    let editMember = null;
    if (req.query.edit_id) {
      const [rows] = await pool.query(
        "SELECT * FROM Membership WHERE Membership_ID = ?",
        [req.query.edit_id],
      );
      editMember = rows[0] || null;
    }

    const memberRows = members.map((member) => `
      <tr>
        <td>${member.Membership_ID}</td>
        <td>${escapeHtml(member.First_Name)} ${escapeHtml(member.Last_Name)}</td>
        <td>${escapeHtml(member.Email || "N/A")}</td>
        <td>${escapeHtml(member.Phone_Number || "N/A")}</td>
        <td>${formatDisplayDate(member.Date_Joined)}</td>
        <td class="actions">
          <form method="get" action="/add-membership" class="inline-form">
            <input type="hidden" name="edit_id" value="${member.Membership_ID}">
            <button class="link-button" type="submit">Edit</button>
          </form>
          <form method="post" action="/delete-membership" class="inline-form" onsubmit="return confirm('Cancel this membership?');">
            <input type="hidden" name="membership_id" value="${member.Membership_ID}">
            <button class="link-button danger" type="submit">Cancel Membership</button>
          </form>
        </td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Visitor Memberships",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <p class="eyebrow">Admissions Desk</p>
        <h1>${editMember ? "Edit Membership" : "Visitor Memberships"}</h1>
        <p>Use to signup visitors for museum membership.</p>
        ${renderFlash(req)}
        <form method="post" action="/add-membership" class="form-grid">
          ${editMember ? `<input type="hidden" name="membership_id" value="${editMember.Membership_ID}">` : ""}
          <label>First Name
            <input type="text" name="first_name" value="${editMember ? escapeHtml(editMember.First_Name) : ""}" required>
          </label>
          <label>Last Name
            <input type="text" name="last_name" value="${editMember ? escapeHtml(editMember.Last_Name) : ""}" required>
          </label>
          <label>Visitor Email
            <input type="email" name="email" value="${editMember ? escapeHtml(editMember.Email || "") : ""}">
          </label>
          <label>Phone
            <input type="tel" name="phone" value="${editMember ? escapeHtml(editMember.Phone_Number || "") : ""}">
          </label>
          <label>Date Joined
            <input type="date" name="date_joined" value="${editMember ? formatDateInput(editMember.Date_Joined) : ""}">
          </label>
          <button class="button" type="submit">${editMember ? "Update Membership" : "Add Membership"}</button>
          ${editMember ? `<a class="button button-secondary" href="/add-membership">Cancel Edit</a>` : ""}
        </form>
      </section>
      <section class="card narrow">
        <h2>Current Members</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${memberRows || '<tr><td colspan="6">No members found.</td></tr>'}
          </tbody>
        </table>
      </section>
    `,
    }));
  }));

  app.post("/add-membership", requireLogin, allowRoles(["admissions", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    const id = req.body.membership_id || null;
    const { first_name: firstName, last_name: lastName, email, phone, date_joined: dateJoined } = req.body;

    if (!firstName || !lastName) {
      setFlash(req, "Name is required.");
      return res.redirect("/add-membership");
    }

    if (id) {
      await pool.query(
        `UPDATE Membership SET First_Name = ?, Last_Name = ?, Email = ?, Phone_Number = ?, Date_Joined = ? WHERE Membership_ID = ?`,
        [firstName, lastName, email || null, phone || null, dateJoined || null, id],
      );
      setFlash(req, "Membership updated successfully.");
    } else {
      await pool.query(
        `INSERT INTO Membership (First_Name, Last_Name, Email, Phone_Number, Date_Joined)
        VALUES (?, ?, ?, ?, ?)`,
        [firstName, lastName, email || null, phone || null, dateJoined || null],
      );
      setFlash(req, "Membership added.");
    }

    res.redirect("/add-membership");
  }));

  app.post("/delete-membership", requireLogin, allowRoles(["admissions", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    const idToDelete = req.body.membership_id;

    if (!idToDelete) {
      setFlash(req, "Error: No membership ID provided.");
      return res.redirect("/add-membership");
    }

    await pool.query("UPDATE Ticket SET Membership_ID = NULL WHERE Membership_ID = ?", [idToDelete]);
    await pool.query("DELETE FROM Membership WHERE Membership_ID = ?", [idToDelete]);
    setFlash(req, "Membership cancelled.");
    res.redirect("/add-membership");
  }));
}

module.exports = { registerMembershipRoutes };