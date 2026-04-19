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

  app.get("/reports", requireLogin, allowRoles(["supervisor", "admissions", "giftshop", "cafe"]), asyncHandler(async (req, res) => {
    const userRole = req.session.user.role;

    // Which tabs each role may see
    const showConsolidated   = userRole === "supervisor";
    const showTickets        = userRole === "supervisor" || userRole === "admissions";
    const showEmployees      = userRole === "supervisor";
    const showExhibition     = userRole === "supervisor" || userRole === "admissions";
    const showGiftShop       = userRole === "supervisor" || userRole === "giftshop";
    const showCafe           = userRole === "supervisor" || userRole === "cafe";
    const showMembership     = userRole === "supervisor" || userRole === "admissions";
    const showMemberActivity = userRole === "supervisor" || userRole === "admissions";
    const showEvents         = userRole === "supervisor";
    const showTours          = userRole === "supervisor";
    const showSchedule       = userRole === "supervisor";

    // ── filter params ──────────────────────────────────────────────────────────
    const salesStart         = req.query.sales_start?.trim()         || null;
    const salesEnd           = req.query.sales_end?.trim()           || null;
    const salesPurchaseType  = req.query.sales_purchase_type?.trim() || null;
    const salesMemberMode    = req.query.sales_member_mode?.trim()   || null;
    const department         = req.query.department?.trim()          || null;
    const revenueStart       = req.query.revenue_start?.trim()       || null;
    const revenueEnd         = req.query.revenue_end?.trim()         || null;
    const exhibitionFilter   = req.query.exhibition_filter?.trim()   || null;
    const giftStart          = req.query.gift_start?.trim()          || null;
    const giftEnd            = req.query.gift_end?.trim()            || null;
    const giftCategory       = req.query.gift_category?.trim()       || null;
    const cafeStart          = req.query.cafe_start?.trim()          || null;
    const cafeEnd            = req.query.cafe_end?.trim()            || null;
    const cafeType           = req.query.cafe_type?.trim()           || null;
    const membershipStart    = req.query.membership_start?.trim()    || null;
    const membershipEnd      = req.query.membership_end?.trim()      || null;
    const membershipStatus   = req.query.membership_status?.trim()   || null;
    const membershipName     = req.query.membership_name?.trim()     || null;
    const activityStart      = req.query.activity_start?.trim()      || null;
    const activityEnd        = req.query.activity_end?.trim()        || null;
    const activityStatus     = req.query.activity_status?.trim()     || null;
    const activityName       = req.query.activity_name?.trim()       || null;
    const attendanceStart    = req.query.attendance_start?.trim()    || null;
    const attendanceEnd      = req.query.attendance_end?.trim()      || null;
    const eventName          = req.query.event_name?.trim()          || null;
    const tourGuide          = req.query.tour_guide?.trim()          || null;
    const scheduleStart      = req.query.schedule_start?.trim()      || null;
    const scheduleEnd        = req.query.schedule_end?.trim()        || null;
    const scheduleDepartment = req.query.schedule_department?.trim() || null;
    const scheduleDuty       = req.query.schedule_duty?.trim()       || null;
    const consolidatedStart  = req.query.consolidated_start?.trim()  || null;
    const consolidatedEnd    = req.query.consolidated_end?.trim()    || null;

    // ── pagination ─────────────────────────────────────────────────────────────
    const consolidatedPage    = getPageNumber(req.query.consolidated_page);
    const financialTxPage     = getPageNumber(req.query.financial_tx_page);
    const ticketSalesPage     = getPageNumber(req.query.ticket_sales_page);
    const employeePage        = getPageNumber(req.query.employee_page);
    const revenuePage         = getPageNumber(req.query.revenue_page);
    const giftPage            = getPageNumber(req.query.gift_page);
    const cafePage            = getPageNumber(req.query.cafe_page);
    const membershipPage      = getPageNumber(req.query.membership_page);
    const memberActivityPage  = getPageNumber(req.query.member_activity_page);
    const eventAttendancePage = getPageNumber(req.query.event_attendance_page);
    const tourAttendancePage  = getPageNumber(req.query.tour_attendance_page);
    const schedulePage        = getPageNumber(req.query.schedule_page);

    // ── shared lookup data (always needed for dropdowns) ──────────────────────
    const [departmentList] = await pool.query(`SELECT Department_Name FROM Department ORDER BY Department_Name`);
    const [dutyList] = await pool.query(`SELECT DISTINCT Duty FROM Schedule WHERE Duty IS NOT NULL ORDER BY Duty`);

    const [exhibitionList] = showExhibition
      ? await pool.query(`SELECT Exhibition_Name FROM Exhibition ORDER BY Exhibition_Name`)
      : [[]];
    const [giftCategoryList] = showGiftShop
      ? await pool.query(`SELECT DISTINCT Category FROM Gift_Shop_Item WHERE Category IS NOT NULL ORDER BY Category`)
      : [[]];
    const [tourGuideList] = showTours
      ? await pool.query(`SELECT DISTINCT CONCAT(E.First_Name, ' ', E.Last_Name) AS Guide_Name FROM Tour T JOIN Employee E ON E.Employee_ID = T.Guide_ID ORDER BY Guide_Name`)
      : [[]];

    // ── food type column check ────────────────────────────────────────────────
    const [foodTypeCols] = await pool.query(
      `SELECT 1 FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Food' AND COLUMN_NAME = 'Type' LIMIT 1`
    );
    const hasFoodTypeColumn = foodTypeCols.length > 0;

    const [cafeTypeList] = (showCafe && hasFoodTypeColumn)
      ? await pool.query(`SELECT DISTINCT Type FROM Food WHERE Type IS NOT NULL ORDER BY Type`)
      : [[]];

    // ── ticket sales ──────────────────────────────────────────────────────────
    let ticketSalesRows = [];
    let ticketSalesSummary = { Total_Orders: 0, Total_Tickets: 0, Total_Revenue: 0 };
    if (showTickets) {
      [ticketSalesRows] = await pool.query(
        `SELECT T.Visit_Date, T.Purchase_type, TL.Ticket_Type,
                CASE WHEN T.Membership_ID IS NULL THEN 'Guest' ELSE 'Member' END AS Buyer_Type,
                SUM(TL.Quantity) AS Tickets_Sold, SUM(TL.Total_sum_of_ticket) AS Revenue
         FROM Ticket T JOIN ticket_line TL ON TL.Ticket_ID = T.Ticket_ID
         WHERE (? IS NULL OR T.Purchase_Date >= ?)
           AND (? IS NULL OR T.Purchase_Date <= ?)
           AND (? IS NULL OR T.Purchase_type = ?)
           AND (? IS NULL
                OR (? = 'member' AND T.Membership_ID IS NOT NULL)
                OR (? = 'guest'  AND T.Membership_ID IS NULL))
         GROUP BY T.Visit_Date, T.Purchase_type, TL.Ticket_Type, Buyer_Type
         ORDER BY T.Visit_Date DESC, T.Purchase_type, TL.Ticket_Type`,
        [salesStart, salesStart, salesEnd, salesEnd,
         salesPurchaseType, salesPurchaseType,
         salesMemberMode, salesMemberMode, salesMemberMode]
      );
      [[ticketSalesSummary]] = await pool.query(
        `SELECT COALESCE(SUM(TL.Quantity), 0) AS Total_Tickets,
                COALESCE(SUM(TL.Total_sum_of_ticket), 0) AS Total_Revenue,
                COUNT(DISTINCT T.Ticket_ID) AS Total_Orders
         FROM Ticket T JOIN ticket_line TL ON TL.Ticket_ID = T.Ticket_ID
         WHERE (? IS NULL OR T.Purchase_Date >= ?)
           AND (? IS NULL OR T.Purchase_Date <= ?)
           AND (? IS NULL OR T.Purchase_type = ?)
           AND (? IS NULL
                OR (? = 'member' AND T.Membership_ID IS NOT NULL)
                OR (? = 'guest'  AND T.Membership_ID IS NULL))`,
        [salesStart, salesStart, salesEnd, salesEnd,
         salesPurchaseType, salesPurchaseType,
         salesMemberMode, salesMemberMode, salesMemberMode]
      );
    }

    // ── employees ─────────────────────────────────────────────────────────────
    let employeeRows = [], employeeDeptSummary = [];
    if (showEmployees) {
      [employeeRows] = await pool.query(
        `SELECT CONCAT(E.First_Name, ' ', E.Last_Name) AS Employee_Name,
                E.Employee_Role, D.Department_Name,
                CONCAT(S.First_Name, ' ', S.Last_Name) AS Supervisor_Name
         FROM Employee E
         LEFT JOIN Department D ON D.Department_ID = E.Department_ID
         LEFT JOIN Employee S ON S.Employee_ID = E.Supervisor_ID
         WHERE (? IS NULL OR D.Department_Name = ?)
         ORDER BY D.Department_Name, E.Last_Name, E.First_Name`,
        [department, department]
      );
      [employeeDeptSummary] = await pool.query(
        `SELECT COALESCE(D.Department_Name, 'Unassigned') AS Department_Name, COUNT(*) AS Headcount
         FROM Employee E LEFT JOIN Department D ON D.Department_ID = E.Department_ID
         WHERE (? IS NULL OR D.Department_Name = ?)
         GROUP BY Department_Name ORDER BY Department_Name`,
        [department, department]
      );
    }

    // ── exhibition revenue ────────────────────────────────────────────────────
    let exhibitionRevenueRows = [];
    let exhibitionRevenueSummary = { Total_Tickets: 0, Total_Revenue: 0 };
    if (showExhibition) {
      [exhibitionRevenueRows] = await pool.query(
        `SELECT COALESCE(EX.Exhibition_Name, 'General Admission') AS Exhibition_Name,
                SUM(TL.Quantity) AS Tickets_Sold,
                SUM(TL.Total_sum_of_ticket) AS Revenue
         FROM ticket_line TL
         JOIN Ticket T ON T.Ticket_ID = TL.Ticket_ID
         LEFT JOIN Exhibition EX ON EX.Exhibition_ID = TL.Exhibition_ID
         WHERE (? IS NULL OR T.Visit_Date >= ?)
           AND (? IS NULL OR T.Visit_Date <= ?)
           AND (? IS NULL OR COALESCE(EX.Exhibition_Name, 'General Admission') = ?)
         GROUP BY COALESCE(EX.Exhibition_Name, 'General Admission')
         HAVING SUM(TL.Quantity) > 0
         ORDER BY Revenue DESC, Exhibition_Name`,
        [revenueStart, revenueStart, revenueEnd, revenueEnd, exhibitionFilter, exhibitionFilter]
      );
      exhibitionRevenueSummary = {
        Total_Tickets: exhibitionRevenueRows.reduce((s, r) => s + Number(r.Tickets_Sold), 0),
        Total_Revenue: exhibitionRevenueRows.reduce((s, r) => s + Number(r.Revenue), 0),
      };
    }

    // ── gift shop ─────────────────────────────────────────────────────────────
    let giftSalesRows = [], giftSummary = { Total_Sales: 0, Items_Sold: 0, Total_Revenue: 0 };
    if (showGiftShop) {
      [giftSalesRows] = await pool.query(
        `SELECT GSI.Name_of_Item, GSI.Category,
                SUM(GSL.Quantity) AS Units_Sold,
                SUM(GSL.Total_Sum_For_Gift_Shop_Sale) AS Revenue
         FROM Gift_Shop_Sale GS
         JOIN Gift_Shop_Sale_Line GSL ON GSL.Gift_Shop_Sale_ID = GS.Gift_Shop_Sale_ID
         JOIN Gift_Shop_Item GSI ON GSI.Gift_Shop_Item_ID = GSL.Gift_Shop_Item_ID
         WHERE (? IS NULL OR GS.Sale_Date >= ?)
           AND (? IS NULL OR GS.Sale_Date <= ?)
           AND (? IS NULL OR GSI.Category = ?)
         GROUP BY GSI.Gift_Shop_Item_ID, GSI.Name_of_Item, GSI.Category
         HAVING SUM(GSL.Quantity) > 0
         ORDER BY Revenue DESC, Units_Sold DESC, GSI.Name_of_Item`,
        [giftStart, giftStart, giftEnd, giftEnd, giftCategory, giftCategory]
      );
      [[giftSummary]] = await pool.query(
        `SELECT COUNT(DISTINCT GS.Gift_Shop_Sale_ID) AS Total_Sales,
                COALESCE(SUM(GSL.Quantity), 0) AS Items_Sold,
                COALESCE(SUM(GSL.Total_Sum_For_Gift_Shop_Sale), 0) AS Total_Revenue
         FROM Gift_Shop_Sale GS
         LEFT JOIN Gift_Shop_Sale_Line GSL ON GSL.Gift_Shop_Sale_ID = GS.Gift_Shop_Sale_ID
         LEFT JOIN Gift_Shop_Item GSI ON GSI.Gift_Shop_Item_ID = GSL.Gift_Shop_Item_ID
         WHERE (? IS NULL OR GS.Sale_Date >= ?)
           AND (? IS NULL OR GS.Sale_Date <= ?)
           AND (? IS NULL OR GSI.Category = ?)`,
        [giftStart, giftStart, giftEnd, giftEnd, giftCategory, giftCategory]
      );
    }

    // ── café ──────────────────────────────────────────────────────────────────
    let cafeSalesRows = [], cafeSummary = { Total_Sales: 0, Items_Sold: 0, Total_Revenue: 0 };
    if (showCafe) {
      const cafeTypeClause = hasFoodTypeColumn ? "AND (? IS NULL OR F.Type = ?)" : "";
      const cafeTypeParams = hasFoodTypeColumn ? [cafeType, cafeType] : [];
      [cafeSalesRows] = await pool.query(
        `SELECT F.Food_Name, ${hasFoodTypeColumn ? "F.Type" : "NULL"} AS Type,
                SUM(FSL.Quantity) AS Units_Sold,
                SUM(FSL.Quantity * FSL.Price_When_Food_Was_Sold) AS Revenue
         FROM Food_Sale FS
         JOIN Food_Sale_Line FSL ON FSL.Food_Sale_ID = FS.Food_Sale_ID
         JOIN Food F ON F.Food_ID = FSL.Food_ID
         WHERE (? IS NULL OR FS.Sale_Date >= ?)
           AND (? IS NULL OR FS.Sale_Date <= ?)
           ${cafeTypeClause}
         GROUP BY F.Food_ID, F.Food_Name${hasFoodTypeColumn ? ", F.Type" : ""}
         HAVING SUM(FSL.Quantity) > 0
         ORDER BY Revenue DESC, Units_Sold DESC, F.Food_Name`,
        [cafeStart, cafeStart, cafeEnd, cafeEnd, ...cafeTypeParams]
      );
      [[cafeSummary]] = await pool.query(
        `SELECT COUNT(DISTINCT FS.Food_Sale_ID) AS Total_Sales,
                COALESCE(SUM(FSL.Quantity), 0) AS Items_Sold,
                COALESCE(SUM(FSL.Quantity * FSL.Price_When_Food_Was_Sold), 0) AS Total_Revenue
         FROM Food_Sale FS
         LEFT JOIN Food_Sale_Line FSL ON FSL.Food_Sale_ID = FS.Food_Sale_ID
         LEFT JOIN Food F ON F.Food_ID = FSL.Food_ID
         WHERE (? IS NULL OR FS.Sale_Date >= ?)
           AND (? IS NULL OR FS.Sale_Date <= ?)
           ${cafeTypeClause}`,
        [cafeStart, cafeStart, cafeEnd, cafeEnd, ...cafeTypeParams]
      );
    }

    // ── membership ────────────────────────────────────────────────────────────
    let membershipRows = [], membershipSummary = { Total_Members: 0, Active_Members: 0, Expired_Members: 0, Cancelled_Members: 0, New_In_Range: 0 };
    if (showMembership) {
      [[membershipSummary]] = await pool.query(
        `SELECT COUNT(*) AS Total_Members,
                SUM(CASE WHEN Status = 'Active'    THEN 1 ELSE 0 END) AS Active_Members,
                SUM(CASE WHEN Status = 'Expired'   THEN 1 ELSE 0 END) AS Expired_Members,
                SUM(CASE WHEN Status = 'Cancelled' THEN 1 ELSE 0 END) AS Cancelled_Members,
                SUM(CASE WHEN (? IS NULL OR Date_Joined >= ?)
                           AND (? IS NULL OR Date_Joined <= ?)
                         THEN 1 ELSE 0 END) AS New_In_Range
         FROM Membership`,
        [membershipStart, membershipStart, membershipEnd, membershipEnd]
      );
      [membershipRows] = await pool.query(
        `SELECT Membership_ID, First_Name, Last_Name, Email, Date_Joined, Date_Exited, Status
         FROM Membership
         WHERE (? IS NULL OR Date_Joined >= ?)
           AND (? IS NULL OR Date_Joined <= ?)
           AND (? IS NULL OR Status = ?)
           AND (? IS NULL OR CONCAT(First_Name, ' ', Last_Name) LIKE CONCAT('%', ?, '%'))
         ORDER BY Date_Joined DESC, Last_Name, First_Name`,
        [membershipStart, membershipStart, membershipEnd, membershipEnd,
         membershipStatus, membershipStatus, membershipName, membershipName]
      );
    }

    // ── member activity ───────────────────────────────────────────────────────
    let memberActivityRows = [];
    if (showMemberActivity) {
      [memberActivityRows] = await pool.query(
        `SELECT M.Membership_ID,
                CONCAT(M.First_Name, ' ', M.Last_Name) AS Member_Name,
                M.Email, M.Status, M.Date_Joined,
                COUNT(DISTINCT T.Ticket_ID) AS Tickets_Bought,
                COALESCE(SUM(TL.Total_sum_of_ticket), 0) AS Ticket_Spend
         FROM Membership M
         LEFT JOIN Ticket T ON T.Membership_ID = M.Membership_ID
           AND (? IS NULL OR T.Purchase_Date >= ?)
           AND (? IS NULL OR T.Purchase_Date <= ?)
         LEFT JOIN ticket_line TL ON TL.Ticket_ID = T.Ticket_ID
         WHERE (? IS NULL OR M.Status = ?)
           AND (? IS NULL OR CONCAT(M.First_Name, ' ', M.Last_Name) LIKE CONCAT('%', ?, '%'))
         GROUP BY M.Membership_ID, M.First_Name, M.Last_Name, M.Email, M.Status, M.Date_Joined
         ORDER BY Tickets_Bought DESC, Member_Name`,
        [activityStart, activityStart, activityEnd, activityEnd,
         activityStatus, activityStatus, activityName, activityName]
      );
    }

    // ── event attendance ──────────────────────────────────────────────────────
    let eventAttendanceRows = [], eventAttendanceSummary = { Total_Events: 0, Total_Registered: 0, Avg_Fill_Pct: "0.0" };
    if (showEvents) {
      [eventAttendanceRows] = await pool.query(
        `SELECT E.Event_ID, E.event_Name, E.start_Date, E.end_Date, E.Max_capacity,
                COUNT(ER.Event_Registration_ID) AS Registered_Count
         FROM Event E
         LEFT JOIN event_registration ER ON ER.Event_ID = E.Event_ID
         WHERE (? IS NULL OR E.start_Date >= ?)
           AND (? IS NULL OR E.start_Date <= ?)
           AND (? IS NULL OR E.event_Name LIKE CONCAT('%', ?, '%'))
         GROUP BY E.Event_ID, E.event_Name, E.start_Date, E.end_Date, E.Max_capacity
         ORDER BY E.start_Date DESC, E.event_Name`,
        [attendanceStart, attendanceStart, attendanceEnd, attendanceEnd, eventName, eventName]
      );
      if (eventAttendanceRows.length > 0) {
        const totalReg = eventAttendanceRows.reduce((s, r) => s + Number(r.Registered_Count), 0);
        const avgFill = eventAttendanceRows.reduce((s, r) => s + (r.Max_capacity ? r.Registered_Count / r.Max_capacity : 0), 0) / eventAttendanceRows.length * 100;
        eventAttendanceSummary = { Total_Events: eventAttendanceRows.length, Total_Registered: totalReg, Avg_Fill_Pct: avgFill.toFixed(1) };
      }
    }

    // ── tour attendance ───────────────────────────────────────────────────────
    let tourAttendanceRows = [], tourAttendanceSummary = { Total_Tours: 0, Total_Registered: 0, Avg_Fill_Pct: "0.0" };
    if (showTours) {
      [tourAttendanceRows] = await pool.query(
        `SELECT T.Tour_ID, T.Tour_Name, T.Tour_Date, T.Max_Capacity,
                COUNT(TR.Tour_Registration_ID) AS Registered_Count,
                CONCAT(E.First_Name, ' ', E.Last_Name) AS Guide_Name
         FROM Tour T
         LEFT JOIN Tour_Registration TR ON TR.Tour_ID = T.Tour_ID
         LEFT JOIN Employee E ON E.Employee_ID = T.Guide_ID
         WHERE (? IS NULL OR T.Tour_Date >= ?)
           AND (? IS NULL OR T.Tour_Date <= ?)
           AND (? IS NULL OR CONCAT(E.First_Name, ' ', E.Last_Name) = ?)
         GROUP BY T.Tour_ID, T.Tour_Name, T.Tour_Date, T.Max_Capacity, E.First_Name, E.Last_Name
         ORDER BY T.Tour_Date DESC, T.Tour_Name`,
        [attendanceStart, attendanceStart, attendanceEnd, attendanceEnd, tourGuide, tourGuide]
      );
      if (tourAttendanceRows.length > 0) {
        const totalReg = tourAttendanceRows.reduce((s, r) => s + Number(r.Registered_Count), 0);
        const avgFill = tourAttendanceRows.reduce((s, r) => s + (r.Max_Capacity ? r.Registered_Count / r.Max_Capacity : 0), 0) / tourAttendanceRows.length * 100;
        tourAttendanceSummary = { Total_Tours: tourAttendanceRows.length, Total_Registered: totalReg, Avg_Fill_Pct: avgFill.toFixed(1) };
      }
    }

    // ── schedule ──────────────────────────────────────────────────────────────
    let scheduleRows = [];
    if (showSchedule) {
      [scheduleRows] = await pool.query(
        `SELECT S.Shift_Date, S.Start_Time, S.End_Time, S.Duty,
                CONCAT(E.First_Name, ' ', E.Last_Name) AS Employee_Name,
                D.Department_Name, EX.Exhibition_Name
         FROM Schedule S
         JOIN Employee E ON E.Employee_ID = S.Employee_ID
         LEFT JOIN Department D ON D.Department_ID = E.Department_ID
         JOIN Exhibition EX ON EX.Exhibition_ID = S.Exhibition_ID
         WHERE (? IS NULL OR S.Shift_Date >= ?)
           AND (? IS NULL OR S.Shift_Date <= ?)
           AND (? IS NULL OR D.Department_Name = ?)
           AND (? IS NULL OR S.Duty = ?)
         ORDER BY S.Shift_Date DESC, S.Start_Time, E.Last_Name, E.First_Name`,
        [scheduleStart, scheduleStart, scheduleEnd, scheduleEnd,
         scheduleDepartment, scheduleDepartment, scheduleDuty, scheduleDuty]
      );
    }

    // ── consolidated financial ────────────────────────────────────────────────
    let consolidatedRows = [], financialTransactionRows = [];
    if (showConsolidated) {
      [consolidatedRows] = await pool.query(
        `SELECT * FROM Consolidated_Revenue
         WHERE (? IS NULL OR Sale_Date >= ?) AND (? IS NULL OR Sale_Date <= ?)
         ORDER BY Sale_Date DESC`,
        [consolidatedStart, consolidatedStart, consolidatedEnd, consolidatedEnd]
      );
      [financialTransactionRows] = await pool.query(
        `SELECT Transaction_Date, Source, Transaction_ID, Description, Amount
         FROM (
           SELECT T.Purchase_Date AS Transaction_Date, 'Ticket' AS Source,
                  CONCAT('Ticket #', T.Ticket_ID, '-', TL.Ticket_line_ID) AS Transaction_ID,
                  CONCAT(COALESCE(EX.Exhibition_Name, 'General Admission'), ' — ', TL.Ticket_Type, ' x', TL.Quantity) AS Description,
                  TL.Total_sum_of_ticket AS Amount
           FROM Ticket T JOIN ticket_line TL ON TL.Ticket_ID = T.Ticket_ID
           LEFT JOIN Exhibition EX ON EX.Exhibition_ID = TL.Exhibition_ID
           WHERE (? IS NULL OR T.Purchase_Date >= ?) AND (? IS NULL OR T.Purchase_Date <= ?)
           UNION ALL
           SELECT GS.Sale_Date, 'Gift Shop',
                  CONCAT('Sale #', GS.Gift_Shop_Sale_ID, '-', GSL.Gift_Shop_Sale_Line_ID),
                  CONCAT(GSI.Name_of_Item, ' x', GSL.Quantity),
                  GSL.Total_Sum_For_Gift_Shop_Sale
           FROM Gift_Shop_Sale GS
           JOIN Gift_Shop_Sale_Line GSL ON GSL.Gift_Shop_Sale_ID = GS.Gift_Shop_Sale_ID
           JOIN Gift_Shop_Item GSI ON GSI.Gift_Shop_Item_ID = GSL.Gift_Shop_Item_ID
           WHERE (? IS NULL OR GS.Sale_Date >= ?) AND (? IS NULL OR GS.Sale_Date <= ?)
           UNION ALL
           SELECT FS.Sale_Date, 'Café',
                  CONCAT('Sale #', FS.Food_Sale_ID, '-', FSL.Food_Sale_Line_ID),
                  CONCAT(F.Food_Name, ' x', FSL.Quantity),
                  FSL.Quantity * FSL.Price_When_Food_Was_Sold
           FROM Food_Sale FS
           JOIN Food_Sale_Line FSL ON FSL.Food_Sale_ID = FS.Food_Sale_ID
           JOIN Food F ON F.Food_ID = FSL.Food_ID
           WHERE (? IS NULL OR FS.Sale_Date >= ?) AND (? IS NULL OR FS.Sale_Date <= ?)
         ) AS all_txns
         ORDER BY Transaction_Date DESC, Source, Transaction_ID`,
        [consolidatedStart, consolidatedStart, consolidatedEnd, consolidatedEnd,
         consolidatedStart, consolidatedStart, consolidatedEnd, consolidatedEnd,
         consolidatedStart, consolidatedStart, consolidatedEnd, consolidatedEnd]
      );
    }

    // ── pagination ─────────────────────────────────────────────────────────────
    const consolidatedPagination    = paginateRows(consolidatedRows, consolidatedPage);
    const financialTxPagination     = paginateRows(financialTransactionRows, financialTxPage);
    const ticketSalesPagination     = paginateRows(ticketSalesRows, ticketSalesPage);
    const employeePagination        = paginateRows(employeeRows, employeePage);
    const revenuePagination         = paginateRows(exhibitionRevenueRows, revenuePage);
    const giftPagination            = paginateRows(giftSalesRows, giftPage);
    const cafePagination            = paginateRows(cafeSalesRows, cafePage);
    const membershipPagination      = paginateRows(membershipRows, membershipPage);
    const memberActivityPagination  = paginateRows(memberActivityRows, memberActivityPage);
    const eventAttendancePagination = paginateRows(eventAttendanceRows, eventAttendancePage);
    const tourAttendancePagination  = paginateRows(tourAttendanceRows, tourAttendancePage);
    const schedulePagination        = paginateRows(scheduleRows, schedulePage);

    // ── row HTML builders ──────────────────────────────────────────────────────
    const ticketSalesHtml = ticketSalesPagination.items.map((row) => `
      <tr>
        <td>${formatDisplayDate(row.Visit_Date)}</td>
        <td>${escapeHtml(row.Purchase_type || "N/A")}</td>
        <td>${escapeHtml(row.Buyer_Type)}</td>
        <td>${escapeHtml(row.Ticket_Type)}</td>
        <td>${row.Tickets_Sold}</td>
        <td>$${Number(row.Revenue).toFixed(2)}</td>
      </tr>`).join("");

    const consolidatedHtml = consolidatedPagination.items.map((row) => `
      <tr>
        <td>${formatDisplayDate(row.Sale_Date)}</td>
        <td>$${Number(row.Ticket_Revenue).toFixed(2)}</td>
        <td>$${Number(row.Gift_Shop_Revenue).toFixed(2)}</td>
        <td>$${Number(row.Cafe_Revenue).toFixed(2)}</td>
        <td style="font-weight:bold; background:#f9f9f9;">$${Number(row.Total_Daily_Revenue).toFixed(2)}</td>
      </tr>`).join("");

    const sourceColors = { Ticket: "#dbeafe", "Gift Shop": "#dcfce7", "Café": "#fef9c3" };
    let financialLedgerHtml = "";
    if (financialTxPagination.items.length === 0) {
      financialLedgerHtml = '<tr><td colspan="5">No transactions in selected range.</td></tr>';
    } else {
      let currentDate = null, dateSubtotal = 0;
      const buf = [];
      for (const row of financialTxPagination.items) {
        const dk = String(row.Transaction_Date);
        if (currentDate !== null && dk !== currentDate) {
          buf.push(`<tr style="font-weight:bold; background:#f0f4f8;"><td colspan="4" style="text-align:right; padding-right:1rem;">Subtotal for ${formatDisplayDate(currentDate)}</td><td>$${dateSubtotal.toFixed(2)}</td></tr>`);
          dateSubtotal = 0;
        }
        currentDate = dk;
        dateSubtotal += Number(row.Amount);
        const bg = sourceColors[row.Source] || "#fff";
        buf.push(`<tr>
          <td>${formatDisplayDate(row.Transaction_Date)}</td>
          <td><span style="background:${bg}; padding:2px 7px; border-radius:4px; font-size:0.85em;">${escapeHtml(row.Source)}</span></td>
          <td style="font-size:0.85em; color:#555;">${escapeHtml(row.Transaction_ID)}</td>
          <td>${escapeHtml(row.Description)}</td>
          <td>$${Number(row.Amount).toFixed(2)}</td>
        </tr>`);
      }
      if (currentDate !== null) {
        buf.push(`<tr style="font-weight:bold; background:#f0f4f8;"><td colspan="4" style="text-align:right; padding-right:1rem;">Subtotal for ${formatDisplayDate(currentDate)}</td><td>$${dateSubtotal.toFixed(2)}</td></tr>`);
      }
      financialLedgerHtml = buf.join("");
    }
    const grandTotal = financialTransactionRows.reduce((s, r) => s + Number(r.Amount), 0);

    const employeeHtml = employeePagination.items.map((row) => `
      <tr>
        <td>${escapeHtml(row.Employee_Name)}</td>
        <td>${escapeHtml(row.Employee_Role || "N/A")}</td>
        <td>${escapeHtml(row.Department_Name || "Unassigned")}</td>
        <td>${escapeHtml(row.Supervisor_Name || "None")}</td>
      </tr>`).join("");

    const employeeDeptSummaryHtml = employeeDeptSummary.map((row) => `
      <tr><td>${escapeHtml(row.Department_Name)}</td><td>${row.Headcount}</td></tr>`).join("");
    const employeeTotalHeadcount = employeeDeptSummary.reduce((s, r) => s + Number(r.Headcount), 0);

    const revenueHtml = revenuePagination.items.map((row) => `
      <tr>
        <td>${escapeHtml(row.Exhibition_Name)}</td>
        <td>${row.Tickets_Sold}</td>
        <td>$${Number(row.Revenue).toFixed(2)}</td>
      </tr>`).join("");

    const giftSalesHtml = giftPagination.items.map((row) => `
      <tr>
        <td>${escapeHtml(row.Name_of_Item)}</td>
        <td>${escapeHtml(row.Category || "—")}</td>
        <td>${row.Units_Sold}</td>
        <td>$${Number(row.Revenue).toFixed(2)}</td>
      </tr>`).join("");

    const cafeSalesHtml = cafePagination.items.map((row) => `
      <tr>
        <td>${escapeHtml(row.Food_Name)}</td>
        <td>${escapeHtml(row.Type || "N/A")}</td>
        <td>${row.Units_Sold}</td>
        <td>$${Number(row.Revenue).toFixed(2)}</td>
      </tr>`).join("");

    const membershipHtml = membershipPagination.items.map((row) => {
      const sc = row.Status === "Active" ? "#dcfce7" : row.Status === "Expired" ? "#fee2e2" : "#e5e7eb";
      return `<tr>
        <td>${row.Membership_ID}</td>
        <td>${escapeHtml(`${row.First_Name} ${row.Last_Name}`)}</td>
        <td>${escapeHtml(row.Email || "—")}</td>
        <td>${formatDisplayDate(row.Date_Joined)}</td>
        <td>${row.Date_Exited ? formatDisplayDate(row.Date_Exited) : "—"}</td>
        <td><span style="background:${sc}; padding:2px 7px; border-radius:4px; font-size:0.85em;">${escapeHtml(row.Status)}</span></td>
      </tr>`;
    }).join("");

    const memberActivityHtml = memberActivityPagination.items.map((row) => {
      const sc = row.Status === "Active" ? "#dcfce7" : row.Status === "Expired" ? "#fee2e2" : "#e5e7eb";
      return `<tr>
        <td>${row.Membership_ID}</td>
        <td>${escapeHtml(row.Member_Name)}</td>
        <td>${escapeHtml(row.Email || "—")}</td>
        <td><span style="background:${sc}; padding:2px 7px; border-radius:4px; font-size:0.85em;">${escapeHtml(row.Status)}</span></td>
        <td>${formatDisplayDate(row.Date_Joined)}</td>
        <td>${row.Tickets_Bought}</td>
        <td>$${Number(row.Ticket_Spend).toFixed(2)}</td>
      </tr>`;
    }).join("");

    const eventAttendanceHtml = eventAttendancePagination.items.map((row) => {
      const pct = row.Max_capacity ? ((row.Registered_Count / row.Max_capacity) * 100).toFixed(0) : "0";
      return `<tr>
        <td>${escapeHtml(row.event_Name)}</td>
        <td>${formatDisplayDate(row.start_Date)}</td>
        <td>${formatDisplayDate(row.end_Date)}</td>
        <td>${row.Registered_Count} / ${row.Max_capacity}</td>
        <td>${pct}%</td>
      </tr>`;
    }).join("");

    const tourAttendanceHtml = tourAttendancePagination.items.map((row) => {
      const pct = row.Max_Capacity ? ((row.Registered_Count / row.Max_Capacity) * 100).toFixed(0) : "0";
      return `<tr>
        <td>${escapeHtml(row.Tour_Name)}</td>
        <td>${formatDisplayDate(row.Tour_Date)}</td>
        <td>${escapeHtml(row.Guide_Name || "TBD")}</td>
        <td>${row.Registered_Count} / ${row.Max_Capacity}</td>
        <td>${pct}%</td>
      </tr>`;
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
      </tr>`).join("");

    // ── dropdown options ───────────────────────────────────────────────────────
    const deptOptions = departmentList.map((d) =>
      `<option value="${escapeHtml(d.Department_Name)}" ${department === d.Department_Name ? "selected" : ""}>${escapeHtml(d.Department_Name)}</option>`).join("");
    const scheduleDeptOptions = departmentList.map((d) =>
      `<option value="${escapeHtml(d.Department_Name)}" ${scheduleDepartment === d.Department_Name ? "selected" : ""}>${escapeHtml(d.Department_Name)}</option>`).join("");
    const dutyOptions = dutyList.map((d) =>
      `<option value="${escapeHtml(d.Duty)}" ${scheduleDuty === d.Duty ? "selected" : ""}>${escapeHtml(d.Duty)}</option>`).join("");
    const exhibitionOptions = exhibitionList.map((e) =>
      `<option value="${escapeHtml(e.Exhibition_Name)}" ${exhibitionFilter === e.Exhibition_Name ? "selected" : ""}>${escapeHtml(e.Exhibition_Name)}</option>`).join("");
    const giftCategoryOptions = giftCategoryList.map((c) =>
      `<option value="${escapeHtml(c.Category)}" ${giftCategory === c.Category ? "selected" : ""}>${escapeHtml(c.Category)}</option>`).join("");
    const cafeTypeOptions = cafeTypeList.map((t) =>
      `<option value="${escapeHtml(t.Type)}" ${cafeType === t.Type ? "selected" : ""}>${escapeHtml(t.Type)}</option>`).join("");
    const tourGuideOptions = tourGuideList.map((g) =>
      `<option value="${escapeHtml(g.Guide_Name)}" ${tourGuide === g.Guide_Name ? "selected" : ""}>${escapeHtml(g.Guide_Name)}</option>`).join("");

    // ── page subtitle per role ────────────────────────────────────────────────
    const pageSubtitle = userRole === "supervisor"
      ? "Full operational reports across all departments."
      : userRole === "admissions"
      ? "Ticket sales, membership, and visitor attendance reports."
      : userRole === "giftshop"
      ? "Gift shop sales and inventory reports."
      : "Café sales reports.";

    // ── build tab bar from visible tabs only ───────────────────────────────────
    const tabDefs = [
      { id: "consolidated-report-tab",    label: "Financial Summary",  show: showConsolidated },
      { id: "ticket-sales-report-tab",    label: "Ticket Sales",       show: showTickets },
      { id: "employee-report-tab",        label: "Employees",          show: showEmployees },
      { id: "revenue-report-tab",         label: "Exhibition Revenue", show: showExhibition },
      { id: "gift-report-tab",            label: "Gift Shop",          show: showGiftShop },
      { id: "cafe-report-tab",            label: "Café",               show: showCafe },
      { id: "membership-report-tab",      label: "Membership",         show: showMembership },
      { id: "member-activity-report-tab", label: "Member Activity",    show: showMemberActivity },
      { id: "event-attendance-report-tab",label: "Events",             show: showEvents },
      { id: "tour-attendance-report-tab", label: "Tours",              show: showTours },
      { id: "schedule-report-tab",        label: "Schedule",           show: showSchedule },
    ].filter((t) => t.show);

    const tabButtonsHtml = tabDefs.map((t) =>
      `<button class="tab-button" type="button" data-tab-target="${t.id}">${escapeHtml(t.label)}</button>`
    ).join("");

    // ── render ────────────────────────────────────────────────────────────────
    res.send(renderPage({
      title: "Museum Reports",
      user: req.session.user,
      currentPath: req.path,
      content: `
      <style>
        @media print {
          .site-header, nav, .tab-bar, form, .button, .dashboard-back-link, .pager, .portal-banner { display: none !important; }
          /* Hide every non-active tab panel so only the selected report prints */
          .tab-panel[hidden] { display: none !important; }
          .tab-panel:not([hidden]) {
            display: block !important;
            visibility: visible !important;
            page-break-inside: avoid;
          }
          /* Drop the empty card that just wrapped the tab bar */
          .card:has(> .tab-bar) { display: none !important; }
          .card { box-shadow: none; border: 1px solid #ccc; margin-bottom: 1rem; page-break-inside: avoid; }
          h1, h2, h3 { margin-top: 0.75rem; page-break-after: avoid; }
          table { width: 100%; border-collapse: collapse; font-size: 0.85em; page-break-inside: auto; }
          tr { page-break-inside: avoid; }
          th, td { border: 1px solid #ccc; padding: 4px 8px; }
          @page { margin: 0.5in; }
        }
      </style>
      <section class="card narrow">
        <p class="eyebrow">Reports</p>
        <h1>Museum Reports</h1>
        <p class="dashboard-note">${escapeHtml(pageSubtitle)}</p>
        <button class="button button-secondary" onclick="window.print()" type="button" style="margin-top:0.5rem;">Print / Save as PDF</button>
      </section>
      <section class="card narrow">
        <div class="tab-bar" data-tab-group="reports">
          ${tabButtonsHtml}
        </div>
      </section>

      ${showConsolidated ? `
      <section class="card narrow tab-panel" data-tab-group="reports" data-tab-panel="consolidated-report-tab">
        <div id="consolidated-report"></div>
        <h2>Consolidated Financial Summary</h2>
        <p class="dashboard-note">Aggregated daily revenue from all departments (Tickets, Gift Shop, Café).</p>
        <form method="get" action="/reports" class="form-grid">
          <label>Start Date<input type="date" name="consolidated_start" value="${escapeHtml(consolidatedStart ?? "")}"></label>
          <label>End Date<input type="date" name="consolidated_end" value="${escapeHtml(consolidatedEnd ?? "")}"></label>
          <button class="button" type="submit">Run Report</button>
        </form>
        <table>
          <thead><tr><th>Date</th><th>Ticket Revenue</th><th>Gift Shop Revenue</th><th>Café Revenue</th><th>Total Daily Revenue</th></tr></thead>
          <tbody>${consolidatedHtml || '<tr><td colspan="5">No financial data available.</td></tr>'}</tbody>
        </table>
        ${renderPager(req, "consolidated_page", consolidatedPagination, "consolidated-report")}
        <h3 style="margin-top:2rem;">Transaction Ledger</h3>
        <p class="dashboard-note">Every individual transaction contributing to the totals above. Grand total: <strong>$${grandTotal.toFixed(2)}</strong></p>
        <table>
          <thead><tr><th>Date</th><th>Source</th><th>Transaction ID</th><th>Description</th><th>Amount</th></tr></thead>
          <tbody>${financialLedgerHtml}</tbody>
        </table>
        ${renderPager(req, "financial_tx_page", financialTxPagination, "consolidated-report")}
      </section>` : ""}

      ${showTickets ? `
      <section class="card narrow tab-panel" data-tab-group="reports" data-tab-panel="ticket-sales-report-tab">
        <div id="ticket-sales-report"></div>
        <h2>Ticket Sales</h2>
        <form method="get" action="/reports" class="form-grid">
          <label>Purchase Start<input type="date" name="sales_start" value="${escapeHtml(salesStart ?? "")}"></label>
          <label>Purchase End<input type="date" name="sales_end" value="${escapeHtml(salesEnd ?? "")}"></label>
          <label>Purchase Type
            <select name="sales_purchase_type">
              <option value="">All Purchase Types</option>
              <option value="In-Person" ${salesPurchaseType === "In-Person" ? "selected" : ""}>In-Person</option>
              <option value="Walk-up"   ${salesPurchaseType === "Walk-up"   ? "selected" : ""}>Walk-up</option>
              <option value="Online"    ${salesPurchaseType === "Online"    ? "selected" : ""}>Online</option>
            </select>
          </label>
          <label>Buyer Type
            <select name="sales_member_mode">
              <option value="">Members and Guests</option>
              <option value="member" ${salesMemberMode === "member" ? "selected" : ""}>Members Only</option>
              <option value="guest"  ${salesMemberMode === "guest"  ? "selected" : ""}>Guests Only</option>
            </select>
          </label>
          <button class="button" type="submit">Run Report</button>
        </form>
        <p class="dashboard-note">Orders: <strong>${ticketSalesSummary.Total_Orders || 0}</strong> &nbsp;|&nbsp; Tickets sold: <strong>${ticketSalesSummary.Total_Tickets || 0}</strong> &nbsp;|&nbsp; Revenue: <strong>$${Number(ticketSalesSummary.Total_Revenue || 0).toFixed(2)}</strong></p>
        <table>
          <thead><tr><th>Visit Date</th><th>Purchase Type</th><th>Buyer Type</th><th>Ticket Type</th><th>Tickets Sold</th><th>Revenue</th></tr></thead>
          <tbody>${ticketSalesHtml || '<tr><td colspan="6">No ticket sales matched the selected filters.</td></tr>'}</tbody>
        </table>
        ${renderPager(req, "ticket_sales_page", ticketSalesPagination, "ticket-sales-report")}
      </section>` : ""}

      ${showEmployees ? `
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
        ${employeeDeptSummary.length > 0 ? `
        <h3>Headcount by Department</h3>
        <table style="width:auto; min-width:320px; margin-bottom:1.5rem;">
          <thead><tr><th>Department</th><th>Headcount</th></tr></thead>
          <tbody>${employeeDeptSummaryHtml}</tbody>
          <tfoot><tr style="font-weight:bold;"><td>Total</td><td>${employeeTotalHeadcount}</td></tr></tfoot>
        </table>` : ""}
        <h3>Employee Roster</h3>
        <table>
          <thead><tr><th>Employee</th><th>Position</th><th>Department</th><th>Supervisor</th></tr></thead>
          <tbody>${employeeHtml || '<tr><td colspan="4">No employees matched the selected department.</td></tr>'}</tbody>
        </table>
        ${renderPager(req, "employee_page", employeePagination, "employee-report")}
      </section>` : ""}

      ${showExhibition ? `
      <section class="card narrow tab-panel" data-tab-group="reports" data-tab-panel="revenue-report-tab">
        <div id="revenue-report"></div>
        <h2>Revenue by Exhibition</h2>
        <form method="get" action="/reports" class="form-grid">
          <label>Visit Start<input type="date" name="revenue_start" value="${escapeHtml(revenueStart ?? "")}"></label>
          <label>Visit End<input type="date" name="revenue_end" value="${escapeHtml(revenueEnd ?? "")}"></label>
          <label>Exhibition
            <select name="exhibition_filter">
              <option value="">All Exhibitions</option>
              <option value="General Admission" ${exhibitionFilter === "General Admission" ? "selected" : ""}>General Admission</option>
              ${exhibitionOptions}
            </select>
          </label>
          <button class="button" type="submit">Run Report</button>
        </form>
        <p class="dashboard-note">Total tickets sold: <strong>${exhibitionRevenueSummary.Total_Tickets}</strong> &nbsp;|&nbsp; Total revenue: <strong>$${Number(exhibitionRevenueSummary.Total_Revenue).toFixed(2)}</strong></p>
        <table>
          <thead><tr><th>Exhibition</th><th>Tickets Sold</th><th>Revenue</th></tr></thead>
          <tbody>${revenueHtml || '<tr><td colspan="3">No exhibition revenue matched the selected filters.</td></tr>'}</tbody>
        </table>
        ${renderPager(req, "revenue_page", revenuePagination, "revenue-report")}
      </section>` : ""}

      ${showGiftShop ? `
      <section class="card narrow tab-panel" data-tab-group="reports" data-tab-panel="gift-report-tab">
        <div id="gift-report"></div>
        <h2>Gift Shop Revenue by Item</h2>
        <form method="get" action="/reports" class="form-grid">
          <label>Sale Start<input type="date" name="gift_start" value="${escapeHtml(giftStart ?? "")}"></label>
          <label>Sale End<input type="date" name="gift_end" value="${escapeHtml(giftEnd ?? "")}"></label>
          <label>Category
            <select name="gift_category">
              <option value="">All Categories</option>
              ${giftCategoryOptions}
            </select>
          </label>
          <button class="button" type="submit">Run Report</button>
        </form>
        <p class="dashboard-note">Sales: <strong>${giftSummary.Total_Sales || 0}</strong> &nbsp;|&nbsp; Items sold: <strong>${giftSummary.Items_Sold || 0}</strong> &nbsp;|&nbsp; Revenue: <strong>$${Number(giftSummary.Total_Revenue || 0).toFixed(2)}</strong></p>
        <table>
          <thead><tr><th>Item</th><th>Category</th><th>Units Sold</th><th>Revenue</th></tr></thead>
          <tbody>${giftSalesHtml || '<tr><td colspan="4">No gift shop sales matched the selected filters.</td></tr>'}</tbody>
        </table>
        ${renderPager(req, "gift_page", giftPagination, "gift-report")}
      </section>` : ""}

      ${showCafe ? `
      <section class="card narrow tab-panel" data-tab-group="reports" data-tab-panel="cafe-report-tab">
        <div id="cafe-report"></div>
        <h2>Café Revenue by Item</h2>
        <form method="get" action="/reports" class="form-grid">
          <label>Sale Start<input type="date" name="cafe_start" value="${escapeHtml(cafeStart ?? "")}"></label>
          <label>Sale End<input type="date" name="cafe_end" value="${escapeHtml(cafeEnd ?? "")}"></label>
          ${hasFoodTypeColumn ? `
          <label>Food Type
            <select name="cafe_type">
              <option value="">All Types</option>
              ${cafeTypeOptions}
            </select>
          </label>` : ""}
          <button class="button" type="submit">Run Report</button>
        </form>
        <p class="dashboard-note">Sales: <strong>${cafeSummary.Total_Sales || 0}</strong> &nbsp;|&nbsp; Items sold: <strong>${cafeSummary.Items_Sold || 0}</strong> &nbsp;|&nbsp; Revenue: <strong>$${Number(cafeSummary.Total_Revenue || 0).toFixed(2)}</strong></p>
        <table>
          <thead><tr><th>Food Item</th><th>Type</th><th>Units Sold</th><th>Revenue</th></tr></thead>
          <tbody>${cafeSalesHtml || '<tr><td colspan="4">No café sales matched the selected filters.</td></tr>'}</tbody>
        </table>
        ${renderPager(req, "cafe_page", cafePagination, "cafe-report")}
      </section>` : ""}

      ${showMembership ? `
      <section class="card narrow tab-panel" data-tab-group="reports" data-tab-panel="membership-report-tab">
        <div id="membership-report"></div>
        <h2>Membership Status Report</h2>
        <form method="get" action="/reports" class="form-grid">
          <label>Joined Start<input type="date" name="membership_start" value="${escapeHtml(membershipStart ?? "")}"></label>
          <label>Joined End<input type="date" name="membership_end" value="${escapeHtml(membershipEnd ?? "")}"></label>
          <label>Status
            <select name="membership_status">
              <option value="">All Statuses</option>
              <option value="Active"    ${membershipStatus === "Active"    ? "selected" : ""}>Active</option>
              <option value="Expired"   ${membershipStatus === "Expired"   ? "selected" : ""}>Expired</option>
              <option value="Cancelled" ${membershipStatus === "Cancelled" ? "selected" : ""}>Cancelled</option>
            </select>
          </label>
          <label>Member Name<input type="text" name="membership_name" value="${escapeHtml(membershipName ?? "")}" placeholder="Search by name…"></label>
          <button class="button" type="submit">Run Report</button>
        </form>
        <p class="dashboard-note">Total: <strong>${membershipSummary.Total_Members || 0}</strong> &nbsp;|&nbsp; Active: <strong>${membershipSummary.Active_Members || 0}</strong> &nbsp;|&nbsp; Expired: <strong>${membershipSummary.Expired_Members || 0}</strong> &nbsp;|&nbsp; Cancelled: <strong>${membershipSummary.Cancelled_Members || 0}</strong> &nbsp;|&nbsp; New in range: <strong>${membershipSummary.New_In_Range || 0}</strong></p>
        <table>
          <thead><tr><th>ID</th><th>Member</th><th>Email</th><th>Joined</th><th>Expires / Expired On</th><th>Status</th></tr></thead>
          <tbody>${membershipHtml || '<tr><td colspan="6">No memberships matched the selected filters.</td></tr>'}</tbody>
        </table>
        ${renderPager(req, "membership_page", membershipPagination, "membership-report")}
      </section>` : ""}

      ${showMemberActivity ? `
      <section class="card narrow tab-panel" data-tab-group="reports" data-tab-panel="member-activity-report-tab">
        <div id="member-activity-report"></div>
        <h2>Member Activity Report</h2>
        <p class="dashboard-note">Members ranked by tickets purchased. The date range filters which ticket purchases count toward the totals.</p>
        <form method="get" action="/reports" class="form-grid">
          <label>Ticket Purchase Start<input type="date" name="activity_start" value="${escapeHtml(activityStart ?? "")}"></label>
          <label>Ticket Purchase End<input type="date" name="activity_end" value="${escapeHtml(activityEnd ?? "")}"></label>
          <label>Status
            <select name="activity_status">
              <option value="">All Statuses</option>
              <option value="Active"    ${activityStatus === "Active"    ? "selected" : ""}>Active</option>
              <option value="Expired"   ${activityStatus === "Expired"   ? "selected" : ""}>Expired</option>
              <option value="Cancelled" ${activityStatus === "Cancelled" ? "selected" : ""}>Cancelled</option>
            </select>
          </label>
          <label>Member Name<input type="text" name="activity_name" value="${escapeHtml(activityName ?? "")}" placeholder="Search by name…"></label>
          <button class="button" type="submit">Run Report</button>
        </form>
        <table>
          <thead><tr><th>ID</th><th>Member</th><th>Email</th><th>Status</th><th>Joined</th><th>Tickets Bought</th><th>Ticket Spend</th></tr></thead>
          <tbody>${memberActivityHtml || '<tr><td colspan="7">No members matched the selected filters.</td></tr>'}</tbody>
        </table>
        ${renderPager(req, "member_activity_page", memberActivityPagination, "member-activity-report")}
      </section>` : ""}

      ${showEvents ? `
      <section class="card narrow tab-panel" data-tab-group="reports" data-tab-panel="event-attendance-report-tab">
        <div id="event-attendance-report"></div>
        <h2>Event Attendance</h2>
        <form method="get" action="/reports" class="form-grid">
          <label>Start Date<input type="date" name="attendance_start" value="${escapeHtml(attendanceStart ?? "")}"></label>
          <label>End Date<input type="date" name="attendance_end" value="${escapeHtml(attendanceEnd ?? "")}"></label>
          <label>Event Name<input type="text" name="event_name" value="${escapeHtml(eventName ?? "")}" placeholder="Search by event name…"></label>
          <button class="button" type="submit">Run Report</button>
        </form>
        <p class="dashboard-note">Events: <strong>${eventAttendanceSummary.Total_Events}</strong> &nbsp;|&nbsp; Total registered: <strong>${eventAttendanceSummary.Total_Registered}</strong> &nbsp;|&nbsp; Avg fill rate: <strong>${eventAttendanceSummary.Avg_Fill_Pct}%</strong></p>
        <table>
          <thead><tr><th>Event</th><th>Start</th><th>End</th><th>Registered</th><th>% Full</th></tr></thead>
          <tbody>${eventAttendanceHtml || '<tr><td colspan="5">No events matched the selected filters.</td></tr>'}</tbody>
        </table>
        ${renderPager(req, "event_attendance_page", eventAttendancePagination, "event-attendance-report")}
      </section>` : ""}

      ${showTours ? `
      <section class="card narrow tab-panel" data-tab-group="reports" data-tab-panel="tour-attendance-report-tab">
        <div id="tour-attendance-report"></div>
        <h2>Tour Attendance</h2>
        <form method="get" action="/reports" class="form-grid">
          <label>Start Date<input type="date" name="attendance_start" value="${escapeHtml(attendanceStart ?? "")}"></label>
          <label>End Date<input type="date" name="attendance_end" value="${escapeHtml(attendanceEnd ?? "")}"></label>
          <label>Guide
            <select name="tour_guide">
              <option value="">All Guides</option>
              ${tourGuideOptions}
            </select>
          </label>
          <button class="button" type="submit">Run Report</button>
        </form>
        <p class="dashboard-note">Tours: <strong>${tourAttendanceSummary.Total_Tours}</strong> &nbsp;|&nbsp; Total registered: <strong>${tourAttendanceSummary.Total_Registered}</strong> &nbsp;|&nbsp; Avg fill rate: <strong>${tourAttendanceSummary.Avg_Fill_Pct}%</strong></p>
        <table>
          <thead><tr><th>Tour</th><th>Date</th><th>Guide</th><th>Registered</th><th>% Full</th></tr></thead>
          <tbody>${tourAttendanceHtml || '<tr><td colspan="5">No tours matched the selected filters.</td></tr>'}</tbody>
        </table>
        ${renderPager(req, "tour_attendance_page", tourAttendancePagination, "tour-attendance-report")}
      </section>` : ""}

      ${showSchedule ? `
      <section class="card narrow tab-panel" data-tab-group="reports" data-tab-panel="schedule-report-tab">
        <div id="schedule-report"></div>
        <h2>Employee Schedule Report</h2>
        <form method="get" action="/reports" class="form-grid">
          <label>Shift Start<input type="date" name="schedule_start" value="${escapeHtml(scheduleStart ?? "")}"></label>
          <label>Shift End<input type="date" name="schedule_end" value="${escapeHtml(scheduleEnd ?? "")}"></label>
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
        <p class="dashboard-note">Shifts shown: <strong>${scheduleRows.length}</strong></p>
        <table>
          <thead><tr><th>Date</th><th>Employee</th><th>Department</th><th>Exhibition</th><th>Start</th><th>End</th><th>Duty</th></tr></thead>
          <tbody>${scheduleHtml || '<tr><td colspan="7">No schedules matched the selected filters.</td></tr>'}</tbody>
        </table>
        ${renderPager(req, "schedule_page", schedulePagination, "schedule-report")}
      </section>` : ""}
      `,
    }));
  }));
}

module.exports = { registerReportsRoutes };
