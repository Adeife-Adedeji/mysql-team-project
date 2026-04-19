const {
  asyncHandler,
  escapeHtml,
  formatDateInput,
  formatDisplayDate,
  getGiftShopAsset,
  renderFlash,
  renderPage,
  requireLogin,
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

function registerGiftShopRoutes(app, { pool, upload }) {

  app.get("/add-item", requireLogin, allowRoles(["giftshop", "supervisor"]), asyncHandler(async (req, res) => {
    const hasImageUrlColumn = await hasColumn(pool, "Gift_Shop_Item", "Image_URL");
    const [items] = await pool.query(
      `SELECT Gift_Shop_Item_ID, Name_of_Item, Price_of_Item, Stock_Quantity, Category, ${hasImageUrlColumn ? "Image_URL" : "NULL"} AS Image_URL FROM Gift_Shop_Item`,
    );
    const isSuper = req.session.user.role === "supervisor";

   let editItem = null;
  if (req.query.edit_id) {
    const [rows] = await pool.query(
      "SELECT * FROM Gift_Shop_Item WHERE Gift_Shop_Item_ID = ?",
      [req.query.edit_id],
    );
    editItem = rows[0] || null;
  }

    const itemRows = items.map((item) => {
      const rowStyle = item.Stock_Quantity === 0
        ? 'style="background:#fdecea;"'
        : item.Stock_Quantity <= 5
          ? 'style="background:#fff8e1;"'
          : '';
      const statusHtml = item.Stock_Quantity === 0
        ? '<span style="color:#c0392b;font-weight:bold;">Out of Stock</span>'
        : item.Stock_Quantity <= 5
          ? '<span style="color:#e67e22;font-weight:bold;">Low Stock</span>'
          : '<span style="color:#27ae60;">Available</span>';
      return `
      <tr ${rowStyle}>
        <td>${item.Gift_Shop_Item_ID}</td>
        <td>${escapeHtml(item.Name_of_Item)}</td>
        <td>$${Number(item.Price_of_Item).toFixed(2)}</td>
        <td>${item.Stock_Quantity}</td>
        <td>${statusHtml}</td>
        <td>${item.Image_URL ? `<img src="${escapeHtml(item.Image_URL)}" alt="${escapeHtml(item.Name_of_Item)} preview" class="table-thumb">` : "—"}</td>
        <td class="actions">
            <form method="get" action="/add-item" class="inline-form">
            <input type="hidden" name="edit_id" value="${item.Gift_Shop_Item_ID}">
            <button class="link-button" type="submit">Edit</button>
          </form>
          ${isSuper ? `
          <form method="post" action="/delete-item" class="inline-form" onsubmit="return confirm('Remove this item?');">
            <input type="hidden" name="item_id" value="${item.Gift_Shop_Item_ID}">
            <button class="link-button danger" type="submit">Delete</button>
          </form>` : ""}
        </td>
      </tr>
    `;
    }).join("");

    res.send(renderPage({
      title: "Gift Shop Inventory",
      user: req.session.user,
      showPortalBanner: false,
      content: `
      <section class="card narrow">
        <h1>${editItem ? "Edit Gift Shop Item" : "Add Gift Shop Item"}</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-item" class="form-grid" enctype="multipart/form-data">
          ${editItem ? `<input type="hidden" name="item_id" value="${editItem.Gift_Shop_Item_ID}">` : ""}
          <label>Name
            <input type="text" name="name" 
            value="${editItem ? escapeHtml(editItem.Name_of_Item) : ""}" required>
          </label>
          <label>Price ($)
            <input type="number" step="0.01" name="price" 
             value="${editItem ? editItem.Price_of_Item : ""}" required>
          </label>
          <label>Stock
            <input type="number" name="stock"
            value="${editItem ? editItem.Stock_Quantity : ""}" required>
          </label>
          <label>Image
            ${editItem && editItem.Image_URL ? `<img src="${escapeHtml(editItem.Image_URL)}" alt="current" class="table-thumb" style="display:block;margin-bottom:0.25rem;">` : ""}
            <input type="file" name="image_file" accept="image/*">
            ${editItem ? `<small style="color:#888">Leave empty to keep current image</small>` : ""}
          </label>
          <button class="button" type="submit">
              ${editItem ? "Save Item" : "Create Item"}
            </button>
        </form>
      </section>
      <section class="card narrow">
        <h2>Current Inventory</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Item Name</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Image</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows || '<tr><td colspan="7">No items found.</td></tr>'}
          </tbody>
        </table>
      </section>
    `,
    }));
  }));

  app.post("/add-item", requireLogin, allowRoles(["giftshop", "supervisor"]), upload.single("image_file"), asyncHandler(async (req, res) => {
    const itemId = req.body.item_id || null;
    const { name, price, stock } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const hasImageUrlColumn = await hasColumn(pool, "Gift_Shop_Item", "Image_URL");
    const parsedPrice = Number.parseFloat(price);
    const parsedStock = Number.parseInt(stock, 10);

    if (!name || !price || !stock) {
      setFlash(req, "All fields are required.");
      return res.redirect("/add-item");
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setFlash(req, "Price must be 0 or greater.");
      return res.redirect(itemId ? `/add-item?edit_id=${itemId}` : "/add-item");
    }

    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      setFlash(req, "Stock cannot be negative.");
      return res.redirect(itemId ? `/add-item?edit_id=${itemId}` : "/add-item");
    }

    if (itemId) {
      if (hasImageUrlColumn && req.file) {
        await pool.query(
          `UPDATE Gift_Shop_Item
          SET Name_of_Item = ?, Price_of_Item = ?, Stock_Quantity = ?, Image_URL = ?
          WHERE Gift_Shop_Item_ID = ?`,
          [name, parsedPrice, parsedStock, imageUrl, itemId],
        );
      } else {
        await pool.query(
          `UPDATE Gift_Shop_Item
          SET Name_of_Item = ?, Price_of_Item = ?, Stock_Quantity = ?
          WHERE Gift_Shop_Item_ID = ?`,
          [name, parsedPrice, parsedStock, itemId],
        );
      }
      setFlash(req, "Gift shop item updated.");
  } else {
    if (hasImageUrlColumn) {
      await pool.query(
        `INSERT INTO Gift_Shop_Item (Name_of_Item, Price_of_Item, Stock_Quantity, Image_URL)
         VALUES (?, ?, ?, ?)`,
        [name, parsedPrice, parsedStock, imageUrl],
      );
    } else {
      await pool.query(
        `INSERT INTO Gift_Shop_Item (Name_of_Item, Price_of_Item, Stock_Quantity)
         VALUES (?, ?, ?)`,
        [name, parsedPrice, parsedStock],
      );
    }

    setFlash(req, "Gift shop item created.");
  }

  res.redirect("/add-item");
}));

  app.post("/delete-item", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const idToDelete = req.body.item_id;

    if (!idToDelete) {
      setFlash(req, "Select an item before deleting.");
      return res.redirect("/add-item");
    }

    try {
      await pool.query("DELETE FROM Gift_Shop_Item WHERE Gift_Shop_Item_ID = ?", [idToDelete]);
      setFlash(req, "Item removed.");
    } catch (err) {
      if (err.code === "ER_ROW_IS_REFERENCED_2" || err.code === "ER_ROW_IS_REFERENCED") {
        setFlash(req, "This item is linked to existing sale records and cannot be deleted.");
      } else {
        throw err;
      }
    }
    res.redirect("/add-item");
  }));

  app.get("/add-sale", requireLogin, allowRoles(["giftshop", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    const hasImageUrlColumn = await hasColumn(pool, "Gift_Shop_Item", "Image_URL");
    const [salesLines] = await pool.query(`
      SELECT
        gs.Gift_Shop_Sale_ID,
        gs.Sale_Date,
        gs.Employee_ID,
        i.Name_of_Item,
        gsl.Quantity,
        gsl.Price_When_Item_is_Sold,
        i.Category AS Item_Category
      FROM Gift_Shop_Sale gs
      LEFT JOIN Gift_Shop_Sale_Line gsl ON gsl.Gift_Shop_Sale_ID = gs.Gift_Shop_Sale_ID
      LEFT JOIN Gift_Shop_Item i ON i.Gift_Shop_Item_ID = gsl.Gift_Shop_Item_ID
      ORDER BY gs.Gift_Shop_Sale_ID DESC, gsl.Gift_Shop_Item_ID
    `);
    const ordersMap = new Map();
    for (const row of salesLines) {
      if (!ordersMap.has(row.Gift_Shop_Sale_ID)) {
        ordersMap.set(row.Gift_Shop_Sale_ID, {
          Gift_Shop_Sale_ID: row.Gift_Shop_Sale_ID,
          Sale_Date: row.Sale_Date,
          Employee_ID: row.Employee_ID,
          items: [],
          orderTotal: 0,
        });
      }
      if (row.Name_of_Item != null) {
        const order = ordersMap.get(row.Gift_Shop_Sale_ID);
        order.items.push({
          Name_of_Item: row.Name_of_Item,
          Quantity: row.Quantity,
          Item_Category: row.Item_Category,
          Price: row.Price_When_Item_is_Sold,
        });
        order.orderTotal += Number(row.Quantity || 0) * Number(row.Price_When_Item_is_Sold || 0);
      }
    }
    const orders = Array.from(ordersMap.values());
    const allCategories = [...new Set(orders.flatMap(o => o.items.map(i => i.Item_Category).filter(Boolean)))].sort();
    let editSale = null;

    // Daily sales summary
    const [[todayTotals]] = await pool.query(`
      SELECT COUNT(DISTINCT gs.Gift_Shop_Sale_ID) AS total_sales,
             COALESCE(SUM(gsl.Quantity * gsl.Price_When_Item_is_Sold), 0) AS total_revenue
      FROM Gift_Shop_Sale gs
      JOIN Gift_Shop_Sale_Line gsl ON gs.Gift_Shop_Sale_ID = gsl.Gift_Shop_Sale_ID
      WHERE gs.Sale_Date = CURDATE()
    `);
    const [bestSeller] = await pool.query(`
      SELECT i.Name_of_Item, SUM(gsl.Quantity) AS total_qty
      FROM Gift_Shop_Sale_Line gsl
      JOIN Gift_Shop_Sale gs ON gsl.Gift_Shop_Sale_ID = gs.Gift_Shop_Sale_ID
      JOIN Gift_Shop_Item i ON gsl.Gift_Shop_Item_ID = i.Gift_Shop_Item_ID
      WHERE gs.Sale_Date = CURDATE()
      GROUP BY gsl.Gift_Shop_Item_ID, i.Name_of_Item
      ORDER BY total_qty DESC LIMIT 1
    `);

      if (req.query.edit_id) {
        const [rows] = await pool.query(
          "SELECT * FROM Gift_Shop_Sale WHERE Gift_Shop_Sale_ID = ?",
          [req.query.edit_id],
        );
        editSale = rows[0] || null;
      }
    const saleRows = orders.map((order) => {
      const dateTs = order.Sale_Date ? new Date(order.Sale_Date).getTime() : 0;
      const itemCats = order.items.map(i => (i.Item_Category || "").toLowerCase()).filter(Boolean).join(",");
      const itemsHtml = order.items.length > 0
        ? order.items.map((item) => {
            const catTag = item.Item_Category
              ? `<span style="font-size:0.72em;background:#f0f4f8;color:#556;padding:1px 5px;border-radius:3px;margin-left:4px;vertical-align:middle;">${escapeHtml(item.Item_Category)}</span>`
              : "";
            return `<div style="margin-bottom:2px;">${escapeHtml(item.Name_of_Item)} &times; ${item.Quantity}${catTag}</div>`;
          }).join("")
        : `<span style="color:#aaa">No items yet</span>`;
      return `<div data-order-id="${order.Gift_Shop_Sale_ID}" data-date="${dateTs}" data-total="${order.orderTotal.toFixed(2)}" data-cats="${escapeHtml(itemCats)}" style="display:grid;grid-template-columns:55px 1fr 75px 95px 80px auto;gap:0.5rem;padding:0.5rem 0.75rem;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:4px;align-items:start;background:#fff;">
        <strong style="padding-top:2px;">#${order.Gift_Shop_Sale_ID}</strong>
        <div>${itemsHtml}</div>
        <span style="font-weight:600;padding-top:2px;white-space:nowrap;">$${order.orderTotal.toFixed(2)}</span>
        <span style="color:#555;padding-top:2px;white-space:nowrap;">${formatDisplayDate(order.Sale_Date)}</span>
        <span style="color:#555;padding-top:2px;">${escapeHtml(String(order.Employee_ID))}</span>
        <div style="display:flex;gap:4px;flex-wrap:wrap;">
          <form method="post" action="/load-gift-sale" class="inline-form">
            <input type="hidden" name="sale_id" value="${order.Gift_Shop_Sale_ID}">
            <button class="link-button" type="submit">Edit</button>
          </form>
          <form method="post" action="/delete-sale" class="inline-form" onsubmit="return confirm('Delete this sale?');">
            <input type="hidden" name="sale_id" value="${order.Gift_Shop_Sale_ID}">
            <button class="link-button danger" type="submit">Delete</button>
          </form>
        </div>
      </div>`;
    }).join("");

    res.send(renderPage({
      title: "Add Gift Shop Sale",
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
          ? `<p style="color:#555;"> Best seller today: <strong>${escapeHtml(bestSeller[0].Name_of_Item)}</strong> (${bestSeller[0].total_qty} sold)</p>`
          : `<p style="color:#888;">No sales recorded today yet.</p>`}
      </section>

      <section class="card narrow">
        <h1>${editSale ? "Edit Gift Shop Sale" : "Add Gift Shop Sale"}</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-sale" class="form-grid">
        ${editSale ? `<input type="hidden" name="sale_id" value="${editSale.Gift_Shop_Sale_ID}">` : ""}
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
        <h2>Recent Sales</h2>
        <div style="display:flex;gap:0.75rem;align-items:flex-start;margin-bottom:1rem;flex-wrap:wrap;">
          <label style="display:flex;align-items:center;gap:0.4rem;font-size:0.9em;font-weight:600;white-space:nowrap;align-self:center;">
            Sort
            <select id="gs-sort" style="padding:0.25rem 0.5rem;border-radius:4px;border:1px solid #ccc;font-size:0.9em;">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="expensive">Most expensive</option>
              <option value="cheapest">Least expensive</option>
            </select>
          </label>
          <label style="display:flex;align-items:center;gap:0.4rem;font-size:0.9em;font-weight:600;white-space:nowrap;align-self:center;">
            Sale ID
            <input type="text" id="gs-id-search" placeholder="Search…" style="width:80px;padding:0.25rem 0.5rem;border-radius:4px;border:1px solid #ccc;font-size:0.9em;">
          </label>
          <div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;align-self:center;">
            <span style="font-size:0.9em;font-weight:600;white-space:nowrap;">Category:</span>
            ${allCategories.length > 0
              ? allCategories.map(c => `<label style="display:inline-flex;align-items:center;gap:0.25rem;padding:0.2rem 0.65rem;border-radius:999px;border:1px solid #ccc;cursor:pointer;font-size:0.82em;background:#fff;white-space:nowrap;user-select:none;"><input type="checkbox" class="gs-cat-cb" value="${escapeHtml(c.toLowerCase())}" style="margin:0;accent-color:#8f4a43;"> ${escapeHtml(c)}</label>`).join("")
              : `<span style="color:#aaa;font-size:0.85em;">No categories found</span>`}
          </div>
          <span id="gs-order-count" style="color:#888;font-size:0.85em;margin-left:auto;align-self:center;"></span>
        </div>
        <div id="gs-orders-list">
          <div style="display:grid;grid-template-columns:55px 1fr 75px 95px 80px auto;gap:0.5rem;padding:0.4rem 0.75rem;background:#f5f5f5;border-radius:4px;font-size:0.8em;font-weight:600;color:#666;margin-bottom:6px;border:1px solid #e5e7eb;">
            <span>Sale</span><span>Items</span><span>Total</span><span>Date</span><span>Employee</span><span>Actions</span>
          </div>
          ${saleRows || '<p style="color:#888;padding:0.5rem 0;">No sales found.</p>'}
        </div>
      </section>
    `,
    }));
  }));

  app.post("/add-sale", requireLogin, allowRoles(["giftshop", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    const saleId = req.body.sale_id || null;
    const { sale_date: saleDate } = req.body;

    if (!saleDate) {
      setFlash(req, "Sale date is required.");
      return res.redirect("/add-sale");
    }
    if (saleId) {
      await pool.query(
      "UPDATE Gift_Shop_Sale SET Sale_Date = ? WHERE Gift_Shop_Sale_ID = ?",
      [saleDate, saleId],
    );

    setFlash(req, "Gift shop sale updated.");
    return res.redirect("/add-sale-line");
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
      return res.redirect("/add-sale");
    }
    const [result] = await pool.query(
      "INSERT INTO Gift_Shop_Sale (Sale_Date, Employee_ID) VALUES (?, ?)",
      [saleDate, employeeId],
    );
    req.session.currentGiftSaleId = result.insertId;
    setFlash(req, "Sale created. Add items to complete the record.");
    res.redirect("/add-sale-line");
  }
  }));

  app.post("/delete-sale", requireLogin, allowRoles(["giftshop", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    const { sale_id: saleId } = req.body;

    await pool.query("DELETE FROM Gift_Shop_Sale_Line WHERE Gift_Shop_Sale_ID = ?", [saleId]);
    await pool.query("DELETE FROM Gift_Shop_Sale WHERE Gift_Shop_Sale_ID = ?", [saleId]);
    setFlash(req, "Gift shop sale deleted.");
    res.redirect("/add-sale");
  }));

  app.post("/load-gift-sale", requireLogin, allowRoles(["giftshop", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    req.session.currentGiftSaleId = parseInt(req.body.sale_id);
    res.redirect("/add-sale-line");
  }));

  app.get("/add-sale-line", requireLogin, allowRoles(["giftshop", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    const currentSaleId = req.session.currentGiftSaleId || null;
    const [items] = await pool.query("SELECT Gift_Shop_Item_ID, Name_of_Item, Price_of_Item FROM Gift_Shop_Item");
    const [saleInfo] = currentSaleId ? await pool.query(
      "SELECT Sale_Date FROM Gift_Shop_Sale WHERE Gift_Shop_Sale_ID = ?", [currentSaleId]
    ) : [[]];
    const [lines] = currentSaleId ? await pool.query(`
      SELECT gsl.Gift_Shop_Sale_ID, gsl.Gift_Shop_Item_ID, i.Name_of_Item, gsl.Quantity, gsl.Price_When_Item_is_Sold, gsl.Total_Sum_For_Gift_Shop_Sale
      FROM Gift_Shop_Sale_Line gsl
      JOIN Gift_Shop_Item i ON gsl.Gift_Shop_Item_ID = i.Gift_Shop_Item_ID
      WHERE gsl.Gift_Shop_Sale_ID = ?
    `, [currentSaleId]) : [[]];

      let editLine = null;

      if (req.query.edit_sale && req.query.edit_item) {
        const [rows] = await pool.query(
          "SELECT * FROM Gift_Shop_Sale_Line WHERE Gift_Shop_Sale_ID = ? AND Gift_Shop_Item_ID = ?",
          [req.query.edit_sale, req.query.edit_item],
        );
        editLine = rows[0] || null;
      }
    const lineRows = lines.map((line) => `
      <tr>
        <td>#${line.Gift_Shop_Sale_ID}</td>
        <td>${escapeHtml(line.Name_of_Item)}</td>
        <td>${line.Quantity}</td>
        <td>$${Number(line.Price_When_Item_is_Sold).toFixed(2)}</td>
        <td>$${Number(line.Total_Sum_For_Gift_Shop_Sale).toFixed(2)}</td>
        <td class="actions">
        <form method="get" action="/add-sale-line" class="inline-form">
          <input type="hidden" name="edit_sale" value="${line.Gift_Shop_Sale_ID}">
          <input type="hidden" name="edit_item" value="${line.Gift_Shop_Item_ID}">
          <button class="link-button" type="submit">Edit</button>
        </form>
          <form method="post" action="/delete-sale-line" class="inline-form" onsubmit="return confirm('Remove item from sale?');">
            <input type="hidden" name="sale_id" value="${line.Gift_Shop_Sale_ID}">
            <input type="hidden" name="item_id" value="${line.Gift_Shop_Item_ID}">
            <button class="link-button danger" type="submit">Delete</button>
          </form>
        </td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Add Sale Line",
      user: req.session.user,
      showPortalBanner: false,
      content: `
      <section class="card narrow">
         <h1>${editLine ? "Edit Item in Sale" : "Add Item to Sale"}</h1>
        ${renderFlash(req)}
        ${!currentSaleId ? `
          <p style="color:#c0392b;">No sale is active. <a href="/add-sale">Create a sale</a> before adding items.</p>
        ` : `
          <p style="color:#555; margin-bottom:1rem;">Current Sale: <strong>Sale #${currentSaleId}</strong> &nbsp;
            <a href="/add-sale" style="font-size:0.85rem;">Create another sale</a>
          </p>
          <form method="post" action="/add-sale" class="form-grid" style="margin-bottom:1rem; padding-bottom:1rem; border-bottom:1px solid #eee;">
            <input type="hidden" name="sale_id" value="${currentSaleId}">
            <label>Sale Date
              <input type="date" name="sale_date" value="${saleInfo[0] ? formatDateInput(saleInfo[0].Sale_Date) : ''}" required>
            </label>
            <button class="button" type="submit" style="background:#666;">Update Date</button>
          </form>
          <form method="post" action="/add-sale-line" class="form-grid">
          ${editLine ? `<input type="hidden" name="original_item" value="${editLine.Gift_Shop_Item_ID}">` : ""}
          <input type="hidden" name="sale_id" value="${currentSaleId}">
          <label>Item
            <select name="item_id">
              ${items.map((item) => `<option value="${item.Gift_Shop_Item_ID}">${escapeHtml(item.Name_of_Item)} ($${item.Price_of_Item})</option>`).join("")}
            </select>
          </label>
          <label>Quantity
            <input type="number" name="quantity" value="${editLine ? editLine.Quantity : ""}" required>
          </label>
          <button class="button" type="submit">
            ${editLine ? "Save Item" : "Add Item"}
          </button>
          </form>
        `}
      </section>
      <section class="card narrow">
        <h2>Items in Sales</h2>
        <table>
          <thead>
            <tr>
              <th>Sale ID</th>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>${lineRows || '<tr><td colspan="6">No items found.</td></tr>'}</tbody>
        </table>
      </section>
    `,
    }));
  }));

  app.post("/add-sale-line", requireLogin, allowRoles(["giftshop", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    const { item_id: itemId, quantity, original_item } = req.body;
    const saleId = req.session.currentGiftSaleId;

    if (!saleId || !itemId || !quantity) {
      setFlash(req, "All fields are required.");
      return res.redirect("/add-sale-line");
    }

    const [[item]] = await pool.query(
      "SELECT Price_of_Item FROM Gift_Shop_Item WHERE Gift_Shop_Item_ID = ?",
      [itemId],
    );
    const price = item.Price_of_Item;
    const total = price * quantity;

    if (original_item) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [[currentLine]] = await connection.query(
          "SELECT Quantity FROM Gift_Shop_Sale_Line WHERE Gift_Shop_Sale_ID = ? AND Gift_Shop_Item_ID = ? FOR UPDATE",
          [saleId, original_item],
        );
        const [[stockRow]] = await connection.query(
          "SELECT Stock_Quantity, Name_of_Item FROM Gift_Shop_Item WHERE Gift_Shop_Item_ID = ? FOR UPDATE",
          [original_item],
        );
        const oldQty = currentLine ? currentLine.Quantity : 0;
        const newQty = parseInt(quantity, 10);
        const delta = newQty - oldQty;
        if (delta > 0 && (!stockRow || stockRow.Stock_Quantity < delta)) {
          await connection.rollback();
          setFlash(req, `Not enough stock for ${stockRow ? stockRow.Name_of_Item : "this item"}.`);
          return res.redirect("/add-sale-line");
        }
        await connection.query(
          `UPDATE Gift_Shop_Sale_Line
           SET Quantity = ?, Total_Sum_For_Gift_Shop_Sale = ?
           WHERE Gift_Shop_Sale_ID = ? AND Gift_Shop_Item_ID = ?`,
          [newQty, total, saleId, original_item],
        );
        await connection.commit();
        setFlash(req, "Sale line updated.");
      } catch (err) {
        await connection.rollback();
        if (err.sqlState === "45000") {
          await logTriggerViolation(pool, req, err.sqlMessage, `Gift Shop · Sale #${saleId} · item quantity edit`);
          setFlash(req, err.sqlMessage || "Update blocked by a stock rule.");
        } else {
          throw err;
        }
      } finally {
        connection.release();
      }
  } else {
    // Check if this item already exists in the sale — if so, add to its quantity instead of inserting a duplicate row
    const [[existingLine]] = await pool.query(
      "SELECT Quantity FROM Gift_Shop_Sale_Line WHERE Gift_Shop_Sale_ID = ? AND Gift_Shop_Item_ID = ?",
      [saleId, itemId],
    );

    if (existingLine) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [[lockedLine]] = await connection.query(
          "SELECT Quantity FROM Gift_Shop_Sale_Line WHERE Gift_Shop_Sale_ID = ? AND Gift_Shop_Item_ID = ? FOR UPDATE",
          [saleId, itemId],
        );
        const [[stockRow]] = await connection.query(
          "SELECT Stock_Quantity, Name_of_Item FROM Gift_Shop_Item WHERE Gift_Shop_Item_ID = ? FOR UPDATE",
          [itemId],
        );
        const addedQty = parseInt(quantity, 10);
        const newQty = (lockedLine ? lockedLine.Quantity : 0) + addedQty;
        if (addedQty > 0 && (!stockRow || stockRow.Stock_Quantity < addedQty)) {
          await connection.rollback();
          setFlash(req, `Not enough stock for ${stockRow ? stockRow.Name_of_Item : "this item"}.`);
          return res.redirect("/add-sale-line");
        }
        await connection.query(
          `UPDATE Gift_Shop_Sale_Line
           SET Quantity = ?, Total_Sum_For_Gift_Shop_Sale = ?
           WHERE Gift_Shop_Sale_ID = ? AND Gift_Shop_Item_ID = ?`,
          [newQty, price * newQty, saleId, itemId],
        );
        await connection.commit();
        setFlash(req, "Item quantity updated.");
      } catch (err) {
        await connection.rollback();
        if (err.sqlState === "45000") {
          await logTriggerViolation(pool, req, err.sqlMessage, `Gift Shop · Sale #${saleId} · quantity update`);
          setFlash(req, err.sqlMessage || "Update blocked by a stock rule.");
        } else {
          throw err;
        }
      } finally {
        connection.release();
      }
    } else {
      try {
        await pool.query(
          `INSERT INTO Gift_Shop_Sale_Line
           (Gift_Shop_Sale_ID, Gift_Shop_Item_ID, Quantity, Price_When_Item_is_Sold, Total_Sum_For_Gift_Shop_Sale)
           VALUES (?, ?, ?, ?, ?)`,
          [saleId, itemId, quantity, price, total],
        );
        setFlash(req, "Item added to sale.");
      } catch (err) {
        if (err.sqlState === "45000") {
          await logTriggerViolation(pool, req, err.sqlMessage, `Gift Shop · Sale #${saleId} · add item to sale`);
          setFlash(req, err.sqlMessage);
        } else {
          throw err;
        }
      }
    }
  }
    res.redirect("/add-sale-line");
  }));

  app.post("/delete-sale-line", requireLogin, allowRoles(["giftshop", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    const { sale_id: saleId, item_id: itemId } = req.body;

    await pool.query(
      "DELETE FROM Gift_Shop_Sale_Line WHERE Gift_Shop_Sale_ID = ? AND Gift_Shop_Item_ID = ?",
      [saleId, itemId],
    );
    setFlash(req, "Item removed.");
    res.redirect("/add-sale-line");
  }));
  app.get("/gift-order", requireLogin, allowRoles(["giftshop", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    const hasImageUrlColumn = await hasColumn(pool, "Gift_Shop_Item", "Image_URL");
    const [items] = await pool.query(
      `SELECT Gift_Shop_Item_ID, Name_of_Item, Price_of_Item, Stock_Quantity, Category, ${hasImageUrlColumn ? "Image_URL" : "NULL"} AS Image_URL
       FROM Gift_Shop_Item
       ORDER BY Stock_Quantity = 0, Category, Name_of_Item`
    );
    const categories = Array.from(new Set(items.map((item) => item.Category || "Museum Favorites").filter(Boolean))).sort();
    const cart = req.session.giftCart || [];
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
      title: "Gift Shop POS",
      user: req.session.user,
      currentPath: req.path,
      showPortalBanner: false,
      content: `
      ${renderFlash(req)}
      <div class="pos-layout gift-shop-pos">
        <section class="pos-products">
          <div class="section-header">
            <div>
              <p class="eyebrow">Retail POS</p>
              <h1>Gift Shop Floor</h1>
            </div>
            <span class="status-badge status-badge--neutral">${cartCount} item${cartCount === 1 ? "" : "s"}</span>
          </div>
          <div class="pos-filter-bar" data-pos-filters>
            <label>Search
              <input type="search" placeholder="Find merchandise" data-pos-search>
            </label>
            <div class="pos-category-tabs" aria-label="Shop categories">
              <button class="tab-button is-active" type="button" data-pos-category="all">All</button>
              ${categories.map((category) => `<button class="tab-button" type="button" data-pos-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join("")}
            </div>
          </div>
          <div class="product-grid">
            ${items.map((item) => {
              const asset = getGiftShopAsset(item.Name_of_Item, item.Category, item.Image_URL);
              const tone = item.Stock_Quantity === 0 ? "danger" : item.Stock_Quantity <= 5 ? "warning" : "success";
              return `
                <article class="product-card shop-product-card ${item.Stock_Quantity === 0 ? "pos-product-card--unavailable" : ""}" data-pos-product data-pos-name="${escapeHtml(item.Name_of_Item)}" data-pos-category="${escapeHtml(item.Category || "Museum Favorites")}">
                  <div class="product-card__media"><img src="${asset.imagePath}" alt="${asset.alt}"></div>
                  <div class="product-card__body">
                    <p class="eyebrow">${escapeHtml(item.Category || "Museum Favorites")}</p>
                    <h2>${escapeHtml(item.Name_of_Item)}</h2>
                    <div class="product-card__meta">
                      <span class="status-badge status-badge--neutral">$${Number(item.Price_of_Item).toFixed(2)}</span>
                      <span class="status-badge status-badge--${tone}">${item.Stock_Quantity} in stock</span>
                    </div>
                    ${item.Stock_Quantity > 0
                      ? `<form method="post" action="/gift-order/add-item" class="pos-add-form">
                          <input type="hidden" name="item_id" value="${item.Gift_Shop_Item_ID}">
                          <label>Quantity
                            <input type="number" name="quantity" value="1" min="1" max="${item.Stock_Quantity}">
                          </label>
                          <button class="button" type="submit">Add to Cart</button>
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
            <h2>Order Summary</h2>
          </div>
          ${cart.length === 0
            ? '<div class="empty-state"><p><strong>No merchandise added yet</strong></p><p>Search or choose a shop category, then add items to the order.</p></div>'
            : `<ul class="order-ledger__items">${cartRows}</ul>
               <div class="order-ledger__edit">
                ${cart.map(item => `
                  <div class="order-ledger__line-edit">
                    <span>${escapeHtml(item.name)}</span>
                    <form method="post" action="/gift-order/update-item" class="inline-form">
                      <input type="hidden" name="item_id" value="${item.id}">
                      <input type="number" name="quantity" value="${item.qty}" min="1" aria-label="Quantity for ${escapeHtml(item.name)}">
                      <button class="link-button" type="submit">Update</button>
                    </form>
                    <form method="post" action="/gift-order/remove-item" class="inline-form">
                      <input type="hidden" name="item_id" value="${item.id}">
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
                 <a class="button" href="/gift-order/checkout">Checkout</a>
                 <form method="post" action="/gift-order/clear">
                   <button class="button button-secondary" type="submit">Clear</button>
                 </form>
               </div>`
          }
        </aside>
      </div>`
    }));
  }));

  app.get("/gift-order/checkout", requireLogin, allowRoles(["giftshop", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    const cart = req.session.giftCart || [];
    if (cart.length === 0) {
      setFlash(req, "Cart is empty.");
      return res.redirect("/gift-order");
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
      title: "Gift Shop Checkout",
      user: req.session.user,
      currentPath: req.path,
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
        <div class="button-row">
          <form method="post" action="/gift-order/checkout">
            <button class="button" type="submit">Complete Order</button>
          </form>
          <a class="button button-secondary" href="/gift-order">Return to Order</a>
        </div>
      </section>`
    }));
  }));

  app.post("/gift-order/add-item", requireLogin, allowRoles(["giftshop", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    const { item_id } = req.body;
    const quantity = Number.parseInt(req.body.quantity, 10) || 1;
    const [[item]] = await pool.query(
      "SELECT Gift_Shop_Item_ID, Name_of_Item, Price_of_Item, Stock_Quantity FROM Gift_Shop_Item WHERE Gift_Shop_Item_ID = ?",
      [item_id]
    );

    if (!item || item.Stock_Quantity <= 0) {
      setFlash(req, "Item is out of stock.");
      return res.redirect("/gift-order");
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      setFlash(req, "Quantity must be at least 1.");
      return res.redirect("/gift-order");
    }

    if (!req.session.giftCart) req.session.giftCart = [];
    const existing = req.session.giftCart.find(i => i.id == item_id);
    const requestedQty = existing ? existing.qty + quantity : quantity;

    if (requestedQty > item.Stock_Quantity) {
      setFlash(req, `Only ${item.Stock_Quantity} units available for "${item.Name_of_Item}".`);
      return res.redirect("/gift-order");
    }

    if (existing) {
      existing.qty += quantity;
    } else {
      req.session.giftCart.push({ id: item_id, name: item.Name_of_Item, price: parseFloat(item.Price_of_Item), qty: quantity });
    }
    res.redirect("/gift-order");
  }));

  app.post("/gift-order/remove-item", requireLogin, allowRoles(["giftshop", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    req.session.giftCart = (req.session.giftCart || []).filter(i => i.id != req.body.item_id);
    res.redirect("/gift-order");
  }));
  app.post("/gift-order/update-item", requireLogin, allowRoles(["giftshop", "supervisor", "employee"]), asyncHandler(async (req, res) => {
      const { item_id, quantity } = req.body;
      const qty = Number.parseInt(quantity, 10);

      if (!qty || qty < 1) {
        setFlash(req, "Enter a valid quantity.");
        return res.redirect("/gift-order");
      }

      if (!req.session.giftCart) req.session.giftCart = [];

      const item = req.session.giftCart.find(i => i.id == item_id);

      if (item) {
        const [[stockRow]] = await pool.query(
          "SELECT Stock_Quantity, Name_of_Item FROM Gift_Shop_Item WHERE Gift_Shop_Item_ID = ?",
          [item_id]
        );
        if (!stockRow || qty > stockRow.Stock_Quantity) {
          setFlash(req, `Only ${stockRow?.Stock_Quantity ?? 0} units available for "${stockRow?.Name_of_Item || "item"}".`);
          return res.redirect("/gift-order");
        }
        item.qty = qty;
      }

      res.redirect("/gift-order");
    }));
  app.post("/gift-order/clear", requireLogin, allowRoles(["giftshop", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    req.session.giftCart = [];
    res.redirect("/gift-order");
  }));

  app.post("/gift-order/checkout", requireLogin, allowRoles(["giftshop", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    const cart = req.session.giftCart || [];
    if (cart.length === 0) {
      setFlash(req, "Cart is empty.");
      return res.redirect("/gift-order");
    }

    let employeeId = req.session.user.employeeId;
    if (!employeeId) {
      const [empRows] = await pool.query("SELECT Employee_ID FROM Employee WHERE Email = ?", [req.session.user.email]);
      employeeId = empRows[0]?.Employee_ID || null;
    }
    if (!employeeId) {
      setFlash(req, "Employee record not found. Contact a supervisor.");
      return res.redirect("/gift-order");
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Lock each item row inside the transaction (FOR UPDATE) so concurrent
      // checkouts cannot read stale stock between the check and the deduction.
      for (const item of cart) {
        const [[stock]] = await connection.query(
          "SELECT Stock_Quantity, Name_of_Item FROM Gift_Shop_Item WHERE Gift_Shop_Item_ID = ? FOR UPDATE",
          [item.id]
        );
        if (!stock || stock.Stock_Quantity < item.qty) {
          await connection.rollback();
          setFlash(req, `Not enough stock for "${stock?.Name_of_Item || "item"}". Available: ${stock?.Stock_Quantity ?? 0}.`);
          return res.redirect("/gift-order");
        }
      }

      const [result] = await connection.query(
        "INSERT INTO Gift_Shop_Sale (Sale_Date, Employee_ID) VALUES (CURDATE(), ?)",
        [employeeId]
      );
      const saleId = result.insertId;

      for (const item of cart) {
        const total = item.price * item.qty;
        await connection.query(
          `INSERT INTO Gift_Shop_Sale_Line (Gift_Shop_Sale_ID, Gift_Shop_Item_ID, Quantity, Price_When_Item_is_Sold, Total_Sum_For_Gift_Shop_Sale) VALUES (?, ?, ?, ?, ?)`,
          [saleId, item.id, item.qty, item.price, total]
        );
      }

      await connection.commit();

      const orderTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
      req.session.giftCart = [];
      setFlash(req, `Order #${saleId} completed. Total: $${orderTotal.toFixed(2)}`);
    } catch (error) {
      await connection.rollback();
      // Catch trigger-level SIGNAL errors (e.g. "Insufficient stock") and
      // show them as a user-friendly flash rather than crashing with a 500.
      if (error.sqlState === "45000") {
        await logTriggerViolation(pool, req, error.sqlMessage, "Gift Shop · Checkout");
        setFlash(req, error.sqlMessage || "Stock check failed. Please review your cart.");
        return res.redirect("/gift-order");
      }
      throw error;
    } finally {
      connection.release();
    }
    res.redirect("/gift-order");
  }));

}

module.exports = { registerGiftShopRoutes };
