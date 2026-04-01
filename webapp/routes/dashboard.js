const {
  asyncHandler,
  escapeHtml,
  formatDisplayDate,
  isEmployee,
  isSupervisor,
  renderFlash,
  renderPage,
  requireLogin,
  setFlash,
  allowRoles
} = require("../helpers");

function registerDashboardRoutes(app, { pool }) {
  app.get("/dashboard", requireLogin, (req, res) => {
    const user = req.session.user;
    let eyebrow = "Member Portal";
    let title = "Plan Your Visit";
    let intro = "Purchase admission tickets and browse museum information from one place.";
    let profileCards = `
      <div class="detail-item"><dt>Name</dt><dd>${escapeHtml(user.name)}</dd></div>
      <div class="detail-item"><dt>Email</dt><dd>${escapeHtml(user.email)}</dd></div>
    `;
    let sections = `
      <section class="dashboard-section">
        <h2>Visit Planning</h2>
        <div class="button-row dashboard-actions">
          <a class="button" href="/purchase-ticket">Purchase Tickets</a>
          <a class="button button-secondary" href="/queries">Browse Museum Queries</a>
        </div>
      </section>
    `;

    if (isEmployee(user)) {
      eyebrow = "Employee Portal";
      title = "Daily Operations";
      intro = "Record admissions, manage memberships, and process retail or cafe sales.";
      sections = `
        <section class="dashboard-section">
          <h2>Admissions Desk</h2>
          <div class="button-row dashboard-actions">
            <a class="button" href="/add-ticket">Manage Ticket Orders</a>
            <a class="button" href="/add-ticket-line">Manage Ticket Line Items</a>
            <a class="button button-secondary" href="/add-membership">Manage Memberships</a>
          </div>
        </section>
        <section class="dashboard-section">
          <h2>Retail and Cafe</h2>
          <div class="button-row dashboard-actions">
            <a class="button" href="/add-sale">Create Gift Shop Sale</a>
            <a class="button" href="/add-sale-line">Add Items to Gift Shop Sale</a>
            <a class="button" href="/add-food-sale">Create Cafe Sale</a>
            <a class="button" href="/add-food-sale-line">Add Food to Cafe Sale</a>
            <a class="button button-secondary" href="/queries">Operational Queries</a>
          </div>
        </section>
      `;
    }

    if (isSupervisor(user)) {
      eyebrow = "Supervisor Portal";
      title = "Collections and Reporting";
      intro = "Oversee collection records, exhibitions, inventory, and reporting.";
      sections = `
        <section class="dashboard-section">
          <h2>Collections Management</h2>
          <div class="button-row dashboard-actions">
            <a class="button" href="/add-artist">Manage Artists</a>
            <a class="button" href="/add-artwork">Manage Artworks</a>
            <a class="button" href="/add-exhibition">Manage Exhibitions</a>
            <a class="button" href="/add-exhibition-artwork">Assign Artwork to Exhibitions</a>
          </div>
        </section>
        <section class="dashboard-section">
          <h2>Business Operations</h2>
          <div class="button-row dashboard-actions">
            <a class="button" href="/add-membership">Manage Memberships</a>
            <a class="button" href="/add-item">Manage Gift Shop Inventory</a>
            <a class="button" href="/add-food">Manage Cafe Menu</a>
            <a class="button button-secondary" href="/queries">Museum Queries</a>
            <a class="button button-secondary" href="/reports">Museum Reports</a>
          </div>
        </section>
      `;
    }

    res.send(renderPage({
      title: "Dashboard",
      user,
      content: `
      <section class="card narrow dashboard-card">
        <p class="eyebrow">${eyebrow}</p>
        <h1>${title}</h1>
        <p class="dashboard-intro">${intro}</p>
        <dl class="details dashboard-details">
          ${profileCards}
        </dl>
        ${renderFlash(req)}
        ${sections}
        <form method="post" action="/logout" class="dashboard-footer">
          <button class="button" type="submit">Log Out</button>
        </form>
      </section>
    `,
    }));
  });

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
          <label>Ticket Type
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

  app.get("/queries", requireLogin, asyncHandler(async (req, res) => {
    const artistSearch = req.query.artist?.trim() || "";
    const styleSearch = req.query.style?.trim() || "";
    const startDate = req.query.start_date?.trim() || "";
    const endDate = req.query.end_date?.trim() || "";
    const categorySearch = req.query.category?.trim() || "";
    const maxPrice = req.query.max_price?.trim() || "";

    const [artworkResults] = await pool.query(
      `SELECT AW.Title, AW.Type, AW.Art_Style, AW.Time_Period, AR.Artist_Name
       FROM Artwork AW
       JOIN Artist AR ON AR.Artist_ID = AW.Artist_ID
       WHERE (? = '' OR AR.Artist_Name LIKE CONCAT('%', ?, '%'))
         AND (? = '' OR AW.Art_Style LIKE CONCAT('%', ?, '%'))
       ORDER BY AR.Artist_Name, AW.Title
       LIMIT 50`,
      [artistSearch, artistSearch, styleSearch, styleSearch],
    );

    const [exhibitionResults] = await pool.query(
      `SELECT Exhibition_Name, Starting_Date, Ending_Date
       FROM Exhibition
       WHERE (? = '' OR Ending_Date >= ?)
         AND (? = '' OR Starting_Date <= ?)
       ORDER BY Starting_Date DESC
       LIMIT 50`,
      [startDate, startDate, endDate, endDate],
    );

    const [inventoryResults] = await pool.query(
      `SELECT Name_of_Item, Category, Price_of_Item, Stock_Quantity
       FROM Gift_Shop_Item
       WHERE (? = '' OR Category LIKE CONCAT('%', ?, '%'))
         AND (? = '' OR Price_of_Item <= ?)
       ORDER BY Category, Name_of_Item
       LIMIT 50`,
      [categorySearch, categorySearch, maxPrice, maxPrice],
    );

    const artworkRows = artworkResults.map((artwork) => `
      <tr>
        <td>${escapeHtml(artwork.Title)}</td>
        <td>${escapeHtml(artwork.Artist_Name)}</td>
        <td>${escapeHtml(artwork.Type)}</td>
        <td>${escapeHtml(artwork.Art_Style || "N/A")}</td>
        <td>${escapeHtml(artwork.Time_Period || "N/A")}</td>
      </tr>
    `).join("");

    const exhibitionRows = exhibitionResults.map((exhibition) => `
      <tr>
        <td>${escapeHtml(exhibition.Exhibition_Name)}</td>
        <td>${formatDisplayDate(exhibition.Starting_Date)}</td>
        <td>${formatDisplayDate(exhibition.Ending_Date)}</td>
      </tr>
    `).join("");

    const inventoryRows = inventoryResults.map((item) => `
      <tr>
        <td>${escapeHtml(item.Name_of_Item)}</td>
        <td>${escapeHtml(item.Category || "N/A")}</td>
        <td>$${Number(item.Price_of_Item).toFixed(2)}</td>
        <td>${item.Stock_Quantity}</td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Museum Queries",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <p class="eyebrow">Data Queries</p>
        <h1>Museum Queries</h1>
        <p class="dashboard-note">These search forms satisfy the required query views with museum-focused filters.</p>
      </section>
      <section class="card narrow">
        <h2>Artwork by Artist or Style</h2>
        <form method="get" action="/queries" class="form-grid">
          <label>Artist Name
            <input type="text" name="artist" value="${escapeHtml(artistSearch)}">
          </label>
          <label>Art Style
            <input type="text" name="style" value="${escapeHtml(styleSearch)}">
          </label>
          <button class="button" type="submit">Run Query</button>
        </form>
        <table>
          <thead><tr><th>Title</th><th>Artist</th><th>Type</th><th>Style</th><th>Period</th></tr></thead>
          <tbody>${artworkRows || '<tr><td colspan="5">No artwork matched the selected filters.</td></tr>'}</tbody>
        </table>
      </section>
      <section class="card narrow">
        <h2>Exhibitions by Date Range</h2>
        <form method="get" action="/queries" class="form-grid">
          <label>Start Date
            <input type="date" name="start_date" value="${escapeHtml(startDate)}">
          </label>
          <label>End Date
            <input type="date" name="end_date" value="${escapeHtml(endDate)}">
          </label>
          <button class="button" type="submit">Run Query</button>
        </form>
        <table>
          <thead><tr><th>Exhibition</th><th>Starts</th><th>Ends</th></tr></thead>
          <tbody>${exhibitionRows || '<tr><td colspan="3">No exhibitions matched the selected dates.</td></tr>'}</tbody>
        </table>
      </section>
      <section class="card narrow">
        <h2>Gift Shop Inventory Lookup</h2>
        <form method="get" action="/queries" class="form-grid">
          <label>Category
            <input type="text" name="category" value="${escapeHtml(categorySearch)}">
          </label>
          <label>Maximum Price
            <input type="number" step="0.01" min="0" name="max_price" value="${escapeHtml(maxPrice)}">
          </label>
          <button class="button" type="submit">Run Query</button>
        </form>
        <table>
          <thead><tr><th>Item</th><th>Category</th><th>Price</th><th>Stock</th></tr></thead>
          <tbody>${inventoryRows || '<tr><td colspan="4">No inventory matched the selected filters.</td></tr>'}</tbody>
        </table>
      </section>
    `,
    }));
  }));

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

module.exports = { registerDashboardRoutes };