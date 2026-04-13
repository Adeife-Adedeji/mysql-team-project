const {
  asyncHandler,
  escapeHtml,
  formatDateInput,
  formatDisplayDate,
  renderFlash,
  renderPage,
  requireLogin,
  setFlash,
  allowRoles,
  logTriggerViolation
} = require("../helpers");

function registerExhibitionRoutes(app, { pool }) {
  app.get("/add-exhibition", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const [exhibitions] = await pool.query(
      "SELECT Exhibition_ID, Exhibition_Name, Starting_Date, Ending_Date FROM Exhibition",
    );

    let editExhibition = null;
    if (req.query.edit_id) {
      const [rows] = await pool.query(
        "SELECT * FROM Exhibition WHERE Exhibition_ID = ?",
        [req.query.edit_id],
      );
      editExhibition = rows[0] || null;
    }

    const exhibitionRows = exhibitions.map((exhibition) => `
      <tr>
        <td>${exhibition.Exhibition_ID}</td>
        <td>${escapeHtml(exhibition.Exhibition_Name)}</td>
        <td>${formatDisplayDate(exhibition.Starting_Date)}</td>
        <td>${formatDisplayDate(exhibition.Ending_Date)}</td>
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

    res.send(renderPage({
      title: "Manage Exhibitions",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>${editExhibition ? "Edit Exhibition" : "Add New Exhibition"}</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-exhibition" class="form-grid">
          ${editExhibition ? `<input type="hidden" name="exhibition_id" value="${editExhibition.Exhibition_ID}">` : ""}
          <label>Exhibition Name
            <input type="text" name="name" value="${editExhibition ? escapeHtml(editExhibition.Exhibition_Name) : ""}" required>
          </label>
          <label>Start Date
            <input type="date" name="start_date" value="${editExhibition ? formatDateInput(editExhibition.Starting_Date) : ""}" required>
          </label>
          <label>End Date
            <input type="date" name="end_date" value="${editExhibition ? formatDateInput(editExhibition.Ending_Date) : ""}" required>
          </label>
          <button class="button" type="submit">${editExhibition ? "Update Exhibition" : "Add Exhibition"}</button>
        </form>
      </section>
      <section class="card narrow">
        <h2>Current Exhibitions</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Start</th>
              <th>End</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${exhibitionRows || '<tr><td colspan="5">No exhibitions found.</td></tr>'}
          </tbody>
        </table>
      </section>
    `,
    }));
  }));

  app.post("/add-exhibition", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const id = req.body.exhibition_id || null;
    const { name, start_date: startDate, end_date: endDate } = req.body;

    if (!name || !startDate || !endDate) {
      setFlash(req, "All fields are required.");
      return res.redirect("/add-exhibition");
    }

    if (id) {
      await pool.query(
        `UPDATE Exhibition
         SET Exhibition_Name = ?, Starting_Date = ?, Ending_Date = ?
         WHERE Exhibition_ID = ?`,
        [name, startDate, endDate, id],
      );
      setFlash(req, "Exhibition updated successfully.");
    } else {
      await pool.query(
        `INSERT INTO Exhibition (Exhibition_Name, Starting_Date, Ending_Date)
         VALUES (?, ?, ?)`,
        [name, startDate, endDate],
      );
      setFlash(req, "Exhibition added successfully. Now link artwork to the exhibition.");
    }

    res.redirect("/add-exhibition");
  }));

  app.post("/delete-exhibition", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const idToDelete = req.body.exhibition_id;

    if (!idToDelete) {
      setFlash(req, "Error: No exhibition ID provided.");
      return res.redirect("/add-exhibition");
    }

    await pool.query("DELETE FROM Schedule WHERE Exhibition_ID = ?", [idToDelete]);
    await pool.query("UPDATE ticket_line SET Exhibition_ID = NULL WHERE Exhibition_ID = ?", [idToDelete]);
    await pool.query("DELETE FROM Exhibition_Artwork WHERE Exhibition_ID = ?", [idToDelete]);
    await pool.query("DELETE FROM Exhibition WHERE Exhibition_ID = ?", [idToDelete]);
    setFlash(req, "Exhibition and its artwork links successfully deleted!");
    res.redirect("/add-exhibition");
  }));

  app.get("/add-exhibition-artwork", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
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

    const linkRows = links.map((link) => `
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
          <button class="button" type="submit">${editLink ? "Update Link" : "Link Artwork"}</button>
        </form>
      </section>
      <section class="card narrow">
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
      </section>
    `,
    }));
  }));

  app.post("/add-exhibition-artwork", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const {
      exhibition_id: exhibitionId,
      artwork_id: artworkId,
      display_room: displayRoom,
      date_installed: dateInstalled,
      edit_exhibition_id: editExhibitionId,
      edit_artwork_id: editArtworkId,
    } = req.body;

    if (!exhibitionId || !artworkId) {
      setFlash(req, "Please select both exhibition and artwork.");
      return res.redirect("/add-exhibition-artwork");
    }

    if (editExhibitionId && editArtworkId) {
      await pool.query(
        `UPDATE Exhibition_Artwork
         SET Exhibition_ID = ?, Artwork_ID = ?, Display_Room = ?, Date_Installed = ?
         WHERE Exhibition_ID = ? AND Artwork_ID = ?`,
        [exhibitionId, artworkId, displayRoom || null, dateInstalled || null, editExhibitionId, editArtworkId],
      );
      setFlash(req, "Artwork link updated successfully.");
    } else {
      try {
        await pool.query(
          `INSERT INTO Exhibition_Artwork (Exhibition_ID, Artwork_ID, Display_Room, Date_Installed)
           VALUES (?, ?, ?, ?)`,
          [exhibitionId, artworkId, displayRoom || null, dateInstalled || null],
        );
        setFlash(req, "Artwork linked successfully.");
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

  app.post("/delete-exhibition-artwork", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const { exhibition_id: exhibitionId, artwork_id: artworkId } = req.body;

    await pool.query(
      "DELETE FROM Exhibition_Artwork WHERE Exhibition_ID = ? AND Artwork_ID = ?",
      [exhibitionId, artworkId],
    );
    setFlash(req, "Link removed.");
    res.redirect("/add-exhibition-artwork");
  }));
}

module.exports = { registerExhibitionRoutes };