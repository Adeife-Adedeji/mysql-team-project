const {
  asyncHandler,
  escapeHtml,
  formatDisplayDate,
  renderPage,
  requireLogin
} = require("../helpers");

function registerQueriesRoutes(app, { pool }) {
  app.get("/queries", requireLogin, asyncHandler(async (req, res) => {
    const artistSearch = req.query.artist?.trim() || null;
    const styleSearch = req.query.style?.trim() || null;
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
       ORDER BY AR.Artist_Name, AW.Title
       LIMIT 50`,
      [artistSearch, artistSearch, styleSearch, styleSearch],
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
       WHERE (? IS NULL OR Category LIKE CONCAT('%', ?, '%'))
         AND (? IS NULL OR Price_of_Item <= ?)
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
            <input type="text" name="artist" value="${escapeHtml(artistSearch ?? '')}">
          </label>
          <label>Art Style
            <input type="text" name="style" value="${escapeHtml(styleSearch ?? '')}">
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
            <input type="date" name="start_date" value="${escapeHtml(startDate ?? '')}">
          </label>
          <label>End Date
            <input type="date" name="end_date" value="${escapeHtml(endDate ?? '')}">
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
            <input type="text" name="category" value="${escapeHtml(categorySearch ?? '')}">
          </label>
          <label>Maximum Price
            <input type="number" step="0.01" min="0" name="max_price" value="${escapeHtml(maxPrice ?? '')}">
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
}

module.exports = {registerQueriesRoutes}