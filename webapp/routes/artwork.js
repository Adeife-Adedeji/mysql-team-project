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
  allowRoles,
  logTriggerViolation
} = require("../helpers");

const ART_STYLES = [
  "Abstract", "Baroque", "Contemporary", "Cubism", "Expressionism", 
  "Impressionism", "Mannerism","Modern", "Neoclassicism", "Pop Art", "Post-Impressionism", 
  "Realism", "Renaissance", "Romanticism", "Surrealism", "Symbolism"
];

const ART_TYPES = [
  "Painting", "Sculpture", "Photograph", "Drawing", "Print", 
  "Installation", "Video Art", "Textile", "Ceramic", "Digital Art"
];

const ART_PERIODS = [
  "Early Renaissance (1300-1499)", "High Renaissance (1500-1527)", "Mannerism (1520-1600)",
  "Baroque (1600-1750)", "Rococo (1700-1775)", "Neoclassicism (1750-1850)", "Romanticism (1800-1850)",
  "Realism (1840-1880)", "Impressionism (1860-1890)", "Post-Impressionism (1886-1905)", "Modernism (1890-1970)",
  "Expressionism (1905-1920)", "Cubism (1907-1914)", "Surrealism (1920s-1950s)", "Abstract Expressionism (1940s-1950s)",
  "Pop Art (1950s-1960s)", "Contemporary (1970-present)"
];

function registerArtworkRoutes (app, { pool }) {
    app.get("/add-artwork", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const artworkPage = getPageNumber(req.query.artwork_page);
    const [artists] = await pool.query("SELECT Artist_ID, Artist_Name FROM Artist");
    
    if (artists.length === 0) {
      setFlash(req, "Please add an artist first.");
      return res.redirect("/add-artist");
    }

    let editArtwork = null;
    if (req.query.edit_id) {
      const [rows] = await pool.query(
        "SELECT * FROM Artwork WHERE Artwork_ID = ?",
        [req.query.edit_id],
      );
      editArtwork = rows[0] || null;
    }

    const [artworks] = await pool.query(`
      SELECT Artwork.Artwork_ID, Artwork.Title, Artwork.Type, Artwork.Art_Style, Artwork.Time_Period, Artwork.Artist_ID, Artist.Artist_Name
      FROM Artwork
      JOIN Artist ON Artwork.Artist_ID = Artist.Artist_ID
    `);

    const artworkPagination = paginateRows(artworks, artworkPage);
    const artworkRows = artworkPagination.items.map((artwork) => `
      <tr>
        <td>${artwork.Artwork_ID}</td>
        <td>${escapeHtml(artwork.Title)}</td>
        <td>${escapeHtml(artwork.Type)}</td>
        <td>${escapeHtml(artwork.Art_Style || "—")}</td>
        <td>${escapeHtml(artwork.Time_Period || "—")}</td>
        <td>${escapeHtml(artwork.Artist_Name)}</td>
        <td class="actions">
          <form method="get" action="/add-artwork" class="inline-form">
            <input type="hidden" name="edit_id" value="${artwork.Artwork_ID}">
            <button class="link-button" type="submit">Edit</button>
          </form>
          <form method="post" action="/delete-artwork" class="inline-form" onsubmit="return confirm('Are you sure you want to delete this artwork?');">
            <input type="hidden" name="artwork_id" value="${artwork.Artwork_ID}">
            <button class="link-button danger" type="submit">Delete</button>
          </form>
        </td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Manage Artwork",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>${editArtwork ? "Edit Artwork" : "Add New Artwork"}</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-artwork" class="form-grid">
          ${editArtwork ? `<input type="hidden" name="artwork_id" value="${editArtwork.Artwork_ID}">` : ""}
          <label>
            Title
            <input type="text" name="title" value="${editArtwork ? escapeHtml(editArtwork.Title) : ""}" required>
          </label>
          <label>
            Type
            <select name="type" required>
              <option value="">Select a type</option>
              ${ART_TYPES.map((type) => `
                <option value="${escapeHtml(type)}" ${editArtwork && editArtwork.Type === type ? "selected" : ""}>
                  ${escapeHtml(type)}
                </option>
              `).join("")}
            </select>
          </label>
          <label>
            Style
            <select name="art_style">
              <option value="">Select a style</option>
              ${ART_STYLES.map((style) => `
                <option value="${escapeHtml(style)}" ${editArtwork && editArtwork.Art_Style === style ? "selected" : ""}>
                  ${escapeHtml(style)}
                </option>
              `).join("")}
            </select>
          </label>
          <label>
            Period
            <select name="time_period">
              <option value="">Select a period</option>
              ${ART_PERIODS.map((period) => `
                <option value="${escapeHtml(period)}" ${editArtwork && editArtwork.Time_Period === period ? "selected" : ""}>
                  ${escapeHtml(period)}
                </option>
              `).join("")}
            </select>
          </label>
          <label>Artist
            <select name="artist_id" required>
              ${artists.map((artist) => `
                <option value="${artist.Artist_ID}" ${editArtwork && editArtwork.Artist_ID === artist.Artist_ID ? "selected" : ""}>
                  ${escapeHtml(artist.Artist_Name)}
                </option>
              `).join("")}
            </select>
          </label>
          <button class="button" type="submit">${editArtwork ? "Update Artwork" : "Add Artwork"}</button>
        </form>
      </section>
      <section class="card narrow">
        <div id="artwork-list"></div>
        <h2>Current Artworks</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Type</th>
              <th>Style</th>
              <th>Period</th>
              <th>Artist Name</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${artworkRows || '<tr><td colspan="6">No artworks found.</td></tr>'}
          </tbody>
        </table>
        ${renderPager(req, "artwork_page", artworkPagination, "artwork-list")}
      </section>
    `,
    }));
  }));

  app.post("/add-artwork", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const id = req.body.artwork_id || null;
    const title = req.body.title?.trim();
    const type = req.body.type?.trim();
    const artStyle = req.body.art_style?.trim() || null;
    const timePeriod = req.body.time_period?.trim() || null;
    const artistId = req.body.artist_id;

    if (!title || !type || !artistId) {
      setFlash(req, "All fields are required.");
      return res.redirect("/add-artwork");
    }

    if (id) {
      await pool.query(
        "UPDATE Artwork SET Title = ?, Type = ?, Art_Style = ?, Time_Period = ?, Artist_ID = ? WHERE Artwork_ID = ?",
        [title, type, artStyle, timePeriod, artistId, id],
      );
      setFlash(req, "Artwork updated successfully.");
    } else {
      await pool.query(
        `INSERT INTO Artwork (Title, Type, Art_Style, Time_Period, Artist_ID)
         VALUES (?, ?, ?, ?, ?)`,
        [title, type, artStyle, timePeriod, artistId],
      );
      setFlash(req, "Artwork added successfully.");
    }

    res.redirect("/add-artwork");
  }));

  app.post("/delete-artwork", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const idToDelete = req.body.artwork_id;

    if (!idToDelete) {
      setFlash(req, "Error: No artwork ID provided.");
      return res.redirect("/add-artwork");
    }

    try {
      await pool.query("DELETE FROM Artwork WHERE Artwork_ID = ?", [idToDelete]);
      setFlash(req, "Artwork successfully deleted!");
    } catch (err) {
      if (err.sqlState === "45000") {
        await logTriggerViolation(pool, req, err.sqlMessage);
        setFlash(req, err.sqlMessage);
      } else {
        throw err;
      }
    }
    res.redirect("/add-artwork");
  }));
}

module.exports = { registerArtworkRoutes };
