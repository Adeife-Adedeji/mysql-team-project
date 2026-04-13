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

function registerGiftShopRoutes(app, { pool }) {

  app.get("/add-item", requireLogin, allowRoles(["giftshop", "supervisor"]), asyncHandler(async (req, res) => {
    const [items] = await pool.query(
      "SELECT Gift_Shop_Item_ID, Name_of_Item, Price_of_Item, Stock_Quantity FROM Gift_Shop_Item",
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
      content: `
      <section class="card narrow">
        <h1>${editItem ? "Edit Gift Shop Item" : "Add Gift Shop Item"}</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-item" class="form-grid">
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
          <button class="button" type="submit">
              ${editItem ? "Update Item" : "Add Item"}
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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows || '<tr><td colspan="6">No items found.</td></tr>'}
          </tbody>
        </table>
      </section>
    `,
    }));
  }));

  app.post("/add-item", requireLogin, allowRoles(["giftshop", "supervisor"]), asyncHandler(async (req, res) => {
    const itemId = req.body.item_id || null;
    const { name, price, stock } = req.body;

    if (!name || !price || !stock) {
      setFlash(req, "All fields are required.");
      return res.redirect("/add-item");
    }

    if (itemId) {
      await pool.query(
        `UPDATE Gift_Shop_Item
        SET Name_of_Item = ?, Price_of_Item = ?, Stock_Quantity = ?
        WHERE Gift_Shop_Item_ID = ?`,
        [name, price, stock, itemId],
      );
      setFlash(req, "Item updated.");
  } else {
    await pool.query(
      `INSERT INTO Gift_Shop_Item (Name_of_Item, Price_of_Item, Stock_Quantity)
       VALUES (?, ?, ?)`,
      [name, price, stock],
    );

    setFlash(req, "Item added.");
  }

  res.redirect("/add-item");
}));

  app.post("/delete-item", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const idToDelete = req.body.item_id;

    if (!idToDelete) {
      setFlash(req, "Error: No item ID provided.");
      return res.redirect("/add-item");
    }

    try {
      await pool.query("DELETE FROM Gift_Shop_Item WHERE Gift_Shop_Item_ID = ?", [idToDelete]);
      setFlash(req, "Item removed.");
    } catch (err) {
      if (err.code === "ER_ROW_IS_REFERENCED_2") {
        setFlash(req, "Cannot delete: this item has existing sale records.");
      } else {
        throw err;
      }
    }
    res.redirect("/add-item");
  }));

  app.get("/add-sale", requireLogin, allowRoles(["giftshop", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    const [sales] = await pool.query("SELECT Gift_Shop_Sale_ID, Sale_Date, Employee_ID FROM Gift_Shop_Sale");
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
    const saleRows = sales.map((sale) => `
      <tr>
        <td>#${sale.Gift_Shop_Sale_ID}</td>
        <td>${formatDisplayDate(sale.Sale_Date)}</td>
        <td>${escapeHtml(sale.Employee_ID)}</td>
        <td class="actions">
        <form method="post" action="/load-gift-sale" class="inline-form">
            <input type="hidden" name="sale_id" value="${sale.Gift_Shop_Sale_ID}">
            <button class="link-button" type="submit">Edit</button>
          </form>
          <form method="post" action="/delete-sale" class="inline-form" onsubmit="return confirm('Delete this sale?');">
            <input type="hidden" name="sale_id" value="${sale.Gift_Shop_Sale_ID}">
            <button class="link-button danger" type="submit">Delete</button>
          </form>
        </td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Add Gift Shop Sale",
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
              ${editSale ? "Update Sale" : "Create Sale"}
            </button>
        </form>
      </section>
      <section class="card narrow">
        <h2>Recent Sales</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Date</th>
              <th>Employee ID</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>${saleRows || '<tr><td colspan="4">No sales found.</td></tr>'}</tbody>
        </table>
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

    setFlash(req, "Sale updated.");
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
      setFlash(req, "Employee record not found. Please contact a supervisor.");
      return res.redirect("/add-sale");
    }
    const [result] = await pool.query(
      "INSERT INTO Gift_Shop_Sale (Sale_Date, Employee_ID) VALUES (?, ?)",
      [saleDate, employeeId],
    );
    req.session.currentGiftSaleId = result.insertId;
    setFlash(req, "Sale started. Now add items to it.");
    res.redirect("/add-sale-line");
  }
  }));

  app.post("/delete-sale", requireLogin, allowRoles(["giftshop", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    const { sale_id: saleId } = req.body;

    await pool.query("DELETE FROM Gift_Shop_Sale_Line WHERE Gift_Shop_Sale_ID = ?", [saleId]);
    await pool.query("DELETE FROM Gift_Shop_Sale WHERE Gift_Shop_Sale_ID = ?", [saleId]);
    setFlash(req, "Sale deleted.");
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
      content: `
      <section class="card narrow">
         <h1>${editLine ? "Edit Item in Sale" : "Add Item to Sale"}</h1>
        ${renderFlash(req)}
        ${!currentSaleId ? `
          <p style="color:#c0392b;">No active sale. Please <a href="/add-sale">start a new sale</a> first.</p>
        ` : `
          <p style="color:#555; margin-bottom:1rem;">Current Sale: <strong>Sale #${currentSaleId}</strong> &nbsp;
            <a href="/add-sale" style="font-size:0.85rem;">Start new sale</a>
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
            ${editLine ? "Update Item" : "Add Item"}
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
      await pool.query(
      `UPDATE Gift_Shop_Sale_Line
       SET Quantity = ?, Total_Sum_For_Gift_Shop_Sale = ?
       WHERE Gift_Shop_Sale_ID = ? AND Gift_Shop_Item_ID = ?`,
      [quantity, total, saleId, original_item],
    );
    setFlash(req, "Sale line updated.");
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
        await logTriggerViolation(pool, req, err.sqlMessage);
        setFlash(req, err.sqlMessage);
      } else {
        throw err;
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
    const [items] = await pool.query("SELECT Gift_Shop_Item_ID, Name_of_Item, Price_of_Item, Stock_Quantity FROM Gift_Shop_Item");
    const cart = req.session.giftCart || [];
    const cartTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

    const menuRows = items.map(item => {
      const stockLabel = item.Stock_Quantity === 0
        ? '<span style="color:#c0392b;font-size:0.85rem;">Out of Stock</span>'
        : item.Stock_Quantity <= 5
          ? `<span style="color:#e67e22;font-size:0.85rem;">${item.Stock_Quantity} left</span>`
          : `<span style="color:#27ae60;font-size:0.85rem;">In Stock</span>`;
      return `
        <tr>
          <td>${escapeHtml(item.Name_of_Item)}</td>
          <td>$${Number(item.Price_of_Item).toFixed(2)}</td>
          <td>${stockLabel}</td>
          <td>${item.Stock_Quantity > 0
            ? `<form method="post" action="/gift-order/add-item" class="inline-form">
                <input type="hidden" name="item_id" value="${item.Gift_Shop_Item_ID}">
                <button class="button" type="submit" style="padding:0.3rem 0.8rem;">Add</button>
               </form>`
            : '<span style="color:#aaa;">Unavailable</span>'
          }</td>
        </tr>`;
    }).join('');

    const cartRows = cart.map(item => `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td>$${Number(item.price).toFixed(2)}</td>
        <td>${item.qty}</td>
        <td>$${(item.price * item.qty).toFixed(2)}</td>
        <td>
          <form method="post" action="/gift-order/remove-item" class="inline-form">
            <input type="hidden" name="item_id" value="${item.id}">
            <button class="link-button danger" type="submit">Remove</button>
          </form>
        </td>
      </tr>`).join('');

    res.send(renderPage({
      title: "New Gift Shop Order",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>New Gift Shop Order</h1>
        ${renderFlash(req)}
        <h2>Items</h2>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Price</th>
              <th>Stock</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${menuRows || '<tr><td colspan="4">No items available.</td></tr>'}</tbody>
        </table>
      </section>
      <section class="card narrow">
        <h2>Cart</h2>
        ${cart.length === 0
          ? '<p style="color:#888;">No items in cart yet.</p>'
          : `<table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th>Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>${cartRows}</tbody>
              <tfoot><tr><td colspan="3" style="text-align:right;font-weight:bold;">Total</td><td><strong>$${cartTotal.toFixed(2)}</strong></td><td></td></tr></tfoot>
             </table>
             <div style="display:flex;gap:1rem;margin-top:1rem;">
               <a class="button" href="/gift-order/checkout">Checkout</a>
               <form method="post" action="/gift-order/clear">
                 <button class="button button-secondary" type="submit">Clear Cart</button>
               </form>
             </div>`
        }
      </section>`
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
          <form method="post" action="/gift-order/checkout">
            <button class="button" type="submit">Confirm Order</button>
          </form>
          <a class="button button-secondary" href="/gift-order">Back to Cart</a>
        </div>
      </section>`
    }));
  }));

  app.post("/gift-order/add-item", requireLogin, allowRoles(["giftshop", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    const { item_id } = req.body;
    const [[item]] = await pool.query(
      "SELECT Gift_Shop_Item_ID, Name_of_Item, Price_of_Item, Stock_Quantity FROM Gift_Shop_Item WHERE Gift_Shop_Item_ID = ?",
      [item_id]
    );

    if (!item || item.Stock_Quantity <= 0) {
      setFlash(req, "Item is out of stock.");
      return res.redirect("/gift-order");
    }

    if (!req.session.giftCart) req.session.giftCart = [];
    const existing = req.session.giftCart.find(i => i.id == item_id);
    if (existing) {
      if (existing.qty >= item.Stock_Quantity) {
        setFlash(req, `Only ${item.Stock_Quantity} units available for "${escapeHtml(item.Name_of_Item)}".`);
        return res.redirect("/gift-order");
      }
      existing.qty++;
    } else {
      req.session.giftCart.push({ id: item_id, name: item.Name_of_Item, price: parseFloat(item.Price_of_Item), qty: 1 });
    }
    res.redirect("/gift-order");
  }));

  app.post("/gift-order/remove-item", requireLogin, allowRoles(["giftshop", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    req.session.giftCart = (req.session.giftCart || []).filter(i => i.id != req.body.item_id);
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
      setFlash(req, "Employee record not found. Please contact a supervisor.");
      return res.redirect("/gift-order");
    }

    for (const item of cart) {
      const [[stock]] = await pool.query("SELECT Stock_Quantity, Name_of_Item FROM Gift_Shop_Item WHERE Gift_Shop_Item_ID = ?", [item.id]);
      if (!stock || stock.Stock_Quantity < item.qty) {
        setFlash(req, `Not enough stock for "${stock?.Name_of_Item || 'item'}". Available: ${stock?.Stock_Quantity ?? 0}.`);
        return res.redirect("/gift-order/checkout");
      }
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

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
      setFlash(req, `Order #${saleId} completed! Total: $${orderTotal.toFixed(2)}`);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    res.redirect("/gift-order");
  }));

}

module.exports = { registerGiftShopRoutes };
