const {
  asyncHandler,
  escapeHtml,
  formatDateInput,
  formatDisplayDate,
  renderFlash,
  renderPage,
  requireLogin,
  setFlash,
  allowRoles,
  logTriggerViolation
} = require("../helpers");

function registerCafeRoutes(app, { pool }) {

  app.get("/add-food", requireLogin, allowRoles(["cafe", "supervisor"]), asyncHandler(async (req, res) => {
    const [foods] = await pool.query("SELECT Food_ID, Food_Name, Food_Price, Stock_Quantity FROM Food");
    const isSuper = req.session.user.role === "supervisor";

    let editFood = null;
    if (req.query.edit_id) {
      const [rows] = await pool.query(
        "SELECT * FROM Food WHERE Food_ID = ?",
        [req.query.edit_id],
      );
      editFood = rows[0] || null;
    }

    const foodRows = foods.map((food) => {
      const rowStyle = food.Stock_Quantity === 0
        ? 'style="background:#fdecea;"'
        : food.Stock_Quantity <= 5
          ? 'style="background:#fff8e1;"'
          : '';
      const statusHtml = food.Stock_Quantity === 0
        ? '<span style="color:#c0392b;font-weight:bold;">Out of Stock</span>'
        : food.Stock_Quantity <= 5
          ? '<span style="color:#e67e22;font-weight:bold;">Low Stock</span>'
          : '<span style="color:#27ae60;">Available</span>';
      return `
      <tr ${rowStyle}>
        <td>${food.Food_ID}</td>
        <td>${escapeHtml(food.Food_Name)}</td>
        <td>$${Number(food.Food_Price).toFixed(2)}</td>
        <td>${food.Stock_Quantity}</td>
        <td>${statusHtml}</td>
        <td class="actions">
          <form method="get" action="/add-food" class="inline-form">
            <input type="hidden" name="edit_id" value="${food.Food_ID}">
            <button class="link-button" type="submit">Edit</button>
          </form>
          ${isSuper ? `
          <form method="post" action="/delete-food" class="inline-form" onsubmit="return confirm('Delete this food item?');">
            <input type="hidden" name="food_id" value="${food.Food_ID}">
            <button class="link-button danger" type="submit">Delete</button>
          </form>` : ""}
        </td>
      </tr>
    `;
    }).join("");

    res.send(renderPage({
      title: "Manage Food",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>${editFood ? "Edit Food Item" : "Add Food Item"}</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-food" class="form-grid">
        ${editFood ? `<input type="hidden" name="food_id" value="${editFood.Food_ID}">` : ""}
          <label>Food Name
            <input type="text" name="food_name"
            value="${editFood ? escapeHtml(editFood.Food_Name) : ""}" required>
          </label>
          <label>Food Price ($)
            <input type="number" step="0.01" name="food_price"
            value="${editFood ? editFood.Food_Price : ""}" required>
          </label>
          <label>Stock
            <input type="number" name="stock"
            value="${editFood ? editFood.Stock_Quantity : ""}" required>
          </label>
          <button class="button" type="submit">
            ${editFood ? "Update Food" : "Add Food"}
          </button>
        </form>
      </section>
      <section class="card narrow">
        <h2>Food Inventory</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${foodRows || '<tr><td colspan="6">No food items found.</td></tr>'}
          </tbody>
        </table>
      </section>
    `,
    }));
  }));

  app.post("/add-food", requireLogin, allowRoles(["cafe", "supervisor"]), asyncHandler(async (req, res) => {
    const foodId = req.body.food_id || null;
    const { food_name: foodName, food_price: foodPrice, stock } = req.body;

    if (!foodName || !foodPrice || stock === undefined || stock === "") {
      setFlash(req, "All fields are required.");
      return res.redirect("/add-food");
    }
    if (foodId) {
      await pool.query(
        "UPDATE Food SET Food_Name = ?, Food_Price = ?, Stock_Quantity = ? WHERE Food_ID = ?",
        [foodName, foodPrice, stock, foodId],
      );
      setFlash(req, "Food updated.");
    } else {
      await pool.query(
        "INSERT INTO Food (Food_Name, Food_Price, Stock_Quantity) VALUES (?, ?, ?)",
        [foodName, foodPrice, stock],
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

    // Daily sales summary
    const [[todayTotals]] = await pool.query(`
      SELECT COUNT(DISTINCT fs.Food_Sale_ID) AS total_sales,
             COALESCE(SUM(fsl.Quantity * fsl.Price_When_Food_Was_Sold), 0) AS total_revenue
      FROM Food_Sale fs
      JOIN Food_Sale_Line fsl ON fs.Food_Sale_ID = fsl.Food_Sale_ID
      WHERE fs.Sale_Date = CURDATE()
    `);
    const [bestSeller] = await pool.query(`
      SELECT f.Food_Name, SUM(fsl.Quantity) AS total_qty
      FROM Food_Sale_Line fsl
      JOIN Food_Sale fs ON fsl.Food_Sale_ID = fs.Food_Sale_ID
      JOIN Food f ON fsl.Food_ID = f.Food_ID
      WHERE fs.Sale_Date = CURDATE()
      GROUP BY fsl.Food_ID, f.Food_Name
      ORDER BY total_qty DESC LIMIT 1
    `);

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
          <form method="post" action="/load-food-sale" class="inline-form">
            <input type="hidden" name="sale_id" value="${sale.Food_Sale_ID}">
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
        <h2>Today's Sales Summary</h2>
        <div style="display:flex; gap:2rem; margin-bottom:1rem;">
          <div style="background:#f0f7ff; padding:1rem 1.5rem; border-radius:8px; text-align:center;">
            <div style="font-size:2rem; font-weight:bold;">${todayTotals.total_sales}</div>
            <div style="color:#555; font-size:0.9rem;">Sales Today</div>
          </div>
          <div style="background:#f0fff4; padding:1rem 1.5rem; border-radius:8px; text-align:center;">
            <div style="font-size:2rem; font-weight:bold;">$${Number(todayTotals.total_revenue).toFixed(2)}</div>
            <div style="color:#555; font-size:0.9rem;">Revenue Today</div>
          </div>
        </div>
        ${bestSeller.length
          ? `<p style="color:#555;">🏆 Best seller today: <strong>${escapeHtml(bestSeller[0].Food_Name)}</strong> (${bestSeller[0].total_qty} sold)</p>`
          : `<p style="color:#888;">No sales recorded today yet.</p>`}
      </section>

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
    return res.redirect("/add-food-sale-line");
  } else {
      let employeeId = req.session.user.employeeId;
      if (!employeeId) {
        const [empRows] = await pool.query(
          "SELECT Employee_ID FROM Employee WHERE Email = ?",
          [req.session.user.email]
        );
        employeeId = empRows[0]?.Employee_ID || null;
      }
      if (!employeeId) {
        setFlash(req, "Employee record not found. Please contact a supervisor.");
        return res.redirect("/add-food-sale");
      }
      const [result] = await pool.query(
        "INSERT INTO Food_Sale (Sale_Date, Employee_ID) VALUES (?, ?)",
        [saleDate, employeeId],
      );
      req.session.currentFoodSaleId = result.insertId;
      setFlash(req, "Order started. Now add items.");
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

  app.post("/load-food-sale", requireLogin, allowRoles(["cafe", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    req.session.currentFoodSaleId = parseInt(req.body.sale_id);
    res.redirect("/add-food-sale-line");
  }));

  app.get("/add-food-sale-line", requireLogin, allowRoles(["cafe", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    const currentSaleId = req.session.currentFoodSaleId || null;
    const [foods] = await pool.query("SELECT Food_ID, Food_Name, Food_Price FROM Food");
    const [saleInfo] = currentSaleId ? await pool.query(
      "SELECT Sale_Date FROM Food_Sale WHERE Food_Sale_ID = ?", [currentSaleId]
    ) : [[]];
    const [lines] = currentSaleId ? await pool.query(`
      SELECT fsl.Food_Sale_ID, fsl.Food_ID, f.Food_Name, fsl.Quantity, fsl.Price_When_Food_Was_Sold
      FROM Food_Sale_Line fsl
      JOIN Food f ON fsl.Food_ID = f.Food_ID
      WHERE fsl.Food_Sale_ID = ?
    `, [currentSaleId]) : [[]];

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
      title: "Add Items to Order",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>${editLine ? "Edit Item in Order" : "Add Items to Order"}</h1>
        ${renderFlash(req)}
        ${!currentSaleId ? `
          <p style="color:#c0392b;">No active order. Please <a href="/add-food-sale">start a new order</a> first.</p>
        ` : `
          <p style="color:#555; margin-bottom:1rem;">Current Order: <strong>Order #${currentSaleId}</strong> &nbsp;
            <a href="/add-food-sale" style="font-size:0.85rem;">Start new order</a>
          </p>
          <form method="post" action="/add-food-sale" class="form-grid" style="margin-bottom:1rem; padding-bottom:1rem; border-bottom:1px solid #eee;">
            <input type="hidden" name="sale_id" value="${currentSaleId}">
            <label>Sale Date
              <input type="date" name="sale_date" value="${saleInfo[0] ? formatDateInput(saleInfo[0].Sale_Date) : ''}" required>
            </label>
            <button class="button" type="submit" style="background:#666;">Update Date</button>
          </form>
          <form method="post" action="/add-food-sale-line" class="form-grid">
          ${editLine ? `<input type="hidden" name="original_food" value="${editLine.Food_ID}">` : ""}
          <input type="hidden" name="sale_id" value="${currentSaleId}">
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
        `}
      </section>
      <section class="card narrow">
        <h2>Items in Current Order</h2>
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
    const { food_id: foodId, quantity, original_food } = req.body;
    const saleId = req.session.currentFoodSaleId;

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
    try {
      await pool.query(
        `INSERT INTO Food_Sale_Line (Food_Sale_ID, Food_ID, Quantity, Price_When_Food_Was_Sold)
         VALUES (?, ?, ?, ?)`,
        [saleId, foodId, quantity, food.Food_Price],
      );
      setFlash(req, "Food added to sale.");
    } catch (err) {
      if (err.sqlState === "45000") {
        await logTriggerViolation(pool, req, err.sqlMessage);
        setFlash(req, err.sqlMessage);
      } else {
        throw err;
      }
    }
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

  app.get("/order", requireLogin, asyncHandler(async (req, res) => {

  const [foods] = await pool.query("SELECT * FROM Food");
  const cart = req.session.cart || [];

  res.send(renderPage({
    title: "Create Order",
    user: req.session.user,
    content: ` 
<h1>Menu</h1>
${foods.map(food => `
<div>
${food.Food_Name} - $${food.Food_Price}
<form method="post" action="/order/add-item">
<input type="hidden" name="food_id" value="${food.Food_ID}">
<button>Add</button>
</form> 
</div>
`).join("")}

<h2>Cart</h2>
${cart.map(item => `
<div>${item.name} x ${item.qty}</div>
`).join("")}

<form method="get" action="/order/checkout">
<button>Checkout</button>
</form>
`
  }));
}));

app.get("/order/checkout", requireLogin, asyncHandler(async (req, res) => {
  const cart = req.session.cart || [];

  if (cart.length === 0) {
    setFlash(req, "Cart is empty.");
    return res.redirect("/order");
  }

  let total = 0;

  const itemsHtml = cart.map(item => {
    const subtotal = item.price * item.qty;
    total += subtotal;

    return `
      <div style="display:flex; justify-content:space-between; margin:10px 0;">
        <span>${item.name} x ${item.qty}</span>
        <span>$${subtotal.toFixed(2)}</span>
      </div>
    `;
  }).join("");

  res.send(renderPage({
    title: "Checkout",
    user: req.session.user,
    content: `
      <h1>Order Summary</h1>

      ${itemsHtml}

      <hr>
      <h2>Total: $${total.toFixed(2)}</h2>

      <form method="post" action="/order/checkout">
        <button class="button">Confirm Order</button>
      </form>

      <a href="/order">⬅ Back to cart</a>
    `
  }));
}));

app.post("/order/add-item", asyncHandler(async (req, res) => {
  const { food_id } = req.body;

  const [[food]] = await pool.query(
    "SELECT * FROM Food WHERE Food_ID = ?",
    [food_id]
  );

  if (!req.session.cart) {
    req.session.cart = [];
  }

  const existing = req.session.cart.find(item => item.id == food_id);

  if (existing) {
    existing.qty++;
  } else {
    req.session.cart.push({
      id: food_id,
      name: food.Food_Name,
      price: food.Food_Price,
      qty: 1
    });
  }

  res.redirect("/order");
}));

app.post("/order/checkout", asyncHandler(async (req, res) => {
  const cart = req.session.cart || [];

  if (cart.length === 0) {
    setFlash(req, "Cart is empty.");
    return res.redirect("/order");
  }

  const [result] = await pool.query(
    "INSERT INTO Food_Sale (Sale_Date, Employee_ID) VALUES (NOW(), ?)",
    [req.session.user.employeeId]
  );

  const saleId = result.insertId;

  for (let item of cart) {
    await pool.query(
      `INSERT INTO Food_Sale_Line
       (Food_Sale_ID, Food_ID, Quantity, Price_When_Food_Was_Sold)
       VALUES (?, ?, ?, ?)`,
      [saleId, item.id, item.qty, item.price]
    );
  }

  req.session.cart = [];

  setFlash(req, "Order completed!");
  res.redirect("/order");
}));
}
module.exports = { registerCafeRoutes };