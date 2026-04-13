const {
  asyncHandler,
  escapeHtml,
  formatDateInput,
  formatDisplayDate,
  renderFlash,
  renderPage,
  requireLogin,
  setFlash,
  allowRoles
} = require("../helpers");

function registerConservationRoutes(app, { pool }) {

  app.get("/condition-reports", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {

    const [artworks] = await pool.query(`
      SELECT AW.Artwork_ID, AW.Title, AR.Artist_Name
      FROM Artwork AW
      JOIN Artist AR ON AW.Artist_ID = AR.Artist_ID
      ORDER BY AW.Title
    `);

    const [employees] = await pool.query(`
      SELECT Employee_ID, CONCAT(First_Name, ' ', Last_Name) AS Full_Name
      FROM Employee
      ORDER BY Last_Name, First_Name
    `);

    
    const [conditionRows] = await pool.query(`
      SELECT
        AW.Artwork_ID,
        AW.Title,
        AR.Artist_Name,
        CR.Condition_Status,
        CR.Report_Date,
        CR.Restoration_Required,
        CR.Notes,
        CONCAT(E.First_Name, ' ', E.Last_Name) AS Inspector_Name,
        CR.Report_ID
      FROM Artwork AW
      JOIN Artist AR ON AW.Artist_ID = AR.Artist_ID
      LEFT JOIN Artwork_Condition_Report CR
        ON AW.Artwork_ID = CR.Artwork_ID
        AND CR.Report_ID = (
          SELECT Report_ID
          FROM Artwork_Condition_Report
          WHERE Artwork_ID = AW.Artwork_ID
          ORDER BY Report_Date DESC
          LIMIT 1
        )
      LEFT JOIN Employee E ON CR.Inspector_ID = E.Employee_ID
      ORDER BY
        FIELD(CR.Condition_Status, 'Critical', 'Poor', 'Fair', 'Good', 'Excellent'),
        AW.Title
    `);

    const preselectedArtwork = req.query.artwork_id || "";

    const tableRows = conditionRows.map((row) => {
      const statusColors = {
        Critical: "color:crimson;font-weight:bold",
        Poor:     "color:darkorange;font-weight:bold",
        Fair:     "color:goldenrod",
        Good:     "color:seagreen",
        Excellent:"color:steelblue"
      };
      const style = statusColors[row.Condition_Status] || "";
      return `
        <tr>
          <td>${escapeHtml(row.Title)}</td>
          <td>${escapeHtml(row.Artist_Name)}</td>
          <td style="${style}">${escapeHtml(row.Condition_Status || "No report yet")}</td>
          <td>${row.Restoration_Required ? "Yes" : row.Condition_Status ? "No" : "—"}</td>
          <td>${formatDisplayDate(row.Report_Date)}</td>
          <td>${escapeHtml(row.Inspector_Name || "—")}</td>
          <td>
            <a class="link-button" href="/condition-reports/history?artwork_id=${row.Artwork_ID}">History</a>
            <a class="link-button" href="/condition-reports?artwork_id=${row.Artwork_ID}">New Report</a>
          </td>
        </tr>
      `;
    }).join("");

    res.send(renderPage({
      title: "Artwork Condition Reports",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <p class="eyebrow">Collections Management</p>
        <h1>File Condition Report</h1>
        <p class="dashboard-note">Log the physical condition of an artwork. If status is <strong>Poor</strong> or <strong>Critical</strong>, restoration will be flagged automatically by the database.</p>
        ${renderFlash(req)}
        <form method="post" action="/condition-reports" class="form-grid">
          <label>Artwork
            <select name="artwork_id" required>
              <option value="">— Select artwork —</option>
              ${artworks.map((a) =>
                `<option value="${a.Artwork_ID}" ${preselectedArtwork == a.Artwork_ID ? "selected" : ""}>
                  ${escapeHtml(a.Title)} — ${escapeHtml(a.Artist_Name)}
                </option>`
              ).join("")}
            </select>
          </label>
          <label>Condition Status
            <select name="condition_status" required>
              <option value="">— Select condition —</option>
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Poor">Poor</option>
              <option value="Critical">Critical</option>
            </select>
          </label>
          <label>Report Date
            <input type="date" name="report_date" value="${new Date().toISOString().split("T")[0]}" required>
          </label>
          <label>Inspector (Employee)
            <select name="inspector_id">
              <option value="">— Optional —</option>
              ${employees.map((e) =>
                `<option value="${e.Employee_ID}">${escapeHtml(e.Full_Name)}</option>`
              ).join("")}
            </select>
          </label>
          <label>Restoration Required?
            <select name="restoration_required">
              <option value="0">No</option>
              <option value="1">Yes</option>
            </select>
          </label>
          <label>Notes
            <textarea name="notes" rows="3" placeholder="Describe observed damage, fading, cracks, etc."></textarea>
          </label>
          <button class="button" type="submit">File Report</button>
        </form>
      </section>

      <section class="card narrow">
        <h2>Current Condition — All Artworks</h2>
        <p class="dashboard-note">Showing the most recent report per artwork. Critical and Poor artworks are sorted to the top.</p>
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Artist</th>
              <th>Condition</th>
              <th>Restoration Needed</th>
              <th>Last Inspected</th>
              <th>Inspector</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="7">No artworks found.</td></tr>'}
          </tbody>
        </table>
      </section>
      `,
    }));
  }));


 
  app.post("/condition-reports", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const {
      artwork_id: artworkId,
      condition_status: conditionStatus,
      report_date: reportDate,
      inspector_id: inspectorId,
      restoration_required: restorationRequired,
      notes
    } = req.body;

    if (!artworkId || !conditionStatus || !reportDate) {
      setFlash(req, "Artwork, condition status, and report date are all required.");
      return res.redirect("/condition-reports");
    }

    
    await pool.query(
      `INSERT INTO Artwork_Condition_Report
         (Artwork_ID, Condition_Status, Report_Date, Inspector_ID, Restoration_Required, Notes, Created_At)
       VALUES (?, ?, ?, ?, ?, ?, CURDATE())`,
      [
        artworkId,
        conditionStatus,
        reportDate,
        inspectorId || null,
        restorationRequired === "1" ? 1 : 0,
        notes?.trim() || null
      ]
    );

    setFlash(req, "Condition report filed successfully.");
    res.redirect("/condition-reports");
  }));


  
  app.get("/condition-reports/history", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const artworkId = req.query.artwork_id;

    if (!artworkId) {
      setFlash(req, "No artwork selected.");
      return res.redirect("/condition-reports");
    }

    const [[artwork]] = await pool.query(
      `SELECT AW.Title, AR.Artist_Name
       FROM Artwork AW JOIN Artist AR ON AW.Artist_ID = AR.Artist_ID
       WHERE AW.Artwork_ID = ?`,
      [artworkId]
    );

    if (!artwork) {
      setFlash(req, "Artwork not found.");
      return res.redirect("/condition-reports");
    }

    const [reports] = await pool.query(
      `SELECT CR.Report_ID, CR.Condition_Status, CR.Report_Date,
              CR.Restoration_Required, CR.Notes,
              CONCAT(E.First_Name, ' ', E.Last_Name) AS Inspector_Name
       FROM Artwork_Condition_Report CR
       LEFT JOIN Employee E ON CR.Inspector_ID = E.Employee_ID
       WHERE CR.Artwork_ID = ?
       ORDER BY CR.Report_Date DESC`,
      [artworkId]
    );

    const historyRows = reports.map((r) => `
      <tr>
        <td>${escapeHtml(r.Condition_Status)}</td>
        <td>${r.Restoration_Required ? "Yes" : "No"}</td>
        <td>${formatDisplayDate(r.Report_Date)}</td>
        <td>${escapeHtml(r.Inspector_Name || "—")}</td>
        <td>${escapeHtml(r.Notes || "—")}</td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: `Condition History — ${artwork.Title}`,
      user: req.session.user,
      content: `
      <section class="card narrow">
        <p class="eyebrow">Condition History</p>
        <h1>${escapeHtml(artwork.Title)}</h1>
        <p class="dashboard-note">Artist: ${escapeHtml(artwork.Artist_Name)}</p>
        ${renderFlash(req)}
        <p><a href="/condition-reports">← Back to all artworks</a></p>
        <table>
          <thead>
            <tr>
              <th>Condition</th>
              <th>Restoration Needed</th>
              <th>Date</th>
              <th>Inspector</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${historyRows || '<tr><td colspan="5">No reports on file for this artwork.</td></tr>'}
          </tbody>
        </table>
      </section>
      `,
    }));
  }));

}

module.exports = { registerConservationRoutes };
