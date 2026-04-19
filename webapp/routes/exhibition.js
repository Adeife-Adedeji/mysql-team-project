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

function registerExhibitionRoutes(app, { pool }) {
  app.get("/add-exhibition", requireLogin, allowRoles(["supervisor", "curator"]), asyncHandler(async (req, res) => {
    const exhibitionPage = getPageNumber(req.query.exhibition_page);
    const hasImageUrlColumn = await hasColumn(pool, "Exhibition", "Image_URL");
    const [exhibitions] = await pool.query(
      `SELECT Exhibition_ID, Exhibition_Name, Starting_Date, Ending_Date, ${hasImageUrlColumn ? "Image_URL" : "NULL"} AS Image_URL FROM Exhibition`,
    );

    let editExhibition = null;
    if (req.query.edit_id) {
      const [rows] = await pool.query(
        "SELECT * FROM Exhibition WHERE Exhibition_ID = ?",
        [req.query.edit_id],
      );
      editExhibition = rows[0] || null;
    }

    const exhibitionPagination = paginateRows(exhibitions, exhibitionPage);
    const exhibitionRows = exhibitionPagination.items.map((exhibition) => `
      <tr>
        <td>${exhibition.Exhibition_ID}</td>
        <td>${escapeHtml(exhibition.Exhibition_Name)}</td>
        <td>${formatDisplayDate(exhibition.Starting_Date)}</td>
        <td>${formatDisplayDate(exhibition.Ending_Date)}</td>
        <td>${exhibition.Image_URL ? `<img src="${escapeHtml(exhibition.Image_URL)}" alt="${escapeHtml(exhibition.Exhibition_Name)} preview" class="table-thumb">` : "—"}</td>
        <td class="actions">
          <form method="get" action="/add-exhibition" class="inline-form">
            <input type="hidden" name="edit_id" value="${exhibition.Exhibition_ID}">
            <button class="link-button" type="submit">Edit</button>
          </form>
          <form method="post" action="/delete-exhibition" class="inline-form" onsubmit="return confirm('Delete this exhibition?');">
            <input type="hidden" name="exhibition_id" value="${exhibition.Exhibition_ID}">
            <button class="link-button danger" type="submit">Delete</button>
          </form>
        </td>
      </tr>
    `).join("");
    const today = new Date().toISOString().split("T")[0];
    res.send(renderPage({
      title: "Manage Exhibitions",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>${editExhibition ? "Edit Exhibition" : "Create Exhibition"}</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-exhibition" class="form-grid">
          ${editExhibition ? `<input type="hidden" name="exhibition_id" value="${editExhibition.Exhibition_ID}">` : ""}
          <label>Exhibition Name
            <input type="text" name="name" value="${editExhibition ? escapeHtml(editExhibition.Exhibition_Name) : ""}" required>
          </label>
          <label>Image
            <input type="text" name="image_url" value="${editExhibition ? escapeHtml(editExhibition.Image_URL || "") : ""}" placeholder="spring-collection.jpg, /images/spring-collection.jpg, or https://...">
          </label>
          <label>Start Date
            <input type="date" name="start_date" value="${editExhibition ? formatDateInput(editExhibition.Starting_Date) : ""}" min="${today}" required>
          </label>
          <label>End Date
            <input type="date" name="end_date" value="${editExhibition ? formatDateInput(editExhibition.Ending_Date) : ""}"  min="${today}" required>
          </label>
          <button class="button" type="submit">${editExhibition ? "Save Exhibition" : "Create Exhibition"}</button>
        </form>
      </section>
      <section class="card narrow">
        <div id="exhibition-list"></div>
        <h2>Current Exhibitions</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Start</th>
              <th>End</th>
              <th>Image</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${exhibitionRows || '<tr><td colspan="6">No exhibitions found.</td></tr>'}
          </tbody>
        </table>
        ${renderPager(req, "exhibition_page", exhibitionPagination, "exhibition-list")}
      </section>
    `,
    }));
  }));

  app.post("/add-exhibition", requireLogin, allowRoles(["supervisor", "curator"]), asyncHandler(async (req, res) => {
    const id = req.body.exhibition_id || null;
    const { name, start_date: startDate, end_date: endDate } = req.body;
    const imageUrl = sanitizeImageUrl(req.body.image_url) || null;
    const hasImageUrlColumn = await hasColumn(pool, "Exhibition", "Image_URL");

    if (!name || !startDate || !endDate) {
      setFlash(req, "All fields are required.");
      return res.redirect("/add-exhibition");
    }
    const today = new Date().toISOString().split("T")[0];

    if (startDate < today) {
    setFlash(req, "Start date cannot be in the past.");
    return res.redirect("/add-exhibition");
  }

    if (endDate < startDate) {
    setFlash(req, "End date cannot be before start date.");
    return res.redirect("/add-exhibition");
  }

    try {
      if (id) {
        if (hasImageUrlColumn) {
          await pool.query(
            `UPDATE Exhibition
             SET Exhibition_Name = ?, Starting_Date = ?, Ending_Date = ?, Image_URL = ?
             WHERE Exhibition_ID = ?`,
            [name, startDate, endDate, imageUrl, id],
          );
        } else {
          await pool.query(
            `UPDATE Exhibition
             SET Exhibition_Name = ?, Starting_Date = ?, Ending_Date = ?
             WHERE Exhibition_ID = ?`,
            [name, startDate, endDate, id],
          );
        }
        setFlash(req, "Exhibition record updated.");
      } else {
        if (hasImageUrlColumn) {
          await pool.query(
            `INSERT INTO Exhibition (Exhibition_Name, Starting_Date, Ending_Date, Image_URL)
             VALUES (?, ?, ?, ?)`,
            [name, startDate, endDate, imageUrl],
          );
        } else {
          await pool.query(
            `INSERT INTO Exhibition (Exhibition_Name, Starting_Date, Ending_Date)
             VALUES (?, ?, ?)`,
            [name, startDate, endDate],
          );
        }
        setFlash(req, "Exhibition record created. Link artwork when ready.");
      }
    } catch (err) {
      if (err.sqlState === "45000") {
        await logTriggerViolation(pool, req, err.sqlMessage);
        setFlash(req, `Cannot save exhibition: ${err.sqlMessage}`);
      } else {
        throw err;
      }
    }
    res.redirect("/add-exhibition");
  }));
  app.post("/delete-exhibition", requireLogin, allowRoles(["supervisor", "curator"]), asyncHandler(async (req, res) => {
    const idToDelete = req.body.exhibition_id;

    if (!idToDelete) {
      setFlash(req, "Select an exhibition record before deleting.");
      return res.redirect("/add-exhibition");
    }

    await pool.query("DELETE FROM Schedule WHERE Exhibition_ID = ?", [idToDelete]);
    await pool.query("UPDATE ticket_line SET Exhibition_ID = NULL WHERE Exhibition_ID = ?", [idToDelete]);
    await pool.query("DELETE FROM Exhibition_Artwork WHERE Exhibition_ID = ?", [idToDelete]);
    await pool.query("DELETE FROM Exhibition WHERE Exhibition_ID = ?", [idToDelete]);
    setFlash(req, "Exhibition record and artwork links deleted.");
    res.redirect("/add-exhibition");
  }));

  app.get("/add-exhibition-artwork", requireLogin, allowRoles(["supervisor", "curator"]), asyncHandler(async (req, res) => {
    const linkPage = getPageNumber(req.query.link_page);
    const [exhibitions] = await pool.query("SELECT Exhibition_ID, Exhibition_Name FROM Exhibition");
    const [artworks] = await pool.query("SELECT Artwork_ID, Title FROM Artwork");

    let editLink = null;
    if (req.query.edit_exhibition_id && req.query.edit_artwork_id) {
      const [rows] = await pool.query(
        `SELECT * FROM Exhibition_Artwork
         WHERE Exhibition_ID = ? AND Artwork_ID = ?`,
        [req.query.edit_exhibition_id, req.query.edit_artwork_id],
      );
      editLink = rows[0] || null;
    }

    const [links] = await pool.query(`
      SELECT ea.Exhibition_ID, ea.Artwork_ID, e.Exhibition_Name, a.Title, ea.Display_Room, ea.Date_Installed
      FROM Exhibition_Artwork ea
      JOIN Exhibition e ON ea.Exhibition_ID = e.Exhibition_ID
      JOIN Artwork a ON ea.Artwork_ID = a.Artwork_ID
    `);

    const linkPagination = paginateRows(links, linkPage);
    const linkRows = linkPagination.items.map((link) => `
      <tr>
        <td>${escapeHtml(link.Exhibition_Name)}</td>
        <td>${escapeHtml(link.Title)}</td>
        <td>${escapeHtml(link.Display_Room || "N/A")}</td>
        <td>${formatDisplayDate(link.Date_Installed)}</td>
        <td class="actions">
          <form method="get" action="/add-exhibition-artwork" class="inline-form">
            <input type="hidden" name="edit_exhibition_id" value="${link.Exhibition_ID}">
            <input type="hidden" name="edit_artwork_id" value="${link.Artwork_ID}">
            <button class="link-button" type="submit">Edit</button>
          </form>
          <form method="post" action="/delete-exhibition-artwork" class="inline-form" onsubmit="return confirm('Remove this artwork from the exhibition?');">
            <input type="hidden" name="exhibition_id" value="${link.Exhibition_ID}">
            <input type="hidden" name="artwork_id" value="${link.Artwork_ID}">
            <button class="link-button danger" type="submit">Remove</button>
          </form>
        </td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Link Artwork to Exhibition",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>${editLink ? "Edit Artwork Link" : "Link Artwork to Exhibition"}</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-exhibition-artwork" class="form-grid">
          ${editLink ? `
            <input type="hidden" name="edit_exhibition_id" value="${editLink.Exhibition_ID}">
            <input type="hidden" name="edit_artwork_id" value="${editLink.Artwork_ID}">
          ` : ""}
          <label>Exhibition
            <select name="exhibition_id" required>
              ${exhibitions.map((exhibition) => `
                <option value="${exhibition.Exhibition_ID}" ${editLink && editLink.Exhibition_ID === exhibition.Exhibition_ID ? "selected" : ""}>
                  ${escapeHtml(exhibition.Exhibition_Name)}
                </option>
              `).join("")}
            </select>
          </label>
          <label>Artwork
            <select name="artwork_id" required>
              ${artworks.map((artwork) => `
                <option value="${artwork.Artwork_ID}" ${editLink && editLink.Artwork_ID === artwork.Artwork_ID ? "selected" : ""}>
                  ${escapeHtml(artwork.Title)}
                </option>
              `).join("")}
            </select>
          </label>
          <label>Display Room
            <input type="text" name="display_room" value="${editLink ? escapeHtml(editLink.Display_Room || "") : ""}">
          </label>
          <label>Date Installed
            <input type="date" name="date_installed" value="${editLink ? formatDateInput(editLink.Date_Installed) : ""}">
          </label>
          <button class="button" type="submit">${editLink ? "Save Link" : "Link Artwork"}</button>
        </form>
      </section>
      <section class="card narrow">
        <div id="exhibition-artwork-list"></div>
        <h2>Currently Linked Artwork</h2>
        <table>
          <thead>
            <tr>
              <th>Exhibition</th>
              <th>Artwork</th>
              <th>Room</th>
              <th>Installed</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${linkRows || '<tr><td colspan="5">No links found.</td></tr>'}
          </tbody>
        </table>
        ${renderPager(req, "link_page", linkPagination, "exhibition-artwork-list")}
      </section>
    `,
    }));
  }));

  app.post("/add-exhibition-artwork", requireLogin, allowRoles(["supervisor", "curator"]), asyncHandler(async (req, res) => {
    const {
      exhibition_id: exhibitionId,
      artwork_id: artworkId,
      display_room: displayRoom,
      date_installed: dateInstalled,
      edit_exhibition_id: editExhibitionId,
      edit_artwork_id: editArtworkId,
    } = req.body;

    if (!exhibitionId || !artworkId) {
      setFlash(req, "Select both an exhibition and an artwork record.");
      return res.redirect("/add-exhibition-artwork");
    }

    if (editExhibitionId && editArtworkId) {
      await pool.query(
        `UPDATE Exhibition_Artwork
         SET Exhibition_ID = ?, Artwork_ID = ?, Display_Room = ?, Date_Installed = ?
         WHERE Exhibition_ID = ? AND Artwork_ID = ?`,
        [exhibitionId, artworkId, displayRoom || null, dateInstalled || null, editExhibitionId, editArtworkId],
      );
      setFlash(req, "Artwork exhibition link updated.");
    } else {
      try {
        await pool.query(
          `INSERT INTO Exhibition_Artwork (Exhibition_ID, Artwork_ID, Display_Room, Date_Installed)
           VALUES (?, ?, ?, ?)`,
          [exhibitionId, artworkId, displayRoom || null, dateInstalled || null],
        );
        setFlash(req, "Artwork linked to exhibition.");
      } catch (err) {
        if (err.sqlState === "45000") {
          await logTriggerViolation(pool, req, err.sqlMessage);
          setFlash(req, err.sqlMessage);
        } else {
          throw err;
        }
      }
    }

    res.redirect("/add-exhibition-artwork");
  }));

  app.post("/delete-exhibition-artwork", requireLogin, allowRoles(["supervisor", "curator"]), asyncHandler(async (req, res) => {
    const { exhibition_id: exhibitionId, artwork_id: artworkId } = req.body;

    await pool.query(
      "DELETE FROM Exhibition_Artwork WHERE Exhibition_ID = ? AND Artwork_ID = ?",
      [exhibitionId, artworkId],
    );
    setFlash(req, "Artwork exhibition link removed.");
    res.redirect("/add-exhibition-artwork");
  }));
}

module.exports = { registerExhibitionRoutes };
