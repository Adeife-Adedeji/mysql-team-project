const {
  asyncHandler,
  escapeHtml,
  formatDateInput,
  formatDisplayDate,
  getCafeAsset,
  renderFlash,
  renderPage,
  requireLogin,
  setFlash,
  allowRoles,
  logTriggerViolation
} = require("../helpers");

const CAFE_TYPES = ["Food", "Drink", "Dessert", "Snack", "Other"];

function registerCafeRoutes(app, { pool, upload }) {

  async function hasColumn(tableName, columnName) {
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

  async function hasFoodTypeColumn() {
    return hasColumn("Food", "Type");
  }

  async function hasFoodStockColumn() {
    return hasColumn("Food", "Stock_Quantity");
  }

  app.get("/add-food", requireLogin, allowRoles(["cafe", "supervisor"]), asyncHandler(async (req, res) => {
    const foodHasTypeColumn = await hasFoodTypeColumn();
    const foodHasStockColumn = await hasFoodStockColumn();
    const foodHasImageUrlColumn = await hasColumn("Food", "Image_URL");
    const [foods] = await pool.query(
      `SELECT Food_ID, Food_Name, ${foodHasTypeColumn ? "Type" : "NULL"} AS Type, Food_Price,
              ${foodHasStockColumn ? "Stock_Quantity" : "NULL"} AS Stock_Quantity,
              ${foodHasImageUrlColumn ? "Image_URL" : "NULL"} AS Image_URL
       FROM Food`
    );
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
      const rowStyle = !foodHasStockColumn
        ? ''
        : food.Stock_Quantity === 0
        ? 'style="background:#fdecea;"'
        : food.Stock_Quantity <= 5
          ? 'style="background:#fff8e1;"'
          : '';
      const statusHtml = !foodHasStockColumn
        ? '<span style="color:#666;">Unavailable</span>'
        : food.Stock_Quantity === 0
        ? '<span style="color:#c0392b;font-weight:bold;">Out of Stock</span>'
        : food.Stock_Quantity <= 5
          ? '<span style="color:#e67e22;font-weight:bold;">Low Stock</span>'
          : '<span style="color:#27ae60;">Available</span>';
      return `
      <tr ${rowStyle}>
        <td>${food.Food_ID}</td>
        <td>${escapeHtml(food.Food_Name)}</td>
        <td>${escapeHtml(food.Type || "—")}</td>
        <td>$${Number(food.Food_Price).toFixed(2)}</td>
        <td>${food.Stock_Quantity}</td>
        <td>${statusHtml}</td>
        <td>${food.Image_URL ? `<img src="${escapeHtml(food.Image_URL)}" alt="${escapeHtml(food.Food_Name)} preview" class="table-thumb">` : "—"}</td>
        <td class="actions">
          <form method="get" action="/add-food" class="inline-form">
            <input type="hidden" name="edit_id" value="${food.Food_ID}">
            <button class="link-button" type="submit">Edit</button>
          </form>
          ${isSuper ? `
          <form method="post" action="/delete-food" class="inline-form" onsubmit="return confirm('Delete this café item?');">
            <input type="hidden" name="food_id" value="${food.Food_ID}">
            <button class="link-button danger" type="submit">Delete</button>
          </form>` : ""}
        </td>
      </tr>
    `;
    }).join("");

    res.send(renderPage({
      title: "Manage Café Items",
      user: req.session.user,
      showPortalBanner: false,
      content: `
      <section class="card narrow">
        <h1>${editFood ? "Edit Café Item" : "Add Café Item"}</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-food" class="form-grid" enctype="multipart/form-data">
        ${editFood ? `<input type="hidden" name="food_id" value="${editFood.Food_ID}">` : ""}
          <label>Item Name
            <input type="text" name="food_name"
            value="${editFood ? escapeHtml(editFood.Food_Name) : ""}" required>
          </label>
          ${foodHasTypeColumn ? `<label>Type
            <select name="type" required>
              <option value="">Select a type</option>
              ${CAFE_TYPES.map(t => `<option value="${t}" ${editFood && editFood.Type === t ? 'selected' : ''}>${t}</option>`).join("")}
            </select>
          </label>` : ""}
          <label>Price ($)
            <input type="number" step="0.01" name="food_price"
            value="${editFood ? editFood.Food_Price : ""}" required>
          </label>
          ${foodHasStockColumn ? `<label>Stock
            <input type="number" name="stock"
            value="${editFood ? editFood.Stock_Quantity : ""}" required>
          </label>` : ""}
          <label>Image
            ${editFood && editFood.Image_URL ? `<img src="${escapeHtml(editFood.Image_URL)}" alt="current" class="table-thumb" style="display:block;margin-bottom:0.25rem;">` : ""}
            <input type="file" name="image_file" accept="image/*">
            ${editFood ? `<small style="color:#888">Leave empty to keep current image</small>` : ""}
          </label>
          <button class="button" type="submit">
            ${editFood ? "Save Item" : "Create Item"}
          </button>
        </form>
      </section>
      <section class="card narrow">
        <h2>Café Inventory</h2>
        <table>
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>Type</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Image</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${foodRows || '<tr><td colspan="8">No café items found.</td></tr>'}
          </tbody>
        </table>
      </section>
    `,
    }));
  }));

  app.post("/add-food", requireLogin, allowRoles(["cafe", "supervisor"]), upload.single("image_file"), asyncHandler(async (req, res) => {
    const foodId = req.body.food_id || null;
    const { food_name: foodName, food_price: foodPrice, stock, type } = req.body;
    const foodHasTypeColumn = await hasFoodTypeColumn();
    const foodHasStockColumn = await hasFoodStockColumn();
    const foodHasImageUrlColumn = await hasColumn("Food", "Image_URL");
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const parsedPrice = Number.parseFloat(foodPrice);
    const parsedStock = foodHasStockColumn ? Number.parseInt(stock, 10) : null;

    if (!foodName || !foodPrice || (foodHasStockColumn && (stock === undefined || stock === "")) || (foodHasTypeColumn && !type)) {
      setFlash(req, "All fields are required.");
      return res.redirect("/add-food");
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setFlash(req, "Price must be 0 or greater.");
      return res.redirect(foodId ? `/add-food?edit_id=${foodId}` : "/add-food");
    }
    if (foodHasStockColumn && (!Number.isInteger(parsedStock) || parsedStock < 0)) {
      setFlash(req, "Stock cannot be negative.");
      return res.redirect(foodId ? `/add-food?edit_id=${foodId}` : "/add-food");
    }
    if (foodId) {
      const assignments = ["Food_Name = ?", "Food_Price = ?"];
      const values = [foodName, parsedPrice];
      if (foodHasStockColumn) {
        assignments.push("Stock_Quantity = ?");
        values.push(parsedStock);
      }
      if (foodHasTypeColumn) {
        assignments.push("Type = ?");
        values.push(type);
      }
      if (foodHasImageUrlColumn && req.file) {
        assignments.push("Image_URL = ?");
        values.push(imageUrl);
      }
      values.push(foodId);
      await pool.query(`UPDATE Food SET ${assignments.join(", ")} WHERE Food_ID = ?`, values);
      setFlash(req, "Café item updated.");
    } else {
      const columns = ["Food_Name", "Food_Price"];
      const values = [foodName, parsedPrice];
      if (foodHasStockColumn) {
        columns.push("Stock_Quantity");
        values.push(parsedStock);
      }
      if (foodHasTypeColumn) {
        columns.push("Type");
        values.push(type);
      }
      if (foodHasImageUrlColumn) {
        columns.push("Image_URL");
        values.push(imageUrl);
      }
      await pool.query(
        `INSERT INTO Food (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
        values,
      );
      setFlash(req, "Café item created.");
    }
    res.redirect("/add-food");
  }));

  app.post("/delete-food", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const idToDelete = req.body.food_id;
    if (!idToDelete) {
      setFlash(req, "Select a café item before deleting.");
      return res.redirect("/add-food");
    }

    try {
      await pool.query("DELETE FROM Food WHERE Food_ID = ?", [idToDelete]);
      setFlash(req, "Café item deleted.");
    } catch (err) {
      if (err.code === "ER_ROW_IS_REFERENCED_2" || err.code === "ER_ROW_IS_REFERENCED") {
        setFlash(req, "This item is linked to existing sale records and cannot be deleted.");
      } else {
        throw err;
      }
    }
    res.redirect("/add-food");
  }));

  app.get("/add-food-sale", requireLogin, allowRoles(["cafe", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    const foodHasTypeColumn = await hasFoodTypeColumn();
    const foodHasImageUrlColumn = await hasColumn("Food", "Image_URL");
    const [salesLines] = await pool.query(`
      SELECT
        fs.Food_Sale_ID,
        fs.Sale_Date,
        fs.Employee_ID,
        f.Food_Name,
        fsl.Quantity,
        fsl.Price_When_Food_Was_Sold,
        ${foodHasTypeColumn ? "f.Type AS Food_Type" : "NULL AS Food_Type"}
      FROM Food_Sale fs
      LEFT JOIN Food_Sale_Line fsl ON fsl.Food_Sale_ID = fs.Food_Sale_ID
      LEFT JOIN Food f ON f.Food_ID = fsl.Food_ID
      ORDER BY fs.Food_Sale_ID DESC, fsl.Food_ID
    `);
    const ordersMap = new Map();
    for (const row of salesLines) {
      if (!ordersMap.has(row.Food_Sale_ID)) {
        ordersMap.set(row.Food_Sale_ID, {
          Food_Sale_ID: row.Food_Sale_ID,
          Sale_Date: row.Sale_Date,
          Employee_ID: row.Employee_ID,
          items: [],
          orderTotal: 0,
        });
      }
      if (row.Food_Name != null) {
        const order = ordersMap.get(row.Food_Sale_ID);
        order.items.push({
          Food_Name: row.Food_Name,
          Quantity: row.Quantity,
          Food_Type: row.Food_Type,
          Price: row.Price_When_Food_Was_Sold,
        });
        order.orderTotal += Number(row.Quantity || 0) * Number(row.Price_When_Food_Was_Sold || 0);
      }
    }
    const orders = Array.from(ordersMap.values());

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

    const saleRows = orders.map((order) => {
      const dateTs = order.Sale_Date ? new Date(order.Sale_Date).getTime() : 0;
      const itemTypes = order.items.map(i => (i.Food_Type || "").toLowerCase()).filter(Boolean).join(",");
      const itemsHtml = order.items.length > 0
        ? order.items.map((item) => {
            const typeTag = item.Food_Type
              ? `<span style="font-size:0.72em;background:#f0f4f8;color:#556;padding:1px 5px;border-radius:3px;margin-left:4px;vertical-align:middle;">${escapeHtml(item.Food_Type)}</span>`
              : "";
            return `<div style="margin-bottom:2px;">${escapeHtml(item.Food_Name)} &times; ${item.Quantity}${typeTag}</div>`;
          }).join("")
        : `<span style="color:#aaa">No items yet</span>`;
      return `<div data-order-id="${order.Food_Sale_ID}" data-date="${dateTs}" data-total="${order.orderTotal.toFixed(2)}" data-types="${escapeHtml(itemTypes)}" style="display:grid;grid-template-columns:55px 1fr 75px 95px 80px auto;gap:0.5rem;padding:0.5rem 0.75rem;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:4px;align-items:start;background:#fff;">
        <strong style="padding-top:2px;">#${order.Food_Sale_ID}</strong>
        <div>${itemsHtml}</div>
        <span style="font-weight:600;padding-top:2px;white-space:nowrap;">$${order.orderTotal.toFixed(2)}</span>
        <span style="color:#555;padding-top:2px;white-space:nowrap;">${formatDisplayDate(order.Sale_Date)}</span>
        <span style="color:#555;padding-top:2px;">${escapeHtml(String(order.Employee_ID))}</span>
        <div style="display:flex;gap:4px;flex-wrap:wrap;">
          <form method="post" action="/load-food-sale" class="inline-form">
            <input type="hidden" name="sale_id" value="${order.Food_Sale_ID}">
            <button class="link-button" type="submit">Edit</button>
          </form>
          <form method="post" action="/delete-food-sale" class="inline-form" onsubmit="return confirm('Delete this sale?');">
            <input type="hidden" name="sale_id" value="${order.Food_Sale_ID}">
            <button class="link-button danger" type="submit">Delete</button>
          </form>
        </div>
      </div>`;
    }).join("");

    res.send(renderPage({
      title: "Add Café Sale",
      user: req.session.user,
      showPortalBanner: false,
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
          ? `<p style="color:#555;"> Best seller today: <strong>${escapeHtml(bestSeller[0].Food_Name)}</strong> (${bestSeller[0].total_qty} sold)</p>`
          : `<p style="color:#888;">No sales recorded today yet.</p>`}
      </section>

      <section class="card narrow">
        <h1>${editSale ? "Edit Café Sale" : "Add Café Sale"}</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-food-sale" class="form-grid">
        ${editSale ? `<input type="hidden" name="sale_id" value="${editSale.Food_Sale_ID}">` : ""}
          <label>Sale Date
            <input type="date" name="sale_date" 
            value="${editSale ? formatDateInput(editSale.Sale_Date) : ""}" required>
          </label>
            <button class="button" type="submit">
            ${editSale ? "Save Sale" : "Create Sale"}
          </button>
        </form>
      </section>
      <section class="card narrow">
        <h2>Recent Café Sales</h2>
        <div style="display:flex;gap:0.75rem;align-items:flex-start;margin-bottom:1rem;flex-wrap:wrap;">
          <label style="display:flex;align-items:center;gap:0.4rem;font-size:0.9em;font-weight:600;white-space:nowrap;align-self:center;">
            Sort
            <select id="cafe-sort" style="padding:0.25rem 0.5rem;border-radius:4px;border:1px solid #ccc;font-size:0.9em;">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="expensive">Most expensive</option>
              <option value="cheapest">Least expensive</option>
            </select>
          </label>
          <label style="display:flex;align-items:center;gap:0.4rem;font-size:0.9em;font-weight:600;white-space:nowrap;align-self:center;">
            Order ID
            <input type="text" id="cafe-id-search" placeholder="Search…" style="width:80px;padding:0.25rem 0.5rem;border-radius:4px;border:1px solid #ccc;font-size:0.9em;">
          </label>
          <div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;align-self:center;">
            <span style="font-size:0.9em;font-weight:600;white-space:nowrap;">Type:</span>
            ${CAFE_TYPES.map(t => `<label style="display:inline-flex;align-items:center;gap:0.25rem;padding:0.2rem 0.65rem;border-radius:999px;border:1px solid #ccc;cursor:pointer;font-size:0.82em;background:#fff;white-space:nowrap;user-select:none;"><input type="checkbox" class="cafe-type-cb" value="${t.toLowerCase()}" style="margin:0;accent-color:#8f4a43;"> ${escapeHtml(t)}</label>`).join("")}
          </div>
          <span id="cafe-order-count" style="color:#888;font-size:0.85em;margin-left:auto;align-self:center;"></span>
        </div>
        <div id="cafe-orders-list">
          <div style="display:grid;grid-template-columns:55px 1fr 75px 95px 80px auto;gap:0.5rem;padding:0.4rem 0.75rem;background:#f5f5f5;border-radius:4px;font-size:0.8em;font-weight:600;color:#666;margin-bottom:6px;border:1px solid #e5e7eb;">
            <span>Order</span><span>Items</span><span>Total</span><span>Date</span><span>Employee</span><span>Actions</span>
          </div>
          ${saleRows || '<p style="color:#888;padding:0.5rem 0;">No café sales found.</p>'}
        </div>
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

    setFlash(req, "Café sale record updated.");
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
        setFlash(req, "Employee record not found. Contact a supervisor.");
        return res.redirect("/add-food-sale");
      }
      const [result] = await pool.query(
        "INSERT INTO Food_Sale (Sale_Date, Employee_ID) VALUES (?, ?)",
        [saleDate, employeeId],
      );
      req.session.currentFoodSaleId = result.insertId;
      setFlash(req, "Order created. Add items to complete the record.");
  }
    res.redirect("/add-food-sale-line");
  }));

  app.post("/delete-food-sale", requireLogin, allowRoles(["cafe", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    const { sale_id: saleId } = req.body;

    await pool.query("DELETE FROM Food_Sale_Line WHERE Food_Sale_ID = ?", [saleId]);
    await pool.query("DELETE FROM Food_Sale WHERE Food_Sale_ID = ?", [saleId]);
    setFlash(req, "Café sale deleted.");
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
      showPortalBanner: false,
      content: `
      <section class="card narrow">
        <h1>${editLine ? "Edit Item in Order" : "Add Items to Order"}</h1>
        ${renderFlash(req)}
        ${!currentSaleId ? `
          <p style="color:#c0392b;">No order is active. <a href="/add-food-sale">Create an order</a> before adding items.</p>
        ` : `
          <p style="color:#555; margin-bottom:1rem;">Current Order: <strong>Order #${currentSaleId}</strong> &nbsp;
            <a href="/add-food-sale" style="font-size:0.85rem;">Create another order</a>
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
          <label>Café Item
            <select name="food_id">
              ${foods.map((food) => `<option value="${food.Food_ID}">${escapeHtml(food.Food_Name)} ($${food.Food_Price})</option>`).join("")}
            </select>
          </label>
          <label>Quantity<input type="number" name="quantity" 
          value="${editLine ? editLine.Quantity : ""}" required></label>
          <button class="button" type="submit">
              ${editLine ? "Save Item" : "Add Item"}
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
              <th>Item</th>
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
      const hasFoodStock = await hasFoodStockColumn();
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [[currentLine]] = await connection.query(
          "SELECT Quantity FROM Food_Sale_Line WHERE Food_Sale_ID = ? AND Food_ID = ? FOR UPDATE",
          [saleId, original_food],
        );
        if (hasFoodStock) {
          const [[stockRow]] = await connection.query(
            "SELECT Stock_Quantity, Food_Name FROM Food WHERE Food_ID = ? FOR UPDATE",
            [foodId],
          );
          const oldQty = currentLine ? currentLine.Quantity : 0;
          const newQty = parseInt(quantity, 10);
          const delta = newQty - oldQty;
          if (delta > 0 && (!stockRow || stockRow.Stock_Quantity < delta)) {
            await connection.rollback();
            setFlash(req, `Not enough stock for ${stockRow ? stockRow.Food_Name : "this item"}.`);
            return res.redirect("/add-food-sale-line");
          }
        }
        await connection.query(
          `UPDATE Food_Sale_Line SET Quantity = ? WHERE Food_Sale_ID = ? AND Food_ID = ?`,
          [quantity, saleId, original_food],
        );
        await connection.commit();
        setFlash(req, "Order item updated.");
      } catch (err) {
        await connection.rollback();
        if (err.sqlState === "45000") {
          await logTriggerViolation(pool, req, err.sqlMessage, `Café · Order #${saleId} · item quantity edit`);
          setFlash(req, err.sqlMessage || "Update blocked by a stock rule.");
        } else {
          throw err;
        }
      } finally {
        connection.release();
      }
  } else {
    // Check if this item already exists in the order — if so, add to its quantity instead of inserting a duplicate row
    const [[existingLine]] = await pool.query(
      "SELECT Quantity FROM Food_Sale_Line WHERE Food_Sale_ID = ? AND Food_ID = ?",
      [saleId, foodId],
    );

    if (existingLine) {
      // Item already in order — update quantity using the same transaction + stock-delta logic
      const hasFoodStock = await hasFoodStockColumn();
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [[lockedLine]] = await connection.query(
          "SELECT Quantity FROM Food_Sale_Line WHERE Food_Sale_ID = ? AND Food_ID = ? FOR UPDATE",
          [saleId, foodId],
        );
        const newQty = (lockedLine ? lockedLine.Quantity : 0) + parseInt(quantity, 10);
        if (hasFoodStock) {
          const [[stockRow]] = await connection.query(
            "SELECT Stock_Quantity, Food_Name FROM Food WHERE Food_ID = ? FOR UPDATE",
            [foodId],
          );
          const delta = parseInt(quantity, 10);
          if (delta > 0 && (!stockRow || stockRow.Stock_Quantity < delta)) {
            await connection.rollback();
            setFlash(req, `Not enough stock for ${stockRow ? stockRow.Food_Name : "this item"}.`);
            return res.redirect("/add-food-sale-line");
          }
        }
        await connection.query(
          "UPDATE Food_Sale_Line SET Quantity = ? WHERE Food_Sale_ID = ? AND Food_ID = ?",
          [newQty, saleId, foodId],
        );
        await connection.commit();
        setFlash(req, "Item quantity updated.");
      } catch (err) {
        await connection.rollback();
        if (err.sqlState === "45000") {
          await logTriggerViolation(pool, req, err.sqlMessage, `Café · Order #${saleId} · quantity update`);
          setFlash(req, err.sqlMessage || "Update blocked by a stock rule.");
        } else {
          throw err;
        }
      } finally {
        connection.release();
      }
    } else {
      // New item — insert fresh row
      try {
        await pool.query(
          `INSERT INTO Food_Sale_Line (Food_Sale_ID, Food_ID, Quantity, Price_When_Food_Was_Sold)
           VALUES (?, ?, ?, ?)`,
          [saleId, foodId, quantity, food.Food_Price],
        );
        setFlash(req, "Item added to order.");
      } catch (err) {
        if (err.sqlState === "45000") {
          await logTriggerViolation(pool, req, err.sqlMessage, `Café · Order #${saleId} · add item to order`);
          setFlash(req, err.sqlMessage);
        } else {
          throw err;
        }
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

  app.get("/order", requireLogin, allowRoles(["cafe", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    const foodHasTypeColumn = await hasFoodTypeColumn();
    const foodHasStockColumn = await hasFoodStockColumn();
    const foodHasImageUrlColumn = await hasColumn("Food", "Image_URL");
    const [foods] = await pool.query(
      `SELECT Food_ID, Food_Name, ${foodHasTypeColumn ? "Type" : "NULL"} AS Type, Food_Price,
              ${foodHasStockColumn ? "Stock_Quantity" : "NULL"} AS Stock_Quantity,
              ${foodHasImageUrlColumn ? "Image_URL" : "NULL"} AS Image_URL
       FROM Food
       ORDER BY ${foodHasStockColumn ? "Stock_Quantity = 0, " : ""}Food_Name`
    );
    const categories = Array.from(new Set(foods.map((food) => food.Type || "Cafe").filter(Boolean))).sort();
    const cart = req.session.cart || [];
    const cartTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);
    const cartRows = cart.map(item => `
      <li>
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <span>$${Number(item.price).toFixed(2)} x ${item.qty}</span>
        </div>
        <span>$${(item.price * item.qty).toFixed(2)}</span>
      </li>
    `).join("");

    res.send(renderPage({
      title: "Café POS",
      user: req.session.user,
      currentPath: req.path,
      showPortalBanner: false,
      content: `
      ${renderFlash(req)}
      <div class="pos-layout cafe-pos">
        <section class="pos-products">
          <div class="section-header">
            <div>
              <p class="eyebrow">Food Service POS</p>
              <h1>Café Orders</h1>
            </div>
            <span class="status-badge status-badge--neutral">${cartCount} item${cartCount === 1 ? "" : "s"}</span>
          </div>
          <div class="pos-filter-bar" data-pos-filters>
            <label>Search
              <input type="search" placeholder="Find item" data-pos-search>
            </label>
            <div class="pos-category-tabs" aria-label="Cafe categories">
              <button class="tab-button is-active" type="button" data-pos-category="all">All</button>
              ${categories.map((category) => `<button class="tab-button" type="button" data-pos-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join("")}
            </div>
          </div>
          <div class="product-grid">
            ${foods.map((food) => {
              const asset = getCafeAsset(food.Food_Name, food.Type, food.Image_URL);
              const tone = !foodHasStockColumn
                ? "neutral"
                : food.Stock_Quantity === 0
                  ? "danger"
                  : food.Stock_Quantity <= 5
                    ? "warning"
                    : "success";
              const stockText = !foodHasStockColumn
                ? "Stock pending"
                : food.Stock_Quantity === 0
                  ? "Out of stock"
                  : food.Stock_Quantity <= 5
                    ? `${food.Stock_Quantity} left`
                    : "In stock";
              return `
                <article class="product-card pos-product-card ${foodHasStockColumn && food.Stock_Quantity === 0 ? "pos-product-card--unavailable" : ""}" data-pos-product data-pos-name="${escapeHtml(food.Food_Name)}" data-pos-category="${escapeHtml(food.Type || "Cafe")}">
                  <div class="product-card__media"><img src="${asset.imagePath}" alt="${asset.alt}"></div>
                  <div class="product-card__body">
                    <h2>${escapeHtml(food.Food_Name)}</h2>
                    <div class="product-card__meta">
                      <span class="status-badge status-badge--neutral">$${Number(food.Food_Price).toFixed(2)}</span>
                      <span class="status-badge status-badge--${tone}">${escapeHtml(stockText)}</span>
                    </div>
                    ${!foodHasStockColumn || food.Stock_Quantity > 0
                      ? `<form method="post" action="/order/add-item" class="pos-add-form">
                          <input type="hidden" name="food_id" value="${food.Food_ID}">
                          <label>Quantity
                            <input type="number" name="quantity" value="1" min="1" ${foodHasStockColumn ? `max="${food.Stock_Quantity}"` : ""}>
                          </label>
                          <button class="button" type="submit">Add to Order</button>
                        </form>`
                      : '<span class="status-badge status-badge--danger">Unavailable</span>'}
                  </div>
                </article>
              `;
            }).join("")}
          </div>
        </section>
        <aside class="order-ledger" aria-label="Current order subtotal">
          <div>
            <h2>Current Order</h2>
          </div>
          ${cart.length === 0
            ? '<div class="empty-state"><p><strong>No items in cart</strong></p><p>Search or choose a category, then add items from the product grid.</p></div>'
            : `<ul class="order-ledger__items">${cartRows}</ul>
               <div class="order-ledger__edit">
                ${cart.map(item => `
                  <div class="order-ledger__line-edit">
                    <span>${escapeHtml(item.name)}</span>
                    <form method="post" action="/order/update-item" class="inline-form">
                      <input type="hidden" name="food_id" value="${item.id}">
                      <input type="number" name="quantity" value="${item.qty}" min="1" aria-label="Quantity for ${escapeHtml(item.name)}">
                      <button class="link-button" type="submit">Update</button>
                    </form>
                    <form method="post" action="/order/remove-item" class="inline-form">
                      <input type="hidden" name="food_id" value="${item.id}">
                      <button class="link-button danger" type="submit">Remove</button>
                    </form>
                  </div>
                `).join("")}
               </div>
               <dl class="order-ledger__totals">
                 <div><dt>Subtotal</dt><dd>$${cartTotal.toFixed(2)}</dd></div>
                 <div><dt>Total Due</dt><dd>$${cartTotal.toFixed(2)}</dd></div>
               </dl>
               <div class="order-ledger__actions">
                 <a class="button" href="/order/checkout">Checkout</a>
                 <form method="post" action="/order/clear">
                   <button class="button button-secondary" type="submit">Clear</button>
                 </form>
               </div>`
          }
        </aside>
      </div>`
    }));
  }));

  app.get("/order/checkout", requireLogin, allowRoles(["cafe", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    const cart = req.session.cart || [];
    if (cart.length === 0) {
      setFlash(req, "Cart is empty.");
      return res.redirect("/order");
    }

    let total = 0;
    const itemRows = cart.map(item => {
      const subtotal = item.price * item.qty;
      total += subtotal;
      return `<tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${item.qty}</td>
        <td>$${Number(item.price).toFixed(2)}</td>
        <td>$${subtotal.toFixed(2)}</td>
      </tr>`;
    }).join('');

    res.send(renderPage({
      title: "Café Checkout",
      user: req.session.user,
      showPortalBanner: false,
      content: `
      <section class="card narrow">
        <h1>Order Summary</h1>
        ${renderFlash(req)}
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
          <tfoot><tr><td colspan="3" style="text-align:right;font-weight:bold;">Total</td><td><strong>$${total.toFixed(2)}</strong></td></tr></tfoot>
        </table>
        <div style="display:flex;gap:1rem;margin-top:1.5rem;">
          <form method="post" action="/order/checkout">
            <button class="button" type="submit">Complete Order</button>
          </form>
          <a class="button button-secondary" href="/order">Return to Order</a>
        </div>
      </section>`
    }));
  }));

  app.post("/order/add-item", requireLogin, allowRoles(["cafe", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    const { food_id } = req.body;
    const quantity = Number.parseInt(req.body.quantity, 10) || 1;
    const foodHasStockColumn = await hasFoodStockColumn();
    const [[food]] = await pool.query(
      `SELECT Food_ID, Food_Name, Food_Price,
              ${foodHasStockColumn ? "Stock_Quantity" : "NULL"} AS Stock_Quantity
       FROM Food WHERE Food_ID = ?`,
      [food_id]
    );

    if (!food || (foodHasStockColumn && food.Stock_Quantity <= 0)) {
      setFlash(req, "Item is out of stock.");
      return res.redirect("/order");
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      setFlash(req, "Quantity must be at least 1.");
      return res.redirect("/order");
    }

    if (!req.session.cart) req.session.cart = [];
    const existing = req.session.cart.find(item => item.id == food_id);
    const requestedQty = existing ? existing.qty + quantity : quantity;

    if (foodHasStockColumn && requestedQty > food.Stock_Quantity) {
      setFlash(req, `Only ${food.Stock_Quantity} portions available for "${food.Food_Name}".`);
      return res.redirect("/order");
    }

    if (existing) {
      existing.qty += quantity;
    } else {
      req.session.cart.push({ id: food_id, name: food.Food_Name, price: parseFloat(food.Food_Price), qty: quantity });
    }
    res.redirect("/order");
  }));

  app.post("/order/remove-item", requireLogin, allowRoles(["cafe", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    req.session.cart = (req.session.cart || []).filter(item => item.id != req.body.food_id);
    res.redirect("/order");
  }));

  app.post("/order/update-item", requireLogin, allowRoles(["cafe", "supervisor", "employee"]), asyncHandler(async (req, res) => {
  const { food_id, quantity } = req.body;
  const qty = Number.parseInt(quantity, 10);
  const foodHasStockColumn = await hasFoodStockColumn();

  if (!qty || qty < 1) {
    setFlash(req, "Enter a valid quantity.");
    return res.redirect("/order");
  }

  if (!req.session.cart) req.session.cart = [];

  const item = req.session.cart.find(i => i.id == food_id);

  if (item) {
    if (foodHasStockColumn) {
      const [[stockRow]] = await pool.query(
        "SELECT Stock_Quantity, Food_Name FROM Food WHERE Food_ID = ?",
        [food_id]
      );
      if (!stockRow || qty > stockRow.Stock_Quantity) {
        setFlash(req, `Only ${stockRow?.Stock_Quantity ?? 0} portions available for "${stockRow?.Food_Name || "item"}".`);
        return res.redirect("/order");
      }
    }
    item.qty = qty;
  }

  res.redirect("/order");
}));
  app.post("/order/clear", requireLogin, allowRoles(["cafe", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    req.session.cart = [];
    res.redirect("/order");
  }));

  app.post("/order/checkout", requireLogin, allowRoles(["cafe", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    const cart = req.session.cart || [];
    const foodHasStockColumn = await hasFoodStockColumn();
    if (cart.length === 0) {
      setFlash(req, "Cart is empty.");
      return res.redirect("/order");
    }

    let employeeId = req.session.user.employeeId;
    if (!employeeId) {
      const [empRows] = await pool.query("SELECT Employee_ID FROM Employee WHERE Email = ?", [req.session.user.email]);
      employeeId = empRows[0]?.Employee_ID || null;
    }
    if (!employeeId) {
      setFlash(req, "Employee record not found. Contact a supervisor.");
      return res.redirect("/order");
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Lock each food row inside the transaction (FOR UPDATE) so concurrent
      // orders cannot read stale stock between the check and the deduction.
      for (const item of cart) {
        const [[stock]] = await connection.query(
          `SELECT Food_Name, ${foodHasStockColumn ? "Stock_Quantity" : "NULL"} AS Stock_Quantity
           FROM Food WHERE Food_ID = ? FOR UPDATE`,
          [item.id]
        );
        if (!stock || (foodHasStockColumn && stock.Stock_Quantity < item.qty)) {
          await connection.rollback();
          setFlash(req, `Not enough stock for "${stock?.Food_Name || "item"}". Available: ${stock?.Stock_Quantity ?? 0}.`);
          return res.redirect("/order");
        }
      }

      const [result] = await connection.query(
        "INSERT INTO Food_Sale (Sale_Date, Employee_ID) VALUES (CURDATE(), ?)",
        [employeeId]
      );
      const saleId = result.insertId;

      for (const item of cart) {
        await connection.query(
          `INSERT INTO Food_Sale_Line (Food_Sale_ID, Food_ID, Quantity, Price_When_Food_Was_Sold) VALUES (?, ?, ?, ?)`,
          [saleId, item.id, item.qty, item.price]
        );
      }

      await connection.commit();

      const orderTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
      req.session.cart = [];
      setFlash(req, `Order #${saleId} completed. Total: $${orderTotal.toFixed(2)}`);
    } catch (error) {
      await connection.rollback();
      if (error.sqlState === "45000") {
        await logTriggerViolation(pool, req, error.sqlMessage, "Café · Checkout");
        setFlash(req, error.sqlMessage);
        return res.redirect("/order");
      }
      throw error;
    } finally {
      connection.release();
    }
    res.redirect("/order");
  }));
}
module.exports = { registerCafeRoutes };
