USE museumdb;

-- exhibitions, events and tours


-- Create two exhibitions

INSERT INTO Exhibition (Exhibition_Name, Starting_Date, Ending_Date)
VALUES 
    ('Spring Collection 2026', CURDATE(), '2026-05-12'),
    ('Summer Showcase 2026', '2026-06-12', '2026-08-14');

-- Assign artworks to exhibitions
-- Spring exhibition gets the first 6 artworks (by Title)
-- Summer exhibition gets the remaining 6

-- We'll use subqueries to find them by name.


-- Spring assignments (by artist)
INSERT INTO Exhibition_Artwork (Display_Room, Date_Installed, Exhibition_ID, Artwork_ID, Created_By, Created_At)
SELECT 
    'Main Gallery',
    CURDATE(),
    (SELECT Exhibition_ID FROM Exhibition WHERE Exhibition_Name = 'Spring Collection 2026'),
    a.Artwork_ID,
    'exhibition_planner',
    CURDATE()
FROM Artwork a
JOIN Artist ar ON a.Artist_ID = ar.Artist_ID
WHERE ar.Artist_Name IN (
    'Hans von Aachen',
    'Carl Frederik Aagaard',
    'Giulio Clovio',
    'Giovanni di Balduccio',
    'Albrecht Dürer',
    'Johann Paul Egell'
);

-- Summer assignments (by artist)
INSERT INTO Exhibition_Artwork (Display_Room, Date_Installed, Exhibition_ID, Artwork_ID, Created_By, Created_At)
SELECT 
    'East Wing',
    CURDATE(),
    (SELECT Exhibition_ID FROM Exhibition WHERE Exhibition_Name = 'Summer Showcase 2026'),
    a.Artwork_ID,
    'exhibition_planner',
    CURDATE()
FROM Artwork a
JOIN Artist ar ON a.Artist_ID = ar.Artist_ID
WHERE ar.Artist_Name IN (
    'John Henry Fuseli',
    'Vincent van Gogh',
    'Jean-Auguste-Dominique Ingres',
    'Jacopo da Empoli',
    'Friedrich Kerseboom',
    'Nicolas Lancret'
);

-- event insert
INSERT INTO Event (event_Name, start_Date, end_Date, member_only, coordinator_ID, created_by, created_at, updated_by, updated_at, Max_capacity) VALUES
('Spring Exhibition Opening Gala', '2026-04-15', '2026-04-15', FALSE, 1, 'system', CURDATE(), 'system', CURDATE(), 200),
('Art History: Renaissance', '2026-04-22', '2026-04-22', FALSE, 5, 'system', CURDATE(), 'system', CURDATE(), 80),
('Members-Only: Summer Showcase', '2026-06-10', '2026-06-10', TRUE, 2, 'system', CURDATE(), 'system', CURDATE(), 150),
('Family Art Workshop', '2026-04-25', '2026-04-25', FALSE, 3, 'system', CURDATE(), 'system', CURDATE(), 30),
('Curator Special: Van Gogh', '2026-05-05', '2026-05-05', FALSE, 4, 'system', CURDATE(), 'system', CURDATE(), 60),
('Evening Jazz & Art', '2026-05-15', '2026-05-15', FALSE, 5, 'system', CURDATE(), 'system', CURDATE(), 120),
('Summer Solstice Celebration', '2026-06-20', '2026-06-20', FALSE, 6, 'system', CURDATE(), 'system', CURDATE(), 250),
('Conservation Workshop', '2026-07-10', '2026-07-12', FALSE, 7, 'system', CURDATE(), 'system', CURDATE(), 25);

-- tours insert
INSERT INTO Tour (Tour_Name, Tour_Date, Start_Time, End_Time, Max_Capacity, Guide_ID, Exhibition_ID, Language, Created_By, Created_At, Updated_By, Updated_At) VALUES
('Renaissance Masterpieces Tour', '2026-04-16', '10:00:00', '11:30:00', 20, 8, 1, 'English', 'system', CURDATE(), 'system', CURDATE()),
('Spring Exhibition Highlights', '2026-04-17', '14:00:00', '15:30:00', 15, 9, 1, 'English', 'system', CURDATE(), 'system', CURDATE()),
('Family Discovery Tour', '2026-04-18', '11:00:00', '12:00:00', 10, 10, 2, 'English', 'system', CURDATE(), 'system', CURDATE()),
('Van Gogh & Friends', '2026-04-20', '13:00:00', '14:30:00', 20, 11, 2, 'English', 'system', CURDATE(), 'system', CURDATE()),
('Summer Showcase Preview', '2026-06-12', '10:30:00', '12:00:00', 25, 12, 2, 'English', 'system', CURDATE(), 'system', CURDATE()),
('Spanish Art Highlights', '2026-06-15', '15:00:00', '16:30:00', 15, 13, 2, 'Spanish', 'system', CURDATE(), 'system', CURDATE()),
('Behind the Scenes Conservation', '2026-07-05', '11:00:00', '12:30:00', 30, 14, 2, 'English', 'system', CURDATE(), 'system', CURDATE()),
('Sunday Morning Classics', '2026-04-23', '09:30:00', '11:00:00', 20, 15, 1, 'English', 'system', CURDATE(), 'system', CURDATE());
