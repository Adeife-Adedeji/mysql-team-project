const {
  asyncHandler,
  escapeHtml,
  getPageNumber,
  paginateRows,
  renderFlash,
  renderPager,
  renderPage,
  requireLogin,
  setFlash,
  allowRoles
} = require("../helpers");

function registerDepartmentRoutes(app, { pool }) {
  app.get("/add-department", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const departmentPage = getPageNumber(req.query.department_page);
    const [departments] = await pool.query(
      "SELECT Department_ID, Department_Name, Manager_ID FROM Department"
    );
    const [employees] = await pool.query(
      "SELECT Employee_ID, First_Name, Last_Name FROM Employee"
    );

    let editDepartment = null;
    if (req.query.edit_id) {
      const [rows] = await pool.query(
        "SELECT * FROM Department WHERE Department_ID = ?",
        [req.query.edit_id]
      );
      editDepartment = rows[0] || null;
    }

    const departmentPagination = paginateRows(departments, departmentPage);
    const departmentRows = departmentPagination.items.map((dept) => {
      const manager = employees.find(e => e.Employee_ID === dept.Manager_ID);
      return `
        <tr>
          <td>${dept.Department_ID}</td>
          <td>${escapeHtml(dept.Department_Name)}</td>
          <td>${manager ? escapeHtml(manager.First_Name + " " + manager.Last_Name) : "None"}</td>
          <td class="actions">
            <form method="get" action="/add-department" class="inline-form">
              <input type="hidden" name="edit_id" value="${dept.Department_ID}">
              <button class="link-button" type="submit">Edit</button>
            </form>
            <form method="post" action="/delete-department" class="inline-form" onsubmit="return confirm('Delete this department?');">
              <input type="hidden" name="department_id" value="${dept.Department_ID}">
              <button class="link-button danger" type="submit">Delete</button>
            </form>
          </td>
        </tr>
      `;
    }).join("");

    res.send(renderPage({
      title: "Manage Departments",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>${editDepartment ? "Edit Department" : "Add Department"}</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-department" class="form-grid">
          ${editDepartment ? `<input type="hidden" name="department_id" value="${editDepartment.Department_ID}">` : ""}
          <label>Department Name
            <input type="text" name="name" value="${editDepartment ? escapeHtml(editDepartment.Department_Name) : ""}" required>
          </label>
          <label>Manager
            <select name="manager_id">
              <option value="">None</option>
              ${employees.map((emp) => `
                <option value="${emp.Employee_ID}" ${editDepartment && editDepartment.Manager_ID === emp.Employee_ID ? "selected" : ""}>
                  ${escapeHtml(emp.First_Name)} ${escapeHtml(emp.Last_Name)}
                </option>
              `).join("")}
            </select>
          </label>
          <button class="button" type="submit">${editDepartment ? "Save Department" : "Create Department"}</button>
        </form>
      </section>
      <section class="card narrow">
        <div id="department-list"></div>
        <h2>Current Departments</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Manager</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${departmentRows || '<tr><td colspan="4">No departments found.</td></tr>'}
          </tbody>
        </table>
        ${renderPager(req, "department_page", departmentPagination, "department-list")}
      </section>
    `,
    }));
  }));

  app.post("/add-department", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const id = req.body.department_id || null;
    const { name, manager_id: managerId } = req.body;

    if (!name) {
      setFlash(req, "Department name is required.");
      return res.redirect("/add-department");
    }

    if (id) {
      await pool.query(
        "UPDATE Department SET Department_Name = ?, Manager_ID = ? WHERE Department_ID = ?",
        [name, managerId || null, id]
      );
      setFlash(req, "Department record updated.");
    } else {
      await pool.query(
        "INSERT INTO Department (Department_Name, Manager_ID) VALUES (?, ?)",
        [name, managerId || null]
      );
      setFlash(req, "Department record created.");
    }

    res.redirect("/add-department");
  }));

  app.post("/delete-department", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const idToDelete = req.body.department_id;

    if (!idToDelete) {
      setFlash(req, "Select a department record before deleting.");
      return res.redirect("/add-department");
    }

    await pool.query("UPDATE Employee SET Department_ID = NULL WHERE Department_ID = ?", [idToDelete]);
    await pool.query("DELETE FROM Department WHERE Department_ID = ?", [idToDelete]);
    setFlash(req, "Department record deleted.");
    res.redirect("/add-department");
  }));
}

module.exports = { registerDepartmentRoutes };
