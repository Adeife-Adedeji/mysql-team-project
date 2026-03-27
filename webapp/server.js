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
  setFlash(
    req,
    err && (err.sqlMessage || err.message) ? (err.sqlMessage || err.message) : "Unexpected error.",
  );
  res.redirect(req.headers.referer || "/");
});

app.listen(port, () => {
  console.log(`Museum login app running on http://localhost:${port}`);
});
