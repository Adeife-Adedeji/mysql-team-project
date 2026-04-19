USE museumdb;

-- gift shop and food shop inserts


-- gift shop items insert
INSERT INTO Gift_Shop_Item (Name_of_Item, Price_of_Item, Category, Stock_Quantity, Image_URL, Created_By, Created_At, Updated_By, Updated_AT) VALUES
('Museum Tote Bag', 24.99, 'Merchandise', 150, '/images/tote.jpg', 'system', CURDATE(), 'system', CURDATE()),
('Van Gogh Umbrella', 32.50, 'Apparel', 75, '/images/van-gogh-umbrella.jpg', 'system', CURDATE(), 'system', CURDATE()),
('Art History Coloring Book', 12.95, 'Books', 200, '/images/art-history-coloring-book.jpg', 'system', CURDATE(), 'system', CURDATE()),
('Museum Magnet Set', 8.99, 'Souvenirs', 300, '/images/magnet.jpg', 'system', CURDATE(), 'system', CURDATE()),
('Replica Ancient Coin', 45.00, 'Collectibles', 40, '/images/replica-ancient-coin.jpg', 'system', CURDATE(), 'system', CURDATE()),
('Kids Art Kit', 19.99, 'Toys', 120, '/images/kids-art-kit.jpg', 'system', CURDATE(), 'system', CURDATE()),
('Exhibition Catalog: SP 2026', 29.99, 'Books', 85, '/images/catalogue.jpg', 'system', CURDATE(), 'system', CURDATE()),
('Museum Logo Scarf', 39.99, 'Apparel', 60, '/images/scarf.jpg', 'system', CURDATE(), 'system', CURDATE());

-- food change
INSERT INTO Food (Food_Name, Type, Food_Price, Stock_Quantity, Image_URL, Created_By, Created_At, Updated_By, Updated_AT) VALUES
('Espresso', "Drink", 3.50, 100, '/images/espresso.jpg', 'system', CURDATE(), 'system', CURDATE()),
('Cappuccino', "Drink", 4.75, 100, '/images/cappuccino.jpg', 'system', CURDATE(), 'system', CURDATE()),
('Blueberry Muffin', "Snack", 3.25, 100, '/images/blueberry-muffin.jpg', 'system', CURDATE(), 'system', CURDATE()),
('Quiche Lorraine', "Food", 7.95, 100, '/images/quiche.jpg', 'system', CURDATE(), 'system', CURDATE()),
('Greek Salad', "Food", 9.50, 100, '/images/salad.jpg', 'system', CURDATE(), 'system', CURDATE()),
('Kids Lunch Box', "Food", 6.50, 100, '/images/pretzel.jpg', 'system', CURDATE(), 'system', CURDATE()),
('Bottled Water', "Drink", 2.00, 100, '/images/water.jpg', 'system', CURDATE(), 'system', CURDATE()),
('Chocolate Croissant', "Dessert", 4.00, 100, '/images/croissant.jpg', 'system', CURDATE(), 'system', CURDATE());

-- gift shop sale
INSERT INTO Gift_Shop_Sale (Sale_Date, Employee_ID, Created_By, Created_At, Updated_By, Updated_At) VALUES
('2026-04-15', 1, 'system', CURDATE(), 'system', NULL),
('2026-04-16', 1, 'system', CURDATE(), 'system', NULL),
('2026-04-17', 2, 'system', CURDATE(), 'system', NULL),
('2026-04-18', 3, 'system', CURDATE(), 'system', NULL),
('2026-04-19', 2, 'system', CURDATE(), 'system', NULL),
('2026-04-20', 3, 'system', CURDATE(), 'system', NULL);


-- gift shop sale line insert
INSERT INTO Gift_Shop_Sale_Line (Price_When_Item_is_Sold, Quantity, Total_Sum_For_Gift_Shop_Sale, Gift_Shop_Sale_ID, Gift_Shop_Item_ID, Created_By, Created_At, Updated_By, Updated_At) VALUES
(24.99, 2, 49.98, 1, 1, 'system', CURDATE(), 'system', NULL),
(12.95, 3, 38.85, 1, 3, 'system', CURDATE(), 'system', NULL),
(8.99, 5, 44.95, 2, 4, 'system', CURDATE(), 'system', NULL),
(45.00, 1, 45.00, 2, 5, 'system', CURDATE(), 'system', NULL),
(32.50, 1, 32.50, 3, 2, 'system', CURDATE(), 'system', NULL),
(19.99, 2, 39.98, 3, 6, 'system', CURDATE(), 'system', NULL),
(29.99, 1, 29.99, 4, 7, 'system', CURDATE(), 'system', NULL),
(39.99, 1, 39.99, 4, 8, 'system', CURDATE(), 'system', NULL),
(24.99, 1, 24.99, 5, 1, 'system', CURDATE(), 'system', NULL),
(12.95, 2, 25.90, 5, 3, 'system', CURDATE(), 'system', NULL),
(8.99, 3, 26.97, 6, 4, 'system', CURDATE(), 'system', NULL),
(19.99, 1, 19.99, 6, 6, 'system', CURDATE(), 'system', NULL);

-- food_sale insert
INSERT INTO Food_Sale (Sale_Date, Employee_ID, Created_By, Created_At, Updated_By, Updated_At) VALUES
('2026-04-15', 4, 'system', CURDATE(), 'system', CURDATE()),
('2026-04-16', 5, 'system', CURDATE(), 'system', CURDATE()),
('2026-04-17', 4, 'system', CURDATE(), 'system', CURDATE()),
('2026-04-18', 5, 'system', CURDATE(), 'system', CURDATE()),
('2026-04-19', 4, 'system', CURDATE(), 'system', CURDATE()),
('2026-04-20', 5, 'system', CURDATE(), 'system', CURDATE()),
('2026-04-21', 4, 'system', CURDATE(), 'system', CURDATE()),
('2026-04-22', 5, 'system', CURDATE(), 'system', CURDATE());

-- food_sale_line insert
INSERT INTO Food_Sale_Line (Price_When_Food_Was_Sold, Quantity, Food_Sale_ID, Food_ID, Created_By, Created_At, Updated_By, Updated_At) VALUES
(3.50, 2, 1, 1, 'system', CURDATE(), 'system', CURDATE()),
(4.75, 1, 1, 2, 'system', CURDATE(), 'system', CURDATE()),
(3.25, 3, 2, 3, 'system', CURDATE(), 'system', CURDATE()),
(7.95, 1, 2, 4, 'system', CURDATE(), 'system', CURDATE()),
(9.50, 1, 3, 5, 'system', CURDATE(), 'system', CURDATE()),
(6.50, 2, 3, 6, 'system', CURDATE(), 'system', CURDATE()),
(2.00, 4, 4, 7, 'system', CURDATE(), 'system', CURDATE()),
(4.00, 2, 4, 8, 'system', CURDATE(), 'system', CURDATE()),
(3.50, 1, 5, 1, 'system', CURDATE(), 'system', CURDATE()),
(4.75, 1, 5, 2, 'system', CURDATE(), 'system', CURDATE()),
(3.25, 2, 6, 3, 'system', CURDATE(), 'system', CURDATE()),
(7.95, 1, 6, 4, 'system', CURDATE(), 'system', CURDATE()),
(9.50, 2, 7, 5, 'system', CURDATE(), 'system', CURDATE()),
(2.00, 2, 7, 7, 'system', CURDATE(), 'system', CURDATE()),
(4.00, 1, 8, 8, 'system', CURDATE(), 'system', CURDATE());
