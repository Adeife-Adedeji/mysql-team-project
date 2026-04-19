const express = require("express");
const path = require("path");
const session = require("express-session");

const { createPool, loadEnv } = require("./db");
const { renderPage, setFlash } = require("./helpers");
const { registerRoutes } = require("./routes");

loadEnv(path.join(__dirname, ".env"));

const app = express();
const port = process.env.PORT || 3000;
const pool = createPool(process.env);

async function ensureImageUrlColumns() {
  const columns = [
    ["Department", "Image_URL VARCHAR(255)"],
    ["Artist", "Image_URL VARCHAR(255)"],
    ["Exhibition", "Image_URL VARCHAR(255)"],
    ["Artwork", "Image_URL VARCHAR(255)"],
    ["Gift_Shop_Item", "Image_URL VARCHAR(255)"],
    ["Food", "Image_URL VARCHAR(255)"],
    ["Membership", "Image_URL VARCHAR(255)"],
    ["Employee", "Image_URL VARCHAR(255)"],
    ["Event", "Image_URL VARCHAR(255)"],
    ["Institution", "Image_URL VARCHAR(255)"],
    ["Tour", "Image_URL VARCHAR(255)"],
  ];

  for (const [tableName, definition] of columns) {
    try {
      await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`);
    } catch (error) {
      if (!["ER_DUP_FIELDNAME", "ER_NO_SUCH_TABLE"].includes(error.code)) {
        throw error;
      }
    }
  }
}

ensureImageUrlColumns().catch((error) => {
  console.error("Unable to ensure optional image URL columns:", error.message);
});

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "museum-session-secret",
    resave: false,
    saveUninitialized: false,
  }),
);

registerRoutes(app, { pool });

app.use((req, res) => {
  res.status(404).send(renderPage({
    title: "Not Found",
    user: req.session.user,
    content: '<section class="card narrow"><h1>Page not found</h1></section>',
  }));
});

app.use((err, req, res, next) => {
  console.error(err);

  if (err && err.sqlState === "45000") {
    pool.query(
      `INSERT INTO trigger_violation_log (route_path, user_email, message)
       VALUES (?, ?, ?)`,
      [
        req.path || null,
        req.session?.user?.email || null,
        err.sqlMessage || err.message || "Trigger violation.",
      ],
    ).catch((loggingError) => {
      if (loggingError && loggingError.code !== "ER_NO_SUCH_TABLE") {
        console.error(loggingError);
      }
    });
  }

  setFlash(
    req,
    err && (err.sqlMessage || err.message) ? (err.sqlMessage || err.message) : "Unexpected error.",
  );
  res.redirect(req.headers.referer || "/");
});

app.listen(port, () => {
  console.log(`Museum login app running on http://localhost:${port}`);
});
