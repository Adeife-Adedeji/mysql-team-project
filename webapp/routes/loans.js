const {
  asyncHandler,
  escapeHtml,
  formatDateInput,
  formatDisplayDate,
  getArtworkAsset,
  renderFlash,
  renderPage,
  requireLogin,
  setFlash,
  allowRoles,
  logTriggerViolation
} = require("../helpers");

function registerLoansRoutes(app, { pool }) {

  // GET /institutions
  // Manage external institutions (other museums, galleries).
  // Shows a list of all institutions and a form to add a new one.
  // Access: supervisor only
  
  app.get("/institutions", requireLogin, allowRoles(["supervisor", "curator"]), asyncHandler(async (req, res) => {
    const [institutions] = await pool.query(
      "SELECT * FROM Institution ORDER BY Institution_Name"
    );

    let editInstitution = null;
    if (req.query.edit_id) {
      const [rows] = await pool.query(
        "SELECT * FROM Institution WHERE Institution_ID = ?",
        [req.query.edit_id]
      );
      editInstitution = rows[0] || null;
    }

    const institutionRows = institutions.map((i) => `
      <tr>
        <td>${i.Institution_ID}</td>
        <td>${escapeHtml(i.Institution_Name)}</td>
        <td>${escapeHtml(i.City || "—")}</td>
        <td>${escapeHtml(i.Country || "—")}</td>
        <td>${escapeHtml(i.Contact_Name || "—")}</td>
        <td>${escapeHtml(i.Contact_Email || "—")}</td>
        <td class="actions">
          <form method="get" action="/institutions" class="inline-form">
            <input type="hidden" name="edit_id" value="${i.Institution_ID}">
            <button class="link-button" type="submit">Edit</button>
          </form>
          <form method="post" action="/delete-institution" class="inline-form"
                onsubmit="return confirm('Delete this institution? This will fail if it has active loans.');">
            <input type="hidden" name="institution_id" value="${i.Institution_ID}">
            <button class="link-button danger" type="submit">Delete</button>
          </form>
        </td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Institutions",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>${editInstitution ? "Edit Institution" : "Manage Institutions"}</h1>
        ${renderFlash(req)}
        <form method="post" action="/institutions" class="form-grid">
          ${editInstitution ? `<input type="hidden" name="institution_id" value="${editInstitution.Institution_ID}">` : ""}
          <label>Institution Name
            <input type="text" name="institution_name" required
              value="${editInstitution ? escapeHtml(editInstitution.Institution_Name) : ""}">
          </label>
          <label>City
            <input type="text" name="city"
              value="${editInstitution ? escapeHtml(editInstitution.City || "") : ""}">
          </label>
          <label>Country
            <input type="text" name="country"
              value="${editInstitution ? escapeHtml(editInstitution.Country || "") : ""}">
          </label>
          <label>Contact Name
            <input type="text" name="contact_name"
              value="${editInstitution ? escapeHtml(editInstitution.Contact_Name || "") : ""}">
          </label>
          <label>Contact Email
            <input type="email" name="contact_email"
              value="${editInstitution ? escapeHtml(editInstitution.Contact_Email || "") : ""}">
          </label>
          <label>Contact Phone
            <input type="tel" name="contact_phone"
              value="${editInstitution ? escapeHtml(editInstitution.Contact_Phone || "") : ""}">
          </label>
          <button class="button" type="submit">${editInstitution ? "Update Institution" : "Add Institution"}</button>
        </form>
      </section>

      <section class="card narrow">
        <h2>All Institutions</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>City</th>
              <th>Country</th>
              <th>Contact</th>
              <th>Email</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${institutionRows || '<tr><td colspan="7">No institutions on record.</td></tr>'}
          </tbody>
        </table>
        <p style="margin-top:1rem"><a class="button button-secondary" href="/artwork-loans">Manage Artwork Loans →</a></p>
      </section>
      `,
    }));
  }));


  app.post("/institutions", requireLogin, allowRoles(["supervisor", "curator"]), asyncHandler(async (req, res) => {
    const {
      institution_id: institutionId,
      institution_name: institutionName,
      city, country,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone
    } = req.body;

    if (!institutionName?.trim()) {
      setFlash(req, "Institution name is required.");
      return res.redirect("/institutions");
    }

    if (institutionId) {
      await pool.query(
        `UPDATE Institution
         SET Institution_Name = ?, City = ?, Country = ?,
             Contact_Name = ?, Contact_Email = ?, Contact_Phone = ?, Updated_At = CURDATE()
         WHERE Institution_ID = ?`,
        [institutionName.trim(), city || null, country || null,
         contactName || null, contactEmail || null, contactPhone || null,
         institutionId]
      );
      setFlash(req, "Institution updated.");
    } else {
      await pool.query(
        `INSERT INTO Institution
           (Institution_Name, City, Country, Contact_Name, Contact_Email, Contact_Phone, Created_At)
         VALUES (?, ?, ?, ?, ?, ?, CURDATE())`,
        [institutionName.trim(), city || null, country || null,
         contactName || null, contactEmail || null, contactPhone || null]
      );
      setFlash(req, "Institution added.");
    }

    res.redirect("/institutions");
  }));


  
  app.post("/delete-institution", requireLogin, allowRoles(["supervisor", "curator"]), asyncHandler(async (req, res) => {
    const id = req.body.institution_id;
    if (!id) {
      setFlash(req, "No institution ID provided.");
      return res.redirect("/institutions");
    }

    try {
      await pool.query("DELETE FROM Institution WHERE Institution_ID = ?", [id]);
      setFlash(req, "Institution deleted.");
    } catch (err) {
      // MySQL error 1451 = FK constraint violation (has existing loans)
      if (err.code === "ER_ROW_IS_REFERENCED_2") {
        setFlash(req, "This institution is linked to loan records and cannot be deleted.");
      } else {
        throw err;
      }
    }

    res.redirect("/institutions");
  }));


 
  app.get("/artwork-loans", requireLogin, allowRoles(["supervisor", "curator"]), asyncHandler(async (req, res) => {
    const filterStatus = req.query.status || "Active";

    const [artworks] = await pool.query(`
      SELECT AW.Artwork_ID, AW.Title, AW.Type, AW.Image_URL, AR.Artist_Name
      FROM Artwork AW
      JOIN Artist AR ON AW.Artist_ID = AR.Artist_ID
      ORDER BY AW.Title
    `);

    const [institutions] = await pool.query(
      "SELECT Institution_ID, Institution_Name FROM Institution ORDER BY Institution_Name"
    );

    const [employees] = await pool.query(`
      SELECT Employee_ID, CONCAT(First_Name, ' ', Last_Name) AS Full_Name
      FROM Employee ORDER BY Last_Name, First_Name
    `);

    const whereClause = filterStatus === "All" ? "" : "WHERE AL.Status = ?";
    const queryParams  = filterStatus === "All" ? [] : [filterStatus];

    const [loans] = await pool.query(`
      SELECT
        AL.Loan_ID, AL.Loan_Type, AL.Start_Date, AL.End_Date,
        AL.Insurance_Value, AL.Status, AL.Notes,
        AW.Title AS Artwork_Title,
        AW.Type AS Artwork_Type,
        AW.Image_URL AS Artwork_Image_URL,
        AR.Artist_Name,
        I.Institution_Name,
        CONCAT(E.First_Name, ' ', E.Last_Name) AS Approved_By_Name
      FROM Artwork_Loan AL
      JOIN Artwork AW ON AL.Artwork_ID = AW.Artwork_ID
      JOIN Artist AR ON AW.Artist_ID = AR.Artist_ID
      JOIN Institution I  ON AL.Institution_ID = I.Institution_ID
      LEFT JOIN Employee E ON AL.Approved_By = E.Employee_ID
      ${whereClause}
      ORDER BY AL.End_Date ASC
    `, queryParams);

    const loanRows = loans.map((loan) => {
      const isActive = loan.Status === "Active";
      const asset = getArtworkAsset(loan.Artwork_Title, loan.Artwork_Type, loan.Artwork_Image_URL);
      const statusTone = loan.Status === "Active" ? "success" : loan.Status === "Returned" ? "neutral" : "danger";
      return `
        <tr>
          <td>${loan.Loan_ID}</td>
          <td><img src="${escapeHtml(asset.imagePath)}" alt="${escapeHtml(asset.alt)}" class="table-thumb"></td>
          <td><strong>${escapeHtml(loan.Artwork_Title)}</strong><span class="table-subtext">${escapeHtml(loan.Artist_Name)}</span></td>
          <td>${escapeHtml(loan.Institution_Name)}</td>
          <td>${escapeHtml(loan.Loan_Type)}</td>
          <td>${formatDisplayDate(loan.Start_Date)}</td>
          <td>${formatDisplayDate(loan.End_Date)}</td>
          <td>${loan.Insurance_Value != null ? "$" + Number(loan.Insurance_Value).toLocaleString() : "—"}</td>
          <td><span class="status-badge status-badge--${statusTone}">${escapeHtml(loan.Status)}</span></td>
          <td class="actions">
            ${isActive ? `
              <form method="post" action="/artwork-loans/return" class="inline-form"
                    onsubmit="return confirm('Mark this loan as Returned?');">
                <input type="hidden" name="loan_id" value="${loan.Loan_ID}">
                <button class="link-button" type="submit">Mark Returned</button>
              </form>
              <form method="post" action="/artwork-loans/cancel" class="inline-form"
                    onsubmit="return confirm('Cancel this loan?');">
                <input type="hidden" name="loan_id" value="${loan.Loan_ID}">
                <button class="link-button danger" type="submit">Cancel</button>
              </form>
            ` : escapeHtml(loan.Status)}
          </td>
        </tr>
      `;
    }).join("");

    res.send(renderPage({
      title: "Artwork Loans",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>Record Artwork Loan</h1>
        <p class="dashboard-note">Create incoming or outgoing loan records for collection movement.</p>
        <div class="info-callout">
          <strong>Loan rule</strong>
          <span>Outgoing loans cannot be assigned to an exhibition while the loan is active.</span>
        </div>
        ${renderFlash(req)}
        <form method="post" action="/artwork-loans" class="loan-form">
          <fieldset>
            <legend>Artwork and institution</legend>
            <label>Artwork
              <select name="artwork_id" required>
                <option value="">— Select artwork —</option>
                ${artworks.map((a) =>
                  `<option value="${a.Artwork_ID}">${escapeHtml(a.Title)} — ${escapeHtml(a.Artist_Name)}</option>`
                ).join("")}
              </select>
            </label>
            <label>Institution
              <select name="institution_id" required>
                <option value="">— Select institution —</option>
                ${institutions.map((i) =>
                  `<option value="${i.Institution_ID}">${escapeHtml(i.Institution_Name)}</option>`
                ).join("")}
              </select>
            </label>
            <label>Loan Type
              <select name="loan_type" required>
                <option value="Outgoing">Outgoing (we lend it out)</option>
                <option value="Incoming">Incoming (we receive it)</option>
              </select>
            </label>
          </fieldset>
          <fieldset>
            <legend>Dates and value</legend>
            <label>Start Date
              <input type="date" name="start_date" required>
            </label>
            <label>End Date
              <input type="date" name="end_date" required>
            </label>
            <label>Insurance Value ($)
              <input type="number" step="0.01" min="0" name="insurance_value" placeholder="e.g. 250000.00">
            </label>
          </fieldset>
          <fieldset>
            <legend>Approvals and notes</legend>
            <label>Approved By (Employee)
              <select name="approved_by">
                <option value="">— Optional —</option>
                ${employees.map((e) =>
                  `<option value="${e.Employee_ID}">${escapeHtml(e.Full_Name)}</option>`
                ).join("")}
              </select>
            </label>
            <label>Notes
              <textarea name="notes" rows="2" placeholder="Shipping details, special conditions, etc."></textarea>
            </label>
            <button class="button" type="submit">Record Loan</button>
          </fieldset>
        </form>
        <p><a class="button button-secondary" href="/institutions">Manage Institutions</a></p>
      </section>

      <section class="card narrow">
        <h2>Loan Records</h2>
        <form method="get" action="/artwork-loans" style="margin-bottom:1rem">
          <label>Filter by status:
            <select name="status" onchange="this.form.submit()">
              <option value="Active" ${filterStatus === "Active" ? "selected" : ""}>Active only</option>
              <option value="All" ${filterStatus === "All" ? "selected" : ""}>All loans</option>
            </select>
          </label>
        </form>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Image</th>
              <th>Artwork</th>
              <th>Institution</th>
              <th>Type</th>
              <th>Start</th>
              <th>End</th>
              <th>Insurance</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${loanRows || `<tr><td colspan="10">No ${filterStatus === "All" ? "" : "active "}loans found.</td></tr>`}
          </tbody>
        </table>
      </section>
      `,
    }));
  }));



  app.post("/artwork-loans", requireLogin, allowRoles(["supervisor", "curator"]), asyncHandler(async (req, res) => {
    const {
      artwork_id: artworkId,
      institution_id: institutionId,
      loan_type: loanType,
      start_date: startDate,
      end_date: endDate,
      insurance_value: insuranceValue,
      approved_by: approvedBy,
      notes
    } = req.body;

    if (!artworkId || !institutionId || !loanType || !startDate || !endDate) {
      setFlash(req, "Artwork, institution, loan type, and dates are required.");
      return res.redirect("/artwork-loans");
    }

    try {
      await pool.query(
        `INSERT INTO Artwork_Loan
           (Artwork_ID, Institution_ID, Loan_Type, Start_Date, End_Date,
            Insurance_Value, Approved_By, Notes, Status, Created_At)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active', CURDATE())`,
        [
          artworkId, institutionId, loanType, startDate, endDate,
          insuranceValue || null,
          approvedBy || null,
          notes?.trim() || null
        ]
      );
      setFlash(req, "Loan record created.");
    } catch (err) {
      // Catch the trigger signal from trigger_check_artwork_on_loan
      if (err.sqlState === "45000") {
        await logTriggerViolation(pool, req, err.sqlMessage);
        setFlash(req, `Cannot create loan: ${err.sqlMessage}`);
      } else {
        throw err;
      }
    }

    res.redirect("/artwork-loans");
  }));



  app.post("/artwork-loans/return", requireLogin, allowRoles(["supervisor", "curator"]), asyncHandler(async (req, res) => {
    const { loan_id: loanId } = req.body;
    if (!loanId) {
      setFlash(req, "No loan ID provided.");
      return res.redirect("/artwork-loans");
    }
    await pool.query(
      "UPDATE Artwork_Loan SET Status = 'Returned', Updated_At = CURDATE() WHERE Loan_ID = ?",
      [loanId]
    );
    setFlash(req, "Loan marked as returned.");
    res.redirect("/artwork-loans");
  }));



  app.post("/artwork-loans/cancel", requireLogin, allowRoles(["supervisor", "curator"]), asyncHandler(async (req, res) => {
    const { loan_id: loanId } = req.body;
    if (!loanId) {
      setFlash(req, "No loan ID provided.");
      return res.redirect("/artwork-loans");
    }
    await pool.query(
      "UPDATE Artwork_Loan SET Status = 'Cancelled', Updated_At = CURDATE() WHERE Loan_ID = ?",
      [loanId]
    );
    setFlash(req, "Loan cancelled.");
    res.redirect("/artwork-loans");
  }));

}

module.exports = { registerLoansRoutes };
