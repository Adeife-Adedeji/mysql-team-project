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
  app.get("/add-membership", requireLogin, allowRoles(["employee", "supervisor"]), asyncHandler(async (req, res) => {
    const [members] = await pool.query(
      "SELECT Membership_ID, First_Name, Last_Name, Email, Phone_Number, Date_Joined FROM Membership",
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
        <td class="actions">
          <form method="get" action="/add-membership" class="inline-form">
            <input type="hidden" name="edit_id" value="${member.Membership_ID}">
            <button class="link-button" type="submit">Edit</button>
          </form>
          <form method="post" action="/delete-membership" class="inline-form" onsubmit="return confirm('Are you sure you want to delete this member?');">
            <input type="hidden" name="membership_id" value="${member.Membership_ID}">
            <button class="link-button danger" type="submit">Delete</button>
          </form>
        </td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Manage Memberships",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>${editMember ? "Edit Membership" : "Add Membership"}</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-membership" class="form-grid">
          ${editMember ? `<input type="hidden" name="membership_id" value="${editMember.Membership_ID}">` : ""}
          <label>First Name
            <input type="text" name="first_name" value="${editMember ? escapeHtml(editMember.First_Name) : ""}" required>
          </label>
          <label>Last Name
            <input type="text" name="last_name" value="${editMember ? escapeHtml(editMember.Last_Name) : ""}" required>
          </label>
          <label>Email
            <input type="email" name="email" value="${editMember ? escapeHtml(editMember.Email || "") : ""}">
          </label>
          <label>Phone
            <input type="tel" name="phone" value="${editMember ? escapeHtml(editMember.Phone_Number || "") : ""}">
          </label>
          <label>Date Joined
            <input type="date" name="date_joined" value="${editMember ? formatDateInput(editMember.Date_Joined) : ""}">
          </label>
          <button class="button" type="submit">${editMember ? "Update Membership" : "Add Membership"}</button>
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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${memberRows || '<tr><td colspan="5">No members found.</td></tr>'}
          </tbody>
        </table>
      </section>
    `,
    }));
  }));

  app.post("/add-membership", requireLogin, allowRoles(["employee", "supervisor"]), asyncHandler(async (req, res) => {
    const id = req.body.membership_id || null;
    const { first_name: firstName, last_name: lastName, email, phone, date_joined: dateJoined } = req.body;

    if (!firstName || !lastName) {
      setFlash(req, "Name is required.");
      return res.redirect("/add-membership");
    }

    if (id) {
      await pool.query(
        `UPDATE Membership
         SET First_Name = ?, Last_Name = ?, Email = ?, Phone_Number = ?, Date_Joined = ?
         WHERE Membership_ID = ?`,
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

  app.post("/delete-membership", requireLogin, allowRoles(["employee", "supervisor"]), asyncHandler(async (req, res) => {
    const idToDelete = req.body.membership_id;

    if (!idToDelete) {
      setFlash(req, "Error: No membership ID provided.");
      return res.redirect("/add-membership");
    }

    await pool.query("DELETE FROM Membership WHERE Membership_ID = ?", [idToDelete]);
    setFlash(req, "Membership successfully deleted!");
    res.redirect("/add-membership");
  }));

  app.get("/add-exhibition", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const [exhibitions] = await pool.query(
      "SELECT Exhibition_ID, Exhibition_Name, Starting_Date, Ending_Date FROM Exhibition",
    );

    let editExhibition = null;
    if (req.query.edit_id) {
      const [rows] = await pool.query(
        "SELECT * FROM Exhibition WHERE Exhibition_ID = ?",
        [req.query.edit_id],
      );
      editExhibition = rows[0] || null;
    }

    const exhibitionRows = exhibitions.map((exhibition) => `
      <tr>
        <td>${exhibition.Exhibition_ID}</td>
        <td>${escapeHtml(exhibition.Exhibition_Name)}</td>
        <td>${formatDisplayDate(exhibition.Starting_Date)}</td>
        <td>${formatDisplayDate(exhibition.Ending_Date)}</td>
        <td class="actions">
          <form method="get" action="/add-exhibition" class="inline-form">
            <input type="hidden" name="edit_id" value="${exhibition.Exhibition_ID}">
            <button class="link-button" type="submit">Edit</button>
          </form>
          <form method="post" action="/delete-exhibition" class="inline-form" onsubmit="return confirm('Delete this exhibition?');">
            <input type="hidden" name="exhibition_id" value="${exhibition.Exhibition_ID}">
            <button class="link-button danger" type="submit">Delete</button>
          </form>
        </td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Manage Exhibitions",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>${editExhibition ? "Edit Exhibition" : "Add New Exhibition"}</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-exhibition" class="form-grid">
          ${editExhibition ? `<input type="hidden" name="exhibition_id" value="${editExhibition.Exhibition_ID}">` : ""}
          <label>Exhibition Name
            <input type="text" name="name" value="${editExhibition ? escapeHtml(editExhibition.Exhibition_Name) : ""}" required>
          </label>
          <label>Start Date
            <input type="date" name="start_date" value="${editExhibition ? formatDateInput(editExhibition.Starting_Date) : ""}" required>
          </label>
          <label>End Date
            <input type="date" name="end_date" value="${editExhibition ? formatDateInput(editExhibition.Ending_Date) : ""}" required>
          </label>
          <button class="button" type="submit">${editExhibition ? "Update Exhibition" : "Add Exhibition"}</button>
        </form>
      </section>
      <section class="card narrow">
        <h2>Current Exhibitions</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Start</th>
              <th>End</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${exhibitionRows || '<tr><td colspan="5">No exhibitions found.</td></tr>'}
          </tbody>
        </table>
      </section>
    `,
    }));
  }));
}

module.exports = { registerMembershipRoutes };