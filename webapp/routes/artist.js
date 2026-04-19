const {
  asyncHandler,
  escapeHtml,
  formatDateInput,
  formatDisplayDate,
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

function registerArtistRoutes(app, { pool }) {
  app.get("/add-artist", requireLogin, allowRoles(["supervisor", "curator"]), asyncHandler(async (req, res) => {
    const artistPage = getPageNumber(req.query.artist_page);
    const hasImageUrlColumn = await hasColumn(pool, "Artist", "Image_URL");
    const [artists] = await pool.query(
      `SELECT Artist_ID, Artist_Name, Birth_Place, Date_of_Birth, Date_of_Death, ${hasImageUrlColumn ? "Image_URL" : "NULL"} AS Image_URL FROM Artist`,
    );

    let editArtist = null; 
    if (req.query.edit_id) {
      const [rows] = await pool.query(
        "SELECT * FROM Artist WHERE Artist_ID = ?",
        [req.query.edit_id],
      );
      editArtist = rows[0] || null;
    }

    const artistPagination = paginateRows(artists, artistPage);
    const artistRows = artistPagination.items.map((artist) => `
      <tr>
        <td>${artist.Artist_ID}</td>
        <td>${escapeHtml(artist.Artist_Name)}</td>
        <td>${escapeHtml(artist.Birth_Place || "Unknown")}</td>
        <td>${formatDisplayDate(artist.Date_of_Birth)}</td>
        <td>${artist.Date_of_Death ? formatDisplayDate(artist.Date_of_Death) : "<em>Still Alive</em>"}</td>
        <td>${artist.Image_URL ? `<img src="${escapeHtml(artist.Image_URL)}" alt="${escapeHtml(artist.Artist_Name)} preview" class="table-thumb">` : "—"}</td>
        <td class="actions">
          <form method="get" action="/add-artist" class="inline-form">
            <input type="hidden" name="edit_id" value="${artist.Artist_ID}">
            <button class="link-button" type="submit">Edit</button>
          </form>
          <form method="post" action="/delete-artist" class="inline-form" onsubmit="return confirm('Delete this artist record?');">
            <input type="hidden" name="artist_id" value="${artist.Artist_ID}">
            <button class="link-button danger" type="submit">Delete</button>
          </form>
        </td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Manage Artists",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>${editArtist ? "Edit Artist" : "Create Artist Record"}</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-artist" class="form-grid">
          ${editArtist ? `<input type="hidden" name="artist_id" value="${editArtist.Artist_ID}">` : ""}
          <label>
            Artist Name
            <input type="text" name="name" value="${editArtist ? escapeHtml(editArtist.Artist_Name) : ""}" required>
          </label>
          <label>
            Birth Place
            <input type="text" name="birthplace" value="${editArtist ? escapeHtml(editArtist.Birth_Place) : ""}">
          </label>
          <label>
            Image
            <input type="text" name="image_url" value="${editArtist ? escapeHtml(editArtist.Image_URL || "") : ""}" placeholder="jacopo-da-empoli.jpg, /images/jacopo-da-empoli.jpg, or https://...">
          </label>
          <label>
            Date of Birth
            <input type="date" name="dob" value="${editArtist ? formatDateInput(editArtist.Date_of_Birth) : ""}">
          </label>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <label class="checkbox-label" style="display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" name="still_alive" id="stillAliveCheckbox" value="1"
                ${editArtist ? (editArtist.Date_of_Death ? "" : "checked") : "checked"}
                onchange="document.getElementById('dodWrapper').style.display = this.checked ? 'none' : 'flex'">
              Artist is living
            </label>
            <div id="dodWrapper" style="display:${editArtist && editArtist.Date_of_Death ? 'flex' : 'none'}; flex-direction: column; gap: 4px;">
              <label>
                Date of Death
                <input type="date" name="dod" value="${editArtist ? formatDateInput(editArtist.Date_of_Death) : ''}">
              </label>
            </div>
          </div>
          <button class="button" type="submit">${editArtist ? "Save Artist" : "Create Artist"}</button>
        </form>
      </section>
      <section class="card narrow">
        <div id="artist-list"></div>
        <h2>Current Artists</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Birth Place</th>
              <th>Date of Birth</th>
              <th>Date of Death</th>
              <th>Image</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${artistRows || '<tr><td colspan="7">No artists found.</td></tr>'}
          </tbody>
        </table>
        ${renderPager(req, "artist_page", artistPagination, "artist-list")}
      </section>
    `,
    }));
  }));

  app.post("/add-artist", requireLogin, allowRoles(["supervisor", "curator"]), asyncHandler(async (req, res) => {
    const id = req.body.artist_id || null;
    const name = req.body.name?.trim();
    const dob = req.body.dob || null;
    const dod = req.body.still_alive === '1' ? null : (req.body.dod || null);
    const birthplace = req.body.birthplace?.trim() || null;
    const imageUrl = sanitizeImageUrl(req.body.image_url) || null;
    const hasImageUrlColumn = await hasColumn(pool, "Artist", "Image_URL");

    if (!name) {
      setFlash(req, "Artist name is required.");
      return res.redirect("/add-artist");
    }

    if (id) {
      try {
        if (hasImageUrlColumn) {
          await pool.query(
            `UPDATE Artist
             SET Artist_Name = ?, Birth_Place = ?, Date_of_Birth = ?, Date_of_Death = ?, Image_URL = ?
             WHERE Artist_ID = ?`,
            [name, birthplace, dob, dod, imageUrl, id],
          );
        } else {
          await pool.query(
            `UPDATE Artist
             SET Artist_Name = ?, Birth_Place = ?, Date_of_Birth = ?, Date_of_Death = ?
             WHERE Artist_ID = ?`,
            [name, birthplace, dob, dod, id],
          );
        }
        setFlash(req, "Artist record updated.");
      } catch (err) {
        if (err.sqlState === "45000") {
          await logTriggerViolation(pool, req, err.sqlMessage);
          setFlash(req, err.sqlMessage);
        } else {
          throw err;
        }
      }
    } else {
      try {
        if (hasImageUrlColumn) {
          await pool.query(
            `INSERT INTO Artist (Artist_Name, Birth_Place, Date_of_Birth, Date_of_Death, Image_URL)
             VALUES (?, ?, ?, ?, ?)`,
            [name, birthplace, dob, dod, imageUrl],
          );
        } else {
          await pool.query(
            `INSERT INTO Artist (Artist_Name, Birth_Place, Date_of_Birth, Date_of_Death)
             VALUES (?, ?, ?, ?)`,
            [name, birthplace, dob, dod],
          );
        }
        setFlash(req, "Artist record created.");
      } catch (err) {
        if (err.sqlState === "45000") {
          await logTriggerViolation(pool, req, err.sqlMessage);
          setFlash(req, err.sqlMessage);
        } else {
          throw err;
        }
      }
    }

    res.redirect("/add-artist");
  }));

  app.post("/delete-artist", requireLogin, allowRoles(["supervisor", "curator"]), asyncHandler(async (req, res) => {
    const idToDelete = req.body.artist_id;

    if (!idToDelete) {
      setFlash(req, "Select an artist record before deleting.");
      return res.redirect("/add-artist");
    }

    const [[artworkCount]] = await pool.query(
      "SELECT COUNT(*) AS cnt FROM Artwork WHERE Artist_ID = ?",
      [idToDelete]
    );
    if (artworkCount.cnt > 0) {
      setFlash(req, `This artist is linked to ${artworkCount.cnt} artwork record(s). Remove or reassign those artworks before deleting the artist.`);
      return res.redirect("/add-artist");
    }

    await pool.query("DELETE FROM Artist WHERE Artist_ID = ?", [idToDelete]);
    setFlash(req, "Artist record deleted.");
    res.redirect("/add-artist");
  }));
}

module.exports = { registerArtistRoutes };
