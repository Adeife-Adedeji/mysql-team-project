const {
  asyncHandler,
  escapeHtml,
  isEmployee,
  isSupervisor,
  renderFlash,
  renderPage,
  requireLogin,
  isAdmissions,
  isCafe,
  isGiftShop,
  isCurator,
} = require("../helpers");

function registerDashboardRoutes(app, { pool }) {
  app.get("/dashboard", requireLogin, asyncHandler(async (req, res) => {
    const user = req.session.user;
    if (!isEmployee(user) && !isSupervisor(user) && !isCurator(user)) {
      return res.send(renderPage({
        title: "Member Dashboard",
        user,
        content: `
        <section class="card narrow dashboard-card">
          <p class="eyebrow">Member Portal</p>
          <h1>Welcome, ${escapeHtml(user.name.split(" ")[0])}</h1>
          <p class="dashboard-intro">Purchase admission tickets and browse museum information.</p>
          <dl class="details dashboard-details">
            <div class="detail-item"><dt>Name</dt><dd>${escapeHtml(user.name)}</dd></div>
            <div class="detail-item"><dt>Email</dt><dd>${escapeHtml(user.email)}</dd></div>
          </dl>
          ${renderFlash(req)}
          <section class="dashboard-section">
            <h2>Plan Your Visit</h2>
            <div class="button-row dashboard-actions">
              <a class="button" href="/purchase-ticket">Buy Tickets Online</a>
              <a class="button" href="/tour-register">Browse Guided Tours</a>
              <a class="button" href="/event-register">Browse Events</a>
              <a class="button button-secondary" href="/queries">Explore the Collection</a>
            </div>
          </section>
          <form method="post" action="/logout" class="dashboard-footer">
            <button class="button" type="submit">Log Out</button>
          </form>
        </section>
      `,
      }));
    }

    if (isAdmissions(user)) {
      return res.send(renderPage({
        title: "Admissions Portal",
        user,
        content: `
        <section class="card narrow dashboard-card">
          <p class="eyebrow">Admissions Desk</p>
          <h1>Welcome, ${escapeHtml(user.name.split(" ")[0])}</h1>
          <p class="dashboard-intro">Sell walk-in tickets and assist visitors with membership sign-ups and look-ups.</p>
          <dl class="details dashboard-details">
            <div class="detail-item"><dt>Name</dt><dd>${escapeHtml(user.name)}</dd></div>
            <div class="detail-item"><dt>Email</dt><dd>${escapeHtml(user.email)}</dd></div>
          </dl>
          ${renderFlash(req)}
          <section class="dashboard-section">
            <h2>Ticket Sales</h2>
            <div class="button-row dashboard-actions">
              <a class="button" href="/sell-ticket">Sell Admission Tickets</a>
              <a class="button button-secondary" href="/ticket-sales">View Ticket Sales</a>
            </div>
          </section>
          <section class="dashboard-section">
            <h2>Memberships</h2>
            <div class="button-row dashboard-actions">
              <a class="button button-secondary" href="/add-membership">Visitor Memberships</a>
            </div>
          </section>
          <form method="post" action="/logout" class="dashboard-footer">
            <button class="button" type="submit">Log Out</button>
          </form>
        </section>
      `,
      }));
    }

    if (isGiftShop(user)) {
      return res.send(renderPage({
        title: "Gift Shop Portal",
        user,
        content: `
        <section class="card narrow dashboard-card">
          <p class="eyebrow">Gift Shop</p>
          <h1>Welcome, ${escapeHtml(user.name.split(" ")[0])}</h1>
          <p class="dashboard-intro">Process gift shop sales and add purchased items to each transaction.</p>
          <dl class="details dashboard-details">
            <div class="detail-item"><dt>Name</dt><dd>${escapeHtml(user.name)}</dd></div>
            <div class="detail-item"><dt>Email</dt><dd>${escapeHtml(user.email)}</dd></div>
          </dl>
          ${renderFlash(req)}
          <section class="dashboard-section">
            <h2>Sales Register</h2>
            <div class="button-row dashboard-actions">
              <a class="button" href="/gift-order">New Gift Shop Order</a>
              <a class="button button-secondary" href="/add-sale">Manage Sales</a>
            </div>
          </section>
          <section class="dashboard-section">
            <h2>Inventory</h2>
            <div class="button-row dashboard-actions">
              <a class="button" href="/add-item">Gift Shop Inventory</a>
            </div>
          </section>
          <form method="post" action="/logout" class="dashboard-footer">
            <button class="button" type="submit">Log Out</button>
          </form>
        </section>
      `,
      }));
    }

    if (isCafe(user)) {
      return res.send(renderPage({
        title: "Café Portal",
        user,
        content: `
        <section class="card narrow dashboard-card">
          <p class="eyebrow">Museum Café</p>
          <h1>Welcome, ${escapeHtml(user.name.split(" ")[0])}</h1>
          <p class="dashboard-intro">Process café orders and add café items to each transaction.</p>
          <dl class="details dashboard-details">
            <div class="detail-item"><dt>Name</dt><dd>${escapeHtml(user.name)}</dd></div>
            <div class="detail-item"><dt>Email</dt><dd>${escapeHtml(user.email)}</dd></div>
          </dl>
          ${renderFlash(req)}
          <section class="dashboard-section">
            <h2>Orders</h2>
            <div class="button-row dashboard-actions">
              <a class="button" href="/order">New Café Order</a>
              <a class="button button-secondary" href="/add-food-sale">Manage Orders</a>
            </div>
          </section>
          <section class="dashboard-section">
            <h2>Inventory</h2>
            <div class="button-row dashboard-actions">
              <a class="button" href="/add-food">Café Inventory</a>
            </div>
          </section>
          <form method="post" action="/logout" class="dashboard-footer">
            <button class="button" type="submit">Log Out</button>
          </form>
        </section>
      `,
      }));
    }

    if (isCurator(user)) {
      return res.send(renderPage({
        title: "Curatorial Portal",
        user,
        content: `
        <section class="card narrow dashboard-card">
          <p class="eyebrow">Curatorial</p>
          <h1>Welcome, ${escapeHtml(user.name.split(" ")[0])}</h1>
          <p class="dashboard-intro">Manage artists, artworks, exhibitions, and collection care records.</p>
          <dl class="details dashboard-details">
            <div class="detail-item"><dt>Name</dt><dd>${escapeHtml(user.name)}</dd></div>
            <div class="detail-item"><dt>Email</dt><dd>${escapeHtml(user.email)}</dd></div>
          </dl>
          ${renderFlash(req)}
          <section class="dashboard-section">
            <h2>Collection Records</h2>
            <div class="button-row dashboard-actions">
              <a class="button" href="/add-artist">Artists</a>
              <a class="button" href="/add-artwork">Artwork</a>
              <a class="button" href="/add-exhibition">Exhibitions</a>
              <a class="button button-secondary" href="/add-exhibition-artwork">Exhibition Artwork</a>
              <a class="button button-secondary" href="/condition-reports">Condition Reports</a>
              <a class="button button-secondary" href="/artwork-loans">Artwork Loans</a>
              <a class="button button-secondary" href="/queries">Search the Collection</a>
            </div>
          </section>
          <form method="post" action="/logout" class="dashboard-footer">
            <button class="button" type="submit">Log Out</button>
          </form>
        </section>
      `,
      }));
    }

    if (isEmployee(user)) {
      return res.send(renderPage({
        title: "Daily Operations",
        user,
        content: `
        <section class="card narrow dashboard-card">
          <p class="eyebrow">Museum Operations</p>
          <h1>Welcome, ${escapeHtml(user.name.split(" ")[0])}</h1>
          <p class="dashboard-intro">Record admissions, manage memberships, and process retail or cafe sales.</p>
          <dl class="details dashboard-details">
            <div class="detail-item"><dt>Name</dt><dd>${escapeHtml(user.name)}</dd></div>
            <div class="detail-item"><dt>Email</dt><dd>${escapeHtml(user.email)}</dd></div>
          </dl>
          ${renderFlash(req)}
          <section class="dashboard-section">
            <h2>Admissions Desk</h2>
            <div class="button-row dashboard-actions">
              <a class="button" href="/sell-ticket">Admissions Desk</a>
              <a class="button button-secondary" href="/add-ticket">Advanced Records</a>
              <a class="button button-secondary" href="/add-membership">Manage Memberships</a>
            </div>
          </section>
          <section class="dashboard-section">
            <h2>Retail and Cafe</h2>
            <div class="button-row dashboard-actions">
              <a class="button" href="/gift-order">New Gift Shop Order</a>
              <a class="button button-secondary" href="/add-sale">Manage Gift Shop Sales</a>
              <a class="button" href="/order">New Café Order</a>
              <a class="button button-secondary" href="/add-food-sale">Manage Café Sales</a>
              <a class="button button-secondary" href="/queries">Search the Collection</a>
            </div>
          </section>
          <form method="post" action="/logout" class="dashboard-footer">
            <button class="button" type="submit">Log Out</button>
          </form>
        </section>
      `,
      }));
    }

    const [notifications] = await pool.query(
      `SELECT * FROM manager_notifications WHERE is_read = FALSE ORDER BY created_at DESC`
    );
    let triggerViolations = [];
    try {
      const [rows] = await pool.query(
        `SELECT violation_id, route_path, user_email, message, created_at
         FROM trigger_violation_log
         WHERE is_resolved = FALSE
         ORDER BY created_at DESC
         LIMIT 10`
      );
      triggerViolations = rows;
    } catch (error) {
      if (!error || error.code !== "ER_NO_SUCH_TABLE") {
        throw error;
      }
    }

    const notificationsHtml = notifications.length > 0
      ? `
        <section class="dashboard-section notifications-section">
          <h2>Notifications <span class="badge">${notifications.length}</span></h2>
          <ul class="notification-list">
            ${notifications.map(n => `
              <li class="notification-item">
                <span class="notification-message">${escapeHtml(n.message)}</span>
                <span class="notification-time">${new Date(n.created_at).toLocaleString()}</span>
                <form method="post" action="/notifications/${n.notification_id}/read" style="display:inline">
                  <button class="button button-secondary button-small" type="submit">Dismiss</button>
                </form>
              </li>
            `).join("")}
          </ul>
          <form method="post" action="/notifications/clear">
            <button class="button button-secondary" type="submit">Clear All</button>
          </form>
        </section>`
      : `
        <section class="dashboard-section notifications-section">
          <h2>Notifications</h2>
          <p class="muted">No new notifications.</p>
        </section>`;

    const triggerViolationsHtml = triggerViolations.length > 0
      ? `
        <section class="dashboard-section notifications-section">
          <h2>Trigger Violations</h2>
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Route</th>
                <th>User</th>
                <th>Message</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${triggerViolations.map((violation) => `
                <tr>
                  <td>${new Date(violation.created_at).toLocaleString()}</td>
                  <td>${escapeHtml(violation.route_path || "N/A")}</td>
                  <td>${escapeHtml(violation.user_email || "N/A")}</td>
                  <td>${escapeHtml(violation.message)}</td>
                  <td>
                    <form method="post" action="/trigger-violations/${violation.violation_id}/resolve" class="inline-form">
                      <button class="button button-secondary button-small" type="submit">Resolve</button>
                    </form>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </section>`
      : `
        <section class="dashboard-section notifications-section">
          <h2>Trigger Violations</h2>
          <p class="muted">No unresolved trigger violations.</p>
        </section>`;

    return res.send(renderPage({
      title: "Supervisor Dashboard",
      user,
      content: `
      <section class="card narrow dashboard-card">
        <p class="eyebrow">Management Portal</p>
        <h1>Welcome, ${escapeHtml(user.name.split(" ")[0])}</h1>
        <p class="dashboard-intro">Manage the collection, staff, events, and review operational reports.</p>
        <dl class="details dashboard-details">
          <div class="detail-item"><dt>Name</dt><dd>${escapeHtml(user.name)}</dd></div>
          <div class="detail-item"><dt>Email</dt><dd>${escapeHtml(user.email)}</dd></div>
        </dl>
        ${renderFlash(req)}
        ${notificationsHtml}
        ${triggerViolationsHtml}
        <section class="dashboard-section">
          <h2>Ticket Sales &amp; Front Desk</h2>
          <div class="button-row dashboard-actions">
            <a class="button" href="/sell-ticket">Admissions Desk</a>
            <a class="button button-secondary" href="/add-membership">Visitor Memberships</a>
          </div>
        </section>
        <section class="dashboard-section">
          <h2>Collections Management</h2>
          <div class="button-row dashboard-actions">
            <a class="button" href="/add-artist">Manage Artists</a>
            <a class="button" href="/add-artwork">Manage Artworks</a>
            <a class="button" href="/add-exhibition">Manage Exhibitions</a>
            <a class="button button-secondary" href="/add-exhibition-artwork">Assign Artwork to Exhibitions</a>
          </div>
        </section>
        <section class="dashboard-section">
          <h2>Conservation &amp; Loans</h2>
          <div class="button-row dashboard-actions">
            <a class="button" href="/condition-reports">Condition Reports</a>
            <a class="button" href="/artwork-loans">Artwork Loans</a>
            <a class="button button-secondary" href="/institutions">Manage Institutions</a>
          </div>
        </section>
        <section class="dashboard-section">
          <h2>Guided Tours</h2>
          <div class="button-row dashboard-actions">
            <a class="button" href="/tours">Schedule Tours</a>
          </div>
        </section>
        <section class="dashboard-section">
          <h2>Staff &amp; Scheduling</h2>
          <div class="button-row dashboard-actions">
            <a class="button" href="/add-employee">Manage Staff</a>
            <a class="button" href="/add-department">Manage Departments</a>
            <a class="button button-secondary" href="/add-schedule">Manage Schedules</a>
          </div>
        </section>
        <section class="dashboard-section">
          <h2>Events</h2>
          <div class="button-row dashboard-actions">
            <a class="button" href="/add-event">Manage Events</a>
            <a class="button button-secondary" href="/add-event-registration">Event Registrations</a>
          </div>
        </section>
        <section class="dashboard-section">
          <h2>Inventory &amp; Reporting</h2>
          <div class="button-row dashboard-actions">
            <a class="button" href="/add-ticket">Ticket Records</a>
            <a class="button" href="/add-item">Gift Shop Inventory</a>
            <a class="button" href="/add-food">Café Inventory</a>
            <a class="button button-secondary" href="/queries">Search the Collection</a>
            <a class="button button-secondary" href="/reports">Reports</a>
          </div>
        </section>
        <form method="post" action="/logout" class="dashboard-footer">
          <button class="button" type="submit">Log Out</button>
        </form>
      </section>
    `,
    }));
  }));

  app.post("/notifications/:id/read", requireLogin, asyncHandler(async (req, res) => {
    await pool.query(
      `UPDATE manager_notifications SET is_read = TRUE WHERE notification_id = ?`,
      [req.params.id]
    );
    res.redirect("/dashboard");
  }));

  app.post("/notifications/clear", requireLogin, asyncHandler(async (req, res) => {
    await pool.query(`UPDATE manager_notifications SET is_read = TRUE`);
    res.redirect("/dashboard");
  }));

  app.post("/trigger-violations/:id/resolve", requireLogin, asyncHandler(async (req, res) => {
    if (!isSupervisor(req.session.user)) {
      return res.redirect("/dashboard");
    }

    await pool.query(
      `UPDATE trigger_violation_log SET is_resolved = TRUE WHERE violation_id = ?`,
      [req.params.id],
    );
    res.redirect("/dashboard");
  }));
}

module.exports = { registerDashboardRoutes };
