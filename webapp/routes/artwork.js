const {
  asyncHandler,
  escapeHtml,
  renderFlash,
  renderPage,
  requireLogin,
  setFlash,
  allowRoles
} = require("../helpers");

function registerArtworkRoutes (app, { pool }) {
    app.get("/add-artwork", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
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
      SELECT Artwork.Artwork_ID, Artwork.Title, Artwork.Type, Artwork.Artist_ID, Artist.Artist_Name
      FROM Artwork
      JOIN Artist ON Artwork.Artist_ID = Artist.Artist_ID
    `);

    const artworkRows = artworks.map((artwork) => `
      <tr>
        <td>${artwork.Artwork_ID}</td>
        <td>${escapeHtml(artwork.Title)}</td>
        <td>${escapeHtml(artwork.Type)}</td>
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
            <input type="text" name="type" value="${editArtwork ? escapeHtml(editArtwork.Type) : ""}" required>
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
        <h2>Current Artworks</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Type</th>
              <th>Artist Name</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${artworkRows || '<tr><td colspan="5">No artworks found.</td></tr>'}
          </tbody>
        </table>
      </section>
    `,
    }));
  }));

  app.post("/add-artwork", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const id = req.body.artwork_id || null;
    const title = req.body.title?.trim();
    const type = req.body.type?.trim();
    const artistId = req.body.artist_id;

    if (!title || !type || !artistId) {
      setFlash(req, "All fields are required.");
      return res.redirect("/add-artwork");
    }

    if (id) {
      await pool.query(
        "UPDATE Artwork SET Title = ?, Type = ?, Artist_ID = ? WHERE Artwork_ID = ?",
        [title, type, artistId, id],
      );
      setFlash(req, "Artwork updated successfully.");
    } else {
      await pool.query(
        `INSERT INTO Artwork (Title, Type, Artist_ID)
         VALUES (?, ?, ?)`,
        [title, type, artistId],
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

    await pool.query("DELETE FROM Artwork WHERE Artwork_ID = ?", [idToDelete]);
    setFlash(req, "Artwork successfully deleted!");
    res.redirect("/add-artwork");
  }));
}

module.exports = { registerArtworkRoutes };