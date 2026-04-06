const {
  escapeHtml,
  isEmployee,
  isSupervisor,
  renderFlash,
  renderPage,
  requireLogin,
  isAdmissions,
  isCafe,
  isGiftShop,
} = require("../helpers");

function registerDashboardRoutes(app, { pool }) {
  app.get("/dashboard", requireLogin, (req, res) => {
    const user = req.session.user;
    if (!isEmployee(user) && !isSupervisor(user)) {
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
              <a class="button" href="/add-sale">New Sale</a>
              <a class="button button-secondary" href="/add-sale-line">Add Items to Sale</a>
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
          <p class="dashboard-intro">Process café orders and add food items to each transaction.</p>
          <dl class="details dashboard-details">
            <div class="detail-item"><dt>Name</dt><dd>${escapeHtml(user.name)}</dd></div>
            <div class="detail-item"><dt>Email</dt><dd>${escapeHtml(user.email)}</dd></div>
          </dl>
          ${renderFlash(req)}
          <section class="dashboard-section">
            <h2>Orders</h2>
            <div class="button-row dashboard-actions">
              <a class="button" href="/add-food">Café Menu</a>
              <a class="button" href="/add-food-sale">New Café Sale</a>
              <a class="button button-secondary" href="/add-food-sale-line">Add Items to Order</a>
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
      eyebrow = "Museum Operations";
      title = "Daily Operations";
      intro = "Record admissions, manage memberships, and process retail or cafe sales.";
      sections = `
        <section class="dashboard-section">
          <h2>Admissions Desk</h2>
          <div class="button-row dashboard-actions">
            <a class="button" href="/add-ticket">Manage Ticket Orders</a>
            <a class="button" href="/add-ticket-line">Manage Ticket Line Items</a>
            <a class="button button-secondary" href="/add-membership">Manage Memberships</a>
          </div>
        </section>
        <section class="dashboard-section">
          <h2>Retail and Cafe</h2>
          <div class="button-row dashboard-actions">
            <a class="button" href="/add-sale">Create Gift Shop Sale</a>
            <a class="button" href="/add-sale-line">Add Items to Gift Shop Sale</a>
            <a class="button" href="/add-food-sale">Create Cafe Sale</a>
            <a class="button" href="/add-food-sale-line">Add Food to Cafe Sale</a>
            <a class="button button-secondary" href="/queries">Operational Queries</a>
          </div>
        </section>
      `;
    }

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
            <a class="button" href="/add-food">Café Menu</a>
            <a class="button button-secondary" href="/queries">Museum Queries</a>
            <a class="button button-secondary" href="/reports">Reports</a>
          </div>
        </section>
        <form method="post" action="/logout" class="dashboard-footer">
          <button class="button" type="submit">Log Out</button>
        </form>
      </section>
    `,
    }));
  });

}

module.exports = { registerDashboardRoutes };