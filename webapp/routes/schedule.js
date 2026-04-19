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
  setFlash,
  allowRoles,
  logTriggerViolation
} = require("../helpers");

function registerScheduleRoutes(app, { pool }) {
  app.get("/add-schedule", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const schedulePage = getPageNumber(req.query.schedule_page);
    const [employees] = await pool.query(
      "SELECT Employee_ID, First_Name, Last_Name FROM Employee"
    );
    const [exhibitions] = await pool.query(
      "SELECT Exhibition_ID, Exhibition_Name FROM Exhibition"
    );
    const [schedules] = await pool.query(`
      SELECT s.Schedule_ID, s.Shift_Date, s.Start_Time, s.End_Time, s.Duty,
             e.First_Name, e.Last_Name, ex.Exhibition_Name
      FROM Schedule s
      JOIN Employee e ON s.Employee_ID = e.Employee_ID
      JOIN Exhibition ex ON s.Exhibition_ID = ex.Exhibition_ID
      ORDER BY s.Shift_Date DESC
    `);

    let editSchedule = null;
    if (req.query.edit_id) {
      const [rows] = await pool.query(
        "SELECT * FROM Schedule WHERE Schedule_ID = ?",
        [req.query.edit_id]
      );
      editSchedule = rows[0] || null;
    }

    const schedulePagination = paginateRows(schedules, schedulePage);
    const scheduleRows = schedulePagination.items.map((s) => `
      <tr>
        <td>${s.Schedule_ID}</td>
        <td>${escapeHtml(s.First_Name)} ${escapeHtml(s.Last_Name)}</td>
        <td>${escapeHtml(s.Exhibition_Name)}</td>
        <td>${formatDisplayDate(s.Shift_Date)}</td>
        <td>${escapeHtml(String(s.Start_Time))}</td>
        <td>${escapeHtml(String(s.End_Time))}</td>
        <td>${escapeHtml(s.Duty || "N/A")}</td>
        <td class="actions">
          <form method="get" action="/add-schedule" class="inline-form">
            <input type="hidden" name="edit_id" value="${s.Schedule_ID}">
            <button class="link-button" type="submit">Edit</button>
          </form>
          <form method="post" action="/delete-schedule" class="inline-form" onsubmit="return confirm('Delete this schedule entry?');">
            <input type="hidden" name="schedule_id" value="${s.Schedule_ID}">
            <button class="link-button danger" type="submit">Delete</button>
          </form>
        </td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Manage Schedule",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>${editSchedule ? "Edit Schedule" : "Add Schedule"}</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-schedule" class="form-grid">
          ${editSchedule ? `<input type="hidden" name="schedule_id" value="${editSchedule.Schedule_ID}">` : ""}
          <label>Employee
            <select name="employee_id" required>
              <option value="">Select Employee</option>
              ${employees.map((emp) => `
                <option value="${emp.Employee_ID}" ${editSchedule && editSchedule.Employee_ID === emp.Employee_ID ? "selected" : ""}>
                  ${escapeHtml(emp.First_Name)} ${escapeHtml(emp.Last_Name)}
                </option>
              `).join("")}
            </select>
          </label>
          <label>Exhibition
            <select name="exhibition_id" required>
              <option value="">Select Exhibition</option>
              ${exhibitions.map((ex) => `
                <option value="${ex.Exhibition_ID}" ${editSchedule && editSchedule.Exhibition_ID === ex.Exhibition_ID ? "selected" : ""}>
                  ${escapeHtml(ex.Exhibition_Name)}
                </option>
              `).join("")}
            </select>
          </label>
          <label>Shift Date
            <input type="date" name="shift_date" value="${editSchedule ? formatDateInput(editSchedule.Shift_Date) : ""}" required>
          </label>
          <label>Start Time
            <input type="time" name="start_time" value="${editSchedule ? editSchedule.Start_Time : ""}" required>
          </label>
          <label>End Time
            <input type="time" name="end_time" value="${editSchedule ? editSchedule.End_Time : ""}" required>
          </label>
          <label>Duty
            <input type="text" name="duty" value="${editSchedule ? escapeHtml(editSchedule.Duty || "") : ""}">
          </label>
          <button class="button" type="submit">${editSchedule ? "Save Schedule" : "Create Schedule"}</button>
        </form>
      </section>
      <section class="card narrow">
        <div id="schedule-list"></div>
        <h2>Current Schedule</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Employee</th>
              <th>Exhibition</th>
              <th>Date</th>
              <th>Start</th>
              <th>End</th>
              <th>Duty</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${scheduleRows || '<tr><td colspan="8">No schedules found.</td></tr>'}
          </tbody>
        </table>
        ${renderPager(req, "schedule_page", schedulePagination, "schedule-list")}
      </section>
    `,
    }));
  }));

  app.post("/add-schedule", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const id = req.body.schedule_id || null;
    const {
      employee_id: employeeId,
      exhibition_id: exhibitionId,
      shift_date: shiftDate,
      start_time: startTime,
      end_time: endTime,
      duty,
    } = req.body;

    if (!employeeId || !exhibitionId || !shiftDate || !startTime || !endTime) {
      setFlash(req, "All fields except Duty are required.");
      return res.redirect("/add-schedule");
    }

    if (id) {
      try {
        await pool.query(
          `UPDATE Schedule
           SET Employee_ID = ?, Exhibition_ID = ?, Shift_Date = ?,
               Start_Time = ?, End_Time = ?, Duty = ?
           WHERE Schedule_ID = ?`,
          [employeeId, exhibitionId, shiftDate, startTime, endTime, duty || null, id]
        );
        setFlash(req, "Schedule record updated.");
      } catch (err) {
        if (err.sqlState === "45000") {
          await logTriggerViolation(pool, req, err.sqlMessage);
          setFlash(req, `Cannot update schedule: ${err.sqlMessage}`);
        } else {
          throw err;
        }
      }
    } else {
      try {
        await pool.query(
          `INSERT INTO Schedule (Employee_ID, Exhibition_ID, Shift_Date, Start_Time, End_Time, Duty)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [employeeId, exhibitionId, shiftDate, startTime, endTime, duty || null]
        );
        setFlash(req, "Schedule record created.");
      } catch (err) {
        if (err.sqlState === "45000") {
          await logTriggerViolation(pool, req, err.sqlMessage);
          setFlash(req, err.sqlMessage);
        } else {
          throw err;
        }
      }
    }

    res.redirect("/add-schedule");
  }));

  app.post("/delete-schedule", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const idToDelete = req.body.schedule_id;

    if (!idToDelete) {
      setFlash(req, "Select a schedule record before deleting.");
      return res.redirect("/add-schedule");
    }

    await pool.query("DELETE FROM Schedule WHERE Schedule_ID = ?", [idToDelete]);
    setFlash(req, "Schedule record deleted.");
    res.redirect("/add-schedule");
  }));
}

module.exports = { registerScheduleRoutes };
