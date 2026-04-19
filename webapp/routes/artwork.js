const {
  ART_STYLES,
  ART_TYPES,
  ART_PERIODS,
  asyncHandler,
  escapeHtml,
  getPageNumber,
  paginateRows,
  renderFlash,
  renderPager,
  renderPage,
  requireLogin,
  sanitizeImageUrl,
  setFlash,
  allowRoles,
  logTriggerViolation
} = require("../helpers");

async function hasColumn(pool, tableName, columnName) {
  const [rows] = await pool.query(
    `SELECT 1
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName],
  );

  return rows.length > 0;
}

function registerArtworkRoutes (app, { pool }) {
    app.get("/add-artwork", requireLogin, allowRoles(["supervisor", "curator"]), asyncHandler(async (req, res) => {
    const artworkPage = getPageNumber(req.query.artwork_page);
    const hasImageUrlColumn = await hasColumn(pool, "Artwork", "Image_URL");
    const [artists] = await pool.query("SELECT Artist_ID, Artist_Name FROM Artist");
    
    if (artists.length === 0) {
      setFlash(req, "Create an artist record before adding artwork.");
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
      SELECT Artwork.Artwork_ID, Artwork.Title, Artwork.Type, Artwork.Art_Style, Artwork.Time_Period, Artwork.Artist_ID, ${hasImageUrlColumn ? "Artwork.Image_URL" : "NULL"} AS Image_URL, Artist.Artist_Name
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
        <td>${artwork.Image_URL ? `<img src="${escapeHtml(artwork.Image_URL)}" alt="${escapeHtml(artwork.Title)} preview" class="table-thumb">` : "—"}</td>
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
        <h1>${editArtwork ? "Edit Artwork" : "Create Artwork Record"}</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-artwork" class="form-grid">
          ${editArtwork ? `<input type="hidden" name="artwork_id" value="${editArtwork.Artwork_ID}">` : ""}
          <label>
            Title
            <input type="text" name="title" value="${editArtwork ? escapeHtml(editArtwork.Title) : ""}" required>
          </label>
          <label>
            Image
            <input type="text" name="image_url" value="${editArtwork ? escapeHtml(editArtwork.Image_URL || "") : ""}" placeholder="allegory.jpg, /images/allegory.jpg, or https://...">
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
          <button class="button" type="submit">${editArtwork ? "Save Artwork" : "Create Artwork"}</button>
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
              <th>Image</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${artworkRows || '<tr><td colspan="8">No artworks found.</td></tr>'}
          </tbody>
        </table>
        ${renderPager(req, "artwork_page", artworkPagination, "artwork-list")}
      </section>
    `,
    }));
  }));

  app.post("/add-artwork", requireLogin, allowRoles(["supervisor", "curator"]), asyncHandler(async (req, res) => {
    const id = req.body.artwork_id || null;
    const title = req.body.title?.trim();
    const type = req.body.type?.trim();
    const artStyle = req.body.art_style?.trim() || null;
    const timePeriod = req.body.time_period?.trim() || null;
    const imageUrl = sanitizeImageUrl(req.body.image_url) || null;
    const artistId = req.body.artist_id;
    const hasImageUrlColumn = await hasColumn(pool, "Artwork", "Image_URL");

    if (!title || !type || !artistId) {
      setFlash(req, "All fields are required.");
      return res.redirect("/add-artwork");
    }

    if (id) {
      if (hasImageUrlColumn) {
        await pool.query(
          "UPDATE Artwork SET Title = ?, Type = ?, Art_Style = ?, Time_Period = ?, Artist_ID = ?, Image_URL = ? WHERE Artwork_ID = ?",
          [title, type, artStyle, timePeriod, artistId, imageUrl, id],
        );
      } else {
        await pool.query(
          "UPDATE Artwork SET Title = ?, Type = ?, Art_Style = ?, Time_Period = ?, Artist_ID = ? WHERE Artwork_ID = ?",
          [title, type, artStyle, timePeriod, artistId, id],
        );
      }
      setFlash(req, "Artwork record updated.");
    } else {
      if (hasImageUrlColumn) {
        await pool.query(
          `INSERT INTO Artwork (Title, Type, Art_Style, Time_Period, Artist_ID, Image_URL)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [title, type, artStyle, timePeriod, artistId, imageUrl],
        );
      } else {
        await pool.query(
          `INSERT INTO Artwork (Title, Type, Art_Style, Time_Period, Artist_ID)
           VALUES (?, ?, ?, ?, ?)`,
          [title, type, artStyle, timePeriod, artistId],
        );
      }
      setFlash(req, "Artwork record created.");
    }

    res.redirect("/add-artwork");
  }));

  app.post("/delete-artwork", requireLogin, allowRoles(["supervisor", "curator"]), asyncHandler(async (req, res) => {
    const idToDelete = req.body.artwork_id;

    if (!idToDelete) {
      setFlash(req, "Select an artwork record before deleting.");
      return res.redirect("/add-artwork");
    }

    try {
      await pool.query("DELETE FROM Artwork WHERE Artwork_ID = ?", [idToDelete]);
      setFlash(req, "Artwork record deleted.");
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
