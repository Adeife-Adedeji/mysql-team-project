const {
  asyncHandler,
  escapeHtml,
  formatDateInput,
  formatDisplayDate,
  getPageNumber,
  paginateRows,
  renderFlash,
  renderPager,
  renderPage,
  requireLogin,
  sanitizeImageUrl,
  setFlash,
  allowRoles,
  logTriggerViolation
} = require("../helpers");

async function hasColumn(pool, tableName, columnName) {
  const [rows] = await pool.query(
    `SELECT 1
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName],
  );

  return rows.length > 0;
}

function registerEventRoutes(app, { pool }) {
  app.get("/add-event", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const eventPage = getPageNumber(req.query.event_page);
    const hasImageUrlColumn = await hasColumn(pool, "Event", "Image_URL");
    const [employees] = await pool.query(
      "SELECT Employee_ID, First_Name, Last_Name FROM Employee"
    );
    const [events] = await pool.query(`
      SELECT ev.Event_ID, ev.event_Name, ev.start_Date, ev.end_Date,
             ev.member_only, ev.Max_capacity,
             ${hasImageUrlColumn ? "ev.Image_URL" : "NULL"} AS Image_URL,
             e.First_Name, e.Last_Name
      FROM Event ev
      LEFT JOIN Employee e ON ev.coordinator_ID = e.Employee_ID
      ORDER BY ev.start_Date DESC
    `);

    let editEvent = null;
    if (req.query.edit_id) {
      const [rows] = await pool.query(
        "SELECT * FROM Event WHERE event_ID = ?",
        [req.query.edit_id]
      );
      editEvent = rows[0] || null;
    }

    const eventPagination = paginateRows(events, eventPage);
    const eventRows = eventPagination.items.map((ev) => `
      <tr>
        <td>${ev.Event_ID}</td>
        <td>${escapeHtml(ev.event_Name)}</td>
        <td>${formatDisplayDate(ev.start_Date)}</td>
        <td>${formatDisplayDate(ev.end_Date)}</td>
        <td>${ev.member_only ? "Yes" : "No"}</td>
        <td>${ev.Max_capacity}</td>
        <td>${ev.First_Name ? escapeHtml(ev.First_Name + " " + ev.Last_Name) : "None"}</td>
        <td>${ev.Image_URL ? `<img src="${escapeHtml(ev.Image_URL)}" alt="${escapeHtml(ev.event_Name)} preview" class="table-thumb">` : "—"}</td>
        <td class="actions">
          <form method="get" action="/add-event" class="inline-form">
            <input type="hidden" name="edit_id" value="${ev.Event_ID}">
            <button class="link-button" type="submit">Edit</button>
          </form>
          <form method="post" action="/delete-event" class="inline-form" onsubmit="return confirm('Delete this event?');">
            <input type="hidden" name="event_id" value="${ev.Event_ID}">
            <button class="link-button danger" type="submit">Delete</button>
          </form>
        </td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Manage Events",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>${editEvent ? "Edit Event" : "Add Event"}</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-event" class="form-grid">
          ${editEvent ? `<input type="hidden" name="event_id" value="${editEvent.event_ID}">` : ""}
          <label>Event Name
            <input type="text" name="name" value="${editEvent ? escapeHtml(editEvent.event_Name) : ""}" required>
          </label>
          <label>Image
            <input type="text" name="image_url" value="${editEvent ? escapeHtml(editEvent.Image_URL || "") : ""}" placeholder="spring-exhibition-opening-gala.jpg, /images/spring-exhibition-opening-gala.jpg, or https://...">
          </label>
          <label>Start Date
            <input type="date" name="start_date" value="${editEvent ? formatDateInput(editEvent.start_Date) : ""}" required>
          </label>
          <label>End Date
            <input type="date" name="end_date" value="${editEvent ? formatDateInput(editEvent.end_Date) : ""}" required>
          </label>
          <label>Max Capacity
            <input type="number" name="max_capacity" value="${editEvent ? editEvent.Max_capacity : ""}" required>
          </label>
          <label>Members Only
            <select name="member_only">
              <option value="0" ${editEvent && !editEvent.member_only ? "selected" : ""}>No</option>
              <option value="1" ${editEvent && editEvent.member_only ? "selected" : ""}>Yes</option>
            </select>
          </label>
          <label>Coordinator
            <select name="coordinator_id">
              <option value="">None</option>
              ${employees.map((emp) => `
                <option value="${emp.Employee_ID}" ${editEvent && editEvent.coordinator_ID === emp.Employee_ID ? "selected" : ""}>
                  ${escapeHtml(emp.First_Name)} ${escapeHtml(emp.Last_Name)}
                </option>
              `).join("")}
            </select>
          </label>
          <button class="button" type="submit">${editEvent ? "Save Event" : "Create Event"}</button>
        </form>
      </section>
      <section class="card narrow">
        <div id="event-list"></div>
        <h2>Current Events</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Start</th>
              <th>End</th>
              <th>Members Only</th>
              <th>Capacity</th>
              <th>Coordinator</th>
              <th>Image</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${eventRows || '<tr><td colspan="9">No events found.</td></tr>'}
          </tbody>
        </table>
        ${renderPager(req, "event_page", eventPagination, "event-list")}
      </section>
    `,
    }));
  }));

  app.post("/add-event", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const id = req.body.event_id || null;
    const {
      name,
      start_date: startDate,
      end_date: endDate,
      max_capacity: maxCapacity,
      member_only: memberOnly,
      coordinator_id: coordinatorId,
    } = req.body;
    const imageUrl = sanitizeImageUrl(req.body.image_url) || null;
    const hasImageUrlColumn = await hasColumn(pool, "Event", "Image_URL");

    if (!name || !startDate || !endDate || !maxCapacity) {
      setFlash(req, "Name, dates, and max capacity are required.");
      return res.redirect("/add-event");
    }

    try {
      if (id) {
        if (hasImageUrlColumn) {
          await pool.query(
            `UPDATE Event
             SET event_Name = ?, start_Date = ?, end_Date = ?,
                 Max_capacity = ?, member_only = ?, coordinator_ID = ?, Image_URL = ?
             WHERE event_ID = ?`,
            [name, startDate, endDate, maxCapacity, memberOnly || 0, coordinatorId || null, imageUrl, id]
          );
        } else {
          await pool.query(
            `UPDATE Event
             SET event_Name = ?, start_Date = ?, end_Date = ?,
                 Max_capacity = ?, member_only = ?, coordinator_ID = ?
             WHERE event_ID = ?`,
            [name, startDate, endDate, maxCapacity, memberOnly || 0, coordinatorId || null, id]
          );
        }
        setFlash(req, "Event record updated.");
      } else {
        if (hasImageUrlColumn) {
          await pool.query(
            `INSERT INTO Event (event_Name, start_Date, end_Date, Max_capacity, member_only, coordinator_ID, Image_URL)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name, startDate, endDate, maxCapacity, memberOnly || 0, coordinatorId || null, imageUrl]
          );
        } else {
          await pool.query(
            `INSERT INTO Event (event_Name, start_Date, end_Date, Max_capacity, member_only, coordinator_ID)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [name, startDate, endDate, maxCapacity, memberOnly || 0, coordinatorId || null]
          );
        }
        setFlash(req, "Event record created.");
      }
    } catch (err) {
      if (err.sqlState === "45000") {
        await logTriggerViolation(pool, req, err.sqlMessage);
        setFlash(req, `Cannot save event: ${err.sqlMessage}`);
      } else {
        throw err;
      }
    }

    res.redirect("/add-event");
  }));

  app.post("/delete-event", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const idToDelete = req.body.event_id;

    if (!idToDelete) {
      setFlash(req, "Select an event record before deleting.");
      return res.redirect("/add-event");
    }

    await pool.query("DELETE FROM event_registration WHERE Event_ID = ?", [idToDelete]);
    await pool.query("DELETE FROM Event WHERE event_ID = ?", [idToDelete]);
    setFlash(req, "Event record deleted.");
    res.redirect("/add-event");
  }));
}

module.exports = { registerEventRoutes };
