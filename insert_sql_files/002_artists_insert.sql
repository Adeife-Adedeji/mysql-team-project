USE museumdb;

-- Artists, artworks and artwork condition

-- Placeholder Artists in database

-- @block
INSERT INTO artist (Artist_Name, Date_of_Birth, Date_of_Death, Birth_Place) VALUES
('Hans von Aachen', '1552-01-01', '1615-03-04', 'Köln'),
('Carl Frederik Aagaard', '1833-01-29', '1895-11-02', 'Odense'),
('Giulio Clovio', '1498-01-01', '1578-01-05', 'Grizane'),
('Giovanni di Balduccio', '1290-01-01', '1365-01-01', 'Pisa'),
('Albrecht Dürer', '1471-05-21', '1528-04-06', 'Nürnberg'),
('Johann Paul Egell', '1691-04-09', '1752-01-10', 'Mannheim'),
('John Henry Fuseli', '1741-02-07', '1825-04-16', 'Zurich'),
('Vincent van Gogh', '1853-03-30', '1890-07-29', 'Groot Zundert'),
('Jean-Auguste-Dominique Ingres', '1780-08-29', '1867-01-14', 'Montauban'),
('Jacopo da Empoli', '1551-04-30', '1640-09-30', 'Firenze'),
('Friedrich Kerseboom', '1632-01-01', '1693-01-01', 'Solingen'),
('Nicolas Lancret', '1690-01-22', '1743-09-14', 'Paris'),
('Claude Monet', '1840-01-01', '1926-01-01', 'Paris');

-- artwork insert
-- @block
-- Insert artworks only for the specified artists (12 records)
-- Titles shortened to fit VARCHAR(30)

INSERT INTO Artwork (Title, Type, Date_Created, Time_Period, Art_Style, Artist_ID, Image_URL, Created_By, Created_At)
SELECT 
    tmp.Title,
    tmp.Type,
    tmp.Date_Created,
    tmp.Time_Period,
    tmp.Art_Style,
    a.Artist_ID,
    tmp.Image_URL,
    'catalog_import',
    CURDATE()
FROM (
    SELECT 'Allegory' AS Title, 'Painting' AS Type, '1598-01-01' AS Date_Created, 'Mannerism (1520-1600)' AS Time_Period, 'Mannerism' AS Art_Style, 'Hans von Aachen' AS Artist_Name, '/images/allegory.jpg' AS Image_URL
    UNION ALL
    SELECT 'The Rose Garden', 'Painting', '1877-01-01', 'Romanticism (1800-1850)', 'Romanticism', 'Carl Frederik Aagaard', '/images/the-rose-garden.jpg'
    UNION ALL
    SELECT 'The Farnese Hours', 'Illumination', '1537-04-01', 'Early Renaissance (1300-1499)', 'Renaissance', 'Giulio Clovio', '/images/the-farnese-hours.jpg'
    UNION ALL
    SELECT 'St Peter Martyr: Reburial', 'Sculpture', '1335-01-01', 'Early Renaissance (1300-1499)', NULL, 'Giovanni di Balduccio', '/images/st-peter-martyr.jpg'
    UNION ALL
    SELECT 'Female Head Type 7', 'Graphics', '1528-01-01', 'Mannerism (1520-1600)', NULL, 'Albrecht Dürer', '/images/female-type-7.jpg'
    UNION ALL
    SELECT 'Deposition', 'Sculpture', '1740-01-01', 'Mannerism (1520-1600)', 'Mannerism', 'Johann Paul Egell', '/images/deposition-egell.jpg.jpg'
    UNION ALL
    SELECT 'Leonore Discovers Dagger', 'Painting', '1795-01-01', 'Romanticism (1800-1850)', 'Romanticism', 'John Henry Fuseli', '/images/leonore-discovers-dagger.jpg'
    UNION ALL
    SELECT 'La Roubine du Roi', 'Graphics', '1888-06-01', 'Impressionism (1860-1890)', 'Impressionism', 'Vincent van Gogh', '/images/la-roubine-du-roi.jpg'
    UNION ALL
    SELECT 'The Birth of the Last Muse', 'Graphics', '1856-01-01', 'Romanticism (1800-1850)', 'Romanticism', 'Jean-Auguste-Dominique Ingres', '/images/the-birth-of-the-last-muse.jpg'
    UNION ALL
    SELECT 'Deposition', 'Painting', NULL, 'Mannerism (1520-1600)', 'Mannerism', 'Jacopo da Empoli', '/images/deposition-empoli.jpg'
    UNION ALL
    SELECT 'Portrait of Sir John Langham', 'Painting', '1683-01-01', 'Mannerism (1520-1600)', 'Mannerism', 'Friedrich Kerseboom', '/images/portrait-of-john-langham.jpg'
    UNION ALL
    SELECT 'Billiard Players', 'Painting', NULL, 'Early Renaissance (1300-1499)', NULL, 'Nicolas Lancret', '/images/billiard-players.jpg'
) tmp
JOIN Artist a ON a.Artist_Name = tmp.Artist_Name;

-- artwork_condition_report
INSERT INTO Artwork_Condition_Report (Artwork_ID, Condition_Status, Report_Date, Inspector_ID, Restoration_Required, Notes, Created_By, Created_At, Updated_By, Updated_At) VALUES
(1, 'Excellent', '2026-01-10', 1, FALSE, 'No issues; stable', 'system', CURDATE(), 'system', CURDATE()),
(2, 'Good', '2026-01-15', 2, FALSE, 'Minor surface dust', 'system', CURDATE(), 'system', CURDATE()),
(3, 'Fair', '2026-02-01', 3, FALSE, 'Slight fading on edges', 'system', CURDATE(), 'system', CURDATE()),
(4, 'Poor', '2026-02-20', 4, TRUE, 'Cracked marble; restoration needed', 'system', CURDATE(), 'system', CURDATE()),
(5, 'Critical', '2026-03-05', 5, TRUE, 'Severe paper discoloration and tears', 'system', CURDATE(), 'system', CURDATE()),
(6, 'Good', '2026-03-12', 6, FALSE, 'Stable; minor scratches', 'system', CURDATE(), 'system', CURDATE()),
(7, 'Excellent', '2026-03-18', 7, FALSE, 'Well preserved', 'system', CURDATE(), 'system', CURDATE()),
(8, 'Fair', '2026-04-01', 8, FALSE, 'Some ink bleeding', 'system', CURDATE(), 'system', CURDATE()),
(9, 'Good', '2026-04-05', 9, FALSE, 'Stable condition', 'system', CURDATE(), 'system', CURDATE()),
(10, 'Poor', '2026-04-08', 10, TRUE, 'Paint flaking; requires conservation', 'system', CURDATE(), 'system', CURDATE()),
(11, 'Excellent', '2026-04-10', 11, FALSE, 'Like new', 'system', CURDATE(), 'system', CURDATE()),
(12, 'Good', '2026-04-12', 12, FALSE, 'Minor wear', 'system', CURDATE(), 'system', CURDATE());


