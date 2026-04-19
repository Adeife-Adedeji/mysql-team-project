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
  logTriggerViolation,
} = require("../helpers");

function renderSummaryCard(label, value, tone = "neutral") {
  return `
    <article class="summary-card">
      <p class="eyebrow">${label}</p>
      <strong class="status-badge status-badge--${tone}">${value}</strong>
    </article>
  `;
}

function renderExhibitionCards(exhibitions) {
  return `
    <div class="feature-grid">
      ${exhibitions.map((exhibition) => {
        const asset = getExhibitionAsset(exhibition.Exhibition_Name, exhibition.Image_URL);
        const name = String(exhibition.Exhibition_Name || "");
        const description = /spring/i.test(name)
          ? "A seasonal presentation of sculpture, painting, and garden-facing works."
          : /summer/i.test(name)
          ? "A bright summer selection of contemporary color, scale, and public programs."
          : "Current exhibition access may be added to admission.";
        return `
          <article class="feature-card">
            <div class="feature-card__media"><img src="${asset.imagePath}" alt="${asset.alt}"></div>
            <div class="feature-card__body">
              <h2>${escapeHtml(exhibition.Exhibition_Name)}</h2>
              <p>${escapeHtml(description)}</p>
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

const MEMBER_DISCOUNT = 0.2;

const TICKET_TYPES = [
  {
    value: "General Admission",
    title: "General Admission",
    price: 20,
    description: "Main campus galleries and permanent collection access.",
    benefits: ["Same-day museum entry", "Optional exhibition pairing"],
  },
  {
    value: "Senior",
    title: "Senior 65+",
    price: 15,
    description: "Reduced admission for visitors 65 and older.",
    benefits: ["Permanent collection access", "Optional exhibition pairing"],
  },
  {
    value: "Child",
    title: "Child Under 12",
    price: 10,
    description: "Youth admission for family visits.",
    benefits: ["Permanent collection access", "Family-friendly galleries"],
  },
];

function getTicketPrice(ticketType, hasDiscount) {
  const ticket = TICKET_TYPES.find((item) => item.value === ticketType);
  if (!ticket) {
    return null;
  }

  return hasDiscount ? ticket.price * (1 - MEMBER_DISCOUNT) : ticket.price;
}

function renderTicketTypeCards(hasDiscount) {
  return `
    <section class="ticket-card-grid" id="ticket-options">
      ${TICKET_TYPES.map((ticket, index) => {
        const finalPrice = getTicketPrice(ticket.value, hasDiscount);
        return `
          <article class="ticket-option-card ${index === TICKET_TYPES.length - 1 ? "ticket-option-card--featured" : ""}">
            <div class="ticket-option-card__header">
              <h2>${escapeHtml(ticket.title)}</h2>
              <strong>$${finalPrice.toFixed(2)}</strong>
            </div>
            ${hasDiscount ? `<p class="ticket-option-card__discount">$${ticket.price.toFixed(2)} standard price</p>` : ""}
            ${ticket.description ? `<p>${escapeHtml(ticket.description)}</p>` : ""}
            ${hasDiscount ? "<p>Member pricing applied.</p>" : ""}
            <ul>
              ${ticket.benefits.map((benefit) => `<li>${escapeHtml(benefit)}</li>`).join("")}
            </ul>
            <a class="button" href="/purchase-ticket/details?ticket_type=${encodeURIComponent(ticket.value)}">Select Ticket</a>
          </article>
        `;
      }).join("")}
    </section>
  `;
}

function renderTicketSteps(activeStep = 1) {
  const steps = ["Choose ticket", "Visit details", "Account", "Review and pay"];
  return `
    <ol class="process-steps" aria-label="Ticket purchase steps">
      ${steps.map((step, index) => `
        <li class="${index + 1 === activeStep ? "is-active" : index + 1 < activeStep ? "is-complete" : ""}">
          <span>${index + 1}</span>
          <strong>${escapeHtml(step)}</strong>
        </li>
      `).join("")}
    </ol>
  `;
}

function registerPurchaseTicketRoutes(app, { pool }) {
  app.get("/purchase-membership", requireLogin, allowRoles(["user"]), asyncHandler(async (req, res) => {
    let membershipInfo = null;
    if (req.session.user.membershipId) {
      const [[row]] = await pool.query(
        "SELECT Membership_ID, Status, Date_Joined, Date_Exited FROM Membership WHERE Membership_ID = ?",
        [req.session.user.membershipId],
      );
      membershipInfo = row || null;
    }

    res.send(renderPage({
      title: "Purchase Membership",
      user: req.session.user,
      currentPath: req.path,
      hero: {
        eyebrow: "Membership",
        title: "Membership",
        description: "Member admission, tours, and programs.",
        imagePath: "/images/museum2.jpg",
        alt: "Museum membership gallery.",
        actions: [
          { href: "#membership-options", label: membershipInfo ? "Manage Membership" : "Purchase Membership" },
          { href: "/queries?view=artwork-status#query-tabs", label: "Search Collection", secondary: true },
        ],
      },
      content: `
        ${renderFlash(req)}
        <section class="membership-pricing" id="membership-options">
          <article class="membership-plan membership-plan--standard">
            <div class="membership-plan__header">
              <h2>Annual Membership</h2>
              <strong>$49<span>/ year</span></strong>
            </div>
            <ul>
              <li>20% admission discount</li>
              <li>Guided tour registration</li>
              <li>Event registration access</li>
              <li>Collection visit planning</li>
            </ul>
            ${membershipInfo?.Status === "Active"
              ? '<a class="button button-secondary" href="/dashboard">Membership Active</a>'
              : `<form method="post" action="/purchase-membership">
                  <button class="button button-success" type="submit">${membershipInfo ? "Restore Membership" : "Purchase Membership"}</button>
                </form>`}
          </article>
          <article class="membership-plan membership-plan--supporter">
            <div class="membership-plan__header">
              <h2>Patron Membership</h2>
              <strong>$149<span>/ year</span></strong>
            </div>
            <ul>
              <li>Member admission discount</li>
              <li>Priority program registration</li>
              <li>Exhibition previews</li>
              <li>Support for collection care</li>
            </ul>
            <form method="post" action="/purchase-membership">
              <button class="button" type="submit" ${membershipInfo?.Status === "Active" ? "disabled" : ""}>Join as Patron</button>
            </form>
          </article>
        </section>
      `,
    }));
  }));

  app.post("/purchase-membership", requireLogin, allowRoles(["user"]), asyncHandler(async (req, res) => {
    const user = req.session.user;
    const [firstName, ...lastParts] = String(user.name || "").split(" ");
    const lastName = lastParts.join(" ") || "Member";

    if (user.membershipId) {
      await pool.query(
        `UPDATE Membership
         SET Status = 'Active',
             Date_Joined = COALESCE(Date_Joined, CURDATE()),
             Date_Exited = DATE_ADD(CURDATE(), INTERVAL 1 YEAR),
             Updated_By = ?
         WHERE Membership_ID = ?`,
        [user.email, user.membershipId],
      );
      setFlash(req, "Membership activated.");
      return res.redirect("/dashboard");
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [membershipResult] = await connection.query(
        `INSERT INTO Membership (First_Name, Last_Name, Email, Date_Joined, Updated_By)
         VALUES (?, ?, ?, CURDATE(), ?)`,
        [firstName || "Museum", lastName, user.email, user.email],
      );
      await connection.query(
        "UPDATE users SET membership_id = ? WHERE id = ?",
        [membershipResult.insertId, user.id],
      );
      await connection.commit();
      req.session.user.membershipId = membershipResult.insertId;
      setFlash(req, "Membership purchased. Member pricing is active.");
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    res.redirect("/dashboard");
  }));

  app.get("/purchase-ticket", requireLogin, allowRoles(["user"]), asyncHandler(async (req, res) => {
    const [exhibitionImageColumns] = await pool.query(
      `SELECT 1
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'Exhibition'
         AND COLUMN_NAME = 'Image_URL'
       LIMIT 1`
    );
    const hasExhibitionImageColumn = exhibitionImageColumns.length > 0;
    const [exhibitions] = await pool.query(
      `SELECT Exhibition_ID, Exhibition_Name, ${hasExhibitionImageColumn ? "Image_URL" : "NULL"} AS Image_URL FROM Exhibition ORDER BY Exhibition_Name`,
    );
    let membershipId = req.session.user.membershipId ?? null;
    const discount = 0.2;
    let membershipInfo = null;

    if (membershipId !== null) {
      const [[row]] = await pool.query(
        "SELECT Membership_ID, Status, Date_Joined, Date_Exited FROM Membership WHERE Membership_ID = ?",
        [membershipId],
      );
      membershipInfo = row || null;
      if (!membershipInfo || membershipInfo.Status !== "Active") {
        membershipId = null;
      }
    }

    const [recentTickets] = membershipId
      ? await pool.query(
          `SELECT Ticket_ID, Purchase_Date, Visit_Date, Payment_method
           FROM Ticket
           WHERE Membership_ID = ?
           ORDER BY Purchase_Date DESC, Ticket_ID DESC
           LIMIT 5`,
          [membershipId],
        )
      : await pool.query(
          `SELECT Ticket_ID, Purchase_Date, Visit_Date, Payment_method
           FROM Ticket
           WHERE Email = ?
           ORDER BY Purchase_Date DESC, Ticket_ID DESC
           LIMIT 5`,
          [req.session.user.email],
        );

    const membershipStatus = membershipInfo?.Status || "No Active Membership";
    const membershipTone = membershipStatus === "Active" ? "success" : membershipStatus === "Expired" ? "warning" : "danger";
    const expiryDate = membershipInfo?.Date_Exited ? formatDisplayDate(membershipInfo.Date_Exited) : "N/A";
    const joinedDate = membershipInfo?.Date_Joined ? formatDisplayDate(membershipInfo.Date_Joined) : "N/A";

    const ticketRows = recentTickets.map((ticket) => `
      <tr>
        <td>#${ticket.Ticket_ID}</td>
        <td>${formatDisplayDate(ticket.Purchase_Date)}</td>
        <td>${formatDisplayDate(ticket.Visit_Date)}</td>
        <td>${escapeHtml(ticket.Payment_method || "N/A")}</td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Tickets",
      user: req.session.user,
      currentPath: req.path,
      hero: {
        eyebrow: "Tickets",
        title: "Tickets",
        description: "",
        imagePath: "/images/admission.jpg",
        alt: "Museum admissions desk.",
        actions: [
          { href: "#ticket-options", label: "Buy Tickets" },
          { href: "/tour-register", label: "Browse Tours", secondary: true },
        ],
      },
      alertContent: membershipId
        ? { type: "success", title: "Member discount ready", message: "Your active membership applies a 20% discount automatically." }
        : {
            type: "warning",
            title: membershipInfo?.Status === "Cancelled" ? "Membership cancelled" : "Membership inactive",
            message: membershipInfo?.Status === "Cancelled"
              ? "Restore your membership to use member pricing."
              : "Renew to unlock member pricing for admission.",
            actions: [{ href: "/purchase-membership", label: membershipInfo ? "Open Membership" : "Join" }],
          },
      content: `
        <section class="flow-shell">
          ${renderTicketSteps(1)}
          <div class="applied-state applied-state--${membershipId ? "success" : "neutral"}">
            <div>
              <p class="eyebrow">${membershipId ? "Member Pricing Applied" : "Guest Pricing"}</p>
              <strong>${membershipId ? "20% admission discount is active." : "Sign in with active membership to apply discounted admission."}</strong>
            </div>
            <span>${membershipId ? `Valid through ${escapeHtml(expiryDate)}` : "Standard admission prices shown"}</span>
          </div>
        </section>
        ${membershipInfo && membershipInfo.Status !== "Active" && membershipInfo.Status !== "Cancelled" ? `
          <section class="card quiet-card">
            <h2>Membership Renewal</h2>
            <form method="post" action="/member-renew-membership">
              <button class="button" type="submit">Renew Membership</button>
            </form>
          </section>
        ` : ""}
        ${membershipInfo?.Status === "Cancelled" ? `
          <section class="card quiet-card">
            <h2>Your Membership</h2>
            <p class="section-lead">Membership is cancelled. Restore it here for member pricing, tours, and events.</p>
            <a class="button" href="/purchase-membership">Open Membership</a>
          </section>
        ` : ""}
        <section class="card" id="ticket-form">
          <div class="section-header">
            <div>
              <p class="eyebrow">Step 1</p>
              <h2>Choose ticket type</h2>
            </div>
            <span class="status-badge status-badge--${membershipId ? "success" : "neutral"}">${membershipId ? "Member pricing" : "Guest pricing"}</span>
          </div>
          ${renderFlash(req)}
          ${renderTicketTypeCards(Boolean(membershipId))}
        </section>
        <section class="supporting-section">
          <h2>Exhibition add-ons</h2>
          ${renderExhibitionCards(exhibitions)}
        </section>
        <section class="card quiet-card">
          <h2>Account activity</h2>
          <div class="summary-grid">
            ${renderSummaryCard("Membership", escapeHtml(membershipStatus), membershipTone)}
            ${renderSummaryCard("Member Since", escapeHtml(joinedDate), "neutral")}
            ${renderSummaryCard("Valid Through", escapeHtml(expiryDate), membershipId ? "success" : "warning")}
          </div>
          <table>
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Purchased</th>
                <th>Visit Date</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              ${ticketRows || '<tr><td colspan="4">No ticket purchases found.</td></tr>'}
            </tbody>
          </table>
        </section>
      `,
    }));
  }));

  app.get("/purchase-ticket/details", requireLogin, allowRoles(["user"]), asyncHandler(async (req, res) => {
    const ticketType = req.query.ticket_type;
    const ticket = TICKET_TYPES.find((item) => item.value === ticketType);

    if (!ticket) {
      setFlash(req, "Choose a ticket type before entering visit details.");
      return res.redirect("/purchase-ticket#ticket-options");
    }

    const [exhibitionImageColumns] = await pool.query(
      `SELECT 1
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'Exhibition'
         AND COLUMN_NAME = 'Image_URL'
       LIMIT 1`
    );
    const hasExhibitionImageColumn = exhibitionImageColumns.length > 0;
    const [exhibitions] = await pool.query(
      `SELECT Exhibition_ID, Exhibition_Name, ${hasExhibitionImageColumn ? "Image_URL" : "NULL"} AS Image_URL FROM Exhibition ORDER BY Exhibition_Name`,
    );
    const membershipId = req.session.user.membershipId ?? null;
    let hasDiscount = false;

    if (membershipId !== null) {
      const [[member]] = await pool.query(
        "SELECT Status FROM Membership WHERE Membership_ID = ?",
        [membershipId],
      );
      hasDiscount = member?.Status === "Active";
    }

    const finalPrice = getTicketPrice(ticket.value, hasDiscount);
    const today = new Date().toISOString().split("T")[0];

    res.send(renderPage({
      title: `${ticket.title} Details`,
      user: req.session.user,
      currentPath: "/purchase-ticket",
      hero: {
        eyebrow: "Ticket Details",
        title: ticket.title,
        description: `${hasDiscount ? "Member price" : "Ticket price"}: $${finalPrice.toFixed(2)}`,
        imagePath: "/images/admission.jpg",
        alt: "Museum admissions desk.",
        actions: [
          { href: "/purchase-ticket#ticket-options", label: "Change Ticket", secondary: true },
        ],
      },
      content: `
        <section class="flow-shell">
          ${renderTicketSteps(2)}
        </section>
        <section class="card">
          <div class="content-rail">
            <div>
              <p class="eyebrow">Step 2</p>
              <h2>Visit details and add-ons</h2>
              ${renderFlash(req)}
              <form method="post" action="/purchase-ticket" class="form-grid">
                <input type="hidden" name="ticket_type" value="${escapeHtml(ticket.value)}">
                <label>Visit Date
                  <input type="date" name="visit_date" required min="${today}">
                </label>
                <label>Quantity
                  <input type="number" name="quantity" min="1" value="1" required>
                </label>
                <label>Payment Method
                  <select name="payment_method" required>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Cash">Cash</option>
                  </select>
                </label>
                <label>Exhibition
                  <select name="exhibition_id">
                    <option value="">General Admission</option>
                    ${exhibitions.map((exhibition) => `<option value="${exhibition.Exhibition_ID}">${escapeHtml(exhibition.Exhibition_Name)}</option>`).join("")}
                  </select>
                </label>
                <button class="button" type="submit">Complete Purchase</button>
              </form>
            </div>
            <aside class="content-rail__side">
              <section class="ticket-summary-card">
                <h2>${escapeHtml(ticket.title)}</h2>
                <strong>$${finalPrice.toFixed(2)}</strong>
                ${hasDiscount ? `<span class="status-badge status-badge--success">20% member discount</span>` : `<span class="status-badge status-badge--neutral">Guest pricing</span>`}
                ${ticket.description ? `<p>${escapeHtml(ticket.description)}</p>` : ""}
              </section>
            </aside>
          </div>
        </section>
        <section class="card">
          <h2>Exhibitions</h2>
          ${renderExhibitionCards(exhibitions)}
        </section>
      `,
    }));
  }));

  app.post("/purchase-ticket", requireLogin, allowRoles(["user"]), asyncHandler(async (req, res) => {
    const {
      visit_date: visitDate,
      ticket_type: ticketType,
      quantity,
      payment_method: paymentMethod,
      exhibition_id: exhibitionId,
    } = req.body;

    if (!visitDate || !ticketType || !quantity || !paymentMethod) {
      setFlash(req, "All purchase fields are required.");
      return res.redirect("/purchase-ticket");
    }

    const qty = Number.parseInt(quantity, 10);
    if (!Number.isInteger(qty) || qty < 1) {
      setFlash(req, "Quantity must be at least 1.");
      return res.redirect("/purchase-ticket");
    }

    let discount = 0;
    let basePrice;
    switch (ticketType) {
      case "General Admission": basePrice = 20.0; break;
      case "Senior": basePrice = 15.0; break;
      case "Child": basePrice = 10.0; break;
      default:
        setFlash(req, "Invalid ticket type selected.");
        return res.redirect("/purchase-ticket");
    }

    const membershipId = req.session.user.membershipId ?? null;
    let activeMembershipId = null;
    if (membershipId !== null) {
      const [memberRows] = await pool.query(
        "SELECT Membership_ID, Status FROM Membership WHERE Membership_ID = ?",
        [membershipId],
      );
      if (memberRows.length > 0 && memberRows[0].Status === "Active") {
        activeMembershipId = membershipId;
        discount = 0.2;
      }
    }
    const finalPrice = basePrice * (1 - discount);

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [ticketResult] = await connection.query(
        `INSERT INTO Ticket (Purchase_type, Purchase_Date, Visit_Date, Payment_method, Membership_ID, Email)
         VALUES ('Online', CURRENT_DATE, ?, ?, ?, ?)`,
        [visitDate, paymentMethod, activeMembershipId, req.session.user.email],
      );

      await connection.query(
        `INSERT INTO ticket_line (Ticket_ID, Ticket_Type, Quantity, Price_per_ticket, Exhibition_ID)
         VALUES (?, ?, ?, ?, ?)`,
        [ticketResult.insertId, ticketType, qty, finalPrice, exhibitionId || null],
      );

      await connection.commit();
      setFlash(req, `Ticket purchase completed. Confirmation #${ticketResult.insertId}. Total: $${(finalPrice * qty).toFixed(2)}`);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    res.redirect("/purchase-ticket");
  }));

  app.post("/member-renew-membership", requireLogin, allowRoles(["user"]), asyncHandler(async (req, res) => {
    const membershipId = req.session.user.membershipId;

    if (!membershipId) {
      return res.redirect("/purchase-membership");
    }

    const [[member]] = await pool.query(
      "SELECT Membership_ID, Status FROM Membership WHERE Membership_ID = ?",
      [membershipId]
    );

    if (!member) {
      setFlash(req, "Membership record not found. Contact museum staff for assistance.");
      return res.redirect("/purchase-ticket");
    }

    if (member.Status === "Cancelled") {
      setFlash(req, "This membership was cancelled. Visit the admissions desk to create a new membership.");
      return res.redirect("/purchase-ticket");
    }

    await pool.query(
      `UPDATE Membership
       SET Date_Exited = DATE_ADD(GREATEST(COALESCE(Date_Exited, CURDATE()), CURDATE()), INTERVAL 1 YEAR),
           Status      = 'Active',
           Updated_By  = ?
       WHERE Membership_ID = ?`,
      [req.session.user.email, membershipId]
    );

    setFlash(req, "Membership renewed for 1 year. Your member discount is active again.");
    res.redirect("/purchase-ticket");
  }));

  app.get("/sell-ticket", requireLogin, allowRoles(["admissions", "employee", "supervisor"]), asyncHandler(async (req, res) => {
    const tickets = [
      { Ticket_Type_ID: 1, Name: "General Admission", Price: 20 },
      { Ticket_Type_ID: 2, Name: "Senior", Price: 15 },
      { Ticket_Type_ID: 3, Name: "Child", Price: 10 },
    ];
    const cart = req.session.ticketCart || [];
    const membershipId = req.session.membershipId || null;
    let discount = membershipId ? 0.2 : 0;

    const [exhibitions] = await pool.query(
      "SELECT Exhibition_ID, Exhibition_Name FROM Exhibition ORDER BY Exhibition_Name"
    );

    const [members] = await pool.query(
      "SELECT Membership_ID, First_Name, Last_Name, Status FROM Membership ORDER BY Last_Name, First_Name"
    );
    const today = new Date().toISOString().split("T")[0];

    res.send(renderPage({
      title: "Sell Tickets",
      user: req.session.user,
      currentPath: req.path,
      content: `
        <section class="card dashboard-card">
          <h1>Sell Tickets</h1>
          ${renderFlash(req)}
          <form method="post" action="/sell-ticket/add" class="form-grid">
            <label>Membership (optional)
              <select name="membership_id" data-ticket-membership-select>
                <option value="">No membership / guest purchase</option>
                ${members.map((m) => `
                  <option value="${m.Membership_ID}" data-status="${escapeHtml(m.Status)}" ${req.session.membershipId == m.Membership_ID ? "selected" : ""}>
                    ID: ${m.Membership_ID} - ${escapeHtml(m.First_Name)} ${escapeHtml(m.Last_Name)} (${escapeHtml(m.Status)})
                  </option>
                `).join("")}
              </select>
            </label>
            <label>Visit Date
              <input type="date" name="visit_date" required min="${today}">
            </label>
            <label>Purchase Type
              <select name="purchase_type" required>
                <option value="In-Person" ${req.session.purchaseType === "In-Person" ? "selected" : ""}>In-Person</option>
                <option value="Walk-up" ${req.session.purchaseType === "Walk-up" ? "selected" : ""}>Walk-up</option>
                <option value="Online" ${req.session.purchaseType === "Online" ? "selected" : ""}>Online</option>
              </select>
            </label>
            <label>Ticket Type
              <select name="ticket_type_id" required data-ticket-type-select>
                ${tickets.map((t) => `
                  <option value="${t.Ticket_Type_ID}" data-name="${escapeHtml(t.Name)}" data-price="${t.Price}">
                    ${t.Name} ($${discount > 0 ? (t.Price * 0.8).toFixed(2) : t.Price.toFixed(2)})
                  </option>
                `).join("")}
              </select>
            </label>
            <label>Quantity
              <input type="number" name="quantity" min="1" required>
            </label>
            <label>Exhibition
              <select name="exhibition_id">
                <option value="">General Admission</option>
                ${exhibitions.map((ex) => `
                  <option value="${ex.Exhibition_ID}">
                    ${escapeHtml(ex.Exhibition_Name)}
                  </option>
                `).join("")}
              </select>
            </label>
            <label>Visitor Email (optional)
              <input type="email" name="email">
            </label>
            <label>Visitor Phone (optional)
              <input type="text" name="phone">
            </label>
            <button class="button" type="submit">Add Ticket</button>
          </form>
        </section>
        <section class="card dashboard-card">
          <div class="section-header">
            <div>
              <h2>Current Order</h2>
            </div>
            <span class="status-badge status-badge--${discount > 0 ? "success" : "neutral"}">${discount > 0 ? "20% member discount" : "Guest pricing"}</span>
          </div>
          ${cart.length === 0 ? "<div class=\"empty-state\"><p>No tickets added yet.</p></div>" : `
            <table>
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Qty</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                ${cart.map((item) => {
                  const finalPrice = item.price * (1 - discount);
                  return `
                    <tr>
                      <td>${item.name}</td>
                      <td>${item.qty}</td>
                      <td>$${(finalPrice * item.qty).toFixed(2)}</td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
            <div class="button-row">
              <form method="post" action="/sell-ticket/checkout">
                <button class="button">Process Sale</button>
              </form>
              <form method="post" action="/sell-ticket/clear" onsubmit="return confirm('Clear the cart and start over?');">
                <button class="button button-secondary" type="submit">Cancel Order</button>
              </form>
            </div>
          `}
        </section>
      `,
    }));
  }));

  app.get("/ticket-sales", requireLogin, allowRoles(["admissions", "employee", "supervisor"]), asyncHandler(async (req, res) => {
    const ticketType = String(req.query.ticket_type || "");
    const purchaseType = String(req.query.purchase_type || "");
    const sortKey = String(req.query.sort || "purchase_date");
    const sortDirection = req.query.direction === "asc" ? "ASC" : "DESC";
    const sortOptions = {
      purchase_date: "t.Purchase_Date",
      visit_date: "t.Visit_Date",
      ticket_type: "tl.Ticket_Type",
      purchase_type: "t.Purchase_type",
      quantity: "tl.Quantity",
      revenue: "Line_Total",
    };
    const orderBy = sortOptions[sortKey] || sortOptions.purchase_date;
    const filters = ["DATE(t.Purchase_Date) = CURDATE()"];
    const params = [];

    if (ticketType) {
      filters.push("tl.Ticket_Type = ?");
      params.push(ticketType);
    }

    if (purchaseType) {
      filters.push("t.Purchase_type = ?");
      params.push(purchaseType);
    }

    const [ticketLines] = await pool.query(`
      SELECT
        t.Ticket_ID,
        t.Purchase_Date,
        t.Visit_Date,
        t.Purchase_type,
        t.Payment_method,
        COALESCE(CONCAT(m.First_Name, ' ', m.Last_Name), t.Email, 'Guest') AS Buyer,
        tl.Ticket_Type,
        tl.Quantity,
        tl.Price_per_ticket,
        tl.Quantity * tl.Price_per_ticket AS Line_Total,
        COALESCE(e.Exhibition_Name, 'General Admission') AS Exhibition_Name
      FROM Ticket t
      JOIN ticket_line tl ON t.Ticket_ID = tl.Ticket_ID
      LEFT JOIN Membership m ON t.Membership_ID = m.Membership_ID
      LEFT JOIN Exhibition e ON tl.Exhibition_ID = e.Exhibition_ID
      WHERE ${filters.join(" AND ")}
      ORDER BY ${orderBy} ${sortDirection}, t.Ticket_ID DESC
    `, params);

    const orderCount = new Set(ticketLines.map((line) => line.Ticket_ID)).size;
    const ticketsSold = ticketLines.reduce((sum, line) => sum + Number(line.Quantity || 0), 0);
    const totalRevenue = ticketLines.reduce((sum, line) => sum + Number(line.Line_Total || 0), 0);
    const averageOrder = orderCount ? totalRevenue / orderCount : 0;
    const ticketTypeMix = ticketLines.reduce((acc, line) => {
      const key = line.Ticket_Type || "Unknown";
      const current = acc.get(key) || { quantity: 0, revenue: 0 };
      current.quantity += Number(line.Quantity || 0);
      current.revenue += Number(line.Line_Total || 0);
      acc.set(key, current);
      return acc;
    }, new Map());

    const purchaseTypes = ["Online", "In-Person", "Walk-up"];
    const queryFor = (overrides = {}) => {
      const params = new URLSearchParams();
      if (ticketType) params.set("ticket_type", ticketType);
      if (purchaseType) params.set("purchase_type", purchaseType);
      Object.entries(overrides).forEach(([key, value]) => {
        if (value) params.set(key, value);
        else params.delete(key);
      });
      return `/ticket-sales${params.toString() ? `?${params.toString()}` : ""}`;
    };
    const sortLink = (label, key) => {
      const nextDirection = sortKey === key && sortDirection === "DESC" ? "asc" : "desc";
      const marker = sortKey === key ? (sortDirection === "DESC" ? " ↓" : " ↑") : "";
      return `<a href="${queryFor({ sort: key, direction: nextDirection })}">${label}${marker}</a>`;
    };

    res.send(renderPage({
      title: "Ticket Sales",
      user: req.session.user,
      currentPath: req.path,
      content: `
        <section class="card dashboard-card">
          <h1>Ticket Sales</h1>
          <form method="get" action="/ticket-sales" class="ticket-sales-filters">
            <label>Ticket Type
              <select name="ticket_type">
                <option value="">All ticket types</option>
                ${TICKET_TYPES.map((ticket) => `<option value="${escapeHtml(ticket.value)}" ${ticketType === ticket.value ? "selected" : ""}>${escapeHtml(ticket.title)}</option>`).join("")}
              </select>
            </label>
            <label>Purchase Type
              <select name="purchase_type">
                <option value="">All purchase types</option>
                ${purchaseTypes.map((type) => `<option value="${escapeHtml(type)}" ${purchaseType === type ? "selected" : ""}>${escapeHtml(type)}</option>`).join("")}
              </select>
            </label>
            <input type="hidden" name="sort" value="${escapeHtml(sortKey)}">
            <input type="hidden" name="direction" value="${sortDirection.toLowerCase()}">
            <button class="button" type="submit">Apply Filters</button>
            <a class="button button-secondary" href="/ticket-sales">Reset</a>
          </form>
          <div class="summary-grid">
            ${renderSummaryCard("Orders", String(orderCount), "neutral")}
            ${renderSummaryCard("Tickets Sold", String(ticketsSold), "success")}
            ${renderSummaryCard("Revenue", `$${totalRevenue.toFixed(2)}`, "neutral")}
            ${renderSummaryCard("Average Order", `$${averageOrder.toFixed(2)}`, "neutral")}
          </div>
          <div class="ticket-sales-mix" aria-label="Ticket type sales mix">
            ${Array.from(ticketTypeMix.entries()).map(([type, totals]) => `
              <article>
                <p class="eyebrow">${escapeHtml(type)}</p>
                <strong>${totals.quantity}</strong>
                <span>$${totals.revenue.toFixed(2)}</span>
              </article>
            `).join("") || '<div class="empty-state"><p>No ticket lines match the current filters.</p></div>'}
          </div>
        </section>
        <section class="card dashboard-card">
          <div class="section-header">
            <div>
              <h2>Ticket Lines</h2>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>${sortLink("Order", "purchase_date")}</th>
                <th>${sortLink("Visit", "visit_date")}</th>
                <th>Buyer</th>
                <th>${sortLink("Ticket Type", "ticket_type")}</th>
                <th>${sortLink("Purchase Type", "purchase_type")}</th>
                <th>Payment</th>
                <th>Exhibition</th>
                <th>${sortLink("Qty", "quantity")}</th>
                <th>Unit</th>
                <th>${sortLink("Total", "revenue")}</th>
              </tr>
            </thead>
            <tbody>
              ${ticketLines.map((line) => `
                <tr>
                  <td>#${line.Ticket_ID}<br><span class="muted">${formatDisplayDate(line.Purchase_Date)}</span></td>
                  <td>${formatDisplayDate(line.Visit_Date)}</td>
                  <td>${escapeHtml(line.Buyer || "Guest")}</td>
                  <td><span class="status-badge status-badge--neutral">${escapeHtml(line.Ticket_Type || "N/A")}</span></td>
                  <td>${escapeHtml(line.Purchase_type || "N/A")}</td>
                  <td>${escapeHtml(line.Payment_method || "N/A")}</td>
                  <td>${escapeHtml(line.Exhibition_Name || "General Admission")}</td>
                  <td>${Number(line.Quantity || 0)}</td>
                  <td>$${Number(line.Price_per_ticket || 0).toFixed(2)}</td>
                  <td>$${Number(line.Line_Total || 0).toFixed(2)}</td>
                </tr>
              `).join("") || '<tr><td colspan="10">No ticket sales match the current filters.</td></tr>'}
            </tbody>
          </table>
        </section>
      `
    }));
  }));

  app.post("/sell-ticket/add", requireLogin, allowRoles(["admissions", "employee", "supervisor"]), asyncHandler(async (req, res) => {
    const { ticket_type_id, quantity, visit_date, membership_id, email, phone, purchase_type } = req.body;
    const qty = Number.parseInt(quantity, 10);

    if (!visit_date || !purchase_type || !ticket_type_id || !Number.isInteger(qty) || qty < 1) {
      setFlash(req, "Visit date, purchase type, ticket type, and a valid quantity are required.");
      return res.redirect("/sell-ticket");
    }

    req.session.visitDate = visit_date;
    req.session.purchaseType = purchase_type;
    let validMembership = null;
    if (membership_id) {
      const [rows] = await pool.query(
        "SELECT Membership_ID, Status FROM Membership WHERE Membership_ID = ?",
        [membership_id]
      );

      if (rows.length > 0) {
        if (rows[0].Status === "Active") {
          validMembership = membership_id;
        } else {
          setFlash(req, `Membership ${membership_id} is ${rows[0].Status}. Guest pricing will be used unless the membership is renewed.`);
        }
      } else {
        setFlash(req, "Membership not found. Guest pricing will be used.");
      }
    }
    req.session.membershipId = validMembership;
    req.session.visitorEmail = email || null;
    req.session.visitorPhone = phone || null;
    let ticket;
    if (ticket_type_id == 1) ticket = { Name: "General Admission", Price: 20 };
    else if (ticket_type_id == 2) ticket = { Name: "Senior", Price: 15 };
    else if (ticket_type_id == 3) ticket = { Name: "Child", Price: 10 };
    else {
      setFlash(req, "Invalid ticket type selected.");
      return res.redirect("/sell-ticket");
    }

    if (!req.session.ticketCart) {
      req.session.ticketCart = [];
    }

    const exhibitionId = req.body.exhibition_id || null;

    const existing = req.session.ticketCart.find((t) => t.id == ticket_type_id && t.exhibitionId == exhibitionId);
    if (existing) {
      existing.qty += qty;
    } else {
      req.session.ticketCart.push({
        id: ticket_type_id,
        name: ticket.Name,
        price: ticket.Price,
        qty,
        exhibitionId: exhibitionId,
      });
    }

    res.redirect("/sell-ticket");
  }));

  app.post("/sell-ticket/checkout", requireLogin, allowRoles(["admissions", "employee", "supervisor"]), asyncHandler(async (req, res) => {
    const cart = req.session.ticketCart || [];
    const visit_date = req.session.visitDate;
    const purchase_type = req.session.purchaseType || "In-Person";
    let membershipId = req.session.membershipId || null;
    const email = req.session.visitorEmail || null;
    const phone = req.session.visitorPhone || null;
    let discount = 0;

    if (membershipId) {
      const [rows] = await pool.query(
        "SELECT Membership_ID, Status FROM Membership WHERE Membership_ID = ?",
        [membershipId]
      );
      if (rows.length > 0 && rows[0].Status === "Active") {
        discount = 0.2;
      } else {
        setFlash(req, rows.length > 0
          ? `Membership ${membershipId} is ${rows[0].Status}. The sale cannot use member pricing.`
          : "Membership not found. The sale cannot use member pricing.");
        req.session.membershipId = null;
        return res.redirect("/sell-ticket");
      }
    }

    if (!visit_date) {
      setFlash(req, "Visit date is required.");
      return res.redirect("/sell-ticket");
    }

    if (cart.length === 0) {
      setFlash(req, "No tickets in order.");
      return res.redirect("/sell-ticket");
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.query(
        "INSERT INTO Ticket (Purchase_type, Purchase_Date, Visit_Date, Membership_ID, Email, Phone_number, Payment_method) VALUES (?, CURRENT_DATE, ?, ?, ?, ?, 'Cash')",
        [purchase_type, visit_date, membershipId, email, phone]
      );

      const saleId = result.insertId;

      for (const item of cart) {
        const finalPrice = item.price * (1 - discount);
        await connection.query(
          `INSERT INTO ticket_line
           (Ticket_ID, Ticket_Type, Quantity, Price_per_ticket, Exhibition_ID)
           VALUES (?, ?, ?, ?, ?)`,
          [saleId, item.name, item.qty, finalPrice, item.exhibitionId || null]
        );
      }

      await connection.commit();
      setFlash(req, "Ticket sale completed.");
    } catch (error) {
      await connection.rollback();
      if (error.sqlState === "45000") {
        await logTriggerViolation(pool, req, error.sqlMessage);
      }
      throw error;
    } finally {
      connection.release();
    }

    req.session.ticketCart = [];
    req.session.visitorEmail = null;
    req.session.visitorPhone = null;
    req.session.membershipId = null;
    req.session.visitDate = null;

    res.redirect("/dashboard");
  }));

  app.post("/sell-ticket/clear", requireLogin, allowRoles(["admissions", "employee", "supervisor"]), asyncHandler(async (req, res) => {
    req.session.ticketCart = [];
    req.session.visitorEmail = null;
    req.session.visitorPhone = null;
    req.session.membershipId = null;
    req.session.visitDate = null;
    setFlash(req, "Cart cleared. Ready for a new order.");
    res.redirect("/sell-ticket");
  }));
}

module.exports = { registerPurchaseTicketRoutes };
