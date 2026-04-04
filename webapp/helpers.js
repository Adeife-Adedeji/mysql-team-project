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
    <a class="brand" href="/">Museum Portal</a>
    <nav>
      <a href="/">Home</a>
      ${user ? '<a href="/dashboard">Dashboard</a>' : '<a href="/login">Login</a>'}
      ${user ? '<form method="post" action="/logout" class="inline-form"><button class="link-button" type="submit">Logout</button></form>' : ""}
    </nav>
  </header>
  <main class="container">
    ${content}
  </main>
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

module.exports = {
  asyncHandler,
  escapeHtml,
  formatDateInput,
  formatDisplayDate,
  isEmployee,
  isMember,
  isStaff,
  isSupervisor,
  renderFlash,
  renderPage,
  requireLogin,
  setFlash,
  allowRoles,
  isAdmissions,
  isGiftShop,
  isCafe
};
