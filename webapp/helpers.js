const ART_STYLES = [
  "Abstract", "Baroque", "Contemporary", "Cubism", "Expressionism",
  "Impressionism", "Mannerism", "Modern", "Neoclassicism", "Pop Art", "Post-Impressionism",
  "Realism", "Renaissance", "Romanticism", "Surrealism", "Symbolism"
];

const ART_TYPES = [
  "Painting", "Sculpture", "Photograph", "Drawing", "Print",
  "Installation", "Video Art", "Textile", "Ceramic", "Digital Art"
];

const ART_PERIODS = [
  "Early Renaissance (1300-1499)", "High Renaissance (1500-1527)", "Mannerism (1520-1600)",
  "Baroque (1600-1750)", "Rococo (1700-1775)", "Neoclassicism (1750-1850)", "Romanticism (1800-1850)",
  "Realism (1840-1880)", "Impressionism (1860-1890)", "Post-Impressionism (1886-1905)", "Modernism (1890-1970)",
  "Expressionism (1905-1920)", "Cubism (1907-1914)", "Surrealism (1920s-1950s)", "Abstract Expressionism (1940s-1950s)",
  "Pop Art (1950s-1960s)", "Contemporary (1970-present)"
];

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
  return isEmployee(user) || isSupervisor(user) || isCurator(user)
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

function isCurator(user) {
  return user && user.role === "curator";
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
  ART_STYLES,
  ART_TYPES,
  ART_PERIODS,
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
  isCurator,
  logTriggerViolation
};
