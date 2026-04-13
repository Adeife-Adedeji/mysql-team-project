USE museumdb;

-- made a different file for institutions that are loaned to us

-- institution(partner museums insert)
INSERT INTO Institution (Institution_Name, Contact_Name, Contact_Email, Contact_Phone, City, Country, Created_By, Created_At, Updated_By, Updated_At) VALUES
('Louvre Museum', 'Jean Dupont', 'jean.dupont@louvre.fr', '+33140205050', 'Paris', 'France', 'system', CURDATE(), 'system', CURDATE()),
('Metropolitan Museum of Art', 'Sarah Johnson', 'sjohnson@metmuseum.org', '+12125705500', 'New York', 'USA', 'system', CURDATE(), 'system', CURDATE()),
('Rijksmuseum', 'Pieter van der Berg', 'p.vanderberg@rijksmuseum.nl', '+31206747000', 'Amsterdam', 'Netherlands', 'system', CURDATE(), 'system', CURDATE()),
('British Museum', 'Emma Thompson', 'e.thompson@britishmuseum.org', '+442073238000', 'London', 'UK', 'system', CURDATE(), 'system', CURDATE()),
('Uffizi Gallery', 'Lorenzo Bianchi', 'l.bianchi@uffizi.it', '+39055238600', 'Florence', 'Italy', 'system', CURDATE(), 'system', CURDATE()),
('Prado Museum', 'Maria Garcia', 'm.garcia@museodelprado.es', '+34913302800', 'Madrid', 'Spain', 'system', CURDATE(), 'system', CURDATE());

-- artwork loan insert
INSERT INTO Artwork_Loan (Artwork_ID, Institution_ID, Loan_Type, Start_Date, End_Date, Insurance_Value, Status, Approved_By, Notes, Created_By, Created_At, Updated_By, Updated_At) VALUES
(4, 1, 'Outgoing', '2026-01-15', '2026-04-15', 50000.00, 'Returned', 1, 'Loan to Louvre for special exhibition', 'system', CURDATE(), 'system', CURDATE()),
(5, 2, 'Outgoing', '2026-02-01', '2026-05-01', 75000.00, 'Active', 2, 'On loan to Met for drawing show', 'system', CURDATE(), 'system', CURDATE()),
(9, 3, 'Outgoing', '2026-03-01', '2026-06-30', 120000.00, 'Active', 3, 'Van Gogh works to Rijksmuseum', 'system', CURDATE(), 'system', CURDATE()),
(11, 4, 'Incoming', '2026-04-01', '2026-07-31', 90000.00, 'Active', 4, 'Loan from British Museum for summer exhibition', 'system', CURDATE(), 'system', CURDATE()),
(12, 5, 'Incoming', '2026-05-01', '2026-08-31', 45000.00, 'Active', 5, 'Danish painting loan from Uffizi', 'system', CURDATE(), 'system', CURDATE()),
(7, 6, 'Outgoing', '2026-01-10', '2026-03-10', 60000.00, 'Returned', 6, 'Temporary loan to Prado', 'system', CURDATE(), 'system', CURDATE());
