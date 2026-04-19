const {
  asyncHandler,
  escapeHtml,
  formatDisplayDate,
  getExhibitionAsset,
  renderFlash,
  renderPage,
  requireLogin,
  setFlash,
  allowRoles,
  logTriggerViolation
} = require("../helpers");

function renderTourCards(tours, membershipActive, hasMembership) {
  if (!tours.length) {
    return '<div class="empty-state"><p>No upcoming tours available.</p></div>';
  }

  return `
    <div class="feature-grid program-grid" id="tour-cards-grid">
      ${tours.map((tour) => {
        const asset = getExhibitionAsset(tour.Tour_Name || tour.Exhibition_Name);
        const imagePath = tour.Image_URL || asset.imagePath;
        const spotsLeft = tour.Max_Capacity - tour.Registered_Count;
        const isFull = spotsLeft <= 0;
        const isRegistered = tour.Already_Registered > 0;
        let status = '<span class="status-badge status-badge--success">Open</span>';
        if (isRegistered) status = '<span class="status-badge status-badge--success">Registered</span>';
        else if (isFull) status = '<span class="status-badge status-badge--danger">Full</span>';
        else if (!hasMembership) status = '<span class="status-badge status-badge--warning">Membership Required</span>';

        const action = isRegistered
          ? '<span class="button button-secondary event-card__action-button">Registered</span>'
          : isFull
          ? '<span class="button button-secondary event-card__action-button">Full</span>'
          : !hasMembership
          ? '<a class="button event-card__action-button" href="/purchase-membership">Join First</a>'
          : `
            <form method="post" action="/tour-register">
              <input type="hidden" name="tour_id" value="${tour.Tour_ID}">
              <button class="button event-card__action-button" type="submit">Register</button>
            </form>
          `;

        const isoDate = tour.Tour_Date instanceof Date
          ? tour.Tour_Date.toISOString().slice(0, 10)
          : String(tour.Tour_Date || "").slice(0, 10);
        const statusKey = isRegistered ? "registered" : isFull ? "full" : "open";

        return `
          <article class="feature-card"
                   data-tour-card
                   data-tour-date="${escapeHtml(isoDate)}"
                   data-tour-exhibition="${escapeHtml(tour.Exhibition_Name || "")}"
                   data-tour-language="${escapeHtml(tour.Language || "")}"
                   data-tour-status="${statusKey}">
            <div class="feature-card__media"><img src="${imagePath}" alt="${asset.alt}"></div>
            <div class="feature-card__body event-card__body">
              <div class="event-card__content">
                <p class="eyebrow">${escapeHtml(tour.Language)} Tour</p>
                <h2>${escapeHtml(tour.Tour_Name)}</h2>
                <div class="collection-card__meta">
                  ${status}
                  <span class="status-badge status-badge--neutral">${spotsLeft > 0 ? `${spotsLeft} left` : "0 left"}</span>
                </div>
                <dl class="event-card__facts">
                  <div><dt>Date</dt><dd>${formatDisplayDate(tour.Tour_Date)}</dd></div>
                  <div><dt>Time</dt><dd>${escapeHtml(String(tour.Start_Time))} - ${escapeHtml(String(tour.End_Time))}</dd></div>
                  <div><dt>Guide</dt><dd>${escapeHtml(tour.Guide_Name || "TBD")}</dd></div>
                  <div><dt>Exhibition</dt><dd>${escapeHtml(tour.Exhibition_Name || "General")}</dd></div>
                </dl>
              </div>
              <div class="event-card__action">${action}</div>
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

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

function registerToursRoutes(app, { pool, upload }) {
  app.get("/tours", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const [employees] = await pool.query(`
      SELECT Employee_ID, CONCAT(First_Name, ' ', Last_Name) AS Full_Name
      FROM Employee ORDER BY Last_Name, First_Name
    `);

    const [exhibitions] = await pool.query(`
      SELECT Exhibition_ID, Exhibition_Name
      FROM Exhibition
      WHERE Ending_Date >= CURDATE()
      ORDER BY Starting_Date
    `);

    const [tours] = await pool.query(`
      SELECT
        T.Tour_ID,
        T.Tour_Name,
        T.Tour_Date,
        T.Start_Time,
        T.End_Time,
        T.Max_Capacity,
        T.Language,
        CONCAT(E.First_Name, ' ', E.Last_Name) AS Guide_Name,
        EX.Exhibition_Name,
        (SELECT COUNT(*) FROM Tour_Registration TR WHERE TR.Tour_ID = T.Tour_ID) AS Registered_Count
      FROM Tour T
      LEFT JOIN Employee E ON T.Guide_ID = E.Employee_ID
      LEFT JOIN Exhibition EX ON T.Exhibition_ID = EX.Exhibition_ID
      ORDER BY T.Tour_Date DESC, T.Start_Time
    `);

    const tourRows = tours.map((t) => {
      const spotsLeft = t.Max_Capacity - t.Registered_Count;
      return `
        <tr>
          <td>${t.Tour_ID}</td>
          <td>${escapeHtml(t.Tour_Name)}</td>
          <td>${formatDisplayDate(t.Tour_Date)}</td>
          <td>${escapeHtml(String(t.Start_Time))} - ${escapeHtml(String(t.End_Time))}</td>
          <td>${escapeHtml(t.Guide_Name || "N/A")}</td>
          <td>${escapeHtml(t.Exhibition_Name || "General")}</td>
          <td>${escapeHtml(t.Language)}</td>
          <td>${t.Registered_Count} / ${t.Max_Capacity} (${spotsLeft} left)</td>
          <td class="actions">
            <a class="link-button" href="/tours/roster?tour_id=${t.Tour_ID}">Roster</a>
            <form method="post" action="/delete-tour" class="inline-form"
                  onsubmit="return confirm('Delete this tour and all its registrations?');">
              <input type="hidden" name="tour_id" value="${t.Tour_ID}">
              <button class="link-button danger" type="submit">Delete</button>
            </form>
          </td>
        </tr>
      `;
    }).join("");

    res.send(renderPage({
      title: "Guided Tours",
      user: req.session.user,
      currentPath: req.path,
      hero: {
        eyebrow: "Supervisor Tours",
        title: "Tours",
        description: "",
        imagePath: "/images/education.jpg",
        alt: "Museum guided tour planning view.",
      },
      content: `
        <section class="card narrow">
          <h2>Guided Tours</h2>
          ${renderFlash(req)}
          <form method="post" action="/tours" class="form-grid" enctype="multipart/form-data">
            <label>Tour Name
              <input type="text" name="tour_name" required placeholder="e.g. Impressionism Highlights">
            </label>
            <label>Tour Date
              <input type="date" name="tour_date" required min="${new Date().toISOString().split("T")[0]}">
            </label>
            <label>Start Time
              <input type="time" name="start_time" required>
            </label>
            <label>End Time
              <input type="time" name="end_time" required>
            </label>
            <label>Max Capacity
              <input type="number" name="max_capacity" min="1" value="15" required>
            </label>
            <label>Guide (Employee)
              <select name="guide_id">
                <option value="">Optional</option>
                ${employees.map((e) =>
                  `<option value="${e.Employee_ID}">${escapeHtml(e.Full_Name)}</option>`
                ).join("")}
              </select>
            </label>
            <label>Exhibition (Optional)
              <select name="exhibition_id">
                <option value="">General Tour</option>
                ${exhibitions.map((ex) =>
                  `<option value="${ex.Exhibition_ID}">${escapeHtml(ex.Exhibition_Name)}</option>`
                ).join("")}
              </select>
            </label>
            <label>Language
              <select name="language">
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="Mandarin">Mandarin</option>
                <option value="Arabic">Arabic</option>
              </select>
            </label>
            <label>Image (optional)
              <input type="file" name="image_file" accept="image/*">
            </label>
            <button class="button" type="submit">Schedule Tour</button>
          </form>
        </section>
        <section class="card narrow">
          <h2>All Tours</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Date</th>
                <th>Time</th>
                <th>Guide</th>
                <th>Exhibition</th>
                <th>Language</th>
                <th>Capacity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${tourRows || '<tr><td colspan="9">No tours scheduled.</td></tr>'}
            </tbody>
          </table>
        </section>
      `,
    }));
  }));

  app.post("/tours", requireLogin, allowRoles(["supervisor"]), upload.single("image_file"), asyncHandler(async (req, res) => {
    const {
      tour_name: tourName,
      tour_date: tourDate,
      start_time: startTime,
      end_time: endTime,
      max_capacity: maxCapacity,
      guide_id: guideId,
      exhibition_id: exhibitionId,
      language
    } = req.body;

    if (!tourName?.trim() || !tourDate || !startTime || !endTime || !maxCapacity) {
      setFlash(req, "Tour name, date, times, and capacity are required.");
      return res.redirect("/tours");
    }

    const hasTourImageUrlColumn = await hasColumn(pool, "Tour", "Image_URL");
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    try {
      if (hasTourImageUrlColumn) {
        await pool.query(
          `INSERT INTO Tour
             (Tour_Name, Tour_Date, Start_Time, End_Time, Max_Capacity,
              Guide_ID, Exhibition_ID, Language, Image_URL, Created_At)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE())`,
          [tourName.trim(), tourDate, startTime, endTime, maxCapacity, guideId || null, exhibitionId || null, language || "English", imageUrl]
        );
      } else {
        await pool.query(
          `INSERT INTO Tour
             (Tour_Name, Tour_Date, Start_Time, End_Time, Max_Capacity,
              Guide_ID, Exhibition_ID, Language, Created_At)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE())`,
          [tourName.trim(), tourDate, startTime, endTime, maxCapacity, guideId || null, exhibitionId || null, language || "English"]
        );
      }
      setFlash(req, "Tour scheduled.");
    } catch (err) {
      if (err.sqlState === "45000") {
        await logTriggerViolation(pool, req, err.sqlMessage);
        setFlash(req, `Cannot schedule tour: ${err.sqlMessage}`);
      } else {
        throw err;
      }
    }

    res.redirect("/tours");
  }));

  app.post("/delete-tour", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const { tour_id: tourId } = req.body;
    if (!tourId) {
      setFlash(req, "No tour ID provided.");
      return res.redirect("/tours");
    }
    await pool.query("DELETE FROM Tour WHERE Tour_ID = ?", [tourId]);
    setFlash(req, "Tour and all its registrations deleted.");
    res.redirect("/tours");
  }));

  app.get("/tours/roster", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const tourId = req.query.tour_id;
    if (!tourId) {
      setFlash(req, "No tour selected.");
      return res.redirect("/tours");
    }

    const [[tour]] = await pool.query(
      `SELECT T.Tour_ID, T.Tour_Name, T.Tour_Date, T.Start_Time, T.Max_Capacity,
              CONCAT(E.First_Name, ' ', E.Last_Name) AS Guide_Name,
              EX.Exhibition_Name
       FROM Tour T
       LEFT JOIN Employee  E  ON T.Guide_ID      = E.Employee_ID
       LEFT JOIN Exhibition EX ON T.Exhibition_ID = EX.Exhibition_ID
       WHERE T.Tour_ID = ?`,
      [tourId]
    );

    if (!tour) {
      setFlash(req, "Tour not found.");
      return res.redirect("/tours");
    }

    const [registrations] = await pool.query(
      `SELECT TR.Tour_Registration_ID, TR.Registration_Date,
              TR.Membership_ID,
              M.First_Name, M.Last_Name, M.Email, M.Phone_Number
       FROM Tour_Registration TR
       JOIN Membership M ON TR.Membership_ID = M.Membership_ID
       WHERE TR.Tour_ID = ?
       ORDER BY TR.Registration_Date`,
      [tourId]
    );

    const rosterRows = registrations.map((r) => {
      const dateTs = r.Registration_Date ? new Date(r.Registration_Date).getTime() : 0;
      const fullName = `${r.First_Name} ${r.Last_Name}`;
      return `<tr data-order-id="${r.Membership_ID}" data-date="${dateTs}" data-name="${escapeHtml(fullName.toLowerCase())}">
        <td style="font-weight:600;">${r.Membership_ID}</td>
        <td>${escapeHtml(fullName)}</td>
        <td style="word-break:break-all;">${escapeHtml(r.Email || "N/A")}</td>
        <td>${escapeHtml(r.Phone_Number || "N/A")}</td>
        <td>${formatDisplayDate(r.Registration_Date)}</td>
        <td>
          <form method="post" action="/tours/remove-registration" class="inline-form" onsubmit="return confirm('Remove this member from the tour?');">
            <input type="hidden" name="registration_id" value="${r.Tour_Registration_ID}">
            <input type="hidden" name="tour_id" value="${tourId}">
            <button class="link-button danger" type="submit">Remove</button>
          </form>
        </td>
      </tr>`;
    }).join("");

    res.send(renderPage({
      title: `Tour Roster - ${tour.Tour_Name}`,
      user: req.session.user,
      currentPath: req.path,
      content: `
        <section class="card narrow">
          <h1>${escapeHtml(tour.Tour_Name)}</h1>
          <dl class="dashboard-details">
            <div class="detail-item"><dt>Date</dt><dd>${formatDisplayDate(tour.Tour_Date)}</dd></div>
            <div class="detail-item"><dt>Time</dt><dd>${escapeHtml(String(tour.Start_Time))}</dd></div>
            <div class="detail-item"><dt>Guide</dt><dd>${escapeHtml(tour.Guide_Name || "TBD")}</dd></div>
            <div class="detail-item"><dt>Exhibition</dt><dd>${escapeHtml(tour.Exhibition_Name || "General")}</dd></div>
            <div class="detail-item"><dt>Registered</dt><dd>${registrations.length} / ${tour.Max_Capacity}</dd></div>
          </dl>
          ${renderFlash(req)}
          <p style="margin-bottom:1rem;"><a href="/tours" style="color:#8f4a43;font-size:0.9em;">← Back to all tours</a></p>
          <div style="display:flex;gap:0.75rem;align-items:flex-start;margin-bottom:1rem;flex-wrap:wrap;">
            <label style="display:flex;align-items:center;gap:0.4rem;font-size:0.9em;font-weight:600;white-space:nowrap;align-self:center;">
              Sort
              <select id="roster-sort" style="padding:0.25rem 0.5rem;border-radius:4px;border:1px solid #ccc;font-size:0.9em;">
                <option value="newest">Newest registered</option>
                <option value="oldest">Oldest registered</option>
                <option value="az">Name A–Z</option>
                <option value="za">Name Z–A</option>
              </select>
            </label>
            <label style="display:flex;align-items:center;gap:0.4rem;font-size:0.9em;font-weight:600;white-space:nowrap;align-self:center;">
              Member ID
              <input type="text" id="roster-id-search" placeholder="Search…" style="width:90px;padding:0.25rem 0.5rem;border-radius:4px;border:1px solid #ccc;font-size:0.9em;">
            </label>
            <span id="roster-count" style="color:#888;font-size:0.85em;margin-left:auto;align-self:center;"></span>
          </div>
          <table data-no-cards="true" style="width:100%;">
            <thead>
              <tr>
                <th>Mbr ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Registered</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="tour-roster-list">
              ${rosterRows || '<tr><td colspan="6" style="color:#888;padding:0.5rem;">No registrations yet.</td></tr>'}
            </tbody>
          </table>
        </section>
      `,
    }));
  }));

  app.post("/tours/remove-registration", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const { registration_id: regId, tour_id: tourId } = req.body;
    if (!regId) {
      setFlash(req, "No registration ID provided.");
      return res.redirect("/tours");
    }
    await pool.query(
      "DELETE FROM Tour_Registration WHERE Tour_Registration_ID = ?",
      [regId]
    );
    setFlash(req, "Member removed from tour.");
    res.redirect(`/tours/roster?tour_id=${tourId}`);
  }));

  app.get("/tour-register", requireLogin, allowRoles(["user"]), asyncHandler(async (req, res) => {
    const membershipId = req.session.user.membershipId;
    let memberInfo = null;
    if (membershipId) {
      [[memberInfo]] = await pool.query(
        "SELECT Status FROM Membership WHERE Membership_ID = ?",
        [membershipId]
      );
    }
    const membershipActive = memberInfo?.Status === "Active";
    const hasMembership = Boolean(memberInfo);

    const hasTourImageUrlColumn = await hasColumn(pool, "Tour", "Image_URL");
    const [upcomingTours] = await pool.query(`
      SELECT
        T.Tour_ID,
        T.Tour_Name,
        T.Tour_Date,
        T.Start_Time,
        T.End_Time,
        T.Language,
        T.Max_Capacity,
        ${hasTourImageUrlColumn ? "T.Image_URL," : "NULL AS Image_URL,"}
        EX.Exhibition_Name,
        CONCAT(E.First_Name, ' ', E.Last_Name) AS Guide_Name,
        (SELECT COUNT(*) FROM Tour_Registration TR WHERE TR.Tour_ID = T.Tour_ID) AS Registered_Count,
        (SELECT COUNT(*) FROM Tour_Registration TR
         WHERE TR.Tour_ID = T.Tour_ID AND TR.Membership_ID = ?) AS Already_Registered
      FROM Tour T
      LEFT JOIN Employee  E  ON T.Guide_ID      = E.Employee_ID
      LEFT JOIN Exhibition EX ON T.Exhibition_ID = EX.Exhibition_ID
      WHERE T.Tour_Date >= CURDATE()
      ORDER BY T.Tour_Date, T.Start_Time
    `, [membershipId || 0]);

    const [myRegistrations] = membershipId ? await pool.query(`
      SELECT TR.Tour_Registration_ID, TR.Registration_Date,
             T.Tour_Name, T.Tour_Date, T.Start_Time,
             EX.Exhibition_Name
      FROM Tour_Registration TR
      JOIN Tour T ON TR.Tour_ID = T.Tour_ID
      LEFT JOIN Exhibition EX ON T.Exhibition_ID = EX.Exhibition_ID
      WHERE TR.Membership_ID = ?
      ORDER BY T.Tour_Date
    `, [membershipId]) : [[]];

    const myRows = myRegistrations.map((r) => `
      <tr>
        <td>${escapeHtml(r.Tour_Name)}</td>
        <td>${formatDisplayDate(r.Tour_Date)}</td>
        <td>${escapeHtml(String(r.Start_Time))}</td>
        <td>${escapeHtml(r.Exhibition_Name || "General")}</td>
        <td>${formatDisplayDate(r.Registration_Date)}</td>
        <td>
          <form method="post" action="/tour-cancel" class="inline-form"
                onsubmit="return confirm('Cancel your registration for this tour?');">
            <input type="hidden" name="registration_id" value="${r.Tour_Registration_ID}">
            <button class="link-button danger" type="submit">Cancel</button>
          </form>
        </td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Guided Tours",
      user: req.session.user,
      currentPath: req.path,
      hero: {
        eyebrow: "Guided Tours",
        title: "Tours",
        description: "",
        imagePath: "/images/education.jpg",
        alt: "Museum guided tour scene.",
        actions: [
          { href: "#tour-options", label: "Browse Tours" },
          { href: "/purchase-ticket", label: "Membership and Tickets", secondary: true },
        ],
      },
      alertContent: !hasMembership ? {
        type: "warning",
        title: "Membership required",
        message: "Join or restore membership to register for tours.",
        actions: [{ href: "/purchase-membership", label: "Join" }],
      } : null,
      content: `
        <section class="card" id="tour-options">
          <div class="section-header">
            <div>
              <p class="eyebrow">Browse</p>
              <h2>Guided Tours</h2>
            </div>
          </div>
          <div class="program-filter-bar" aria-label="Tour filters" id="tour-filter-bar">
            <label>Date
              <input type="date" id="tour-filter-date">
            </label>
            <label>Exhibition
              <select id="tour-filter-exhibition">
                <option value="">All exhibitions</option>
                ${[...new Set(upcomingTours.map((t) => t.Exhibition_Name).filter(Boolean))].sort().map((name) => `
                  <option value="${escapeHtml(name)}">${escapeHtml(name)}</option>
                `).join("")}
              </select>
            </label>
            <label>Language
              <select id="tour-filter-language">
                <option value="">All languages</option>
                ${[...new Set(upcomingTours.map((t) => t.Language).filter(Boolean))].sort().map((lang) => `
                  <option value="${escapeHtml(lang)}">${escapeHtml(lang)}</option>
                `).join("")}
              </select>
            </label>
            <label>Availability
              <select id="tour-filter-availability">
                <option value="">All</option>
                <option value="open">Open</option>
                <option value="registered">Registered</option>
                <option value="full">Full</option>
              </select>
            </label>
            <button type="button" class="link-button" id="tour-filter-clear">Clear filters</button>
          </div>
          ${renderFlash(req)}
          ${renderTourCards(upcomingTours, membershipActive, hasMembership)}
          <div class="empty-state" id="tour-filter-empty" hidden>
            <p><strong>No tours match your filters.</strong> Try clearing one or more filters.</p>
          </div>
          <script>
            (function () {
              const bar = document.getElementById("tour-filter-bar");
              const grid = document.getElementById("tour-cards-grid");
              if (!bar || !grid) return;
              const dateInput = document.getElementById("tour-filter-date");
              const exhibitionSel = document.getElementById("tour-filter-exhibition");
              const languageSel = document.getElementById("tour-filter-language");
              const availabilitySel = document.getElementById("tour-filter-availability");
              const clearBtn = document.getElementById("tour-filter-clear");
              const emptyMsg = document.getElementById("tour-filter-empty");
              const cards = Array.from(grid.querySelectorAll("[data-tour-card]"));

              function applyFilters() {
                const wantDate = dateInput.value;
                const wantExhibition = exhibitionSel.value;
                const wantLanguage = languageSel.value;
                const wantStatus = availabilitySel.value;
                let visible = 0;
                cards.forEach((card) => {
                  const date = card.getAttribute("data-tour-date");
                  const exhibition = card.getAttribute("data-tour-exhibition");
                  const language = card.getAttribute("data-tour-language");
                  const status = card.getAttribute("data-tour-status");
                  const show =
                    (!wantDate || date >= wantDate) &&
                    (!wantExhibition || exhibition === wantExhibition) &&
                    (!wantLanguage || language === wantLanguage) &&
                    (!wantStatus || status === wantStatus);
                  card.style.display = show ? "" : "none";
                  if (show) visible++;
                });
                if (emptyMsg) emptyMsg.hidden = visible !== 0;
              }

              [dateInput, exhibitionSel, languageSel, availabilitySel].forEach((el) => {
                el.addEventListener("input", applyFilters);
                el.addEventListener("change", applyFilters);
              });
              clearBtn.addEventListener("click", () => {
                dateInput.value = "";
                exhibitionSel.value = "";
                languageSel.value = "";
                availabilitySel.value = "";
                applyFilters();
              });
            })();
          </script>
        </section>
        <section class="card quiet-card">
          <h2>My Tours</h2>
          <table>
            <thead>
              <tr>
                <th>Tour</th>
                <th>Date</th>
                <th>Time</th>
                <th>Exhibition</th>
                <th>Registered On</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${myRows || '<tr><td colspan="6">You have no tour registrations.</td></tr>'}
            </tbody>
          </table>
        </section>
      `,
    }));
  }));

  app.post("/tour-register", requireLogin, allowRoles(["user"]), asyncHandler(async (req, res) => {
    const { tour_id: tourId } = req.body;
    const membershipId = req.session.user.membershipId;

    if (!tourId || !membershipId) {
      setFlash(req, "Select a tour before registering.");
      return res.redirect("/tour-register");
    }

    try {
      await pool.query(
        `INSERT INTO Tour_Registration (Tour_ID, Membership_ID, Registration_Date, Created_At)
         VALUES (?, ?, CURDATE(), CURDATE())`,
        [tourId, membershipId]
      );
      setFlash(req, "Tour registration confirmed.");
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        setFlash(req, "You are already registered for this tour.");
      } else if (err.sqlState === "45000") {
        await logTriggerViolation(pool, req, err.sqlMessage);
        setFlash(req, err.sqlMessage);
      } else {
        throw err;
      }
    }

    res.redirect("/tour-register");
  }));

  app.post("/tour-cancel", requireLogin, allowRoles(["user"]), asyncHandler(async (req, res) => {
    const { registration_id: regId } = req.body;
    const membershipId = req.session.user.membershipId;

    if (!regId) {
      setFlash(req, "No registration ID provided.");
      return res.redirect("/tour-register");
    }

    await pool.query(
      "DELETE FROM Tour_Registration WHERE Tour_Registration_ID = ? AND Membership_ID = ?",
      [regId, membershipId]
    );

    setFlash(req, "Your tour registration has been cancelled.");
    res.redirect("/tour-register");
  }));
}

module.exports = { registerToursRoutes };
