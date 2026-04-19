const {
  asyncHandler,
  escapeHtml,
  formatDateInput,
  formatDisplayDate,
  getPageNumber,
  paginateRows,
  renderFlash,
  renderPager,
  renderPage,
  requireLogin,
  setFlash,
  allowRoles
} = require("../helpers");

function registerMembershipRoutes(app, { pool }) {

  // ─── List + Add/Edit ─────────────────────────────────────────────────────────
  app.get("/add-membership", requireLogin, allowRoles(["admissions", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    const membershipPage = getPageNumber(req.query.membership_page);
    const [members] = await pool.query(
      `SELECT Membership_ID, First_Name, Last_Name, Email, Phone_Number,
              Date_Joined, Date_Exited, Status
       FROM Membership
       ORDER BY Membership_ID DESC`
    );

    let editMember = null;
    if (req.query.edit_id) {
      const [rows] = await pool.query(
        "SELECT * FROM Membership WHERE Membership_ID = ?",
        [req.query.edit_id]
      );
      editMember = rows[0] || null;
    }

    const isSuper = req.session.user?.role === "supervisor";
    const membershipPagination = paginateRows(members, membershipPage);

    const memberRows = membershipPagination.items.map((m) => {
      const statusColor = m.Status === "Active" ? "#dcfce7"
                        : m.Status === "Expired"   ? "#fee2e2"
                        : "#e5e7eb"; // Cancelled = grey
      const badge = `<span style="background:${statusColor}; padding:2px 8px; border-radius:4px; font-size:0.82em; font-weight:600;">${escapeHtml(m.Status)}</span>`;

      const actionButtons = [];

      // Renew: available for Active and Expired (not Cancelled)
      if (m.Status !== "Cancelled") {
        actionButtons.push(`
          <form method="post" action="/renew-membership" class="inline-form">
            <input type="hidden" name="membership_id" value="${m.Membership_ID}">
            <button class="link-button" type="submit">Renew</button>
          </form>`);
      }

      // Edit: always available
      actionButtons.push(`
        <form method="get" action="/add-membership" class="inline-form">
          <input type="hidden" name="edit_id" value="${m.Membership_ID}">
          <button class="link-button" type="submit">Edit</button>
        </form>`);

      // Restore: only for cancelled memberships — gives a fresh 1-year period from today
      if (m.Status === "Cancelled") {
        actionButtons.push(`
          <form method="post" action="/restore-membership" class="inline-form"
                onsubmit="return confirm('Restore this membership? They will get a new 1-year period starting today.');">
            <input type="hidden" name="membership_id" value="${m.Membership_ID}">
            <button class="link-button success" type="submit">Restore</button>
          </form>`);
      }

      // Cancel: only if not already cancelled
      if (m.Status !== "Cancelled") {
        actionButtons.push(`
          <form method="post" action="/cancel-membership" class="inline-form"
                onsubmit="return confirm('Cancel this membership? The record will be kept for history.');">
            <input type="hidden" name="membership_id" value="${m.Membership_ID}">
            <button class="link-button danger" type="submit">Cancel</button>
          </form>`);
      }

      // Hard delete: supervisor only
      if (isSuper) {
        actionButtons.push(`
          <form method="post" action="/delete-membership" class="inline-form"
                onsubmit="return confirm('Permanently delete this membership record and all linked data? This cannot be undone.');">
            <input type="hidden" name="membership_id" value="${m.Membership_ID}">
            <button class="link-button danger" type="submit">Delete</button>
          </form>`);
      }

      return `
        <tr>
          <td>${m.Membership_ID}</td>
          <td>${escapeHtml(m.First_Name)} ${escapeHtml(m.Last_Name)}</td>
          <td>${escapeHtml(m.Email || "N/A")}</td>
          <td>${escapeHtml(m.Phone_Number || "N/A")}</td>
          <td>${formatDisplayDate(m.Date_Joined)}</td>
          <td>${m.Date_Exited ? formatDisplayDate(m.Date_Exited) : "—"}</td>
          <td>${badge}</td>
          <td class="actions">${actionButtons.join("")}</td>
        </tr>`;
    }).join("");

    const today = new Date().toISOString().split("T")[0];

    res.send(renderPage({
      title: "Visitor Memberships",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>${editMember ? "Edit Membership" : "Visitor Memberships"}</h1>
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
            <input type="date" name="date_joined" value="${editMember ? formatDateInput(editMember.Date_Joined) : today}" max="${today}" required>
          </label>
          <button class="button" type="submit">${editMember ? "Update Membership" : "Add Membership"}</button>
          ${editMember ? `<a class="button button-secondary" href="/add-membership">Cancel Edit</a>` : ""}
        </form>
      </section>
      <section class="card narrow">
        <div id="membership-list"></div>
        <h2>Current Members</h2>
        <p class="dashboard-note">
          <strong>Active</strong> = membership valid &nbsp;|&nbsp;
          <strong>Expired</strong> = over 1 year, must renew &nbsp;|&nbsp;
          <strong>Cancelled</strong> = manually cancelled
        </p>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Joined</th>
              <th>Expires / Expired</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${memberRows || '<tr><td colspan="8">No members found.</td></tr>'}
          </tbody>
        </table>
        ${renderPager(req, "membership_page", membershipPagination, "membership-list")}
      </section>
    `,
    }));
  }));


  // ─── Add or Edit (POST) ───────────────────────────────────────────────────────
  app.post("/add-membership", requireLogin, allowRoles(["admissions", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    const id = req.body.membership_id || null;
    const { first_name: firstName, last_name: lastName, email, phone, date_joined: dateJoined } = req.body;

    if (!firstName || !lastName) {
      setFlash(req, "Name is required.");
      return res.redirect("/add-membership");
    }

    if (!dateJoined) {
      setFlash(req, "Date Joined is required.");
      return res.redirect("/add-membership");
    }

    if (id) {
      await pool.query(
        `UPDATE Membership
         SET First_Name = ?, Last_Name = ?, Email = ?, Phone_Number = ?, Date_Joined = ?,
             Updated_By = ?
         WHERE Membership_ID = ?`,
        [firstName, lastName, email || null, phone || null, dateJoined, req.session.user.email, id]
      );
      setFlash(req, "Membership updated.");
    } else {
      await pool.query(
        `INSERT INTO Membership (First_Name, Last_Name, Email, Phone_Number, Date_Joined, Created_By, Created_At)
         VALUES (?, ?, ?, ?, ?, ?, CURDATE())`,
        [firstName, lastName, email || null, phone || null, dateJoined, req.session.user.email]
      );
      setFlash(req, "Membership added. Expiry set to 1 year from join date.");
    }

    res.redirect("/add-membership");
  }));


  // ─── Renew membership ─────────────────────────────────────────────────────────
  // Extends Date_Exited by 1 year from whichever is later: current expiry or today.
  // This handles both Active (early renewal) and Expired (lapsed) members.
  app.post("/renew-membership", requireLogin, allowRoles(["admissions", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    const id = req.body.membership_id;
    if (!id) {
      setFlash(req, "No membership ID provided.");
      return res.redirect("/add-membership");
    }

    const [[member]] = await pool.query(
      "SELECT Membership_ID, Status, Date_Exited FROM Membership WHERE Membership_ID = ?",
      [id]
    );

    if (!member) {
      setFlash(req, "Membership not found.");
      return res.redirect("/add-membership");
    }

    if (member.Status === "Cancelled") {
      setFlash(req, "Cannot renew a cancelled membership. Add a new one instead.");
      return res.redirect("/add-membership");
    }

    // Extend from whichever is later: current Date_Exited or today
    await pool.query(
      `UPDATE Membership
       SET Date_Exited = DATE_ADD(GREATEST(COALESCE(Date_Exited, CURDATE()), CURDATE()), INTERVAL 1 YEAR),
           Status      = 'Active',
           Updated_By  = ?
       WHERE Membership_ID = ?`,
      [req.session.user.email, id]
    );

    setFlash(req, "Membership renewed for 1 year.");
    res.redirect("/add-membership");
  }));


  // ─── Soft cancel ─────────────────────────────────────────────────────────────
  // Sets Status = 'Cancelled' and Date_Exited = today. Keeps the record and history.
  app.post("/cancel-membership", requireLogin, allowRoles(["admissions", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    const id = req.body.membership_id;
    if (!id) {
      setFlash(req, "No membership ID provided.");
      return res.redirect("/add-membership");
    }

    await pool.query(
      `UPDATE Membership
       SET Status = 'Cancelled', Date_Exited = CURDATE(), Updated_By = ?
       WHERE Membership_ID = ?`,
      [req.session.user.email, id]
    );

    setFlash(req, "Membership cancelled. Record kept for history.");
    res.redirect("/add-membership");
  }));


  // ─── Restore cancelled membership ────────────────────────────────────────────
  // Reactivates a Cancelled membership with a fresh 1-year period from today.
  app.post("/restore-membership", requireLogin, allowRoles(["admissions", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    const id = req.body.membership_id;
    if (!id) {
      setFlash(req, "No membership ID provided.");
      return res.redirect("/add-membership");
    }

    const [[member]] = await pool.query(
      "SELECT Membership_ID, Status FROM Membership WHERE Membership_ID = ?",
      [id]
    );

    if (!member) {
      setFlash(req, "Membership not found.");
      return res.redirect("/add-membership");
    }

    if (member.Status !== "Cancelled") {
      setFlash(req, "Only cancelled memberships can be restored.");
      return res.redirect("/add-membership");
    }

    await pool.query(
      `UPDATE Membership
       SET Status      = 'Active',
           Date_Exited = DATE_ADD(CURDATE(), INTERVAL 1 YEAR),
           Updated_By  = ?
       WHERE Membership_ID = ?`,
      [req.session.user.email, id]
    );

    await pool.query(
      `INSERT INTO manager_notifications (source_table, source_id, message)
       VALUES ('Membership', ?, ?)`,
      [id, `Membership #${id} was restored to Active by ${req.session.user.name} (${req.session.user.email}). New expiry: 1 year from today.`]
    );

    setFlash(req, "Membership restored. New expiry set to 1 year from today.");
    res.redirect("/add-membership");
  }));


  // ─── Hard delete (supervisor only) ───────────────────────────────────────────
  // Cascades: nulls out Ticket.Membership_ID, removes registrations.
  app.post("/delete-membership", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const idToDelete = req.body.membership_id;

    if (!idToDelete) {
      setFlash(req, "No membership ID provided.");
      return res.redirect("/add-membership");
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query("UPDATE users SET membership_id = NULL WHERE membership_id = ?", [idToDelete]);
      await connection.query("DELETE FROM Tour_Registration WHERE Membership_ID = ?", [idToDelete]);
      await connection.query("DELETE FROM event_registration WHERE Membership_ID = ?", [idToDelete]);
      await connection.query("UPDATE Ticket SET Membership_ID = NULL WHERE Membership_ID = ?", [idToDelete]);
      await connection.query("DELETE FROM Membership WHERE Membership_ID = ?", [idToDelete]);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    setFlash(req, "Membership permanently deleted.");
    res.redirect("/add-membership");
  }));
}

module.exports = { registerMembershipRoutes };
