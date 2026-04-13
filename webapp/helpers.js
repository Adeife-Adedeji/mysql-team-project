function requireLogin(req, res, next) {
  if (!req.session.user) {
    setFlash(req, "Please log in first.");
    return res.redirect("/login");
  }

  next();
}

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function setFlash(req, message) {
  req.session.flash = message;
}

function renderFlash(req) {
  if (!req.session.flash) {
    return "";
  }

  const html = `<div class="flash">${escapeHtml(req.session.flash)}</div>`;
  delete req.session.flash;
  return html;
}

function renderPage({ title, user, content }) {
  const roleLabel = user?.role
    ? escapeHtml(user.role.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase()))
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <header class="site-header">
    <div class="site-header__topline"></div>
    <div class="site-header__inner">
      <a class="brand" href="/">
        <span class="brand-mark">MFAH</span>
        <span class="brand-copy">
          <span class="brand-eyebrow">The Museum of Fine Arts, Houston</span>
          <span class="brand-title">Internal Operations Portal</span>
        </span>
      </a>
      <div class="site-header__actions">
        <nav class="site-nav" aria-label="Primary">
          <a href="/">Home</a>
          ${user ? '<a href="/dashboard">Dashboard</a>' : '<a href="/login">Login</a>'}
        </nav>
        <div class="session-meta">
          ${user ? `<span class="session-chip">${roleLabel}</span>` : ""}
          ${user ? '<form method="post" action="/logout" class="inline-form"><button class="link-button" type="submit">Log Out</button></form>' : ""}
        </div>
      </div>
    </div>
  </header>
  <main class="container">
    ${content}
  </main>
  <script src="/app.js"></script>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDateInput(value) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().split("T")[0];
}

function formatDisplayDate(value) {
  if (!value) {
    return "N/A";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleDateString();
}

function getPageNumber(rawValue) {
  const parsed = Number.parseInt(rawValue, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function paginateRows(rows, page, pageSize = 10) {
  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;

  return {
    items: rows.slice(startIndex, startIndex + pageSize),
    currentPage,
    totalPages,
    totalRows,
    pageSize,
  };
}

function renderPager(req, pageParam, pagination, anchorId, basePath = req.path) {
  if (pagination.totalRows <= pagination.pageSize) {
    return "";
  }

  const buildHref = (page) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query || {})) {
      if (value === undefined || value === null || value === "") {
        continue;
      }
      params.set(key, String(value));
    }

    params.set(pageParam, String(page));
    return `${basePath}?${params.toString()}#${anchorId}`;
  };

  return `
    <div class="pagination">
      <span class="pagination__summary">Page ${pagination.currentPage} of ${pagination.totalPages} • ${pagination.totalRows} results</span>
      <div class="button-row pagination__actions">
        ${pagination.currentPage > 1 ? `<a class="button button-secondary button-small" href="${escapeHtml(buildHref(pagination.currentPage - 1))}">Previous</a>` : ""}
        ${pagination.currentPage < pagination.totalPages ? `<a class="button button-secondary button-small" href="${escapeHtml(buildHref(pagination.currentPage + 1))}">Next</a>` : ""}
      </div>
    </div>
  `;
}

function isStaff(user) {
  return isEmployee(user) || isSupervisor(user)
}

function isSupervisor(user) {
  return user && user.role === "supervisor";
}

function isEmployee(user) {
  return user && ["employee", "admissions", "giftshop", "cafe", "janitor",
    "security", "maintenance"].includes(user.role);
}

function isMember(user) {
  return user && user.role === "user";
}

function isAdmissions(user) {
  return user && user.role === "admissions";
}

function isGiftShop(user) {
  return user && user.role === "giftshop";
}

function isCafe(user) {
  return user && user.role === "cafe";
}

function allowRoles(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.session.user.role)) {
      setFlash(req, "Access denied.");
      return res.redirect("/dashboard");
    }
    next();
  };
}

async function logTriggerViolation(pool, req, message) {
  try {
    await pool.query(
      `INSERT INTO trigger_violation_log (route_path, user_email, message) VALUES (?, ?, ?)`,
      [req.path, req.session?.user?.email || null, message]
    );
  } catch (_) {}
}

module.exports = {
  asyncHandler,
  escapeHtml,
  formatDateInput,
  formatDisplayDate,
  getPageNumber,
  isEmployee,
  isMember,
  isStaff,
  isSupervisor,
  paginateRows,
  renderFlash,
  renderPager,
  renderPage,
  requireLogin,
  setFlash,
  allowRoles,
  isAdmissions,
  isGiftShop,
  isCafe,
  logTriggerViolation
};
