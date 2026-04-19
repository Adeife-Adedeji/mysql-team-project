const {
  asyncHandler,
  escapeHtml,
  getExhibitionAsset,
  getGiftShopAsset,
  getRoleAsset,
  isEmployee,
  isSupervisor,
  renderFlash,
  renderPage,
  requireLogin,
  isAdmissions,
  isCafe,
  isGiftShop,
  isCurator,
  renderSupervisorSidebar,
} = require("../helpers");

function renderActionCards(cards) {
  return `
    <div class="feature-grid">
      ${cards.map((card) => `
        <article class="feature-card">
          <div class="feature-card__media"><img src="${card.imagePath}" alt="${card.alt}"></div>
          <div class="feature-card__body">
            <h2>${card.title}</h2>
            ${card.description ? `<p>${card.description}</p>` : ""}
            <a class="feature-card__link" href="${card.href}">${card.linkLabel}</a>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderProfile(user) {
  return `
    <dl class="dashboard-details">
      <div class="detail-item"><dt>Name</dt><dd>${escapeHtml(user.name)}</dd></div>
      <div class="detail-item"><dt>Email</dt><dd>${escapeHtml(user.email)}</dd></div>
      <div class="detail-item"><dt>Access Role</dt><dd>${escapeHtml(user.role)}</dd></div>
    </dl>
  `;
}

function formatMetric(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

async function getScalar(pool, sql, field, fallback = 0) {
  try {
    const [[row]] = await pool.query(sql);
    return row?.[field] ?? fallback;
  } catch (error) {
    if (["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR", "ER_SP_DOES_NOT_EXIST"].includes(error?.code)) {
      return fallback;
    }
    throw error;
  }
}

async function getRows(pool, sql, fallback = []) {
  try {
    const [rows] = await pool.query(sql);
    return rows;
  } catch (error) {
    if (["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"].includes(error?.code)) {
      return fallback;
    }
    throw error;
  }
}

function renderSupervisorDashboard({
  user,
  urgentCount,
  notifications,
  triggerViolations,
  metrics,
  collectionRows,
  flashHtml,
}) {
  const noticeItems = [
    ...notifications.slice(0, 2).map((notice) => ({
      type: "notification",
      title: "Supervisor notification",
      message: notice.message,
      time: new Date(notice.created_at).toLocaleString(),
      action: `
        <form method="post" action="/notifications/${notice.notification_id}/read" class="inline-form">
          <button class="supervisor-text-action" type="submit">Dismiss</button>
        </form>
      `,
    })),
    ...triggerViolations.slice(0, 2).map((violation) => ({
      type: "rule",
      title: violation.route_path || "Business rule",
      message: violation.message,
      detail: violation.user_email ? `Submitted by ${violation.user_email}` : "",
      time: new Date(violation.created_at).toLocaleString(),
      action: `
        <form method="post" action="/trigger-violations/${violation.violation_id}/resolve" class="inline-form">
          <button class="supervisor-text-action" type="submit">Resolve</button>
        </form>
      `,
    })),
  ];
  const urgentModal = noticeItems.length ? `
    <section class="supervisor-issue-modal" role="alert" aria-live="assertive" aria-label="Items requiring review">
      <div class="supervisor-issue-modal__card">
        <div class="section-header">
          <div>
            <p class="eyebrow">Review Required</p>
            <h2>${urgentCount} open item${urgentCount === 1 ? "" : "s"}</h2>
          </div>
          <a class="supervisor-text-action" href="#supervisor-review-required">View</a>
        </div>
        <ul>
          ${noticeItems.map((item) => `
            <li>
              <strong>${escapeHtml(item.title)}</strong>
              <span>${escapeHtml(item.message)}</span>
              ${item.detail ? `<span>${escapeHtml(item.detail)}</span>` : ""}
              <small>${escapeHtml(item.time)}</small>
            </li>
          `).join("")}
        </ul>
      </div>
    </section>
  ` : "";

  const collectionHtml = collectionRows.length
    ? collectionRows.map((row) => `
      <tr>
        <td>
          <strong>${escapeHtml(row.Title)}</strong>
          <span>${escapeHtml(row.Artist_Name || "Unknown artist")}</span>
        </td>
        <td>${escapeHtml(row.Type || "Artwork")}</td>
        <td><span class="supervisor-status">${escapeHtml(row.Condition_Status || "Pending")}</span></td>
      </tr>
    `).join("")
    : `
      <tr>
        <td><strong>No artwork records found</strong><span>Add collection records to populate this table.</span></td>
        <td>--</td>
        <td><span class="supervisor-status">Pending</span></td>
      </tr>
    `;

  return `
    <div class="supervisor-shell">
      ${renderSupervisorSidebar(user, "/dashboard", urgentCount)}
      <div class="supervisor-main">
        ${urgentModal}
        <section class="supervisor-masthead">
          <div>
            <p class="eyebrow">Supervisor Dashboard</p>
            <h1>Operations overview</h1>
            <p>Monitor collection care, admissions activity, commercial revenue, staffing, and business rule alerts from one executive workspace.</p>
          </div>
          <div class="supervisor-masthead__meta">
            <span>${new Date().toLocaleDateString()}</span>
            <strong>${urgentCount ? `${urgentCount} needs review` : "All clear"}</strong>
          </div>
        </section>

        ${flashHtml}

        <section class="supervisor-overview-grid">
          <article class="supervisor-value-panel">
            <p class="eyebrow">Recorded Institutional Revenue</p>
            <strong>${formatMoney(metrics.allRevenue)}</strong>
            <span>${formatMoney(metrics.todayRevenue)} recorded today</span>
            <div class="supervisor-kpi-row">
              <div><span>Active Works</span><strong>${formatMetric(metrics.artworks)}</strong></div>
              <div><span>On Loan</span><strong>${formatMetric(metrics.activeLoans)}</strong></div>
              <div><span>Daily Footfall</span><strong>${formatMetric(metrics.footfall)}</strong></div>
            </div>
          </article>

          <aside class="supervisor-notices ${urgentCount ? "supervisor-notices--urgent" : ""}" id="supervisor-review-required">
            <div class="section-header">
              <div>
                <p class="eyebrow">Administrative Notices</p>
                <h2>${urgentCount ? "Review required" : "No open notices"}</h2>
              </div>
              ${urgentCount ? `<span class="status-badge status-badge--danger">${urgentCount} open</span>` : `<span class="status-badge status-badge--success">Clear</span>`}
            </div>
            ${noticeItems.length ? `
              <ul>
                ${noticeItems.map((item) => `
                  <li>
                    <span class="supervisor-notice-dot supervisor-notice-dot--${escapeHtml(item.type)}"></span>
                    <div>
                      <strong>${escapeHtml(item.title)}</strong>
                      <p>${escapeHtml(item.message)}</p>
                      ${item.detail ? `<p class="supervisor-notice-detail">${escapeHtml(item.detail)}</p>` : ""}
                      <small>${escapeHtml(item.time)}</small>
                      ${item.action}
                    </div>
                  </li>
                `).join("")}
              </ul>
            ` : `<div class="empty-state"><p>No notifications or trigger violations require action.</p></div>`}
            ${notifications.length > 2 ? `
              <form method="post" action="/notifications/clear">
                <button class="supervisor-text-action" type="submit">Clear all notifications</button>
              </form>
            ` : ""}
          </aside>
        </section>

        <section class="supervisor-section-heading">
          <p>Operational snapshot</p>
        </section>

        <section class="supervisor-card-grid" aria-label="Operational indicators">
          <article class="supervisor-business-card">
            <p class="eyebrow">Admissions</p>
            <strong>${formatMetric(metrics.ticketSalesToday)}</strong>
            <span>ticket transactions today</span>
            <small>${formatMoney(metrics.ticketRevenue)} admission revenue</small>
          </article>
          <article class="supervisor-business-card">
            <p class="eyebrow">Events & Tours</p>
            <strong>${formatMetric(metrics.upcomingEvents + metrics.upcomingTours)}</strong>
            <span>scheduled public programs</span>
            <small>${formatMetric(metrics.activeMembers)} active member accounts</small>
          </article>
          <article class="supervisor-business-card">
            <p class="eyebrow">Staffing</p>
            <strong>${formatMetric(metrics.scheduledStaff)}</strong>
            <span>staff scheduled today</span>
            <small>${formatMetric(metrics.employeeCount)} employees on file</small>
          </article>
        </section>

        <section class="supervisor-lower-grid">
          <div class="supervisor-collection-panel">
            <div class="section-header">
              <div>
                <p class="eyebrow">Collections & Conservation</p>
                <h2>Collection status sample</h2>
              </div>
              <span class="status-badge status-badge--${metrics.restorationOpen ? "warning" : "success"}">${formatMetric(metrics.restorationOpen)} restoration</span>
            </div>
            <table class="supervisor-table">
              <thead>
                <tr>
                  <th>Artwork Identity</th>
                  <th>Type</th>
                  <th>Condition</th>
                </tr>
              </thead>
              <tbody>${collectionHtml}</tbody>
            </table>
            <div class="supervisor-mini-grid">
              <div>
                <span>Open Loans</span>
                <strong>${formatMetric(metrics.activeLoans)}</strong>
              </div>
              <div>
                <span>New Acquisitions</span>
                <strong>${formatMetric(metrics.recentArtworks)}</strong>
              </div>
            </div>
          </div>

          <aside class="supervisor-revenue-panel">
            <p class="eyebrow">Commercial & Visitor Ops</p>
            <h2>Aggregate daily revenue</h2>
            <strong>${formatMoney(metrics.todayRevenue)}</strong>
            <dl>
              <div><dt>Main Admissions</dt><dd>${formatMoney(metrics.ticketRevenue)}</dd></div>
              <div><dt>Gift Shop</dt><dd>${formatMoney(metrics.giftRevenue)}</dd></div>
              <div><dt>Museum Cafe</dt><dd>${formatMoney(metrics.cafeRevenue)}</dd></div>
            </dl>
            <p class="supervisor-revenue-panel__note">Use Management Reports in the sidebar for detailed financial audit views.</p>
          </aside>
        </section>
      </div>
    </div>
  `;
}

function renderWorkspaceSections(sections) {
  return `
    <section class="card dashboard-card">
      <p class="eyebrow">Operations Index</p>
      <h2>Supervisor Workspaces</h2>
      <div class="workspace-sections">
        ${sections.map((section) => `
          <div class="workspace-section">
            <h3>${section.title}</h3>
            <div class="workspace-links">
              ${section.links.map((link) => `<a class="button ${link.secondary ? "button-secondary" : ""}" href="${link.href}">${link.label}</a>`).join("")}
            </div>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function registerDashboardRoutes(app, { pool }) {
  app.get("/dashboard", requireLogin, asyncHandler(async (req, res) => {
    const user = req.session.user;

    if (!isEmployee(user) && !isSupervisor(user) && !isCurator(user)) {
      const membershipId = user.membershipId ?? null;
      let membershipInfo = null;
      let ticketCount = 0;

      if (membershipId) {
        const [[memberRow]] = await pool.query(
          "SELECT Status, Date_Joined, Date_Exited FROM Membership WHERE Membership_ID = ?",
          [membershipId],
        );
        membershipInfo = memberRow || null;
      }

      const [[ticketRow]] = membershipId
        ? await pool.query("SELECT COUNT(*) AS value FROM Ticket WHERE Membership_ID = ?", [membershipId])
        : await pool.query("SELECT COUNT(*) AS value FROM Ticket WHERE Email = ?", [user.email]);
      ticketCount = Number(ticketRow?.value || 0);

      const memberStatus = membershipInfo?.Status || "No membership on file";
      const hasMembership = Boolean(membershipInfo && membershipInfo.Status === "Active");
      const hasTicket = ticketCount > 0;
      const needsRenewal = membershipInfo && membershipInfo.Status !== "Active" && membershipInfo.Status !== "Cancelled";
      const firstName = escapeHtml(user.name.split(" ")[0]);
      const memberBenefitLine = hasMembership
        ? hasTicket
          ? `${ticketCount} active admission benefit${ticketCount === 1 ? "" : "s"}`
          : "Eligible for member event pricing"
        : "Join for admission and event benefits";
      const memberActions = hasMembership
        ? hasTicket
          ? [
              { href: "/queries?view=artwork-status#query-tabs", label: "Explore Art" },
              { href: "/tour-register", label: "Browse Tours", secondary: true },
            ]
          : [
              { href: "/purchase-ticket", label: "Buy Tickets" },
              { href: "/queries?view=artwork-status#query-tabs", label: "Explore Art", secondary: true },
            ]
        : [
            { href: "/purchase-membership", label: "Purchase Membership" },
            { href: "/queries?view=artwork-status#query-tabs", label: "Search Collection", secondary: true },
          ];
      const memberCards = [
        ...(!hasTicket ? [
          { eyebrow: "Visit", title: "Tickets", description: "", href: "/purchase-ticket", linkLabel: "Buy Tickets", imagePath: "/images/admission.jpg", alt: "Museum admissions desk." },
        ] : []),
        ...(hasMembership ? [
          { eyebrow: "Membership", title: "Membership", description: needsRenewal ? `Status: ${memberStatus}.` : "", href: "/purchase-ticket", linkLabel: needsRenewal ? "Renew" : "Manage", imagePath: "/images/visitor-services.jpg", alt: "Museum member services area." },
        ] : []),
        ...(hasMembership && hasTicket ? [
          { eyebrow: "Tours", title: "Tours", description: "", href: "/tour-register", linkLabel: "Browse Tours", imagePath: "/images/education.jpg", alt: "Museum tour visitors." },
          { eyebrow: "Events", title: "Events", description: "", href: "/event-register", linkLabel: "View Events", imagePath: "/images/evening-jazz.jpg", alt: "Museum event." },
        ] : []),
        { eyebrow: "Art", title: "Collection", description: "", href: "/queries?view=artwork-status#query-tabs", linkLabel: "Search Collection", imagePath: "/images/the-farnese-hours.jpg", alt: "Illuminated manuscript artwork." },
      ];

      return res.send(renderPage({
        title: "Member Overview",
        user,
        currentPath: req.path,
        hero: {
          eyebrow: "Member Portal",
          title: `Welcome, ${firstName}`,
          description: hasMembership
            ? hasTicket
              ? ""
              : "Member pricing available."
            : "Membership and admission access.",
          imagePath: "/images/museum3.jpg",
          alt: "Museum member gallery.",
          actions: memberActions,
          compact: true,
        },
        content: `
          <section class="member-dashboard-layout">
            <div class="member-dashboard-main">
              <article class="member-primary-action">
                <img src="${hasTicket ? "/images/the-farnese-hours.jpg" : "/images/admission.jpg"}" alt="">
                <div>
                  <p class="eyebrow">${hasTicket ? "Next" : "Visit"}</p>
                  <h2>${hasTicket ? "Explore the collection before your visit." : "Buy admission with your member pricing."}</h2>
                  <p>${hasTicket ? "Search artwork records, tours, and member events from one place." : "Choose ticket type first, then add your visit date and exhibition."}</p>
                  <a class="button" href="${hasTicket ? "/queries?view=artwork-status#query-tabs" : "/purchase-ticket"}">${hasTicket ? "Explore Art" : "Buy Tickets"}</a>
                </div>
              </article>
              <div class="member-support-grid">
                ${memberCards.slice(0, 3).map((card) => `
                  <article class="member-support-card">
                    <img src="${card.imagePath}" alt="${card.alt}">
                    <div>
                      <p class="eyebrow">${card.eyebrow}</p>
                      <h2>${card.title}</h2>
                      <a href="${card.href}">${card.linkLabel}</a>
                    </div>
                  </article>
                `).join("")}
              </div>
            </div>
            <aside class="member-status-rail">
              <h2>${hasMembership ? "Membership" : "Account"}</h2>
              <p class="member-status-rail__note">${escapeHtml(memberBenefitLine)}</p>
              ${renderFlash(req)}
              <dl>
                <div><dt>Status</dt><dd><span class="status-badge status-badge--${hasMembership ? "success" : membershipInfo ? "warning" : "neutral"}">${escapeHtml(memberStatus)}</span></dd></div>
                <div><dt>Admission</dt><dd>${hasTicket ? `${ticketCount} ticket${ticketCount === 1 ? "" : "s"}` : "No ticket on file"}</dd></div>
                <div><dt>Valid Through</dt><dd>${membershipInfo?.Date_Exited ? escapeHtml(new Date(membershipInfo.Date_Exited).toLocaleDateString()) : "N/A"}</dd></div>
              </dl>
              <div class="workspace-links">
                <a class="button button-secondary" href="/event-register">Events</a>
                <a class="button button-secondary" href="/tour-register">Tours</a>
              </div>
            </aside>
          </section>
        `,
      }));
    }

    if (isAdmissions(user)) {
      const [[ticketSalesTodayRow]] = await pool.query(
        "SELECT COALESCE(SUM(tl.Quantity), 0) AS value FROM Ticket t JOIN ticket_line tl ON t.Ticket_ID = tl.Ticket_ID WHERE t.Purchase_Date = CURDATE()"
      );
      const ticketsSoldToday = Number(ticketSalesTodayRow?.value || 0);

      return res.send(renderPage({
        title: "Admissions Overview",
        user,
        currentPath: req.path,
        hero: {
          eyebrow: "Admissions Desk",
          title: "Admissions",
          description: "",
          imagePath: getRoleAsset("admissions").imagePath,
          alt: getRoleAsset("admissions").alt,
          compact: true,
          actions: [
            { href: "/sell-ticket", label: "Sell Tickets" },
            { href: "/add-membership", label: "Manage Memberships", secondary: true },
          ],
        },
        content: `
          <section class="card dashboard-card">
            <h2>Admissions Overview</h2>
            ${renderProfile(user)}
            ${renderFlash(req)}
          </section>
          ${renderActionCards([
            { eyebrow: "Primary Task", title: "Ticket Sales", description: `${ticketsSoldToday} sold today`, href: "/sell-ticket", linkLabel: "Sell Tickets", imagePath: "/images/admission.jpg", alt: "Museum admissions view." },
            { eyebrow: "Membership", title: "Memberships", description: "", href: "/add-membership", linkLabel: "Open Memberships", imagePath: "/images/visitor-services.jpg", alt: "Museum member services area." },
            { eyebrow: "Reporting", title: "Sales Report", description: "", href: "/ticket-sales", linkLabel: "Open Sales Report", imagePath: "/images/marketing.jpg", alt: "Museum visitor traffic." },
          ])}
        `,
      }));
    }

    if (isGiftShop(user)) {
      return res.send(renderPage({
        title: "Gift Shop Overview",
        user,
        currentPath: req.path,
        hero: {
          eyebrow: "Gift Shop",
          title: "Gift Shop",
          description: "",
          imagePath: getRoleAsset("giftshop").imagePath,
          alt: getRoleAsset("giftshop").alt,
          compact: true,
          actions: [
            { href: "/gift-order", label: "New Shop Order" },
            { href: "/add-item", label: "Inventory", secondary: true },
          ],
        },
        content: `
          <section class="card dashboard-card">
            <h2>Gift Shop Overview</h2>
            ${renderProfile(user)}
            ${renderFlash(req)}
          </section>
          ${renderActionCards([
            { eyebrow: "Orders", title: "Orders", description: "", href: "/gift-order", linkLabel: "Open Shop Floor", imagePath: getGiftShopAsset("Museum Tote Bag", "Merchandise").imagePath, alt: "Gift shop product display." },
            { eyebrow: "Sales", title: "Sales", description: "", href: "/add-sale", linkLabel: "Manage Sales", imagePath: "/images/the-birth-of-the-last-muse.jpg", alt: "Museum store merchandise." },
            { eyebrow: "Inventory", title: "Inventory", description: "", href: "/add-item", linkLabel: "Open Inventory", imagePath: "/images/gift-shop.jpg", alt: "Gift shop display." },
          ])}
        `,
      }));
    }

    if (isCafe(user)) {
      return res.send(renderPage({
        title: "Cafe Overview",
        user,
        currentPath: req.path,
        hero: {
          eyebrow: "Museum Cafe",
          title: "Cafe",
          description: "",
          imagePath: getRoleAsset("cafe").imagePath,
          alt: getRoleAsset("cafe").alt,
          compact: true,
          actions: [
            { href: "/order", label: "New Cafe Order" },
            { href: "/add-food", label: "Inventory", secondary: true },
          ],
        },
        content: `
          <section class="card dashboard-card">
            <h2>Cafe Overview</h2>
            ${renderProfile(user)}
            ${renderFlash(req)}
          </section>
          ${renderActionCards([
            { eyebrow: "Menu", title: "Menu", description: "", href: "/order", linkLabel: "Open Menu", imagePath: "/images/cafe.jpg", alt: "Cafe ordering area." },
            { eyebrow: "Orders", title: "Orders", description: "", href: "/add-food-sale", linkLabel: "Manage Orders", imagePath: "/images/cappuccino.jpg", alt: "Cafe service workflow." },
            { eyebrow: "Inventory", title: "Inventory", description: "", href: "/add-food", linkLabel: "Open Inventory", imagePath: "/images/croissant.jpg", alt: "Cafe stock display." },
          ])}
        `,
      }));
    }

    if (isCurator(user)) {
      return res.send(renderPage({
        title: "Curatorial Overview",
        user,
        currentPath: req.path,
        hero: {
          eyebrow: "Curatorial",
          title: "Curatorial",
          description: "",
          imagePath: getRoleAsset("curator").imagePath,
          alt: getRoleAsset("curator").alt,
          compact: true,
          actions: [
            { href: "/queries", label: "Search Collection" },
            { href: "/add-artwork", label: "Manage Artwork", secondary: true },
          ],
        },
        content: `
          <section class="card dashboard-card">
            <h2>Curatorial Overview</h2>
            ${renderProfile(user)}
            ${renderFlash(req)}
          </section>
          ${renderActionCards([
            { eyebrow: "Search", title: "Collection", description: "", href: "/queries", linkLabel: "Open Search", imagePath: "/images/the-farnese-hours.jpg", alt: "Collection artwork." },
            { eyebrow: "Artwork", title: "Artwork", description: "", href: "/add-artwork", linkLabel: "Manage Artwork", imagePath: "/images/allegory.jpg", alt: "Artwork record view." },
            { eyebrow: "Exhibitions", title: "Exhibitions", description: "", href: "/add-exhibition", linkLabel: "Manage Exhibitions", imagePath: "/images/exhibit.jpg", alt: "Exhibition gallery planning image." },
          ])}
        `,
      }));
    }

    if (user.role === "employee") {
      return res.send(renderPage({
        title: "Staff Overview",
        user,
        currentPath: req.path,
        hero: {
          eyebrow: "Museum Staff",
          title: "Staff",
          imagePath: getRoleAsset("employee").imagePath,
          alt: getRoleAsset("employee").alt,
          compact: true,
          actions: [
            { href: "/sell-ticket", label: "Ticket Register" },
            { href: "/gift-order", label: "Gift Shop POS", secondary: true },
            { href: "/order", label: "Cafe POS", secondary: true },
          ],
        },
        content: `
          <section class="card dashboard-card">
            <h2>Daily Operations</h2>
            ${renderProfile(user)}
            ${renderFlash(req)}
          </section>
          ${renderActionCards([
            { eyebrow: "Admissions", title: "Tickets", description: "", href: "/sell-ticket", linkLabel: "Open Register", imagePath: "/images/admission.jpg", alt: "Museum admissions view." },
            { eyebrow: "Gift Shop", title: "Gift Shop", description: "", href: "/gift-order", linkLabel: "Open POS", imagePath: getGiftShopAsset("Museum Tote Bag", "Merchandise").imagePath, alt: "Gift shop product display." },
            { eyebrow: "Cafe", title: "Cafe", description: "", href: "/order", linkLabel: "Open POS", imagePath: "/images/cafe.jpg", alt: "Cafe ordering area." },
          ])}
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

    const urgentCount = notifications.length + triggerViolations.length;
    const [
      ticketRevenue,
      giftRevenue,
      cafeRevenue,
      allTicketRevenue,
      allGiftRevenue,
      allCafeRevenue,
      ticketSalesToday,
      footfall,
      activeMembers,
      artworks,
      activeLoans,
      restorationOpen,
      upcomingEvents,
      upcomingTours,
      scheduledStaff,
      employeeCount,
      recentArtworks,
      collectionRows,
    ] = await Promise.all([
      getScalar(pool, `SELECT COALESCE(SUM(tl.Total_sum_of_ticket), 0) AS value FROM Ticket t JOIN ticket_line tl ON t.Ticket_ID = tl.Ticket_ID WHERE t.Purchase_Date = CURDATE()`, "value"),
      getScalar(pool, `SELECT COALESCE(SUM(gsl.Total_Sum_For_Gift_Shop_Sale), 0) AS value FROM Gift_Shop_Sale gs JOIN Gift_Shop_Sale_Line gsl ON gs.Gift_Shop_Sale_ID = gsl.Gift_Shop_Sale_ID WHERE gs.Sale_Date = CURDATE()`, "value"),
      getScalar(pool, `SELECT COALESCE(SUM(fsl.Quantity * fsl.Price_When_Food_Was_Sold), 0) AS value FROM Food_Sale fs JOIN Food_Sale_Line fsl ON fs.Food_Sale_ID = fsl.Food_Sale_ID WHERE fs.Sale_Date = CURDATE()`, "value"),
      getScalar(pool, `SELECT COALESCE(SUM(tl.Total_sum_of_ticket), 0) AS value FROM Ticket t JOIN ticket_line tl ON t.Ticket_ID = tl.Ticket_ID`, "value"),
      getScalar(pool, `SELECT COALESCE(SUM(gsl.Total_Sum_For_Gift_Shop_Sale), 0) AS value FROM Gift_Shop_Sale_Line gsl`, "value"),
      getScalar(pool, `SELECT COALESCE(SUM(fsl.Quantity * fsl.Price_When_Food_Was_Sold), 0) AS value FROM Food_Sale_Line fsl`, "value"),
      getScalar(pool, `SELECT COUNT(DISTINCT Ticket_ID) AS value FROM Ticket WHERE Purchase_Date = CURDATE()`, "value"),
      getScalar(pool, `SELECT COALESCE(SUM(tl.Quantity), 0) AS value FROM Ticket t JOIN ticket_line tl ON t.Ticket_ID = tl.Ticket_ID WHERE t.Visit_Date = CURDATE()`, "value"),
      getScalar(pool, `SELECT COUNT(*) AS value FROM Membership WHERE Status = 'Active'`, "value"),
      getScalar(pool, `SELECT COUNT(*) AS value FROM Artwork`, "value"),
      getScalar(pool, `SELECT COUNT(*) AS value FROM Artwork_Loan WHERE Status = 'Active'`, "value"),
      getScalar(pool, `SELECT COUNT(DISTINCT Artwork_ID) AS value FROM Artwork_Condition_Report WHERE Restoration_Required = TRUE`, "value"),
      getScalar(pool, `SELECT COUNT(*) AS value FROM Event WHERE start_Date >= CURDATE()`, "value"),
      getScalar(pool, `SELECT COUNT(*) AS value FROM Tour WHERE Tour_Date >= CURDATE()`, "value"),
      getScalar(pool, `SELECT COUNT(DISTINCT Employee_ID) AS value FROM Schedule WHERE Shift_Date = CURDATE()`, "value"),
      getScalar(pool, `SELECT COUNT(*) AS value FROM Employee`, "value"),
      getScalar(pool, `SELECT COUNT(*) AS value FROM Artwork WHERE Created_At >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`, "value"),
      getRows(pool, `
        SELECT
          aw.Title,
          aw.Type,
          ar.Artist_Name,
          COALESCE(cr.Condition_Status, 'Pending') AS Condition_Status
        FROM Artwork aw
        LEFT JOIN Artist ar ON aw.Artist_ID = ar.Artist_ID
        LEFT JOIN Artwork_Condition_Report cr
          ON cr.Report_ID = (
            SELECT cr2.Report_ID
            FROM Artwork_Condition_Report cr2
            WHERE cr2.Artwork_ID = aw.Artwork_ID
            ORDER BY cr2.Report_Date DESC, cr2.Report_ID DESC
            LIMIT 1
          )
        ORDER BY
          cr.Report_ID IS NULL,
          FIELD(cr.Condition_Status, 'Critical', 'Poor', 'Fair', 'Good', 'Excellent'),
          aw.Title
        LIMIT 4
      `),
    ]);

    const metrics = {
      ticketRevenue,
      giftRevenue,
      cafeRevenue,
      todayRevenue: Number(ticketRevenue) + Number(giftRevenue) + Number(cafeRevenue),
      allRevenue: Number(allTicketRevenue) + Number(allGiftRevenue) + Number(allCafeRevenue),
      ticketSalesToday,
      footfall,
      activeMembers,
      artworks,
      activeLoans,
      restorationOpen,
      upcomingEvents,
      upcomingTours,
      scheduledStaff,
      employeeCount,
      recentArtworks,
    };

    return res.send(renderPage({
      title: "Supervisor Overview",
      user,
      currentPath: req.path,
      showPortalBanner: false,
      mainClass: "supervisor-dashboard",
      content: `
        ${renderSupervisorDashboard({
          user,
          urgentCount,
          notifications,
          triggerViolations,
          metrics,
          collectionRows,
          flashHtml: renderFlash(req),
        })}
      `,
    }));
  }));

  app.post("/notifications/:id/read", requireLogin, asyncHandler(async (req, res) => {
    if (!isSupervisor(req.session.user)) {
      return res.redirect("/dashboard");
    }

    await pool.query(
      `UPDATE manager_notifications SET is_read = TRUE WHERE notification_id = ?`,
      [req.params.id]
    );
    res.redirect("/dashboard");
  }));

  app.post("/notifications/clear", requireLogin, asyncHandler(async (req, res) => {
    if (!isSupervisor(req.session.user)) {
      return res.redirect("/dashboard");
    }

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
