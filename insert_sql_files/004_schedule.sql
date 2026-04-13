USE museumdb;

-- Added after exhibition was created due to foreign key constraint on Schedule.Exhibition_ID

INSERT INTO Schedule (Shift_Date, Start_Time, End_Time, Employee_ID, Exhibition_ID, Duty, Created_By, Created_At, Updated_By, Updated_At) VALUES
('2026-04-15', '09:00:00', '17:00:00', 22, 1, 'Supervisor', 'system', CURDATE(), 'system', CURDATE()),
('2026-04-15', '10:00:00', '18:00:00', 23, 1, 'Gallery Attendant', 'system', CURDATE(), 'system', CURDATE()),
('2026-04-16', '09:00:00', '17:00:00', 24, 1, 'Security', 'system', CURDATE(), 'system', CURDATE()),
('2026-04-16', '12:00:00', '20:00:00', 25, 1, 'Guide', 'system', CURDATE(), 'system', CURDATE()),
('2026-06-12', '09:00:00', '17:00:00', 26, 2, 'Supervisor', 'system', CURDATE(), 'system', CURDATE()),
('2026-06-12', '10:00:00', '18:00:00', 27, 2, 'Gallery Attendant', 'system', CURDATE(), 'system', CURDATE()),
('2026-06-13', '09:00:00', '17:00:00', 28, 2, 'Security', 'system', CURDATE(), 'system', CURDATE()),
('2026-06-13', '11:00:00', '19:00:00', 29, 2, 'Guide', 'system', CURDATE(), 'system', CURDATE()),
('2026-04-20', '09:00:00', '17:00:00', 30, 1, 'Janitor', 'system', CURDATE(), 'system', CURDATE()),
('2026-04-21', '09:00:00', '17:00:00', 31, 1, 'Maintenance', 'system', CURDATE(), 'system', CURDATE());
