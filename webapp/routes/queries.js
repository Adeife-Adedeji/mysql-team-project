const {
  ART_STYLES,
  ART_TYPES,
  ART_PERIODS,
  asyncHandler,
  escapeHtml,
  formatDisplayDate,
  getArtworkAsset,
  getExhibitionAsset,
  getCafeAsset,
  getGiftShopAsset,
  renderPage,
  requireLogin
} = require("../helpers");

function renderArtworkResults(artworkResults) {
  if (!artworkResults.length) {
    return '<div class="empty-state"><p>No artwork matched the selected filters.</p></div>';
  }

  return `
    <div class="collection-grid">
      ${artworkResults.map((artwork) => {
        const asset = getArtworkAsset(artwork.Title, artwork.Type, artwork.Image_URL);
        return `
          <article class="collection-card">
            <div class="collection-card__media"><img src="${asset.imagePath}" alt="${asset.alt}"></div>
            <div class="collection-card__body">
              <p class="eyebrow">${escapeHtml(artwork.Type)}</p>
              <h2>${escapeHtml(artwork.Title)}</h2>
              <p>${escapeHtml(artwork.Artist_Name)}</p>
              <div class="collection-card__meta">
                <span class="status-badge status-badge--neutral">${escapeHtml(artwork.Art_Style || "Style Pending")}</span>
                <span class="status-badge status-badge--neutral">${escapeHtml(artwork.Time_Period || "Period Pending")}</span>
              </div>
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderProductCards(items, type) {
  if (!items.length) {
    return '<div class="empty-state"><p>No items matched the selected filters.</p></div>';
  }

  return `
    <div class="product-grid">
      ${items.map((item) => {
        const name = item.Name_of_Item || item.Food_Name;
        const category = item.Category || item.Type;
        const asset = type === "giftshop"
          ? getGiftShopAsset(name, category, item.Image_URL)
          : getCafeAsset(name, category, item.Image_URL);
        const price = item.Price_of_Item ?? item.Food_Price;
        const stock = item.Stock_Quantity ?? "N/A";
        return `
          <article class="product-card">
            <div class="product-card__media"><img src="${asset.imagePath}" alt="${asset.alt}"></div>
            <div class="product-card__body">
              <p class="eyebrow">${escapeHtml(category || (type === "giftshop" ? "Gift Shop" : "Cafe"))}</p>
              <h2>${escapeHtml(name)}</h2>
              <div class="product-card__meta">
                <span class="status-badge status-badge--neutral">$${Number(price).toFixed(2)}</span>
                <span class="status-badge status-badge--${Number(stock) > 5 ? "success" : Number(stock) > 0 ? "warning" : "danger"}">${stock} in stock</span>
              </div>
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function registerQueriesRoutes(app, { pool }) {
  app.get("/queries", requireLogin, asyncHandler(async (req, res) => {
    const user = req.session.user;
    const isSuper = user.role === "supervisor";
    const isEmp = user.role === "employee" || user.role === "cafe" || user.role === "giftshop" || user.role === "admissions" || user.role === "curator";

    const artworkStatusSearch = req.query.artwork_status?.trim() || null;
    const locationSearch = req.query.location?.trim() || null;
    const conditionSearch = req.query.condition?.trim() || null;

    const [allExhibitions] = await pool.query("SELECT Exhibition_Name FROM Exhibition ORDER BY Exhibition_Name");
    const [allInstitutions] = await pool.query("SELECT Institution_Name FROM institution ORDER BY Institution_Name");
    const conditionStatuses = ["Excellent", "Good", "Fair", "Poor", "Critical", "No Recent Report"];
    const [artworkImageColumns] = await pool.query(
      `SELECT 1
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'Artwork'
         AND COLUMN_NAME = 'Image_URL'
       LIMIT 1`
    );
    const hasArtworkImageColumn = artworkImageColumns.length > 0;
    const [exhibitionImageColumns] = await pool.query(
      `SELECT 1
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'Exhibition'
         AND COLUMN_NAME = 'Image_URL'
       LIMIT 1`
    );
    const hasExhibitionImageColumn = exhibitionImageColumns.length > 0;

    const [artworkStatusResults] = await pool.query(
      `SELECT AW.Title, AW.Type, ${hasArtworkImageColumn ? "AW.Image_URL" : "NULL"} AS Image_URL,
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
    const [giftStockColumns] = await pool.query(
      `SELECT 1
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'Gift_Shop_Item'
         AND COLUMN_NAME = 'Stock_Quantity'
       LIMIT 1`
    );
    const hasGiftStockColumn = giftStockColumns.length > 0;
    const [giftImageColumns] = await pool.query(
      `SELECT 1
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'Gift_Shop_Item'
         AND COLUMN_NAME = 'Image_URL'
       LIMIT 1`
    );
    const hasGiftImageColumn = giftImageColumns.length > 0;

    const [artworkResults] = await pool.query(
      `SELECT AW.Title, AW.Type, AW.Art_Style, AW.Time_Period, ${hasArtworkImageColumn ? "AW.Image_URL" : "NULL"} AS Image_URL, AR.Artist_Name
       FROM Artwork AW
       JOIN Artist AR ON AR.Artist_ID = AW.Artist_ID
       WHERE (? IS NULL OR AR.Artist_Name LIKE CONCAT('%', ?, '%'))
         AND (? IS NULL OR AW.Art_Style = ?)
         AND (? IS NULL OR AW.Title LIKE CONCAT('%', ?, '%'))
         AND (? IS NULL OR AW.Type = ?)
         AND (? IS NULL OR AW.Time_Period = ?)
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
      `SELECT Exhibition_Name, Starting_Date, Ending_Date, ${hasExhibitionImageColumn ? "Image_URL" : "NULL"} AS Image_URL
       FROM Exhibition
       WHERE (? IS NULL OR Ending_Date >= ?)
         AND (? IS NULL OR Starting_Date <= ?)
       ORDER BY Starting_Date DESC
       LIMIT 50`,
      [startDate, startDate, endDate, endDate],
    );

    const [inventoryResults] = await pool.query(
      `SELECT Name_of_Item, Category, Price_of_Item, ${hasGiftStockColumn ? "Stock_Quantity" : "NULL"} AS Stock_Quantity, ${hasGiftImageColumn ? "Image_URL" : "NULL"} AS Image_URL
       FROM Gift_Shop_Item
       WHERE (? IS NULL OR Category = ?)
         AND (? IS NULL OR Price_of_Item <= ?)
       ORDER BY Category, Name_of_Item
       LIMIT 50`,
      [categorySearch, categorySearch, maxPrice, maxPrice],
    );

    const [giftCategories] = await pool.query("SELECT DISTINCT Category FROM Gift_Shop_Item WHERE Category IS NOT NULL ORDER BY Category");

    const cafeTypeSearch = req.query.cafe_type?.trim() || null;
    const [foodTypeColumns] = await pool.query(
      `SELECT 1
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'Food'
         AND COLUMN_NAME = 'Type'
       LIMIT 1`
    );
    const hasFoodTypeColumn = foodTypeColumns.length > 0;
    const [foodStockColumns] = await pool.query(
      `SELECT 1
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'Food'
         AND COLUMN_NAME = 'Stock_Quantity'
       LIMIT 1`
    );
    const hasFoodStockColumn = foodStockColumns.length > 0;
    const [foodImageColumns] = await pool.query(
      `SELECT 1
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'Food'
         AND COLUMN_NAME = 'Image_URL'
       LIMIT 1`
    );
    const hasFoodImageColumn = foodImageColumns.length > 0;
    const cafeFilterSql = hasFoodTypeColumn
      ? "(? IS NULL OR Type LIKE CONCAT('%', ?, '%'))"
      : "(? IS NULL)";
    const cafeFilterParams = hasFoodTypeColumn
      ? [cafeTypeSearch, cafeTypeSearch]
      : [cafeTypeSearch];
    const [cafeResults] = await pool.query(
      `SELECT Food_Name,
              ${hasFoodTypeColumn ? "Type" : "NULL"} AS Type,
              Food_Price,
              ${hasFoodStockColumn ? "Stock_Quantity" : "NULL"} AS Stock_Quantity,
              ${hasFoodImageColumn ? "Image_URL" : "NULL"} AS Image_URL
       FROM Food
       WHERE ${cafeFilterSql}
       ORDER BY ${hasFoodTypeColumn ? "Type," : ""} Food_Name
       LIMIT 50`,
      cafeFilterParams,
    );
    const canViewStaffing = isSuper || isEmp;

    const artworkStatusRows = artworkStatusResults.map((row) => {
      const asset = getArtworkAsset(row.Title, row.Type, row.Image_URL);
      return `
        <tr>
          <td><img src="${asset.imagePath}" alt="${asset.alt}" class="table-thumb"></td>
          <td>${escapeHtml(row.Title)}</td>
          <td>${escapeHtml(row.Current_Location)}</td>
          ${isSuper || isEmp ? `<td><span class="condition-badge condition-badge--${escapeHtml(String(row.Last_Condition || "pending").toLowerCase().replace(/\s+/g, "-"))}">${escapeHtml(row.Last_Condition)}</span></td>` : ""}
        </tr>
      `;
    }).join("");

    const staffExhibitionRows = staffExhibitionResults.map((row) => `
      <tr>
        <td>${escapeHtml(row.Exhibition_Name)}</td>
        <td>${escapeHtml(row.First_Name)} ${escapeHtml(row.Last_Name)}</td>
        ${isSuper || isEmp ? `<td>${escapeHtml(row.Employee_Role)}</td>` : ""}
        <td>${formatDisplayDate(row.Shift_Date)}</td>
        ${isSuper ? `<td>${escapeHtml(row.Duty)}</td>` : ""}
      </tr>
    `).join("");

    const exhibitionRows = exhibitionResults.map((exhibition) => {
      const asset = getExhibitionAsset(exhibition.Exhibition_Name, exhibition.Image_URL);
      return `
        <tr>
          <td><img src="${asset.imagePath}" alt="${asset.alt}" class="table-thumb"></td>
          <td>${escapeHtml(exhibition.Exhibition_Name)}</td>
          <td>${formatDisplayDate(exhibition.Starting_Date)}</td>
          <td>${formatDisplayDate(exhibition.Ending_Date)}</td>
        </tr>
      `;
    }).join("");

    res.send(renderPage({
      title: "Collection Search",
      user: req.session.user,
      currentPath: req.path,
      hero: isEmp || isSuper ? null : {
        eyebrow: "Collection Search",
        title: "Collection",
        description: "",
        imagePath: "/images/the-farnese-hours.jpg",
        alt: "Museum collection artwork.",
      },
      featureCards: isEmp || isSuper ? null : [
        { eyebrow: "Collections", title: "Artwork", description: "", href: "/queries?view=artwork-status#query-tabs", linkLabel: "View Artwork", imagePath: "/images/allegory.jpg", alt: "Artwork search card." },
        { eyebrow: "Exhibitions", title: "Exhibitions", description: "", href: "/queries?view=exhibition-dates#query-tabs", linkLabel: "View Exhibitions", imagePath: "/images/spring-collection.jpg", alt: "Exhibition card." },
        { eyebrow: "Operations", title: "Shop and Cafe", description: "", href: "/queries?view=gift-inventory#query-tabs", linkLabel: "Browse Inventory", imagePath: "/images/gift-shop.jpg", alt: "Gift shop display." },
      ],
      content: `
        ${isEmp || isSuper ? `
        <section class="card narrow collection-work-header">
          <h1>Collection Tracking</h1>
        </section>
        ` : ""}
        <section class="card narrow query-tab-shell" id="query-tabs">
          <div class="tab-bar" data-tab-group="queries">
            <button class="tab-button" type="button" data-tab-target="artwork-status">Artwork Status</button>
            ${canViewStaffing ? '<button class="tab-button" type="button" data-tab-target="staff-exhibitions">Staffing</button>' : ""}
            <button class="tab-button" type="button" data-tab-target="artwork-search">Artwork Search</button>
            <button class="tab-button" type="button" data-tab-target="exhibition-dates">Exhibitions</button>
            <button class="tab-button" type="button" data-tab-target="gift-inventory">Gift Shop</button>
            <button class="tab-button" type="button" data-tab-target="cafe-inventory">Cafe</button>
          </div>
        </section>

        <section class="card narrow tab-panel" data-tab-group="queries" data-tab-panel="artwork-status">
          <h2>Artwork Status</h2>
          <form method="get" action="/queries" class="form-grid">
            <label>Artwork Title
              <input type="text" name="artwork_status" value="${escapeHtml(artworkStatusSearch ?? "")}" placeholder="Title">
            </label>
            <label>Current Location
              <select name="location">
                <option value="">All Locations</option>
                <option value="In Storage" ${locationSearch === "In Storage" ? "selected" : ""}>In Storage</option>
                <optgroup label="Exhibitions">
                  ${allExhibitions.map(e => `<option value="${escapeHtml(e.Exhibition_Name)}" ${locationSearch === e.Exhibition_Name ? "selected" : ""}>${escapeHtml(e.Exhibition_Name)}</option>`).join("")}
                </optgroup>
                <optgroup label="Institutions">
                  ${allInstitutions.map(i => `<option value="${escapeHtml(i.Institution_Name)}" ${locationSearch === i.Institution_Name ? "selected" : ""}>${escapeHtml(i.Institution_Name)}</option>`).join("")}
                </optgroup>
              </select>
            </label>
            <label>Condition Status
              <select name="condition">
                <option value="">All Conditions</option>
                ${conditionStatuses.map(s => `<option value="${escapeHtml(s)}" ${conditionSearch === s ? "selected" : ""}>${escapeHtml(s)}</option>`).join("")}
              </select>
            </label>
            <button class="button" type="submit">Track Artwork</button>
          </form>
          <table>
            <thead>
              <tr>
                <th>Image</th>
                <th>Artwork</th>
                <th>Current Location</th>
                ${isSuper || isEmp ? "<th>Condition Report</th>" : ""}
              </tr>
            </thead>
            <tbody>${artworkStatusRows || `<tr><td colspan="${isSuper || isEmp ? 4 : 3}">No artwork status found.</td></tr>`}</tbody>
          </table>
        </section>

        ${canViewStaffing ? `
        <section class="card narrow tab-panel" data-tab-group="queries" data-tab-panel="staff-exhibitions">
          <h2>Exhibition Guides and Staffing</h2>
          <form method="get" action="/queries" class="form-grid">
            <label>Search Exhibition
              <select name="staff_exhibition">
                <option value="">All Exhibitions</option>
                ${allExhibitions.map((exhibition) => `
                  <option value="${escapeHtml(exhibition.Exhibition_Name)}" ${staffExhibitionSearch === exhibition.Exhibition_Name ? "selected" : ""}>
                    ${escapeHtml(exhibition.Exhibition_Name)}
                  </option>
                `).join("")}
              </select>
            </label>
            <button class="button" type="submit">Find Guides</button>
          </form>
          <table>
            <thead>
              <tr>
                <th>Exhibition</th>
                <th>Staff Member</th>
                ${isSuper || isEmp ? "<th>Role</th>" : ""}
                <th>Date Available</th>
                ${isSuper ? "<th>Specific Duty</th>" : ""}
              </tr>
            </thead>
            <tbody>${staffExhibitionRows || `<tr><td colspan="${isSuper ? 5 : isEmp ? 4 : 3}">No assignments found for upcoming exhibitions.</td></tr>`}</tbody>
          </table>
        </section>
        ` : ""}

        <section class="card narrow tab-panel" data-tab-group="queries" data-tab-panel="artwork-search" id="artwork-search-panel">
          <h2>Artwork Search</h2>
          <form method="get" action="/queries" class="form-grid">
            <label>Title
              <input type="text" name="title" value="${escapeHtml(titleSearch ?? "")}">
            </label>
            <label>Artist Name
              <input type="text" name="artist" value="${escapeHtml(artistSearch ?? "")}">
            </label>
            <label>Art Style
              <select name="style">
                <option value="">All Styles</option>
                ${ART_STYLES.map((s) => `<option value="${escapeHtml(s)}" ${styleSearch === s ? "selected" : ""}>${escapeHtml(s)}</option>`).join("")}
              </select>
            </label>
            <label>Type
              <select name="type">
                <option value="">All Types</option>
                ${ART_TYPES.map((t) => `<option value="${escapeHtml(t)}" ${typeSearch === t ? "selected" : ""}>${escapeHtml(t)}</option>`).join("")}
              </select>
            </label>
            <label>Time Period
              <select name="period">
                <option value="">All Periods</option>
                ${ART_PERIODS.map((p) => `<option value="${escapeHtml(p)}" ${periodSearch === p ? "selected" : ""}>${escapeHtml(p)}</option>`).join("")}
              </select>
            </label>
            <button class="button" type="submit">Search Artwork</button>
          </form>
          ${renderArtworkResults(artworkResults)}
        </section>

        <section class="card narrow tab-panel" data-tab-group="queries" data-tab-panel="exhibition-dates" id="exhibition-panel">
          <h2>Exhibitions by Date Range</h2>
          <form method="get" action="/queries" class="form-grid">
            <label>Start Date
              <input type="date" name="start_date" value="${escapeHtml(startDate ?? "")}">
            </label>
            <label>End Date
              <input type="date" name="end_date" value="${escapeHtml(endDate ?? "")}">
            </label>
            <button class="button" type="submit">View Exhibitions</button>
          </form>
          <table>
            <thead>
              <tr>
                <th>Image</th>
                <th>Exhibition</th>
                <th>Starts</th>
                <th>Ends</th>
              </tr>
            </thead>
            <tbody>${exhibitionRows || '<tr><td colspan="4">No exhibitions matched the selected dates.</td></tr>'}</tbody>
          </table>
        </section>

        <section class="card narrow tab-panel" data-tab-group="queries" data-tab-panel="gift-inventory" id="gift-panel">
          <h2>Gift Shop Inventory</h2>
          <form method="get" action="/queries" class="form-grid">
            <label>Category
              <select name="category">
                <option value="">All Categories</option>
                ${giftCategories.map(c => `
                  <option value="${escapeHtml(c.Category)}" ${categorySearch === c.Category ? "selected" : ""}>
                    ${escapeHtml(c.Category)}
                  </option>
                `).join("")}
              </select>
            </label>
            <label>Maximum Price
              <input type="number" step="0.01" min="0" name="max_price" value="${escapeHtml(maxPrice ?? "")}">
            </label>
            <button class="button" type="submit">Search Item</button>
          </form>
          ${renderProductCards(inventoryResults, "giftshop")}
        </section>

        <section class="card narrow tab-panel" data-tab-group="queries" data-tab-panel="cafe-inventory">
          <h2>Cafe Inventory</h2>
          <form method="get" action="/queries" class="form-grid">
            <label>Item Type
              <select name="cafe_type">
                <option value="">All Types</option>
                <option value="Food" ${cafeTypeSearch === "Food" ? "selected" : ""}>Food</option>
                <option value="Drink" ${cafeTypeSearch === "Drink" ? "selected" : ""}>Drink</option>
                <option value="Dessert" ${cafeTypeSearch === "Dessert" ? "selected" : ""}>Dessert</option>
                <option value="Snack" ${cafeTypeSearch === "Snack" ? "selected" : ""}>Snack</option>
              </select>
            </label>
            <button class="button" type="submit">Search Cafe</button>
          </form>
          ${renderProductCards(cafeResults, "cafe")}
        </section>
      `,
    }));
  }));
}

module.exports = { registerQueriesRoutes };
