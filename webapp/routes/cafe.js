const {
  asyncHandler,
  escapeHtml,
  formatDateInput,
  formatDisplayDate,
  renderFlash,
  renderPage,
  requireLogin,
  setFlash,
  allowRoles
} = require("../helpers");

function registerCafeRoutes(app, { pool }) {

  app.get("/add-food", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const [foods] = await pool.query("SELECT Food_ID, Food_Name, Food_Price FROM Food");

    let editFood = null;
    if (req.query.edit_id) {
    const [rows] = await pool.query(
      "SELECT * FROM Food WHERE Food_ID = ?",
      [req.query.edit_id],
    );
    editFood = rows[0] || null;
    }

    const foodRows = foods.map((food) => `
      <tr>
        <td>${food.Food_ID}</td>
        <td>${escapeHtml(food.Food_Name)}</td>
        <td>$${Number(food.Food_Price).toFixed(2)}</td>
        <td class="actions">
        <form method="get" action="/add-food" class="inline-form">
          <input type="hidden" name="edit_id" value="${food.Food_ID}">
          <button class="link-button" type="submit">Edit</button>
        </form>
          <form method="post" action="/delete-food" class="inline-form" onsubmit="return confirm('Delete this food item?');">
            <input type="hidden" name="food_id" value="${food.Food_ID}">
            <button class="link-button danger" type="submit">Delete</button>
          </form>
        </td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Manage Food",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>${editFood ? "Edit Food" : "Add Food Item"}</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-food" class="form-grid">
        ${editFood ? `<input type="hidden" name="food_id" value="${editFood.Food_ID}">` : ""}
          <label>Food Name
            <input type="text" name="food_name"
            value="${editFood ? escapeHtml(editFood.Food_Name) : ""}" required>
          </label>
          <label>Food Price
            <input type="number" step="0.01" name="food_price" 
            value="${editFood ? editFood.Food_Price : ""}" required>
          </label>
         <button class="button" type="submit">
            ${editFood ? "Update Food" : "Add Food"}
          </button>
        </form>
      </section>
      <section class="card narrow">
        <h2>Food Menu</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${foodRows || '<tr><td colspan="4">No food items found.</td></tr>'}
          </tbody>
        </table>
      </section>
    `,
    }));
  }));

  app.post("/add-food", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const foodId = req.body.food_id || null;
    const { food_name: foodName, food_price: foodPrice } = req.body;

    if (!foodName || !foodPrice) {
      setFlash(req, "All fields are required.");
      return res.redirect("/add-food");
    }
    if (foodId) {
      await pool.query(
      "UPDATE Food SET Food_Name = ?, Food_Price = ? WHERE Food_ID = ?",
      [foodName, foodPrice, foodId],
    );
    setFlash(req, "Food updated.");
  } else {
    await pool.query(
      "INSERT INTO Food (Food_Name, Food_Price) VALUES (?, ?)",
      [foodName, foodPrice],
    );
    setFlash(req, "Food added.");
  }
    res.redirect("/add-food");
  }));

  app.post("/delete-food", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const idToDelete = req.body.food_id;

    await pool.query("DELETE FROM Food WHERE Food_ID = ?", [idToDelete]);
    setFlash(req, "Food item deleted.");
    res.redirect("/add-food");
  }));

  app.get("/add-food-sale", requireLogin, allowRoles(["cafe", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    const [sales] = await pool.query("SELECT Food_Sale_ID, Sale_Date, Employee_ID FROM Food_Sale");

    let editSale = null;

    if (req.query.edit_id) {
      const [rows] = await pool.query(
        "SELECT * FROM Food_Sale WHERE Food_Sale_ID = ?",
        [req.query.edit_id],
      );
      editSale = rows[0] || null;
    }

    const saleRows = sales.map((sale) => `
      <tr>
        <td>#${sale.Food_Sale_ID}</td>
        <td>${formatDisplayDate(sale.Sale_Date)}</td>
        <td>${escapeHtml(sale.Employee_ID)}</td>
        <td class="actions">
          <form method="get" action="/add-food-sale" class="inline-form">
          <input type="hidden" name="edit_id" value="${sale.Food_Sale_ID}">
          <button class="link-button" type="submit">Edit</button>
        </form>
          <form method="post" action="/delete-food-sale" class="inline-form" onsubmit="return confirm('Delete this sale?');">
            <input type="hidden" name="sale_id" value="${sale.Food_Sale_ID}">
            <button class="link-button danger" type="submit">Delete</button>
          </form>
        </td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Add Food Sale",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>${editSale ? "Edit Food Sale" : "Add Food Sale"}</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-food-sale" class="form-grid">
        ${editSale ? `<input type="hidden" name="sale_id" value="${editSale.Food_Sale_ID}">` : ""}
          <label>Sale Date
            <input type="date" name="sale_date" 
            value="${editSale ? formatDateInput(editSale.Sale_Date) : ""}" required>
          </label>
            <button class="button" type="submit">
            ${editSale ? "Update Sale" : "Create Sale"}
          </button>
        </form>
      </section>
      <section class="card narrow">
        <h2>Recent Food Sales</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Date</th>
              <th>Employee ID</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>${saleRows || '<tr><td colspan="4">No food sales found.</td></tr>'}</tbody>
        </table>
      </section>
    `,
    }));
  }));

  app.post("/add-food-sale", requireLogin, allowRoles(["cafe", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    const saleId = req.body.sale_id || null;
    const { sale_date: saleDate } = req.body;

    if (!saleDate) {
      setFlash(req, "Sale date is required.");
      return res.redirect("/add-food-sale");
    }

    if (saleId) {
      await pool.query(
      "UPDATE Food_Sale SET Sale_Date = ? WHERE Food_Sale_ID = ?",
      [saleDate, saleId],
    );

    setFlash(req, "Food sale updated.");
    return res.redirect("/add-food-sale");
  } else {
      await pool.query(
      "INSERT INTO Food_Sale (Sale_Date, Employee_ID) VALUES (?, ?)",
      [saleDate, req.session.user.employeeId],
    );
    setFlash(req, "Food sale created. Now add items.");
  }
    res.redirect("/add-food-sale-line");
  }));

  app.post("/delete-food-sale", requireLogin, allowRoles(["cafe", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    const { sale_id: saleId } = req.body;

    await pool.query("DELETE FROM Food_Sale_Line WHERE Food_Sale_ID = ?", [saleId]);
    await pool.query("DELETE FROM Food_Sale WHERE Food_Sale_ID = ?", [saleId]);
    setFlash(req, "Food sale deleted.");
    res.redirect("/add-food-sale");
  }));

  app.get("/add-food-sale-line", requireLogin, allowRoles(["cafe", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    const [sales] = await pool.query("SELECT Food_Sale_ID FROM Food_Sale");
    const [foods] = await pool.query("SELECT Food_ID, Food_Name, Food_Price FROM Food");
    const [lines] = await pool.query(`
      SELECT fsl.Food_Sale_ID, fsl.Food_ID, f.Food_Name, fsl.Quantity, fsl.Price_When_Food_Was_Sold
      FROM Food_Sale_Line fsl
      JOIN Food f ON fsl.Food_ID = f.Food_ID
    `);

    let editLine = null;

    if (req.query.edit_sale && req.query.edit_food) {
      const [rows] = await pool.query(
        "SELECT * FROM Food_Sale_Line WHERE Food_Sale_ID = ? AND Food_ID = ?",
        [req.query.edit_sale, req.query.edit_food],
      );
      editLine = rows[0] || null;
    }

    const lineRows = lines.map((line) => `
      <tr>
        <td>#${line.Food_Sale_ID}</td>
        <td>${escapeHtml(line.Food_Name)}</td>
        <td>${line.Quantity}</td>
        <td>$${Number(line.Price_When_Food_Was_Sold).toFixed(2)}</td>
        <td class="actions">
          <form method="get" action="/add-food-sale-line" class="inline-form">
            <input type="hidden" name="edit_sale" value="${line.Food_Sale_ID}">
            <input type="hidden" name="edit_food" value="${line.Food_ID}">
            <button class="link-button" type="submit">Edit</button>
          </form>
          <form method="post" action="/delete-food-sale-line" class="inline-form" onsubmit="return confirm('Remove item from sale?');">
            <input type="hidden" name="sale_id" value="${line.Food_Sale_ID}">
            <input type="hidden" name="food_id" value="${line.Food_ID}">
            <button class="link-button danger" type="submit">Delete</button>
          </form>
        </td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Add Food Sale Line",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>${editLine ? "Edit Food Sale Line" : "Add Food to Sale"}</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-food-sale-line" class="form-grid">
          ${editLine ? `
          <input type="hidden" name="original_food" value="${editLine.Food_ID}">
        ` : ""}
          <label>Sale
            <select name="sale_id">
              ${sales.map((sale) => `<option value="${sale.Food_Sale_ID}">Sale #${sale.Food_Sale_ID}</option>`).join("")}
            </select>
          </label>
          <label>Food
            <select name="food_id">
              ${foods.map((food) => `<option value="${food.Food_ID}">${escapeHtml(food.Food_Name)} ($${food.Food_Price})</option>`).join("")}
            </select>
          </label>
          <label>Quantity<input type="number" name="quantity" 
          value="${editLine ? editLine.Quantity : ""}" required></label>
          <button class="button" type="submit">
              ${editLine ? "Update Food" : "Add Food"}
            </button>
        </form>
      </section>
      <section class="card narrow">
        <h2>Items in Sales</h2>
        <table>
          <thead>
            <tr>
              <th>Sale ID</th>
              <th>Food</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>${lineRows || '<tr><td colspan="5">No items found.</td></tr>'}</tbody>
        </table>
      </section>
    `,
    }));
  }));

  app.post("/add-food-sale-line", requireLogin, allowRoles(["cafe", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    
    const { sale_id: saleId, food_id: foodId, quantity, original_food } = req.body;

    if (!saleId || !foodId || !quantity) {
      setFlash(req, "All fields are required.");
      return res.redirect("/add-food-sale-line");
    }

    const [[food]] = await pool.query("SELECT Food_Price FROM Food WHERE Food_ID = ?", [foodId]);
    if (original_food) {
      await pool.query(
        `UPDATE Food_Sale_Line
        SET Quantity = ?
        WHERE Food_Sale_ID = ? AND Food_ID = ?`,
        [quantity, saleId, original_food],
    );
      setFlash(req, "Food sale line updated.");
  } else {
    await pool.query(
      `INSERT INTO Food_Sale_Line (Food_Sale_ID, Food_ID, Quantity, Price_When_Food_Was_Sold)
       VALUES (?, ?, ?, ?)`,
      [saleId, foodId, quantity, food.Food_Price],
    );
    setFlash(req, "Food added to sale.");
  }
    res.redirect("/add-food-sale-line");
  }));

  app.post("/delete-food-sale-line", requireLogin, allowRoles(["cafe", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    const { sale_id: saleId, food_id: foodId } = req.body;

    await pool.query(
      "DELETE FROM Food_Sale_Line WHERE Food_Sale_ID = ? AND Food_ID = ?",
      [saleId, foodId],
    );
    setFlash(req, "Item removed.");
    res.redirect("/add-food-sale-line");
  }));

}

module.exports = { registerCafeRoutes };