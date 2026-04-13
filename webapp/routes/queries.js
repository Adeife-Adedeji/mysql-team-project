const {
  asyncHandler,
  escapeHtml,
  formatDisplayDate,
  renderPage,
  requireLogin
} = require("../helpers");

function registerQueriesRoutes(app, { pool }) {
  app.get("/queries", requireLogin, asyncHandler(async (req, res) => {
    const user = req.session.user;
    const isSuper = user.role === "supervisor";
    const isEmp = user.role === "employee" || user.role === "cafe" || user.role === "giftshop" || user.role === "admissions";

    const artworkStatusSearch = req.query.artwork_status?.trim() || null;
    const locationSearch = req.query.location?.trim() || null;
    const conditionSearch = req.query.condition?.trim() || null;

    const [allExhibitions] = await pool.query("SELECT Exhibition_Name FROM Exhibition ORDER BY Exhibition_Name");
    const [allInstitutions] = await pool.query("SELECT Institution_Name FROM institution ORDER BY Institution_Name");
    const conditionStatuses = ['Excellent', 'Good', 'Fair', 'Poor', 'Critical', 'No Recent Report'];

    const [artworkStatusResults] = await pool.query(
      `SELECT AW.Title, 
              CASE 
                WHEN AL_Info.Loan_ID IS NOT NULL THEN CONCAT('On Loan to: ', AL_Info.Institution_Name)
                WHEN EX.Exhibition_ID IS NOT NULL THEN CONCAT('In Exhibition: ', EX.Exhibition_Name)
                ELSE 'In Storage'
              END AS Current_Location,
              COALESCE(CR.Condition_Status, 'No Recent Report') AS Last_Condition
       FROM Artwork AW
       LEFT JOIN (
         SELECT al1.Artwork_ID, al1.Loan_ID, inst.Institution_Name
         FROM artwork_loan al1
         JOIN institution inst ON al1.Institution_ID = inst.Institution_ID
         WHERE al1.Status = 'Active' AND (al1.End_Date IS NULL OR al1.End_Date >= CURDATE())
         AND al1.Loan_ID = (
           SELECT MAX(al2.Loan_ID) 
           FROM artwork_loan al2 
           WHERE al2.Artwork_ID = al1.Artwork_ID AND al2.Status = 'Active'
         )
       ) AL_Info ON AW.Artwork_ID = AL_Info.Artwork_ID
       LEFT JOIN (
         SELECT ea1.Artwork_ID, MAX(ea1.Exhibition_ID) as Latest_Exh_ID
         FROM exhibition_artwork ea1
         GROUP BY ea1.Artwork_ID
       ) LatestEA ON AW.Artwork_ID = LatestEA.Artwork_ID
       LEFT JOIN exhibition EX ON LatestEA.Latest_Exh_ID = EX.Exhibition_ID AND (EX.Ending_Date >= CURDATE())
       LEFT JOIN (
         SELECT cr1.Artwork_ID, cr1.Condition_Status
         FROM artwork_condition_report cr1
         WHERE cr1.Report_ID = (
           SELECT MAX(cr2.Report_ID)
           FROM artwork_condition_report cr2
           WHERE cr2.Artwork_ID = cr1.Artwork_ID
         )
       ) CR ON AW.Artwork_ID = CR.Artwork_ID
       WHERE (? IS NULL OR AW.Title LIKE CONCAT('%', ?, '%'))
         AND (? IS NULL OR (
             CASE 
                WHEN AL_Info.Loan_ID IS NOT NULL THEN AL_Info.Institution_Name
                WHEN EX.Exhibition_ID IS NOT NULL THEN EX.Exhibition_Name
                ELSE 'In Storage'
              END
         ) = ?)
         AND (? IS NULL OR COALESCE(CR.Condition_Status, 'No Recent Report') = ?)
       LIMIT 50`,
      [artworkStatusSearch, artworkStatusSearch, locationSearch, locationSearch, conditionSearch, conditionSearch]
    );

    const staffExhibitionSearch = req.query.staff_exhibition?.trim() || null;
    const [staffExhibitionResults] = await pool.query(
      `SELECT EX.Exhibition_Name, 
              E.First_Name, E.Last_Name, E.Employee_Role,
              S.Shift_Date, S.Duty
       FROM Exhibition EX
       JOIN schedule S ON EX.Exhibition_ID = S.Exhibition_ID
       JOIN employee E ON S.Employee_ID = E.Employee_ID
       WHERE (? IS NULL OR EX.Exhibition_Name LIKE CONCAT('%', ?, '%'))
         AND S.Shift_Date >= CURDATE()
       ORDER BY S.Shift_Date, EX.Exhibition_Name
       LIMIT 50`,
      [staffExhibitionSearch, staffExhibitionSearch]
    );

    const artistSearch = req.query.artist?.trim() || null;
    const styleSearch = req.query.style?.trim() || null;
    const titleSearch = req.query.title?.trim() || null;
    const typeSearch = req.query.type?.trim() || null;
    const periodSearch = req.query.period?.trim() || null;

    const startDate = req.query.start_date?.trim() || null;
    const endDate = req.query.end_date?.trim() || null;
    const categorySearch = req.query.category?.trim() || null;
    const maxPrice = req.query.max_price?.trim() || null;

    const [artworkResults] = await pool.query(
      `SELECT AW.Title, AW.Type, AW.Art_Style, AW.Time_Period, AR.Artist_Name
       FROM Artwork AW
       JOIN Artist AR ON AR.Artist_ID = AW.Artist_ID
       WHERE (? IS NULL OR AR.Artist_Name LIKE CONCAT('%', ?, '%'))
         AND (? IS NULL OR AW.Art_Style LIKE CONCAT('%', ?, '%'))
         AND (? IS NULL OR AW.Title LIKE CONCAT('%', ?, '%'))
         AND (? IS NULL OR AW.Type LIKE CONCAT('%', ?, '%'))
         AND (? IS NULL OR AW.Time_Period LIKE CONCAT('%', ?, '%'))
       ORDER BY AR.Artist_Name, AW.Title
       LIMIT 50`,
      [
        artistSearch, artistSearch, 
        styleSearch, styleSearch,
        titleSearch, titleSearch,
        typeSearch, typeSearch,
        periodSearch, periodSearch
      ],
    );

    const [exhibitionResults] = await pool.query(
      `SELECT Exhibition_Name, Starting_Date, Ending_Date
       FROM Exhibition
       WHERE (? IS NULL OR Ending_Date >= ?)
         AND (? IS NULL OR Starting_Date <= ?)
       ORDER BY Starting_Date DESC
       LIMIT 50`,
      [startDate, startDate, endDate, endDate],
    );

    const [inventoryResults] = await pool.query(
      `SELECT Name_of_Item, Category, Price_of_Item, Stock_Quantity
       FROM Gift_Shop_Item
       WHERE (? IS NULL OR Category = ?)
         AND (? IS NULL OR Price_of_Item <= ?)
       ORDER BY Category, Name_of_Item
       LIMIT 50`,
      [categorySearch, categorySearch, maxPrice, maxPrice],
    );

    const [giftCategories] = await pool.query("SELECT DISTINCT Category FROM Gift_Shop_Item WHERE Category IS NOT NULL ORDER BY Category");

    const cafeTypeSearch = req.query.cafe_type?.trim() || null;
    const [cafeResults] = await pool.query(
      `SELECT Food_Name, Type, Food_Price, Stock_Quantity
       FROM Food
       WHERE (? IS NULL OR Type LIKE CONCAT('%', ?, '%'))
       ORDER BY Type, Food_Name
       LIMIT 50`,
      [cafeTypeSearch, cafeTypeSearch],
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

    const cafeRows = cafeResults.map((item) => `
      <tr>
        <td>${escapeHtml(item.Food_Name)}</td>
        <td>${escapeHtml(item.Type || "N/A")}</td>
        <td>$${Number(item.Food_Price).toFixed(2)}</td>
        <td>${item.Stock_Quantity}</td>
      </tr>
    `).join("");

    const artworkStatusRows = artworkStatusResults.map((row) => `
      <tr>
        <td>${escapeHtml(row.Title)}</td>
        <td>${escapeHtml(row.Current_Location)}</td>
        ${isSuper || isEmp ? `<td>${escapeHtml(row.Last_Condition)}</td>` : ""}
      </tr>
    `).join("");

    const staffExhibitionRows = staffExhibitionResults.map((row) => `
      <tr>
        <td>${escapeHtml(row.Exhibition_Name)}</td>
        <td>${escapeHtml(row.First_Name)} ${escapeHtml(row.Last_Name)}</td>
        ${isSuper || isEmp ? `<td>${escapeHtml(row.Employee_Role)}</td>` : ""}
        <td>${formatDisplayDate(row.Shift_Date)}</td>
        ${isSuper ? `<td>${escapeHtml(row.Duty)}</td>` : ""}
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Museum Queries",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <p class="eyebrow">Data Queries</p>
        <h1>Museum Queries</h1>
        <p class="dashboard-note">Advanced museum tracking with role-based visibility.</p>
      </section>

      <section class="card narrow">
        <h2>Artwork Status & Tracking</h2>
        <form method="get" action="/queries" class="form-grid">
          <label>Artwork Title
            <input type="text" name="artwork_status" value="${escapeHtml(artworkStatusSearch ?? '')}" placeholder="Title">
          </label>
          <label>Current Location
            <select name="location">
              <option value="">All Locations</option>
              <option value="In Storage" ${locationSearch === 'In Storage' ? 'selected' : ''}>In Storage</option>
              <optgroup label="Exhibitions">
                ${allExhibitions.map(e => `<option value="${escapeHtml(e.Exhibition_Name)}" ${locationSearch === e.Exhibition_Name ? 'selected' : ''}>${escapeHtml(e.Exhibition_Name)}</option>`).join("")}
              </optgroup>
              <optgroup label="Institutions">
                ${allInstitutions.map(i => `<option value="${escapeHtml(i.Institution_Name)}" ${locationSearch === i.Institution_Name ? 'selected' : ''}>${escapeHtml(i.Institution_Name)}</option>`).join("")}
              </optgroup>
            </select>
          </label>
          <label>Condition Status
            <select name="condition">
              <option value="">All Conditions</option>
              ${conditionStatuses.map(s => `<option value="${escapeHtml(s)}" ${conditionSearch === s ? 'selected' : ''}>${escapeHtml(s)}</option>`).join("")}
            </select>
          </label>
          <button class="button" type="submit">Track Artwork</button>
        </form>
        <table>
          <thead>
            <tr>
              <th>Artwork</th>
              <th>Current Location</th>
              ${isSuper || isEmp ? `<th>Condition Report</th>` : ""}
            </tr>
          </thead>
          <tbody>${artworkStatusRows || '<tr><td colspan="3">No artwork status found.</td></tr>'}</tbody>
        </table>
      </section>

      <section class="card narrow">
        <h2>Exhibition Guides & Staffing</h2>
        <form method="get" action="/queries" class="form-grid">
          <label>Search Exhibition
            <input type="text" name="staff_exhibition" value="${escapeHtml(staffExhibitionSearch ?? '')}" placeholder="Exhibition Name">
          </label>
          <button class="button" type="submit">Find Guides</button>
        </form>
        <table>
          <thead>
            <tr>
              <th>Exhibition</th>
              <th>Staff Member</th>
              ${isSuper || isEmp ? `<th>Role</th>` : ""}
              <th>Date Available</th>
              ${isSuper ? `<th>Specific Duty</th>` : ""}
            </tr>
          </thead>
          <tbody>${staffExhibitionRows || '<tr><td colspan="5">No assignments found for upcoming exhibitions.</td></tr>'}</tbody>
        </table>
      </section>

      <section class="card narrow">
        <h2>Finding Artwork</h2>
        <form method="get" action="/queries" class="form-grid">
          <label>Title
            <input type="text" name="title" value="${escapeHtml(titleSearch ?? '')}">
          </label>
          <label>Artist Name
            <input type="text" name="artist" value="${escapeHtml(artistSearch ?? '')}">
          </label>
          <label>Art Style
            <input type="text" name="style" value="${escapeHtml(styleSearch ?? '')}">
          </label>
          <label>Type
            <input type="text" name="type" value="${escapeHtml(typeSearch ?? '')}">
          </label>
          <label>Time Period
            <input type="text" name="period" value="${escapeHtml(periodSearch ?? '')}" placeholder="e.g. 1601-1650">
          </label>
          <button class="button" type="submit">Search Artwork</button>
        </form>
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Artist</th>
              <th>Type</th>
              <th>Style</th>
              <th>Period</th>
            </tr>
          </thead>
          <tbody>${artworkRows || '<tr><td colspan="5">No artwork matched the selected filters.</td></tr>'}</tbody>
        </table>
      </section>

      <section class="card narrow">
        <h2>Exhibitions by Date Range</h2>
        <form method="get" action="/queries" class="form-grid">
          <label>Start Date
            <input type="date" name="start_date" value="${escapeHtml(startDate ?? '')}">
          </label>
          <label>End Date
            <input type="date" name="end_date" value="${escapeHtml(endDate ?? '')}">
          </label>
          <button class="button" type="submit">Run Query</button>
        </form>
        <table>
          <thead>
            <tr>
              <th>Exhibition</th>
              <th>Starts</th>
              <th>Ends</th>
            </tr>
          </thead>
          <tbody>${exhibitionRows || '<tr><td colspan="3">No exhibitions matched the selected dates.</td></tr>'}</tbody>
        </table>
      </section>

      <section class="card narrow">
        <h2>Gift Shop Inventory</h2>
        <form method="get" action="/queries" class="form-grid">
          <label>Category
            <select name="category">
              <option value="">All Categories</option>
              ${giftCategories.map(c => `
                <option value="${escapeHtml(c.Category)}" ${categorySearch === c.Category ? 'selected' : ''}>
                  ${escapeHtml(c.Category)}
                </option>
              `).join("")}
            </select>
          </label>
          <label>Maximum Price
            <input type="number" step="0.01" min="0" name="max_price" value="${escapeHtml(maxPrice ?? '')}">
          </label>
          <button class="button" type="submit">Search Item</button>
        </form>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>${inventoryRows || '<tr><td colspan="4">No inventory matched the selected filters.</td></tr>'}</tbody>
        </table>
      </section>

      <section class="card narrow">
        <h2>Café Inventory</h2>
        <form method="get" action="/queries" class="form-grid">
          <label>Item Type
            <select name="cafe_type">
              <option value="">All Types</option>
              <option value="Food" ${cafeTypeSearch === 'Food' ? 'selected' : ''}>Food</option>
              <option value="Drink" ${cafeTypeSearch === 'Drink' ? 'selected' : ''}>Drink</option>
              <option value="Dessert" ${cafeTypeSearch === 'Dessert' ? 'selected' : ''}>Dessert</option>
              <option value="Snack" ${cafeTypeSearch === 'Snack' ? 'selected' : ''}>Snack</option>
            </select>
          </label>
          <button class="button" type="submit">Search Café</button>
        </form>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Type</th>
              <th>Price</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>${cafeRows || '<tr><td colspan="4">No café items matched the selected filters.</td></tr>'}</tbody>
        </table>
      </section>
    `,
    }));
  }));
}

module.exports = {registerQueriesRoutes}