const {
  asyncHandler,
  escapeHtml,
  formatDateInput,  
  getPageNumber,
  paginateRows,
  renderFlash,
  renderPager,
  renderPage,
  requireLogin,
  setFlash,
  allowRoles
} = require("../helpers");

function registerEmployeeRoutes(app, { pool }) {
  app.get("/add-employee", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const employeePage = getPageNumber(req.query.employee_page);
    const [employees] = await pool.query(
      "SELECT Employee_ID, First_Name, Last_Name, Employee_Role, Department_ID FROM Employee"
    );
    const [departments] = await pool.query(
      "SELECT Department_ID, Department_Name FROM Department"
    );

    let editEmployee = null;
    if (req.query.edit_id) {
      const [rows] = await pool.query(
        "SELECT * FROM Employee WHERE Employee_ID = ?",
        [req.query.edit_id]
      );
      editEmployee = rows[0] || null;
    }

    const employeePagination = paginateRows(employees, employeePage);
    const employeeRows = employeePagination.items.map((emp) => `
      <tr>
        <td>${emp.Employee_ID}</td>
        <td>${escapeHtml(emp.First_Name)} ${escapeHtml(emp.Last_Name)}</td>
        <td>${{admissions:"Admissions Desk",giftshop:"Gift Shop",cafe:"Café",supervisor:"Supervisor",curator:"Curator",employee:"General Staff",
          janitor:"Janitorial",security:"Security",maintenance:"Maintenance"}[emp.Employee_Role] || escapeHtml(emp.Employee_Role || "N/A")}</td>
        <td class="actions">
          <form method="get" action="/add-employee" class="inline-form">
            <input type="hidden" name="edit_id" value="${emp.Employee_ID}">
            <button class="link-button" type="submit">Edit</button>
          </form>
          <form method="post" action="/delete-employee" class="inline-form" onsubmit="return confirm('Delete this employee? This will also delete their sales records.');">
            <input type="hidden" name="employee_id" value="${emp.Employee_ID}">
            <button class="link-button danger" type="submit">Delete</button>
          </form>
        </td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Manage Employees",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>${editEmployee ? "Edit Employee" : "Add Employee"}</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-employee" class="form-grid">
          ${editEmployee ? `<input type="hidden" name="employee_id" value="${editEmployee.Employee_ID}">` : ""}
          <label>First Name
            <input type="text" name="first_name" value="${editEmployee ? escapeHtml(editEmployee.First_Name) : ""}" required>
          </label>
          <label>Last Name
            <input type="text" name="last_name" value="${editEmployee ? escapeHtml(editEmployee.Last_Name) : ""}" required>
          </label>
          <label>Email
            <input type="email" name="email" value="${editEmployee ? escapeHtml(editEmployee.Email || "") : ""}">
          </label>
          <label>Date Hired
            <input type="date" name="date_hired" value="${editEmployee ? formatDateInput(editEmployee.Date_Hired) : ""}" required>
          </label>
          <label>Date of Birth
            <input type="date" name="dob" value="${editEmployee ? formatDateInput(editEmployee.Date_of_Birth) : ""}">
          </label>
          <label>Address
            <input type="text" name="address" value="${editEmployee ? escapeHtml(editEmployee.Employee_Address || "") : ""}">
          </label>
          <label>Role
            <select name="role">
              <option value="employee" ${editEmployee && editEmployee.Employee_Role === "employee" ? "selected" : ""}>Employee</option>
              <option value="supervisor" ${editEmployee && editEmployee.Employee_Role === "supervisor" ? "selected" : ""}>Supervisor</option>
              <option value="curator" ${editEmployee && editEmployee.Employee_Role === "curator" ? "selected" : ""}>Curator</option>
              <option value="admissions" ${editEmployee && editEmployee.Employee_Role === "admissions" ? "selected" : ""}>Admissions Desk</option>
              <option value="giftshop" ${editEmployee && editEmployee.Employee_Role === "giftshop"   ? "selected" : ""}>Gift Shop</option>
              <option value="cafe" ${editEmployee && editEmployee.Employee_Role === "cafe"   ? "selected" : ""}>Café</option>
              <option value="janitor" ${editEmployee && editEmployee.Employee_Role === "janitor"   ? "selected" : ""}>Janitorial</option>
              <option value="security" ${editEmployee && editEmployee.Employee_Role === "security"   ? "selected" : ""}>Security</option>
              <option value="maintenance" ${editEmployee && editEmployee.Employee_Role === "maintenance"   ? "selected" : ""}>Maintenance</option>
            </select>
          </label>
          <label>Hourly Pay (leave blank if salaried)
            <input type="number" step="0.01" name="hourly_pay" value="${editEmployee && editEmployee.Hourly_Pay ? editEmployee.Hourly_Pay : ""}">
          </label>
          <label>Salary (leave blank if hourly)
            <input type="number" step="0.01" name="salary" value="${editEmployee && editEmployee.Salary ? editEmployee.Salary : ""}">
          </label>
          <label>Supervisor
            <select name="supervisor_id">
              <option value="">None</option>
              ${employees.filter(e => !editEmployee || e.Employee_ID !== editEmployee.Employee_ID).map((emp) => `
                <option value="${emp.Employee_ID}" ${editEmployee && editEmployee.Supervisor_ID === emp.Employee_ID ? "selected" : ""}>
                  ${escapeHtml(emp.First_Name)} ${escapeHtml(emp.Last_Name)}
                </option>
              `).join("")}
            </select>
          </label>
          <label>Department
            <select name="department_id">
              <option value="">Unassigned</option>
              ${departments.map((dept) => `
                <option value="${dept.Department_ID}" ${editEmployee && editEmployee.Department_ID === dept.Department_ID ? "selected" : ""}>
                  ${escapeHtml(dept.Department_Name)}
                </option>
              `).join("")}
            </select>
          </label>
          <button class="button" type="submit">${editEmployee ? "Save Employee" : "Create Employee"}</button>
        </form>
      </section>
      <section class="card narrow">
        <div id="employee-list"></div>
        <h2>Current Employees</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${employeeRows || '<tr><td colspan="4">No employees found.</td></tr>'}
          </tbody>
        </table>
        ${renderPager(req, "employee_page", employeePagination, "employee-list")}
      </section>
    `,
    }));
  }));

  app.post("/add-employee", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const id = req.body.employee_id || null;
    const {
      first_name: firstName,
      last_name: lastName,
      email,
      date_hired: dateHired,
      dob,
      address,
      role,
      hourly_pay: hourlyPay,
      salary,
      supervisor_id: supervisorId,
      department_id: departmentId,
    } = req.body;

    if (!firstName || !lastName || !dateHired) {
      setFlash(req, "First name, last name, and date hired are required.");
      return res.redirect("/add-employee");
    }

    if (hourlyPay && salary) {
      setFlash(req, "Enter either Hourly Pay or Salary, not both.");
      return res.redirect("/add-employee");
    }

    if (!hourlyPay && !salary) {
      setFlash(req, "You must enter either Hourly Pay or Salary.");
      return res.redirect("/add-employee");
    }

    const params = [
      firstName,
      lastName,
      email || null,
      dateHired,
      dob || null,
      address || null,
      role || "employee",
      hourlyPay || null,
      salary || null,
      supervisorId || null,
      departmentId || null,
    ];

    if (id) {
      await pool.query(
        `UPDATE Employee
         SET First_Name = ?, Last_Name = ?, Email = ?, Date_Hired = ?,
             Date_of_Birth = ?, Employee_Address = ?, Employee_Role = ?,
             Hourly_Pay = ?, Salary = ?, Supervisor_ID = ?, Department_ID = ?
         WHERE Employee_ID = ?`,
        [...params, id]
      );
      setFlash(req, "Employee record updated.");
    } else {
      await pool.query(
        `INSERT INTO Employee
         (First_Name, Last_Name, Email, Date_Hired, Date_of_Birth, Employee_Address,
          Employee_Role, Hourly_Pay, Salary, Supervisor_ID, Department_ID)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params
      );
      setFlash(req, "Employee record created.");
    }

    res.redirect("/add-employee");
  }));

  app.post("/delete-employee", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const idToDelete = req.body.employee_id;

    if (!idToDelete) {
      setFlash(req, "Select an employee record before deleting.");
      return res.redirect("/add-employee");
    }

    await pool.query("DELETE FROM Schedule WHERE Employee_ID = ?", [idToDelete]);
    await pool.query("UPDATE Event SET coordinator_ID = NULL WHERE coordinator_ID = ?", [idToDelete]);
    await pool.query("UPDATE users SET employee_id = NULL WHERE employee_id = ?", [idToDelete]);
    await pool.query("DELETE FROM Gift_Shop_Sale WHERE Employee_ID = ?", [idToDelete]);
    await pool.query("DELETE FROM Food_Sale WHERE Employee_ID = ?", [idToDelete]);
    await pool.query("DELETE FROM Employee WHERE Employee_ID = ?", [idToDelete]);

    setFlash(req, "Employee record deleted.");
    res.redirect("/add-employee");
  }));
}

module.exports = { registerEmployeeRoutes };
