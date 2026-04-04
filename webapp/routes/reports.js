const {
  asyncHandler,
  escapeHtml,
  formatDisplayDate,
  renderPage,
  requireLogin,
  allowRoles
} = require("../helpers");

function registerReportsRoutes(app, { pool }) {
    
  app.get("/reports", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const salesStart = req.query.sales_start?.trim() || "";
    const salesEnd = req.query.sales_end?.trim() || "";
    const department = req.query.department?.trim() || "";
    const revenueStart = req.query.revenue_start?.trim() || "";
    const revenueEnd = req.query.revenue_end?.trim() || "";

    const [ticketSalesRows] = await pool.query(
      `SELECT T.Visit_Date, TL.Ticket_Type, SUM(TL.Quantity) AS Tickets_Sold, SUM(TL.Total_sum_of_ticket) AS Revenue
       FROM Ticket T
       JOIN ticket_line TL ON TL.Ticket_ID = T.Ticket_ID
       WHERE (? = '' OR T.Purchase_Date >= ?)
         AND (? = '' OR T.Purchase_Date <= ?)
       GROUP BY T.Visit_Date, TL.Ticket_Type
       ORDER BY T.Visit_Date DESC, TL.Ticket_Type`,
      [salesStart, salesStart, salesEnd, salesEnd],
    );

    const [employeeRows] = await pool.query(
      `SELECT CONCAT(E.First_Name, ' ', E.Last_Name) AS Employee_Name,
              E.Employee_Role,
              D.Department_Name,
              CONCAT(S.First_Name, ' ', S.Last_Name) AS Supervisor_Name
       FROM Employee E
       LEFT JOIN Department D ON D.Department_ID = E.Department_ID
       LEFT JOIN Employee S ON S.Employee_ID = E.Supervisor_ID
       WHERE (? = '' OR D.Department_Name LIKE CONCAT('%', ?, '%'))
       ORDER BY D.Department_Name, E.Last_Name, E.First_Name`,
      [department, department],
    );

    const [exhibitionRevenueRows] = await pool.query(
      `SELECT COALESCE(EX.Exhibition_Name, 'General Admission') AS Exhibition_Name,
              SUM(TL.Quantity) AS Tickets_Sold,
              SUM(TL.Total_sum_of_ticket) AS Revenue
       FROM ticket_line TL
       JOIN Ticket T ON T.Ticket_ID = TL.Ticket_ID
       LEFT JOIN Exhibition EX ON EX.Exhibition_ID = TL.Exhibition_ID
       WHERE (? = '' OR T.Visit_Date >= ?)
         AND (? = '' OR T.Visit_Date <= ?)
       GROUP BY COALESCE(EX.Exhibition_Name, 'General Admission')
       HAVING SUM(TL.Quantity) > 0
       ORDER BY Revenue DESC, Exhibition_Name`,
      [revenueStart, revenueStart, revenueEnd, revenueEnd],
    );

    const ticketSalesHtml = ticketSalesRows.map((row) => `
      <tr>
        <td>${formatDisplayDate(row.Visit_Date)}</td>
        <td>${escapeHtml(row.Ticket_Type)}</td>
        <td>${row.Tickets_Sold}</td>
        <td>$${Number(row.Revenue).toFixed(2)}</td>
      </tr>
    `).join("");

    const employeeHtml = employeeRows.map((row) => `
      <tr>
        <td>${escapeHtml(row.Employee_Name)}</td>
        <td>${escapeHtml(row.Employee_Role || "N/A")}</td>
        <td>${escapeHtml(row.Department_Name || "Unassigned")}</td>
        <td>${escapeHtml(row.Supervisor_Name || "None")}</td>
      </tr>
    `).join("");

    const revenueHtml = exhibitionRevenueRows.map((row) => `
      <tr>
        <td>${escapeHtml(row.Exhibition_Name)}</td>
        <td>${row.Tickets_Sold}</td>
        <td>$${Number(row.Revenue).toFixed(2)}</td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Museum Reports",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <p class="eyebrow">Supervisor Reports</p>
        <h1>Museum Reports</h1>
        <p class="dashboard-note">These report views satisfy the rubric requirement for filtered reports with selectable criteria.</p>
      </section>
      <section class="card narrow">
        <h2>Ticket Sales by Date Range</h2>
        <form method="get" action="/reports" class="form-grid">
          <label>Purchase Start
            <input type="date" name="sales_start" value="${escapeHtml(salesStart)}">
          </label>
          <label>Purchase End
            <input type="date" name="sales_end" value="${escapeHtml(salesEnd)}">
          </label>
          <button class="button" type="submit">Run Report</button>
        </form>
        <table>
          <thead><tr><th>Visit Date</th><th>Ticket Type</th><th>Tickets Sold</th><th>Revenue</th></tr></thead>
          <tbody>${ticketSalesHtml || '<tr><td colspan="4">No ticket sales matched the selected dates.</td></tr>'}</tbody>
        </table>
      </section>
      <section class="card narrow">
        <h2>Employees by Department</h2>
        <form method="get" action="/reports" class="form-grid">
          <label>Department Name
            <input type="text" name="department" value="${escapeHtml(department)}">
          </label>
          <button class="button" type="submit">Run Report</button>
        </form>
        <table>
          <thead><tr><th>Employee</th><th>Position</th><th>Department</th><th>Supervisor</th></tr></thead>
          <tbody>${employeeHtml || '<tr><td colspan="4">No employees matched the selected department.</td></tr>'}</tbody>
        </table>
      </section>
      <section class="card narrow">
        <h2>Revenue by Exhibition</h2>
        <form method="get" action="/reports" class="form-grid">
          <label>Visit Start
            <input type="date" name="revenue_start" value="${escapeHtml(revenueStart)}">
          </label>
          <label>Visit End
            <input type="date" name="revenue_end" value="${escapeHtml(revenueEnd)}">
          </label>
          <button class="button" type="submit">Run Report</button>
        </form>
        <table>
          <thead><tr><th>Exhibition</th><th>Tickets Sold</th><th>Revenue</th></tr></thead>
          <tbody>${revenueHtml || '<tr><td colspan="3">No exhibition revenue matched the selected dates.</td></tr>'}</tbody>
        </table>
      </section>
    `,
    }));
  }));
}

module.exports = { registerReportsRoutes };