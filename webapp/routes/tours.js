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
    <div class="feature-grid program-grid">
      ${tours.map((tour) => {
        const asset = getExhibitionAsset(tour.Tour_Name || tour.Exhibition_Name);
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

        return `
          <article class="feature-card">
            <div class="feature-card__media"><img src="${asset.imagePath}" alt="${asset.alt}"></div>
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

function registerToursRoutes(app, { pool }) {
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
          <form method="post" action="/tours" class="form-grid">
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

  app.post("/tours", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
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

    try {
      await pool.query(
        `INSERT INTO Tour
           (Tour_Name, Tour_Date, Start_Time, End_Time, Max_Capacity,
            Guide_ID, Exhibition_ID, Language, Created_At)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE())`,
        [tourName.trim(), tourDate, startTime, endTime, maxCapacity, guideId || null, exhibitionId || null, language || "English"]
      );
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
              M.First_Name, M.Last_Name, M.Email, M.Phone_Number
       FROM Tour_Registration TR
       JOIN Membership M ON TR.Membership_ID = M.Membership_ID
       WHERE TR.Tour_ID = ?
       ORDER BY TR.Registration_Date`,
      [tourId]
    );

    const rosterRows = registrations.map((r) => `
      <tr>
        <td>${escapeHtml(r.First_Name)} ${escapeHtml(r.Last_Name)}</td>
        <td>${escapeHtml(r.Email || "N/A")}</td>
        <td>${escapeHtml(r.Phone_Number || "N/A")}</td>
        <td>${formatDisplayDate(r.Registration_Date)}</td>
        <td>
          <form method="post" action="/tours/remove-registration" class="inline-form"
                onsubmit="return confirm('Remove this member from the tour?');">
            <input type="hidden" name="registration_id" value="${r.Tour_Registration_ID}">
            <input type="hidden" name="tour_id" value="${tourId}">
            <button class="link-button danger" type="submit">Remove</button>
          </form>
        </td>
      </tr>
    `).join("");

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
          <p><a href="/tours">Back to all tours</a></p>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Registered</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${rosterRows || '<tr><td colspan="5">No registrations yet.</td></tr>'}
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

    const [upcomingTours] = await pool.query(`
      SELECT
        T.Tour_ID,
        T.Tour_Name,
        T.Tour_Date,
        T.Start_Time,
        T.End_Time,
        T.Language,
        T.Max_Capacity,
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
          <div class="program-filter-bar" aria-label="Tour filters">
            <span>Date</span>
            <span>Exhibition</span>
            <span>Language</span>
            <span>Availability</span>
          </div>
          ${renderFlash(req)}
          ${renderTourCards(upcomingTours, membershipActive, hasMembership)}
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
