USE museumdb;

-- event and tour registrations

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

-- tour registrations
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
