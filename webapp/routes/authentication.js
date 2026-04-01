const {
  asyncHandler,
  renderFlash,
  renderPage,
  setFlash,
} = require("../helpers");

function registerAuthenticationRoutes(app, { pool }) {

  app.get("/", (req, res) => {
    res.send(renderPage({
      title: "The Museum of Fine Arts, Houston",
      user: req.session.user,
      content: `
      <section class="hero card narrow">
        <p class="eyebrow">Museum Operations</p>
        <h1>Museum Portal</h1>
        <p>Use the member, employee, or supervisor portal to purchase tickets, manage daily operations, and review museum reports.</p>
        <div class="button-row">
          ${req.session.user ? '<a class="button" href="/dashboard">Go to Dashboard</a>' : '<a class="button" href="/login">Open Login</a>'}
        </div>
      </section>
    `,
    }));
  });

  app.get("/login", (req, res) => {
    res.send(renderPage({
      title: "Log In",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>Log In</h1>
        ${renderFlash(req)}
        <form id="login-form" method="post" action="/login" class="form-grid">
          <label>Email<input type="email" name="email" required></label>
          <label>Password<input type="password" name="password" required></label>
        </form>
        <div class="button-row form-actions">
          <button class="button" type="submit" form="login-form">Log In</button>
          <a class="button" href="/signup">Sign Up</a>
        </div>
      </section>
    `,
    }));
  });

  app.get("/signup", (req, res) => {
    res.send(renderPage({
      title: "Sign Up",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>Member Sign Up</h1>
        ${renderFlash(req)}
        <form id="signup-form" method="post" action="/signup" class="form-grid">
          <label>First Name<input type="text" name="first_name" required></label>
          <label>Last Name<input type="text" name="last_name" required></label>
          <label>Email<input type="email" name="email" required></label>
          <label>Phone<input type="tel" name="phone"></label>
          <label>Password<input type="password" name="password" required></label>
        </form>
        <div class="button-row form-actions">
          <button class="button" type="submit" form="signup-form">Create Account</button>
          <a class="button" href="/login">Log In</a>
        </div>
      </section>
    `,
    }));
  });

  app.post("/login", asyncHandler(async (req, res) => {
    const email = req.body.email?.trim().toLowerCase();
    const submittedCredential = req.body.password?.trim();

    const [rows] = await pool.query(
      `SELECT id, name, email, password AS stored_credential, role, is_active, employee_id, membership_id
       FROM users
       WHERE email = ?`,
      [email],
    );

    const authenticatedUser = rows[0];
    if (!authenticatedUser || authenticatedUser.stored_credential !== submittedCredential || !authenticatedUser.is_active) {
      setFlash(req, "Invalid login credentials.");
      return res.redirect("/login");
    }

    req.session.user = {
      id: authenticatedUser.id,
      name: authenticatedUser.name,
      email: authenticatedUser.email,
      role: authenticatedUser.role,
      employeeId: authenticatedUser.employee_id,
      membershipId: authenticatedUser.membership_id,
    };

    res.redirect("/dashboard");
  }));

  app.post("/signup", asyncHandler(async (req, res) => {
    const firstName = req.body.first_name?.trim();
    const lastName = req.body.last_name?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const phone = req.body.phone?.trim();
    const password = req.body.password?.trim();

    if (!firstName || !lastName || !email || !password) {
      setFlash(req, "Please fill in all required fields.");
      return res.redirect("/signup");
    }

    const [existingUsers] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email],
    );

    if (existingUsers.length > 0) {
      setFlash(req, "An account with that email already exists.");
      return res.redirect("/signup");
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [membershipResult] = await connection.query(
        `INSERT INTO Membership (First_Name, Last_Name, Email, Phone_Number, Date_Joined)
         VALUES (?, ?, ?, ?, CURRENT_DATE)`,
        [firstName, lastName, email, phone || null],
      );

      await connection.query(
        `INSERT INTO users (name, email, password, role, is_active, membership_id)
         VALUES (?, ?, ?, 'user', TRUE, ?)`,
        [`${firstName} ${lastName}`, email, password, membershipResult.insertId],
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();

      if (error && error.code === "ER_DUP_ENTRY") {
        setFlash(req, "An account with that email already exists.");
        return res.redirect("/signup");
      }

      throw error;
    } finally {
      connection.release();
    }

    setFlash(req, "Account created. Please log in.");
    res.redirect("/login");
  }));

  app.post("/logout", (req, res) => {
    req.session.destroy(() => {
      res.redirect("/");
    });
  });
}

module.exports = { registerAuthenticationRoutes };
