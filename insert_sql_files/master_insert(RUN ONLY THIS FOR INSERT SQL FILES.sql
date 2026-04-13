USE museumdb;

SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;

-- 1. ARTISTS
INSERT INTO artist (Artist_Name, Date_of_Birth, Date_of_Death, Birth_Place) VALUES
('Hans von Aachen',               '1552-01-01', '1615-03-04', 'Köln'),
('Carl Frederik Aagaard',         '1833-01-29', '1895-11-02', 'Odense'),
('Giulio Clovio',                 '1498-01-01', '1578-01-05', 'Grizane'),
('Giovanni di Balduccio',         '1290-01-01',  '1365-01-01', 'Pisa'),
('Albrecht Dürer',                '1471-05-21', '1528-04-06', 'Nürnberg'),
('Johann Paul Egell',             '1691-04-09', '1752-01-10', 'Mannheim'),
('John Henry Fuseli',             '1741-02-07', '1825-04-16', 'Zurich'),
('Vincent van Gogh',              '1853-03-30', '1890-07-29', 'Groot Zundert'),
('Jean-Auguste-Dominique Ingres', '1780-08-29', '1867-01-14', 'Montauban'),
('Jacopo da Empoli',              '1551-04-30', '1640-09-30', 'Firenze'),
('Friedrich Kerseboom',           '1632-01-01', '1693-01-01', 'Solingen'),
('Nicolas Lancret',               '1690-01-22', '1743-09-14', 'Paris'),
('Claude Monet',                  '1840-01-01', '1926-01-01', 'Paris');

-- 2. DEPARTMENTS
INSERT INTO Department (Department_Name, Manager_ID, Created_By, Created_At, Updated_By, Updated_AT) VALUES 
('Curatorial', NULL, 'system', CURDATE(), 'system', CURDATE()),
('Conservation', NULL, 'system', CURDATE(), 'system', CURDATE()),
('Exhibition Design', NULL, 'system', CURDATE(), 'system', CURDATE()),
('Visitor Services', NULL, 'system', CURDATE(), 'system', CURDATE()),
('Education', NULL, 'system', CURDATE(), 'system', CURDATE()),
('Marketing', NULL, 'system', CURDATE(), 'system', CURDATE());

-- 3. EMPLOYEES
INSERT INTO Employee (Last_Name, First_Name, Date_Hired, Email, Employee_Address, Date_of_Birth, Salary, Employee_Role, Department_ID, Created_By, Created_At) VALUES
-- Curatorial (Department_ID = 1, IDs 1-5)
('Chen', 'Wei', '2020-03-15', 'wei.chen@museum.org', '123 Museum Ave, NY', '1975-06-10', 85000.00, 'Chief Curator', 1, 'system', CURDATE()),
('Rodriguez', 'Elena', '2021-07-22', 'elena.rodriguez@museum.org', '456 Gallery St, NY', '1982-11-03', 72000.00, 'Associate Curator', 1, 'system', CURDATE()),
('Thompson', 'James', '2019-11-01', 'james.thompson@museum.org', '789 Art Ln, NY', '1978-02-18', 68000.00, 'Assistant Curator', 1, 'system', CURDATE()),
('Okonkwo', 'Chiamaka', '2022-01-10', 'chiamaka.okonkwo@museum.org', '321 Heritage Dr, NY', '1985-09-25', 65000.00, 'Curatorial Assistant', 1, 'system', CURDATE()),
('Kowalski', 'Anna', '2018-06-30', 'anna.kowalski@museum.org', '654 Research Blvd, NY', '1970-12-01', 95000.00, 'Senior Curator', 1, 'system', CURDATE()),
-- Conservation (Department_ID = 2, IDs 6-10)
('Martinez', 'Carlos', '2017-09-12', 'carlos.martinez@museum.org', '147 Restoration Rd, NY', '1968-04-22', 78000.00, 'Head Conservator', 2, 'system', CURDATE()),
('Dubois', 'Sophie', '2020-05-18', 'sophie.dubois@museum.org', '258 Preserve Ln, NY', '1980-07-14', 67000.00, 'Painting Cons', 2, 'system', CURDATE()),
('Yamamoto', 'Kenji', '2021-11-03', 'kenji.yamamoto@museum.org', '369 Art Care Ave, NY', '1977-03-09', 64000.00, 'Paper Conservator', 2, 'system', CURDATE()),
('Patel', 'Priya', '2019-04-25', 'priya.patel@museum.org', '741 Science Ct, NJ', '1988-08-30', 62000.00, 'Preventive Cons', 2, 'system', CURDATE()),
('Williams', 'Michael', '2016-12-01', 'michael.williams@museum.org', '852 Treatment Way, NJ', '1965-05-17', 82000.00, 'Sr Objects Cons', 2, 'system', CURDATE()),
-- Exhibition Design (Department_ID = 3, IDs 11-15)
('Lopez', 'Isabella', '2019-08-20', 'isabella.lopez@museum.org', '963 Design Pl, NY', '1981-01-26', 75000.00, 'Lead Exhibit Des', 3, 'system', CURDATE()),
('Nguyen', 'Thomas', '2020-10-14', 'thomas.nguyen@museum.org', '159 Exhibit Ave, NY', '1984-09-12', 68000.00, 'Exhibition Designer', 3, 'system', CURDATE()),
('Smith', 'Laura', '2021-02-28', 'laura.smith@museum.org', '357 Gallery Row, NY', '1990-11-05', 59000.00, 'Junior Designer', 3, 'system', CURDATE()),
('Garcia', 'Javier', '2018-07-07', 'javier.garcia@museum.org', '753 Installation St, NY', '1979-06-19', 71000.00, 'Lighting Designer', 3, 'system', CURDATE()),
('Lee', 'Hannah', '2017-03-19', 'hannah.lee@museum.org', '852 Mounting Dr, NY', '1972-10-28', 80000.00, 'Production Mgr', 3, 'system', CURDATE()),
-- Visitor Services (Department_ID = 4, IDs 16-21)
('Brown', 'David', '2022-06-01', 'david.brown@museum.org', '963 Welcome Blvd, NY', '1992-07-30', 48000.00, 'Visitor Svcs Mgr', 4, 'system', CURDATE()),
('Taylor', 'Jessica', '2021-09-15', 'jessica.taylor@museum.org', '147 Ticket Ln, NY', '1995-02-14', 42000.00, 'Front Desk Sup', 4, 'system', CURDATE()),
('Wilson', 'Kevin', '2020-12-10', 'kevin.wilson@museum.org', '258 Guest St, NY', '1988-12-05', 38000.00, 'Guest Svcs Assoc', 4, 'system', CURDATE()),
('Anderson', 'Maria', '2019-10-22', 'maria.anderson@museum.org', '369 Info Way, NY', '1985-03-22', 45000.00, 'Membership Coor', 4, 'system', CURDATE()),
('Thomas', 'Robert', '2018-04-05', 'robert.thomas@museum.org', '741 Hospitality Ave, NY', '1976-09-11', 52000.00, 'Group Sales Coord', 4, 'system', CURDATE()),
('Jackson', 'Linda', '2023-01-17', 'linda.jackson@museum.org', '852 Concierge Ct, NY', '1998-05-02', 36000.00, 'Welcome Ambass', 4, 'system', CURDATE()),
-- Education (Department_ID = 5, IDs 22-27)
('White', 'Patricia', '2016-11-11', 'patricia.white@museum.org', '963 Learning Ln, NY', '1969-08-19', 72000.00, 'Dir of Education', 5, 'system', CURDATE()),
('Harris', 'Christopher', '2019-05-30', 'christopher.harris@museum.org', '147 Teach St, NY', '1983-04-07', 58000.00, 'School Prog Mgr', 5, 'system', CURDATE()),
('Martin', 'Amanda', '2020-08-26', 'amanda.martin@museum.org', '258 Family Ave, NY', '1987-10-15', 54000.00, 'Family Prog Coord', 5, 'system', CURDATE()),
('Robinson', 'Daniel', '2021-12-13', 'daniel.robinson@museum.org', '369 Outreach Dr, NY', '1991-01-23', 51000.00, 'Community Engage', 5, 'system', CURDATE()),
('Clark', 'Sarah', '2018-09-04', 'sarah.clark@museum.org', '741 Youth Pl, NY', '1974-06-29', 67000.00, 'Teen Prog Lead', 5, 'system', CURDATE()),
('Lewis', 'Brandon', '2022-04-19', 'brandon.lewis@museum.org', '852 Lecture Hall Rd, NY', '1994-11-17', 46000.00, 'Education Asst', 5, 'system', CURDATE()),
-- Marketing (Department_ID = 6, IDs 28-33)
('Walker', 'Nancy', '2017-02-14', 'nancy.walker@museum.org', '963 Brand Blvd, NY', '1971-12-03', 88000.00, 'Marketing Dir', 6, 'system', CURDATE()),
('Hall', 'Gregory', '2019-09-09', 'gregory.hall@museum.org', '147 Social Ln, NY', '1986-05-26', 65000.00, 'Social Media Mgr', 6, 'system', CURDATE()),
('Allen', 'Rebecca', '2020-11-01', 'rebecca.allen@museum.org', '258 PR Way, NY', '1989-07-18', 60000.00, 'PR Specialist', 6, 'system', CURDATE()),
('Young', 'Jason', '2018-06-22', 'jason.young@museum.org', '369 Digital Ave, NY', '1982-09-09', 72000.00, 'Digital Mktg Mgr', 6, 'system', CURDATE()),
('King', 'Michelle', '2021-03-17', 'michelle.king@museum.org', '741 Content Dr, NY', '1993-02-28', 55000.00, 'Content Creator', 6, 'system', CURDATE()),
('Scott', 'Brian', '2022-08-08', 'brian.scott@museum.org', '852 Analytics St, NY', '1990-12-12', 49000.00, 'Marketing Coord', 6, 'system', CURDATE());

-- 4. UPDATE DEPARTMENT MANAGERS
UPDATE Department SET Manager_ID = 1 WHERE Department_ID = 1;
UPDATE Department SET Manager_ID = 6 WHERE Department_ID = 2;
UPDATE Department SET Manager_ID = 11 WHERE Department_ID = 3;
UPDATE Department SET Manager_ID = 16 WHERE Department_ID = 4;
UPDATE Department SET Manager_ID = 22 WHERE Department_ID = 5;
UPDATE Department SET Manager_ID = 28 WHERE Department_ID = 6;

-- 5. ARTWORKS
INSERT INTO Artwork (Title, Type, Date_Created, Time_Period, Art_Style, Artist_ID, Created_By, Created_At)
SELECT tmp.Title, tmp.Type, tmp.Date_Created, tmp.Time_Period, tmp.Art_Style, a.Artist_ID, 'catalog_import', CURDATE()
FROM (
    SELECT 'Allegory' AS Title, 'painting' AS Type, '1598-01-01' AS Date_Created, '1601-1650' AS Time_Period, NULL AS Art_Style, 'Hans von Aachen' AS Artist_Name
    UNION ALL
    SELECT 'The Rose Garden', 'painting', '1877-01-01', '1851-1900', NULL, 'Carl Frederik Aagaard'
    UNION ALL
    SELECT 'The Farnese Hours', 'illumination', '1537-04-01', '1501-1550', NULL, 'Giulio Clovio'
    UNION ALL
    SELECT 'St Peter Martyr: Reburial', 'sculpture', '1335-01-01', '1301-1350', NULL, 'Giovanni di Balduccio'
    UNION ALL
    SELECT 'Female Head Type 7', 'graphics', '1528-01-01', '1501-1550', NULL, 'Albrecht Dürer'
    UNION ALL
    SELECT 'Deposition', 'sculpture', '1740-01-01', '1701-1750', NULL, 'Johann Paul Egell'
    UNION ALL
    SELECT 'Leonore Discovers Dagger', 'painting', '1795-01-01', '1751-1800', NULL, 'John Henry Fuseli'
    UNION ALL
    SELECT 'La Roubine du Roi', 'graphics', '1888-06-01', '1851-1900', NULL, 'Vincent van Gogh'
    UNION ALL
    SELECT 'The Birth of the Last Muse', 'graphics', '1856-01-01', '1801-1850', NULL, 'Jean-Auguste-Dominique Ingres'
    UNION ALL
    SELECT 'Deposition', 'painting', NULL, '1551-1600', NULL, 'Jacopo da Empoli'
    UNION ALL
    SELECT 'Portrait of Sir John Langham', 'painting', '1683-01-01', '1651-1700', NULL, 'Friedrich Kerseboom'
    UNION ALL
    SELECT 'Billiard Players', 'painting', NULL, '1701-1750', NULL, 'Nicolas Lancret'
) tmp
JOIN Artist a ON a.Artist_Name = tmp.Artist_Name;

-- 6. ARTWORK CONDITION REPORTS (Inspector_ID 6-10 are Conservation employees)
INSERT INTO Artwork_Condition_Report (Artwork_ID, Condition_Status, Report_Date, Inspector_ID, Restoration_Required, Notes, Created_By, Created_At, Updated_By, Updated_At) VALUES
(1, 'Excellent', '2026-01-10', 6, FALSE, 'No issues; stable', 'system', CURDATE(), 'system', CURDATE()),
(2, 'Good', '2026-01-15', 7, FALSE, 'Minor surface dust', 'system', CURDATE(), 'system', CURDATE()),
(3, 'Fair', '2026-02-01', 8, FALSE, 'Slight fading on edges', 'system', CURDATE(), 'system', CURDATE()),
(4, 'Poor', '2026-02-20', 9, TRUE, 'Cracked marble; restoration needed', 'system', CURDATE(), 'system', CURDATE()),
(5, 'Critical', '2026-03-05', 10, TRUE, 'Severe paper discoloration and tears', 'system', CURDATE(), 'system', CURDATE()),
(6, 'Good', '2026-03-12', 6, FALSE, 'Stable; minor scratches', 'system', CURDATE(), 'system', CURDATE()),
(7, 'Excellent', '2026-03-18', 7, FALSE, 'Well preserved', 'system', CURDATE(), 'system', CURDATE()),
(8, 'Fair', '2026-04-01', 8, FALSE, 'Some ink bleeding', 'system', CURDATE(), 'system', CURDATE()),
(9, 'Good', '2026-04-05', 9, FALSE, 'Stable condition', 'system', CURDATE(), 'system', CURDATE()),
(10, 'Poor', '2026-04-08', 10, TRUE, 'Paint flaking; requires conservation', 'system', CURDATE(), 'system', CURDATE()),
(11, 'Excellent', '2026-04-10', 6, FALSE, 'Like new', 'system', CURDATE(), 'system', CURDATE()),
(12, 'Good', '2026-04-12', 7, FALSE, 'Minor wear', 'system', CURDATE(), 'system', CURDATE());

-- 7. EXHIBITIONS
INSERT INTO Exhibition (Exhibition_Name, Starting_Date, Ending_Date) VALUES 
('Spring Collection 2026', CURDATE(), '2026-05-12'),
('Summer Showcase 2026', '2026-06-12', '2026-08-14');

-- 8. EXHIBITION ARTWORKS
INSERT INTO Exhibition_Artwork (Display_Room, Date_Installed, Exhibition_ID, Artwork_ID, Created_By, Created_At)
SELECT 'Main Gallery', CURDATE(), (SELECT Exhibition_ID FROM Exhibition WHERE Exhibition_Name = 'Spring Collection 2026'), a.Artwork_ID, 'exhibition_planner', CURDATE()
FROM Artwork a JOIN Artist ar ON a.Artist_ID = ar.Artist_ID
WHERE ar.Artist_Name IN ('Hans von Aachen', 'Carl Frederik Aagaard', 'Giulio Clovio', 'Giovanni di Balduccio', 'Albrecht Dürer', 'Johann Paul Egell');

INSERT INTO Exhibition_Artwork (Display_Room, Date_Installed, Exhibition_ID, Artwork_ID, Created_By, Created_At)
SELECT 'East Wing', CURDATE(), (SELECT Exhibition_ID FROM Exhibition WHERE Exhibition_Name = 'Summer Showcase 2026'), a.Artwork_ID, 'exhibition_planner', CURDATE()
FROM Artwork a JOIN Artist ar ON a.Artist_ID = ar.Artist_ID
WHERE ar.Artist_Name IN ('John Henry Fuseli', 'Vincent van Gogh', 'Jean-Auguste-Dominique Ingres', 'Jacopo da Empoli', 'Friedrich Kerseboom', 'Nicolas Lancret');

-- 9. SCHEDULE (Employee Shifts)
INSERT INTO Schedule (Shift_Date, Start_Time, End_Time, Employee_ID, Exhibition_ID, Duty, Created_By, Created_At, Updated_By, Updated_At) VALUES
('2026-04-15', '09:00:00', '17:00:00', 16, 1, 'Supervisor', 'system', CURDATE(), 'system', CURDATE()),
('2026-04-15', '10:00:00', '18:00:00', 17, 1, 'Gallery Attendant', 'system', CURDATE(), 'system', CURDATE()),
('2026-04-16', '09:00:00', '17:00:00', 18, 1, 'Security', 'system', CURDATE(), 'system', CURDATE()),
('2026-04-16', '12:00:00', '20:00:00', 19, 1, 'Guide', 'system', CURDATE(), 'system', CURDATE()),
('2026-06-12', '09:00:00', '17:00:00', 16, 2, 'Supervisor', 'system', CURDATE(), 'system', CURDATE()),
('2026-06-12', '10:00:00', '18:00:00', 17, 2, 'Gallery Attendant', 'system', CURDATE(), 'system', CURDATE()),
('2026-06-13', '09:00:00', '17:00:00', 18, 2, 'Security', 'system', CURDATE(), 'system', CURDATE()),
('2026-06-13', '11:00:00', '19:00:00', 19, 2, 'Guide', 'system', CURDATE(), 'system', CURDATE()),
('2026-04-20', '09:00:00', '17:00:00', 20, 1, 'Janitor', 'system', CURDATE(), 'system', CURDATE()),
('2026-04-21', '09:00:00', '17:00:00', 21, 1, 'Maintenance', 'system', CURDATE(), 'system', CURDATE());

-- 10. EVENTS
INSERT INTO Event (event_Name, start_Date, end_Date, member_only, coordinator_ID, created_by, created_at, updated_by, updated_at, Max_capacity) VALUES
('Spring Exhibition Opening Gala', '2026-04-15', '2026-04-15', FALSE, 22, 'system', CURDATE(), 'system', CURDATE(), 200),
('Art History: Renaissance', '2026-04-22', '2026-04-22', FALSE, 23, 'system', CURDATE(), 'system', CURDATE(), 80),
('Members-Only: Summer Showcase', '2026-06-10', '2026-06-10', TRUE, 22, 'system', CURDATE(), 'system', CURDATE(), 150),
('Family Art Workshop', '2026-04-25', '2026-04-25', FALSE, 24, 'system', CURDATE(), 'system', CURDATE(), 30),
('Curator Special: Van Gogh', '2026-05-05', '2026-05-05', FALSE, 1, 'system', CURDATE(), 'system', CURDATE(), 60),
('Evening Jazz & Art', '2026-05-15', '2026-05-15', FALSE, 25, 'system', CURDATE(), 'system', CURDATE(), 120),
('Summer Solstice Celebration', '2026-06-20', '2026-06-20', FALSE, 26, 'system', CURDATE(), 'system', CURDATE(), 250),
('Conservation Workshop', '2026-07-10', '2026-07-12', FALSE, 6, 'system', CURDATE(), 'system', CURDATE(), 25);

-- 11. MEMBERSHIPS
INSERT INTO Membership (Membership_ID, Last_Name, First_Name, Phone_Number, Email, Date_Joined, Date_Exited, Created_By, Created_At, Updated_By, Updated_AT) VALUES
(2, 'Smith', 'John', '2125551234', 'john.smith@email.com', '2025-01-15', NULL, 'system', CURDATE(), 'system', CURDATE()),
(3, 'Garcia', 'Maria', '3105555678', 'maria.garcia@email.com', '2025-02-20', NULL, 'system', CURDATE(), 'system', CURDATE()),
(4, 'Lee', 'David', '4155559012', 'david.lee@email.com', '2024-11-10', NULL, 'system', CURDATE(), 'system', CURDATE()),
(5, 'Williams', 'Sarah', '6175553456', 'sarah.williams@email.com', '2025-03-05', NULL, 'system', CURDATE(), 'system', CURDATE()),
(6, 'Brown', 'Michael', '2065557890', 'michael.brown@email.com', '2024-12-01', NULL, 'system', CURDATE(), 'system', CURDATE());

-- 12. TICKETS
INSERT INTO Ticket (Purchase_type, Purchase_Date, Visit_Date, Last_Name, First_Name, Phone_number, Email, Payment_method, Membership_ID, Created_by, Created_at, Updated_by, Updated_at) VALUES
('Online', '2026-04-01', '2026-04-15', 'Smith', 'John', '2125551234', 'john.smith@email.com', 'Credit Card', 2, 'system', CURDATE(), 'system', CURDATE()),
('Walk-up', '2026-04-10', '2026-04-10', 'Garcia', 'Maria', '3105555678', 'maria.garcia@email.com', 'Cash', 3, 'system', CURDATE(), 'system', CURDATE()),
('Online', '2026-04-05', '2026-04-20', 'Lee', 'David', '4155559012', 'david.lee@email.com', 'Debit Card', 4, 'system', CURDATE(), 'system', CURDATE()),
('Walk-up', '2026-04-12', '2026-04-12', 'Williams', 'Sarah', '6175553456', 'sarah.williams@email.com', 'Credit Card', 5, 'system', CURDATE(), 'system', CURDATE()),
('Online', '2026-04-08', '2026-04-22', 'Brown', 'Michael', '2065557890', 'michael.brown@email.com', 'PayPal', 6, 'system', CURDATE(), 'system', CURDATE()),
('Online', '2026-04-15', '2026-05-01', 'Johnson', 'Emily', '4045551111', 'emily.j@email.com', 'Credit Card', NULL, 'system', CURDATE(), 'system', CURDATE()),
('Walk-up', '2026-04-18', '2026-04-18', 'Martinez', 'Carlos', '5125552222', 'carlos.m@email.com', 'Cash', NULL, 'system', CURDATE(), 'system', CURDATE()),
('Online', '2026-04-20', '2026-04-30', 'Taylor', 'Lisa', '3035553333', 'lisa.t@email.com', 'Credit Card', 2, 'system', CURDATE(), 'system', CURDATE());

-- 13. TICKET LINES
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

-- 14. EVENT REGISTRATION
INSERT INTO event_registration (Registration_Date, Event_ID, Membership_ID, Ticket_ID, Created_By, Created_At, Updated_By, Updated_At) VALUES
('2026-04-01', 1, 2, 1, 'system', CURDATE(), 'system', CURDATE()),
('2026-04-01', 1, 3, 2, 'system', CURDATE(), 'system', CURDATE()),
('2026-04-02', 5, 4, 3, 'system', CURDATE(), 'system', CURDATE()),
('2026-04-05', 2, 5, 4, 'system', CURDATE(), 'system', CURDATE()),
('2026-04-10', 5, 3, 6, 'system', CURDATE(), 'system', CURDATE()),
('2026-04-12', 5, 2, 7, 'system', CURDATE(), 'system', CURDATE()),
('2026-04-15', 7, 6, 5, 'system', CURDATE(), 'system', CURDATE()),
('2026-04-18', 8, 3, 8, 'system', CURDATE(), 'system', CURDATE()),
('2026-04-20', 3, 3, 2, 'system', CURDATE(), 'system', CURDATE()),
('2026-05-01', 6, 4, 3, 'system', CURDATE(), 'system', CURDATE());

-- 15. TOURS
INSERT INTO Tour (Tour_Name, Tour_Date, Start_Time, End_Time, Max_Capacity, Guide_ID, Exhibition_ID, Language, Created_By, Created_At, Updated_By, Updated_At) VALUES
('Renaissance Masterpieces Tour', '2026-04-16', '10:00:00', '11:30:00', 20, 19, 1, 'English', 'system', CURDATE(), 'system', CURDATE()),
('Spring Exhibition Highlights', '2026-04-17', '14:00:00', '15:30:00', 15, 19, 1, 'English', 'system', CURDATE(), 'system', CURDATE()),
('Family Discovery Tour', '2026-04-18', '11:00:00', '12:00:00', 10, 19, 2, 'English', 'system', CURDATE(), 'system', CURDATE()),
('Van Gogh & Friends', '2026-04-20', '13:00:00', '14:30:00', 20, 19, 2, 'English', 'system', CURDATE(), 'system', CURDATE()),
('Summer Showcase Preview', '2026-06-12', '10:30:00', '12:00:00', 25, 19, 2, 'English', 'system', CURDATE(), 'system', CURDATE()),
('Spanish Art Highlights', '2026-06-15', '15:00:00', '16:30:00', 15, 19, 2, 'Spanish', 'system', CURDATE(), 'system', CURDATE()),
('Behind the Scenes Conservation', '2026-07-05', '11:00:00', '12:30:00', 30, 19, 2, 'English', 'system', CURDATE(), 'system', CURDATE()),
('Sunday Morning Classics', '2026-04-23', '09:30:00', '11:00:00', 20, 19, 1, 'English', 'system', CURDATE(), 'system', CURDATE());

-- 16. TOUR REGISTRATION
INSERT INTO Tour_Registration (Tour_ID, Membership_ID, Registration_Date, Created_By, Created_At) VALUES
(1, 2, '2026-04-01', 'system', CURDATE()),
(1, 3, '2026-04-02', 'system', CURDATE()),
(1, 4, '2026-04-03', 'system', CURDATE()),
(2, 5, '2026-04-05', 'system', CURDATE()),
(2, 6, '2026-04-06', 'system', CURDATE()),
(3, 2, '2026-04-08', 'system', CURDATE()),
(4, 3, '2026-04-10', 'system', CURDATE()),
(4, 4, '2026-04-11', 'system', CURDATE()),
(4, 5, '2026-04-12', 'system', CURDATE()),
(8, 6, '2026-05-15', 'system', CURDATE()),
(7, 2, '2026-05-20', 'system', CURDATE()),
(5, 3, '2026-06-01', 'system', CURDATE()),
(6, 4, '2026-04-15', 'system', CURDATE()),
(5, 5, '2026-04-16', 'system', CURDATE());

-- 17. INSTITUTIONS
INSERT INTO Institution (Institution_Name, Contact_Name, Contact_Email, Contact_Phone, City, Country, Created_By, Created_At, Updated_By, Updated_At) VALUES
('Louvre Museum', 'Jean Dupont', 'jean.dupont@louvre.fr', '+33140205050', 'Paris', 'France', 'system', CURDATE(), 'system', CURDATE()),
('Metropolitan Museum of Art', 'Sarah Johnson', 'sjohnson@metmuseum.org', '+12125705500', 'New York', 'USA', 'system', CURDATE(), 'system', CURDATE()),
('Rijksmuseum', 'Pieter van der Berg', 'p.vanderberg@rijksmuseum.nl', '+31206747000', 'Amsterdam', 'Netherlands', 'system', CURDATE(), 'system', CURDATE()),
('British Museum', 'Emma Thompson', 'e.thompson@britishmuseum.org', '+442073238000', 'London', 'UK', 'system', CURDATE(), 'system', CURDATE()),
('Uffizi Gallery', 'Lorenzo Bianchi', 'l.bianchi@uffizi.it', '+39055238600', 'Florence', 'Italy', 'system', CURDATE(), 'system', CURDATE()),
('Prado Museum', 'Maria Garcia', 'm.garcia@museodelprado.es', '+34913302800', 'Madrid', 'Spain', 'system', CURDATE(), 'system', CURDATE());

-- 18. ARTWORK LOANS
INSERT INTO Artwork_Loan (Artwork_ID, Institution_ID, Loan_Type, Start_Date, End_Date, Insurance_Value, Status, Approved_By, Notes, Created_By, Created_At, Updated_By, Updated_At) VALUES
(1, 1, 'Outgoing', '2026-01-15', '2026-04-15', 50000.00, 'Returned', 1, 'Loan to Louvre for special exhibition', 'system', CURDATE(), 'system', CURDATE()),
(2, 2, 'Outgoing', '2026-02-01', '2026-05-01', 75000.00, 'Active', 2, 'On loan to Met for drawing show', 'system', CURDATE(), 'system', CURDATE()),
(6, 3, 'Outgoing', '2026-03-01', '2026-06-30', 120000.00, 'Active', 3, 'Van Gogh works to Rijksmuseum', 'system', CURDATE(), 'system', CURDATE()),
(8, 4, 'Incoming', '2026-04-01', '2026-07-31', 90000.00, 'Active', 4, 'Loan from British Museum for summer exhibition', 'system', CURDATE(), 'system', CURDATE()),
(12, 5, 'Incoming', '2026-05-01', '2026-08-31', 45000.00, 'Active', 5, 'Danish painting loan from Uffizi', 'system', CURDATE(), 'system', CURDATE()),
(4, 6, 'Outgoing', '2026-01-10', '2026-03-10', 60000.00, 'Returned', 6, 'Temporary loan to Prado', 'system', CURDATE(), 'system', CURDATE());

-- 19. GIFT SHOP ITEMS
INSERT INTO Gift_Shop_Item (Name_of_Item, Price_of_Item, Category, Stock_Quantity, Created_By, Created_At, Updated_By, Updated_AT) VALUES
('Museum Tote Bag', 24.99, 'Merchandise', 150, 'system', CURDATE(), 'system', CURDATE()),
('Van Gogh Umbrella', 32.50, 'Apparel', 75, 'system', CURDATE(), 'system', CURDATE()),
('Art History Coloring Book', 12.95, 'Books', 200, 'system', CURDATE(), 'system', CURDATE()),
('Museum Magnet Set', 8.99, 'Souvenirs', 300, 'system', CURDATE(), 'system', CURDATE()),
('Replica Ancient Coin', 45.00, 'Collectibles', 40, 'system', CURDATE(), 'system', CURDATE()),
('Kids Art Kit', 19.99, 'Toys', 120, 'system', CURDATE(), 'system', CURDATE()),
('Exhibition Catalog: SP 2026', 29.99, 'Books', 85, 'system', CURDATE(), 'system', CURDATE()),
('Museum Logo Scarf', 39.99, 'Apparel', 60, 'system', CURDATE(), 'system', CURDATE());

-- 20. FOOD ITEMS
INSERT INTO Food (Food_Name, Food_Price, Stock_Quantity, Created_By, Created_At, Updated_By, Updated_AT) VALUES
('Espresso', 3.50, 100, 'system', CURDATE(), 'system', CURDATE()),
('Cappuccino', 4.75, 100, 'system', CURDATE(), 'system', CURDATE()),
('Blueberry Muffin', 3.25, 100, 'system', CURDATE(), 'system', CURDATE()),
('Quiche Lorraine', 7.95, 100, 'system', CURDATE(), 'system', CURDATE()),
('Greek Salad', 9.50, 100, 'system', CURDATE(), 'system', CURDATE()),
('Kids Lunch Box', 6.50, 100, 'system', CURDATE(), 'system', CURDATE()),
('Bottled Water', 2.00, 100, 'system', CURDATE(), 'system', CURDATE()),
('Chocolate Croissant', 4.00, 100, 'system', CURDATE(), 'system', CURDATE());

-- 21. GIFT SHOP SALES
INSERT INTO Gift_Shop_Sale (Sale_Date, Employee_ID, Created_By, Created_At, Updated_By, Updated_At) VALUES
('2026-04-15', 16, 'system', CURDATE(), 'system', NULL),
('2026-04-16', 16, 'system', CURDATE(), 'system', NULL),
('2026-04-17', 17, 'system', CURDATE(), 'system', NULL),
('2026-04-18', 18, 'system', CURDATE(), 'system', NULL),
('2026-04-19', 17, 'system', CURDATE(), 'system', NULL),
('2026-04-20', 19, 'system', CURDATE(), 'system', NULL);

-- 22. GIFT SHOP SALE LINES
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

-- 23. FOOD SALES
INSERT INTO Food_Sale (Sale_Date, Employee_ID, Created_By, Created_At, Updated_By, Updated_At) VALUES
('2026-04-15', 18, 'system', CURDATE(), 'system', CURDATE()),
('2026-04-16', 18, 'system', CURDATE(), 'system', CURDATE()),
('2026-04-17', 18, 'system', CURDATE(), 'system', CURDATE()),
('2026-04-18', 18, 'system', CURDATE(), 'system', CURDATE()),
('2026-04-19', 18, 'system', CURDATE(), 'system', CURDATE()),
('2026-04-20', 18, 'system', CURDATE(), 'system', CURDATE()),
('2026-04-21', 18, 'system', CURDATE(), 'system', CURDATE()),
('2026-04-22', 18, 'system', CURDATE(), 'system', CURDATE());

UPDATE Food SET Stock_Quantity = 100;

-- 24. FOOD SALE LINES
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

SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;