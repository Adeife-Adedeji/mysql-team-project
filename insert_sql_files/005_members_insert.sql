USE museumdb;

-- members and tickets insert

-- membership data insert
INSERT INTO Membership (Membership_ID, Last_Name, First_Name, Phone_Number, Email, Date_Joined, Date_Exited, Created_By, Created_At, Updated_By, Updated_AT) VALUES
(2, 'Smith', 'John', '2125551234', 'john.smith@email.com', '2025-01-15', NULL, 'system', CURDATE(), 'system', CURDATE()),
(3, 'Garcia', 'Maria', '3105555678', 'maria.garcia@email.com', '2025-02-20', NULL, 'system', CURDATE(), 'system', CURDATE()),
(4, 'Lee', 'David', '4155559012', 'david.lee@email.com', '2024-11-10', NULL, 'system', CURDATE(), 'system', CURDATE()),
(5, 'Williams', 'Sarah', '6175553456', 'sarah.williams@email.com', '2025-03-05', NULL, 'system', CURDATE(), 'system', CURDATE()),
(6, 'Brown', 'Michael', '2065557890', 'michael.brown@email.com', '2024-12-01', NULL, 'system', CURDATE(), 'system', CURDATE());



-- tickets
INSERT INTO Ticket (Purchase_type, Purchase_Date, Visit_Date, Last_Name, First_Name, Phone_number, Email, Payment_method, Membership_ID, Created_by, Created_at, Updated_by, Updated_at) VALUES
('Online', '2026-04-01', '2026-04-15', 'Smith', 'John', '2125551234', 'john.smith@email.com', 'Credit Card', 2, 'system', CURDATE(), 'system', CURDATE()),
('Walk-up', '2026-04-10', '2026-04-10', 'Garcia', 'Maria', '3105555678', 'maria.garcia@email.com', 'Cash', 3, 'system', CURDATE(), 'system', CURDATE()),
('Online', '2026-04-05', '2026-04-20', 'Lee', 'David', '4155559012', 'david.lee@email.com', 'Debit Card', 4, 'system', CURDATE(), 'system', CURDATE()),
('Walk-up', '2026-04-12', '2026-04-12', 'Williams', 'Sarah', '6175553456', 'sarah.williams@email.com', 'Credit Card', 5, 'system', CURDATE(), 'system', CURDATE()),
('Online', '2026-04-08', '2026-04-22', 'Brown', 'Michael', '2065557890', 'michael.brown@email.com', 'PayPal', 6, 'system', CURDATE(), 'system', CURDATE()),
('Online', '2026-04-15', '2026-05-01', 'Johnson', 'Emily', '4045551111', 'emily.j@email.com', 'Credit Card', NULL, 'system', CURDATE(), 'system', CURDATE()),
('Walk-up', '2026-04-18', '2026-04-18', 'Martinez', 'Carlos', '5125552222', 'carlos.m@email.com', 'Cash', NULL, 'system', CURDATE(), 'system', CURDATE()),
('Online', '2026-04-20', '2026-04-30', 'Taylor', 'Lisa', '3035553333', 'lisa.t@email.com', 'Credit Card', 2, 'system', CURDATE(), 'system', CURDATE());

-- ticket line
INSERT INTO ticket_line (Ticket_Type, Quantity, Price_per_ticket, Ticket_ID, Exhibition_ID, Created_by, Created_at, Updated_by, Updated_at) VALUES
('Adult', 2, 25.00, 1, 1, 'system', CURDATE(), 'system', CURDATE()),
('Child', 1, 15.00, 1, 1, 'system', CURDATE(), 'system', CURDATE()),
('Senior', 1, 20.00, 2, 2, 'system', CURDATE(), 'system', CURDATE()),
('Adult', 1, 25.00, 3, 1, 'system', CURDATE(), 'system', CURDATE()),
('Member', 1, 0.00, 4, 2, 'system', CURDATE(), 'system', CURDATE()),
('Adult', 2, 25.00, 5, 1, 'system', CURDATE(), 'system', CURDATE()),
('Student', 1, 18.00, 6, 2, 'system', CURDATE(), 'system', CURDATE()),
('Adult', 1, 25.00, 6, 2, 'system', CURDATE(), 'system', CURDATE()),
('Child', 2, 15.00, 7, 1, 'system', CURDATE(), 'system', CURDATE()),
('Senior', 1, 20.00, 8, 2, 'system', CURDATE(), 'system', CURDATE());
