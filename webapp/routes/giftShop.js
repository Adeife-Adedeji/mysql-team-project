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

function registerGiftShopRoutes(app, { pool }) {

  app.get("/add-item", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const [items] = await pool.query(
      "SELECT Gift_Shop_Item_ID, Name_of_Item, Price_of_Item, Stock_Quantity FROM Gift_Shop_Item",
    );

   let editItem = null;
  if (req.query.edit_id) {
    const [rows] = await pool.query(
      "SELECT * FROM Gift_Shop_Item WHERE Gift_Shop_Item_ID = ?",
      [req.query.edit_id],
    );
    editItem = rows[0] || null;
  }

    const itemRows = items.map((item) => `
      <tr>
        <td>${item.Gift_Shop_Item_ID}</td>
        <td>${escapeHtml(item.Name_of_Item)}</td>
        <td>$${Number(item.Price_of_Item).toFixed(2)}</td>
        <td>${item.Stock_Quantity}</td>
        <td>${item.Stock_Quantity > 5 ? "Available" : item.Stock_Quantity > 0 ? "Low Stock" : "Out of Stock"}</td>
        <td class="actions">
            <form method="get" action="/add-item" class="inline-form">
            <input type="hidden" name="edit_id" value="${item.Gift_Shop_Item_ID}">
            <button class="link-button" type="submit">Edit</button>
          </form>
          <form method="post" action="/delete-item" class="inline-form" onsubmit="return confirm('Remove this item?');">
            <input type="hidden" name="item_id" value="${item.Gift_Shop_Item_ID}">
            <button class="link-button danger" type="submit">Delete</button>
          </form>
        </td>
      </tr>
    `).join("");

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
          <label>Price
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

  app.post("/add-item", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
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

    await pool.query("DELETE FROM Gift_Shop_Item WHERE Gift_Shop_Item_ID = ?", [idToDelete]);
    setFlash(req, "Item removed.");
    res.redirect("/add-item");
  }));

  app.get("/add-sale", requireLogin, allowRoles(["giftshop", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    const [sales] = await pool.query("SELECT Gift_Shop_Sale_ID, Sale_Date, Employee_ID FROM Gift_Shop_Sale");
    let editSale = null;

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
        <form method="get" action="/add-sale" class="inline-form">
          <input type="hidden" name="edit_id" value="${sale.Gift_Shop_Sale_ID}">
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
          <thead><tr><th>ID</th><th>Date</th><th>Employee ID</th><th>Actions</th></tr></thead>
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
    return res.redirect("/add-sale");
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
    await pool.query(
      "INSERT INTO Gift_Shop_Sale (Sale_Date, Employee_ID) VALUES (?, ?)",
      [saleDate, employeeId],
    );
    setFlash(req, "Sale created. Now add items to it.");
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

  app.get("/add-sale-line", requireLogin, allowRoles(["giftshop", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    const [sales] = await pool.query("SELECT Gift_Shop_Sale_ID FROM Gift_Shop_Sale");
    const [items] = await pool.query("SELECT Gift_Shop_Item_ID, Name_of_Item, Price_of_Item FROM Gift_Shop_Item");
    const [lines] = await pool.query(`
      SELECT gsl.Gift_Shop_Sale_ID, gsl.Gift_Shop_Item_ID, i.Name_of_Item, gsl.Quantity, gsl.Price_When_Item_is_Sold, gsl.Total_Sum_For_Gift_Shop_Sale
      FROM Gift_Shop_Sale_Line gsl
      JOIN Gift_Shop_Item i ON gsl.Gift_Shop_Item_ID = i.Gift_Shop_Item_ID
    `);

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
        <form method="post" action="/add-sale-line" class="form-grid">
        ${editLine ? `
            <input type="hidden" name="original_item" value="${editLine.Gift_Shop_Item_ID}">
          ` : ""}
          <label>Sale
            <select name="sale_id">
              ${sales.map((sale) => `<option value="${sale.Gift_Shop_Sale_ID}">Sale #${sale.Gift_Shop_Sale_ID}</option>`).join("")}
            </select>
          </label>
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
      </section>
      <section class="card narrow">
        <h2>Items in Sales</h2>
        <table>
          <thead><tr><th>Sale ID</th><th>Item</th><th>Qty</th><th>Price</th><th>Total</th><th>Actions</th></tr></thead>
          <tbody>${lineRows || '<tr><td colspan="6">No items found.</td></tr>'}</tbody>
        </table>
      </section>
    `,
    }));
  }));

  app.post("/add-sale-line", requireLogin, allowRoles(["giftshop", "supervisor", "employee"]), asyncHandler(async (req, res) => {
    const { sale_id: saleId, item_id: itemId, quantity, original_item } = req.body;

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
    await pool.query(
      `INSERT INTO Gift_Shop_Sale_Line
       (Gift_Shop_Sale_ID, Gift_Shop_Item_ID, Quantity, Price_When_Item_is_Sold, Total_Sum_For_Gift_Shop_Sale)
       VALUES (?, ?, ?, ?, ?)`,
      [saleId, itemId, quantity, price, total],
    );
    setFlash(req, "Item added to sale.");
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
}

module.exports = { registerGiftShopRoutes };
