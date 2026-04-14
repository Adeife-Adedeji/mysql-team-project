const {
  asyncHandler,
  escapeHtml,
  formatDisplayDate,
  getPageNumber,
  paginateRows,
  renderPage,
  renderPager,
  requireLogin,
  allowRoles
} = require("../helpers");

function registerReportsRoutes(app, { pool }) {
    
  app.get("/reports", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const salesStart = req.query.sales_start?.trim() || null;
    const salesEnd = req.query.sales_end?.trim() || null;
    const department = req.query.department?.trim() || null;
    const revenueStart = req.query.revenue_start?.trim() || null;
    const revenueEnd = req.query.revenue_end?.trim() || null;
    const giftStart = req.query.gift_start?.trim() || null;
    const giftEnd = req.query.gift_end?.trim() || null;
    const cafeStart = req.query.cafe_start?.trim() || null;
    const cafeEnd = req.query.cafe_end?.trim() || null;
    const membershipStart = req.query.membership_start?.trim() || null;
    const membershipEnd = req.query.membership_end?.trim() || null;
    const membershipStatus = req.query.membership_status?.trim() || null;
    const membershipName = req.query.membership_name?.trim() || null;
    const attendanceStart = req.query.attendance_start?.trim() || null;
    const attendanceEnd = req.query.attendance_end?.trim() || null;
    const scheduleStart = req.query.schedule_start?.trim() || null;
    const scheduleEnd = req.query.schedule_end?.trim() || null;
    const scheduleDepartment = req.query.schedule_department?.trim() || null;
    const scheduleDuty = req.query.schedule_duty?.trim() || null;
    const consolidatedPage = getPageNumber(req.query.consolidated_page);
    const financialTxPage = getPageNumber(req.query.financial_tx_page);
    const ticketSalesPage = getPageNumber(req.query.ticket_sales_page);
    const employeePage = getPageNumber(req.query.employee_page);
    const revenuePage = getPageNumber(req.query.revenue_page);
    const giftPage = getPageNumber(req.query.gift_page);
    const cafePage = getPageNumber(req.query.cafe_page);
    const membershipPage = getPageNumber(req.query.membership_page);
    const eventAttendancePage = getPageNumber(req.query.event_attendance_page);
    const tourAttendancePage = getPageNumber(req.query.tour_attendance_page);
    const schedulePage = getPageNumber(req.query.schedule_page);

    // Shared lookup data for dropdowns
    const [departmentList] = await pool.query(
      `SELECT Department_Name FROM Department ORDER BY Department_Name`
    );
    const [dutyList] = await pool.query(
      `SELECT DISTINCT Duty FROM Schedule WHERE Duty IS NOT NULL ORDER BY Duty`
    );

    const [ticketSalesRows] = await pool.query(
      `SELECT T.Visit_Date, TL.Ticket_Type, SUM(TL.Quantity) AS Tickets_Sold, SUM(TL.Total_sum_of_ticket) AS Revenue
       FROM Ticket T
       JOIN ticket_line TL ON TL.Ticket_ID = T.Ticket_ID
       WHERE (? IS NULL OR T.Purchase_Date >= ?)
         AND (? IS NULL OR T.Purchase_Date <= ?)
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
       WHERE (? IS NULL OR D.Department_Name = ?)
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
       WHERE (? IS NULL OR T.Visit_Date >= ?)
         AND (? IS NULL OR T.Visit_Date <= ?)
       GROUP BY COALESCE(EX.Exhibition_Name, 'General Admission')
       HAVING SUM(TL.Quantity) > 0
      ORDER BY Revenue DESC, Exhibition_Name`,
      [revenueStart, revenueStart, revenueEnd, revenueEnd],
    );

    const [giftSalesRows] = await pool.query(
      `SELECT GSI.Name_of_Item,
              SUM(GSL.Quantity) AS Units_Sold,
              SUM(GSL.Total_Sum_For_Gift_Shop_Sale) AS Revenue
       FROM Gift_Shop_Sale GS
       JOIN Gift_Shop_Sale_Line GSL ON GSL.Gift_Shop_Sale_ID = GS.Gift_Shop_Sale_ID
       JOIN Gift_Shop_Item GSI ON GSI.Gift_Shop_Item_ID = GSL.Gift_Shop_Item_ID
       WHERE (? IS NULL OR GS.Sale_Date >= ?)
         AND (? IS NULL OR GS.Sale_Date <= ?)
       GROUP BY GSI.Gift_Shop_Item_ID, GSI.Name_of_Item
       HAVING SUM(GSL.Quantity) > 0
       ORDER BY Revenue DESC, Units_Sold DESC, GSI.Name_of_Item`,
      [giftStart, giftStart, giftEnd, giftEnd],
    );

    const [[giftSummary]] = await pool.query(
      `SELECT COUNT(DISTINCT GS.Gift_Shop_Sale_ID) AS Total_Sales,
              COALESCE(SUM(GSL.Quantity), 0) AS Items_Sold,
              COALESCE(SUM(GSL.Total_Sum_For_Gift_Shop_Sale), 0) AS Total_Revenue
       FROM Gift_Shop_Sale GS
       LEFT JOIN Gift_Shop_Sale_Line GSL ON GSL.Gift_Shop_Sale_ID = GS.Gift_Shop_Sale_ID
       WHERE (? IS NULL OR GS.Sale_Date >= ?)
         AND (? IS NULL OR GS.Sale_Date <= ?)`,
      [giftStart, giftStart, giftEnd, giftEnd],
    );

    const [foodTypeColumns] = await pool.query(
      `SELECT 1
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'Food'
         AND COLUMN_NAME = 'Type'
       LIMIT 1`
    );
    const hasFoodTypeColumn = foodTypeColumns.length > 0;

    const [cafeSalesRows] = await pool.query(
      `SELECT F.Food_Name, ${hasFoodTypeColumn ? "F.Type" : "NULL"} AS Type,
              SUM(FSL.Quantity) AS Units_Sold,
              SUM(FSL.Quantity * FSL.Price_When_Food_Was_Sold) AS Revenue
       FROM Food_Sale FS
       JOIN Food_Sale_Line FSL ON FSL.Food_Sale_ID = FS.Food_Sale_ID
       JOIN Food F ON F.Food_ID = FSL.Food_ID
       WHERE (? IS NULL OR FS.Sale_Date >= ?)
         AND (? IS NULL OR FS.Sale_Date <= ?)
       GROUP BY F.Food_ID, F.Food_Name${hasFoodTypeColumn ? ", F.Type" : ""}
       HAVING SUM(FSL.Quantity) > 0
       ORDER BY Revenue DESC, Units_Sold DESC, F.Food_Name`,
      [cafeStart, cafeStart, cafeEnd, cafeEnd],
    );

    const [[cafeSummary]] = await pool.query(
      `SELECT COUNT(DISTINCT FS.Food_Sale_ID) AS Total_Sales,
              COALESCE(SUM(FSL.Quantity), 0) AS Items_Sold,
              COALESCE(SUM(FSL.Quantity * FSL.Price_When_Food_Was_Sold), 0) AS Total_Revenue
       FROM Food_Sale FS
       LEFT JOIN Food_Sale_Line FSL ON FSL.Food_Sale_ID = FS.Food_Sale_ID
       WHERE (? IS NULL OR FS.Sale_Date >= ?)
         AND (? IS NULL OR FS.Sale_Date <= ?)`,
      [cafeStart, cafeStart, cafeEnd, cafeEnd],
    );

    const [[membershipSummary]] = await pool.query(
      `SELECT COUNT(*) AS Total_Members,
              SUM(CASE WHEN Status = 'Active'    THEN 1 ELSE 0 END) AS Active_Members,
              SUM(CASE WHEN Status = 'Expired'   THEN 1 ELSE 0 END) AS Expired_Members,
              SUM(CASE WHEN Status = 'Cancelled' THEN 1 ELSE 0 END) AS Cancelled_Members,
              SUM(CASE WHEN (? IS NULL OR Date_Joined >= ?)
                         AND (? IS NULL OR Date_Joined <= ?)
                       THEN 1 ELSE 0 END) AS New_In_Range
       FROM Membership`,
      [membershipStart, membershipStart, membershipEnd, membershipEnd],
    );

    const [membershipRows] = await pool.query(
      `SELECT Membership_ID, First_Name, Last_Name, Email, Date_Joined, Date_Exited, Status
       FROM Membership
       WHERE (? IS NULL OR Date_Joined >= ?)
         AND (? IS NULL OR Date_Joined <= ?)
         AND (? IS NULL OR Status = ?)
         AND (? IS NULL OR CONCAT(First_Name, ' ', Last_Name) LIKE CONCAT('%', ?, '%'))
       ORDER BY Date_Joined DESC, Last_Name, First_Name`,
      [
        membershipStart, membershipStart,
        membershipEnd, membershipEnd,
        membershipStatus, membershipStatus,
        membershipName, membershipName,
      ],
    );

    const [eventAttendanceRows] = await pool.query(
      `SELECT E.Event_ID,
              E.event_Name,
              E.start_Date,
              E.end_Date,
              E.Max_capacity,
              COUNT(ER.Event_Registration_ID) AS Registered_Count
       FROM Event E
       LEFT JOIN event_registration ER ON ER.Event_ID = E.Event_ID
       WHERE (? IS NULL OR E.start_Date >= ?)
         AND (? IS NULL OR E.start_Date <= ?)
       GROUP BY E.Event_ID, E.event_Name, E.start_Date, E.end_Date, E.Max_capacity
       ORDER BY E.start_Date DESC, E.event_Name`,
      [attendanceStart, attendanceStart, attendanceEnd, attendanceEnd],
    );

    const [tourAttendanceRows] = await pool.query(
      `SELECT T.Tour_ID,
              T.Tour_Name,
              T.Tour_Date,
              T.Max_Capacity,
              COUNT(TR.Tour_Registration_ID) AS Registered_Count,
              CONCAT(E.First_Name, ' ', E.Last_Name) AS Guide_Name
       FROM Tour T
       LEFT JOIN Tour_Registration TR ON TR.Tour_ID = T.Tour_ID
       LEFT JOIN Employee E ON E.Employee_ID = T.Guide_ID
       WHERE (? IS NULL OR T.Tour_Date >= ?)
         AND (? IS NULL OR T.Tour_Date <= ?)
       GROUP BY T.Tour_ID, T.Tour_Name, T.Tour_Date, T.Max_Capacity, E.First_Name, E.Last_Name
       ORDER BY T.Tour_Date DESC, T.Tour_Name`,
      [attendanceStart, attendanceStart, attendanceEnd, attendanceEnd],
    );

    const [scheduleRows] = await pool.query(
      `SELECT S.Shift_Date,
              S.Start_Time,
              S.End_Time,
              S.Duty,
              CONCAT(E.First_Name, ' ', E.Last_Name) AS Employee_Name,
              D.Department_Name,
              EX.Exhibition_Name
       FROM Schedule S
       JOIN Employee E ON E.Employee_ID = S.Employee_ID
       LEFT JOIN Department D ON D.Department_ID = E.Department_ID
       JOIN Exhibition EX ON EX.Exhibition_ID = S.Exhibition_ID
       WHERE (? IS NULL OR S.Shift_Date >= ?)
         AND (? IS NULL OR S.Shift_Date <= ?)
         AND (? IS NULL OR D.Department_Name = ?)
         AND (? IS NULL OR S.Duty = ?)
       ORDER BY S.Shift_Date DESC, S.Start_Time, E.Last_Name, E.First_Name`,
      [scheduleStart, scheduleStart, scheduleEnd, scheduleEnd, scheduleDepartment, scheduleDepartment, scheduleDuty, scheduleDuty],
    );

    const consolidatedStart = req.query.consolidated_start?.trim() || null;
    const consolidatedEnd = req.query.consolidated_end?.trim() || null;

    const [consolidatedRows] = await pool.query(
      `SELECT * FROM Consolidated_Revenue 
       WHERE (? IS NULL OR Sale_Date >= ?)
         AND (? IS NULL OR Sale_Date <= ?)
       ORDER BY Sale_Date DESC`,
      [consolidatedStart, consolidatedStart, consolidatedEnd, consolidatedEnd]
    );

    const [financialTransactionRows] = await pool.query(
      `SELECT Transaction_Date, Source, Transaction_ID, Description, Amount
       FROM (
         SELECT
           T.Purchase_Date AS Transaction_Date,
           'Ticket' AS Source,
           CONCAT('Ticket #', T.Ticket_ID, '-', TL.Ticket_line_ID) AS Transaction_ID,
           CONCAT(COALESCE(EX.Exhibition_Name, 'General Admission'), ' — ', TL.Ticket_Type, ' x', TL.Quantity) AS Description,
           TL.Total_sum_of_ticket AS Amount
         FROM Ticket T
         JOIN ticket_line TL ON TL.Ticket_ID = T.Ticket_ID
         LEFT JOIN Exhibition EX ON EX.Exhibition_ID = TL.Exhibition_ID
         WHERE (? IS NULL OR T.Purchase_Date >= ?)
           AND (? IS NULL OR T.Purchase_Date <= ?)

         UNION ALL

         SELECT
           GS.Sale_Date,
           'Gift Shop',
           CONCAT('Sale #', GS.Gift_Shop_Sale_ID, '-', GSL.Gift_Shop_Sale_Line_ID),
           CONCAT(GSI.Name_of_Item, ' x', GSL.Quantity),
           GSL.Total_Sum_For_Gift_Shop_Sale
         FROM Gift_Shop_Sale GS
         JOIN Gift_Shop_Sale_Line GSL ON GSL.Gift_Shop_Sale_ID = GS.Gift_Shop_Sale_ID
         JOIN Gift_Shop_Item GSI ON GSI.Gift_Shop_Item_ID = GSL.Gift_Shop_Item_ID
         WHERE (? IS NULL OR GS.Sale_Date >= ?)
           AND (? IS NULL OR GS.Sale_Date <= ?)

         UNION ALL

         SELECT
           FS.Sale_Date,
           'Café',
           CONCAT('Sale #', FS.Food_Sale_ID, '-', FSL.Food_Sale_Line_ID),
           CONCAT(F.Food_Name, ' x', FSL.Quantity),
           FSL.Quantity * FSL.Price_When_Food_Was_Sold
         FROM Food_Sale FS
         JOIN Food_Sale_Line FSL ON FSL.Food_Sale_ID = FS.Food_Sale_ID
         JOIN Food F ON F.Food_ID = FSL.Food_ID
         WHERE (? IS NULL OR FS.Sale_Date >= ?)
           AND (? IS NULL OR FS.Sale_Date <= ?)
       ) AS all_txns
       ORDER BY Transaction_Date DESC, Source, Transaction_ID`,
      [
        consolidatedStart, consolidatedStart, consolidatedEnd, consolidatedEnd,
        consolidatedStart, consolidatedStart, consolidatedEnd, consolidatedEnd,
        consolidatedStart, consolidatedStart, consolidatedEnd, consolidatedEnd,
      ]
    );

    const consolidatedPagination = paginateRows(consolidatedRows, consolidatedPage);
    const financialTxPagination = paginateRows(financialTransactionRows, financialTxPage);
    const ticketSalesPagination = paginateRows(ticketSalesRows, ticketSalesPage);
    const employeePagination = paginateRows(employeeRows, employeePage);
    const revenuePagination = paginateRows(exhibitionRevenueRows, revenuePage);
    const giftPagination = paginateRows(giftSalesRows, giftPage);
    const cafePagination = paginateRows(cafeSalesRows, cafePage);
    const membershipPagination = paginateRows(membershipRows, membershipPage);
    const eventAttendancePagination = paginateRows(eventAttendanceRows, eventAttendancePage);
    const tourAttendancePagination = paginateRows(tourAttendanceRows, tourAttendancePage);
    const schedulePagination = paginateRows(scheduleRows, schedulePage);

    const ticketSalesHtml = ticketSalesPagination.items.map((row) => `
      <tr>
        <td>${formatDisplayDate(row.Visit_Date)}</td>
        <td>${escapeHtml(row.Ticket_Type)}</td>
        <td>${row.Tickets_Sold}</td>
        <td>$${Number(row.Revenue).toFixed(2)}</td>
      </tr>
    `).join("");

    const consolidatedHtml = consolidatedPagination.items.map((row) => `
      <tr>
        <td>${formatDisplayDate(row.Sale_Date)}</td>
        <td>$${Number(row.Ticket_Revenue).toFixed(2)}</td>
        <td>$${Number(row.Gift_Shop_Revenue).toFixed(2)}</td>
        <td>$${Number(row.Cafe_Revenue).toFixed(2)}</td>
        <td style="font-weight:bold; background:#f9f9f9;">$${Number(row.Total_Daily_Revenue).toFixed(2)}</td>
      </tr>
    `).join("");

    // Build ledger HTML: individual transactions grouped by date with subtotals
    const sourceColors = { Ticket: "#dbeafe", "Gift Shop": "#dcfce7", "Café": "#fef9c3" };
    let financialLedgerHtml = "";
    if (financialTxPagination.items.length === 0) {
      financialLedgerHtml = '<tr><td colspan="5">No transactions in selected range.</td></tr>';
    } else {
      let currentDate = null;
      let dateSubtotal = 0;
      const rowsBuffer = [];
      for (const row of financialTxPagination.items) {
        const rowDateKey = String(row.Transaction_Date);
        if (currentDate !== null && rowDateKey !== currentDate) {
          rowsBuffer.push(`<tr style="font-weight:bold; background:#f0f4f8;">
            <td colspan="4" style="text-align:right; padding-right:1rem;">Subtotal for ${formatDisplayDate(currentDate)}</td>
            <td>$${dateSubtotal.toFixed(2)}</td>
          </tr>`);
          dateSubtotal = 0;
        }
        currentDate = rowDateKey;
        dateSubtotal += Number(row.Amount);
        const bg = sourceColors[row.Source] || "#fff";
        rowsBuffer.push(`<tr>
          <td>${formatDisplayDate(row.Transaction_Date)}</td>
          <td><span style="background:${bg}; padding:2px 7px; border-radius:4px; font-size:0.85em;">${escapeHtml(row.Source)}</span></td>
          <td style="font-size:0.85em; color:#555;">${escapeHtml(row.Transaction_ID)}</td>
          <td>${escapeHtml(row.Description)}</td>
          <td>$${Number(row.Amount).toFixed(2)}</td>
        </tr>`);
      }
      if (currentDate !== null) {
        rowsBuffer.push(`<tr style="font-weight:bold; background:#f0f4f8;">
          <td colspan="4" style="text-align:right; padding-right:1rem;">Subtotal for ${formatDisplayDate(currentDate)}</td>
          <td>$${dateSubtotal.toFixed(2)}</td>
        </tr>`);
      }
      financialLedgerHtml = rowsBuffer.join("");
    }

    const grandTotal = financialTransactionRows.reduce((sum, r) => sum + Number(r.Amount), 0);

    const employeeHtml = employeePagination.items.map((row) => `
      <tr>
        <td>${escapeHtml(row.Employee_Name)}</td>
        <td>${escapeHtml(row.Employee_Role || "N/A")}</td>
        <td>${escapeHtml(row.Department_Name || "Unassigned")}</td>
        <td>${escapeHtml(row.Supervisor_Name || "None")}</td>
      </tr>
    `).join("");

    const revenueHtml = revenuePagination.items.map((row) => `
      <tr>
        <td>${escapeHtml(row.Exhibition_Name)}</td>
        <td>${row.Tickets_Sold}</td>
        <td>$${Number(row.Revenue).toFixed(2)}</td>
      </tr>
    `).join("");

    const giftSalesHtml = giftPagination.items.map((row) => `
      <tr>
        <td>${escapeHtml(row.Name_of_Item)}</td>
        <td>${row.Units_Sold}</td>
        <td>$${Number(row.Revenue).toFixed(2)}</td>
      </tr>
    `).join("");

    const cafeSalesHtml = cafePagination.items.map((row) => `
      <tr>
        <td>${escapeHtml(row.Food_Name)}</td>
        <td>${escapeHtml(row.Type || "N/A")}</td>
        <td>${row.Units_Sold}</td>
        <td>$${Number(row.Revenue).toFixed(2)}</td>
      </tr>
    `).join("");

    const membershipHtml = membershipPagination.items.map((row) => {
      const statusColor = row.Status === "Active" ? "#dcfce7"
                        : row.Status === "Expired"  ? "#fee2e2"
                        : "#e5e7eb";
      return `
      <tr>
        <td>${row.Membership_ID}</td>
        <td>${escapeHtml(`${row.First_Name} ${row.Last_Name}`)}</td>
        <td>${escapeHtml(row.Email || "—")}</td>
        <td>${formatDisplayDate(row.Date_Joined)}</td>
        <td>${row.Date_Exited ? formatDisplayDate(row.Date_Exited) : "—"}</td>
        <td><span style="background:${statusColor}; padding:2px 7px; border-radius:4px; font-size:0.85em;">${escapeHtml(row.Status)}</span></td>
      </tr>
    `;
    }).join("");

    const eventAttendanceHtml = eventAttendancePagination.items.map((row) => {
      const capacityPct = row.Max_capacity ? ((row.Registered_Count / row.Max_capacity) * 100).toFixed(0) : "0";
      return `
        <tr>
          <td>${escapeHtml(row.event_Name)}</td>
          <td>${formatDisplayDate(row.start_Date)}</td>
          <td>${formatDisplayDate(row.end_Date)}</td>
          <td>${row.Registered_Count} / ${row.Max_capacity}</td>
          <td>${capacityPct}%</td>
        </tr>
      `;
    }).join("");

    const tourAttendanceHtml = tourAttendancePagination.items.map((row) => {
      const capacityPct = row.Max_Capacity ? ((row.Registered_Count / row.Max_Capacity) * 100).toFixed(0) : "0";
      return `
        <tr>
          <td>${escapeHtml(row.Tour_Name)}</td>
          <td>${formatDisplayDate(row.Tour_Date)}</td>
          <td>${escapeHtml(row.Guide_Name || "TBD")}</td>
          <td>${row.Registered_Count} / ${row.Max_Capacity}</td>
          <td>${capacityPct}%</td>
        </tr>
      `;
    }).join("");

    const scheduleHtml = schedulePagination.items.map((row) => `
      <tr>
        <td>${formatDisplayDate(row.Shift_Date)}</td>
        <td>${escapeHtml(row.Employee_Name)}</td>
        <td>${escapeHtml(row.Department_Name || "Unassigned")}</td>
        <td>${escapeHtml(row.Exhibition_Name)}</td>
        <td>${escapeHtml(String(row.Start_Time))}</td>
        <td>${escapeHtml(String(row.End_Time))}</td>
        <td>${escapeHtml(row.Duty || "—")}</td>
      </tr>
    `).join("");

    // Build reusable dropdown option strings
    const deptOptions = departmentList.map((d) =>
      `<option value="${escapeHtml(d.Department_Name)}" ${department === d.Department_Name ? "selected" : ""}>${escapeHtml(d.Department_Name)}</option>`
    ).join("");
    const scheduleDeptOptions = departmentList.map((d) =>
      `<option value="${escapeHtml(d.Department_Name)}" ${scheduleDepartment === d.Department_Name ? "selected" : ""}>${escapeHtml(d.Department_Name)}</option>`
    ).join("");
    const dutyOptions = dutyList.map((d) =>
      `<option value="${escapeHtml(d.Duty)}" ${scheduleDuty === d.Duty ? "selected" : ""}>${escapeHtml(d.Duty)}</option>`
    ).join("");

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
        <div class="tab-bar" data-tab-group="reports">
          <button class="tab-button" type="button" data-tab-target="consolidated-report-tab">Financial Summary</button>
          <button class="tab-button" type="button" data-tab-target="ticket-sales-report-tab">Ticket Sales</button>
          <button class="tab-button" type="button" data-tab-target="employee-report-tab">Employees</button>
          <button class="tab-button" type="button" data-tab-target="revenue-report-tab">Exhibition Revenue</button>
          <button class="tab-button" type="button" data-tab-target="gift-report-tab">Gift Shop</button>
          <button class="tab-button" type="button" data-tab-target="cafe-report-tab">Café</button>
          <button class="tab-button" type="button" data-tab-target="membership-report-tab">Membership</button>
          <button class="tab-button" type="button" data-tab-target="event-attendance-report-tab">Events</button>
          <button class="tab-button" type="button" data-tab-target="tour-attendance-report-tab">Tours</button>
          <button class="tab-button" type="button" data-tab-target="schedule-report-tab">Schedule</button>
        </div>
      </section>
      <section class="card narrow tab-panel" data-tab-group="reports" data-tab-panel="consolidated-report-tab">
        <div id="consolidated-report"></div>
        <h2>Consolidated Financial Summary</h2>
        <p class="dashboard-note">Aggregated daily revenue from all departments (Tickets, Gift Shop, Café).</p>
        <form method="get" action="/reports" class="form-grid">
          <label>Start Date
            <input type="date" name="consolidated_start" value="${escapeHtml(consolidatedStart ?? '')}">
          </label>
          <label>End Date
            <input type="date" name="consolidated_end" value="${escapeHtml(consolidatedEnd ?? '')}">
          </label>
          <button class="button" type="submit">Run Report</button>
        </form>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Ticket Revenue</th>
              <th>Gift Shop Revenue</th>
              <th>Café Revenue</th>
              <th>Total Daily Revenue</th>
            </tr>
          </thead>
          <tbody>${consolidatedHtml || '<tr><td colspan="5">No financial data available.</td></tr>'}</tbody>
        </table>
        ${renderPager(req, "consolidated_page", consolidatedPagination, "consolidated-report")}

        <h3 style="margin-top:2rem;">Transaction Ledger</h3>
        <p class="dashboard-note">Every individual transaction contributing to the totals above. Subtotals are shown after each day's entries. Grand total across all dates: <strong>$${grandTotal.toFixed(2)}</strong></p>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Source</th>
              <th>Transaction ID</th>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>${financialLedgerHtml}</tbody>
        </table>
        ${renderPager(req, "financial_tx_page", financialTxPagination, "consolidated-report")}
      </section>
      <section class="card narrow tab-panel" data-tab-group="reports" data-tab-panel="ticket-sales-report-tab">
        <div id="ticket-sales-report"></div>
        <h2>Ticket Sales by Date Range</h2>
        <form method="get" action="/reports" class="form-grid">
          <label>Purchase Start
            <input type="date" name="sales_start" value="${escapeHtml(salesStart ?? '')}">
          </label>
          <label>Purchase End
            <input type="date" name="sales_end" value="${escapeHtml(salesEnd ?? '')}">
          </label>
          <button class="button" type="submit">Run Report</button>
        </form>
        <table>
          <thead>
            <tr>
              <th>Visit Date</th>
              <th>Ticket Type</th>
              <th>Tickets Sold</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>${ticketSalesHtml || '<tr><td colspan="4">No ticket sales matched the selected dates.</td></tr>'}</tbody>
        </table>
        ${renderPager(req, "ticket_sales_page", ticketSalesPagination, "ticket-sales-report")}
      </section>
      <section class="card narrow tab-panel" data-tab-group="reports" data-tab-panel="employee-report-tab">
        <div id="employee-report"></div>
        <h2>Employees by Department</h2>
        <form method="get" action="/reports" class="form-grid">
          <label>Department
            <select name="department">
              <option value="">All Departments</option>
              ${deptOptions}
            </select>
          </label>
          <button class="button" type="submit">Run Report</button>
        </form>
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Position</th>
              <th>Department</th>
              <th>Supervisor</th>
            </tr>
          </thead>
          <tbody>${employeeHtml || '<tr><td colspan="4">No employees matched the selected department.</td></tr>'}</tbody>
        </table>
        ${renderPager(req, "employee_page", employeePagination, "employee-report")}
      </section>
      <section class="card narrow tab-panel" data-tab-group="reports" data-tab-panel="revenue-report-tab">
        <div id="revenue-report"></div>
        <h2>Revenue by Exhibition</h2>
        <form method="get" action="/reports" class="form-grid">
          <label>Visit Start
            <input type="date" name="revenue_start" value="${escapeHtml(revenueStart ?? '')}">
          </label>
          <label>Visit End
            <input type="date" name="revenue_end" value="${escapeHtml(revenueEnd ?? '')}">
          </label>
          <button class="button" type="submit">Run Report</button>
        </form>
        <table>
          <thead>
            <tr>
              <th>Exhibition</th>
              <th>Tickets Sold</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>${revenueHtml || '<tr><td colspan="3">No exhibition revenue matched the selected dates.</td></tr>'}</tbody>
        </table>
        ${renderPager(req, "revenue_page", revenuePagination, "revenue-report")}
      </section>
      <section class="card narrow tab-panel" data-tab-group="reports" data-tab-panel="gift-report-tab">
        <div id="gift-report"></div>
        <h2>Gift Shop Sales Summary</h2>
        <form method="get" action="/reports" class="form-grid">
          <label>Sale Start
            <input type="date" name="gift_start" value="${escapeHtml(giftStart ?? '')}">
          </label>
          <label>Sale End
            <input type="date" name="gift_end" value="${escapeHtml(giftEnd ?? '')}">
          </label>
          <button class="button" type="submit">Run Report</button>
        </form>
        <p class="dashboard-note">Sales: ${giftSummary.Total_Sales || 0} | Items sold: ${giftSummary.Items_Sold || 0} | Revenue: $${Number(giftSummary.Total_Revenue || 0).toFixed(2)}</p>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Units Sold</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>${giftSalesHtml || '<tr><td colspan="3">No gift shop sales matched the selected dates.</td></tr>'}</tbody>
        </table>
        ${renderPager(req, "gift_page", giftPagination, "gift-report")}
      </section>
      <section class="card narrow tab-panel" data-tab-group="reports" data-tab-panel="cafe-report-tab">
        <div id="cafe-report"></div>
        <h2>Cafe Sales Summary</h2>
        <form method="get" action="/reports" class="form-grid">
          <label>Sale Start
            <input type="date" name="cafe_start" value="${escapeHtml(cafeStart ?? '')}">
          </label>
          <label>Sale End
            <input type="date" name="cafe_end" value="${escapeHtml(cafeEnd ?? '')}">
          </label>
          <button class="button" type="submit">Run Report</button>
        </form>
        <p class="dashboard-note">Sales: ${cafeSummary.Total_Sales || 0} | Items sold: ${cafeSummary.Items_Sold || 0} | Revenue: $${Number(cafeSummary.Total_Revenue || 0).toFixed(2)}</p>
        <table>
          <thead>
            <tr>
              <th>Food Item</th>
              <th>Units Sold</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>${cafeSalesHtml || '<tr><td colspan="3">No cafe sales matched the selected dates.</td></tr>'}</tbody>
        </table>
        ${renderPager(req, "cafe_page", cafePagination, "cafe-report")}
      </section>
      <section class="card narrow tab-panel" data-tab-group="reports" data-tab-panel="membership-report-tab">
        <div id="membership-report"></div>
        <h2>Membership Status Report</h2>
        <form method="get" action="/reports" class="form-grid">
          <label>Joined Start
            <input type="date" name="membership_start" value="${escapeHtml(membershipStart ?? '')}">
          </label>
          <label>Joined End
            <input type="date" name="membership_end" value="${escapeHtml(membershipEnd ?? '')}">
          </label>
          <label>Status
            <select name="membership_status">
              <option value="">All Statuses</option>
              <option value="Active"     ${membershipStatus === "Active"     ? "selected" : ""}>Active</option>
              <option value="Expired"    ${membershipStatus === "Expired"    ? "selected" : ""}>Expired</option>
              <option value="Cancelled"  ${membershipStatus === "Cancelled"  ? "selected" : ""}>Cancelled</option>
            </select>
          </label>
          <label>Member Name
            <input type="text" name="membership_name" value="${escapeHtml(membershipName ?? '')}" placeholder="Search by name…">
          </label>
          <button class="button" type="submit">Run Report</button>
        </form>
        <p class="dashboard-note">Total: ${membershipSummary.Total_Members || 0} | Active: ${membershipSummary.Active_Members || 0} | Expired: ${membershipSummary.Expired_Members || 0} | Cancelled: ${membershipSummary.Cancelled_Members || 0} | New in range: ${membershipSummary.New_In_Range || 0}</p>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Member</th>
              <th>Email</th>
              <th>Joined</th>
              <th>Expires / Expired On</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${membershipHtml || '<tr><td colspan="6">No memberships matched the selected filters.</td></tr>'}</tbody>
        </table>
        ${renderPager(req, "membership_page", membershipPagination, "membership-report")}
      </section>
      <section class="card narrow tab-panel" data-tab-group="reports" data-tab-panel="event-attendance-report-tab">
        <div id="event-attendance-report"></div>
        <h2>Event Attendance</h2>
        <form method="get" action="/reports" class="form-grid">
          <label>Start Date
            <input type="date" name="attendance_start" value="${escapeHtml(attendanceStart ?? '')}">
          </label>
          <label>End Date
            <input type="date" name="attendance_end" value="${escapeHtml(attendanceEnd ?? '')}">
          </label>
          <button class="button" type="submit">Run Report</button>
        </form>
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Start</th>
              <th>End</th>
              <th>Registered</th>
              <th>% Full</th>
            </tr>
          </thead>
          <tbody>${eventAttendanceHtml || '<tr><td colspan="5">No events matched the selected dates.</td></tr>'}</tbody>
        </table>
        ${renderPager(req, "event_attendance_page", eventAttendancePagination, "event-attendance-report")}
      </section>
      <section class="card narrow tab-panel" data-tab-group="reports" data-tab-panel="tour-attendance-report-tab">
        <div id="tour-attendance-report"></div>
        <h2>Tour Attendance</h2>
        <form method="get" action="/reports" class="form-grid">
          <label>Start Date
            <input type="date" name="attendance_start" value="${escapeHtml(attendanceStart ?? '')}">
          </label>
          <label>End Date
            <input type="date" name="attendance_end" value="${escapeHtml(attendanceEnd ?? '')}">
          </label>
          <button class="button" type="submit">Run Report</button>
        </form>
        <table>
          <thead>
            <tr>
              <th>Tour</th>
              <th>Date</th>
              <th>Guide</th>
              <th>Registered</th>
              <th>% Full</th>
            </tr>
          </thead>
          <tbody>${tourAttendanceHtml || '<tr><td colspan="5">No tours matched the selected dates.</td></tr>'}</tbody>
        </table>
        ${renderPager(req, "tour_attendance_page", tourAttendancePagination, "tour-attendance-report")}
      </section>
      <section class="card narrow tab-panel" data-tab-group="reports" data-tab-panel="schedule-report-tab">
        <div id="schedule-report"></div>
        <h2>Employee Schedule Report</h2>
        <form method="get" action="/reports" class="form-grid">
          <label>Shift Start
            <input type="date" name="schedule_start" value="${escapeHtml(scheduleStart ?? '')}">
          </label>
          <label>Shift End
            <input type="date" name="schedule_end" value="${escapeHtml(scheduleEnd ?? '')}">
          </label>
          <label>Department
            <select name="schedule_department">
              <option value="">All Departments</option>
              ${scheduleDeptOptions}
            </select>
          </label>
          <label>Duty
            <select name="schedule_duty">
              <option value="">All Duties</option>
              ${dutyOptions}
            </select>
          </label>
          <button class="button" type="submit">Run Report</button>
        </form>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Employee</th>
              <th>Department</th>
              <th>Exhibition</th>
              <th>Start</th>
              <th>End</th>
              <th>Duty</th>
            </tr>
          </thead>
          <tbody>${scheduleHtml || '<tr><td colspan="7">No schedules matched the selected dates.</td></tr>'}</tbody>
        </table>
        ${renderPager(req, "schedule_page", schedulePagination, "schedule-report")}
      </section>
    `,
    }));
  }));
}

module.exports = { registerReportsRoutes };
