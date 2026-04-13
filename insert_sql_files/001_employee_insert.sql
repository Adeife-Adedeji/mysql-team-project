USE museumdb;

-- employee and departments creation

-- create departments and employees for each department
INSERT INTO Department (Department_Name, Manager_ID, Created_By, Created_At, Updated_By, Updated_AT) VALUES 
('Curatorial', NULL, 'system', CURDATE(), 'system', CURDATE()),
('Conservation', NULL, 'system', CURDATE(), 'system', CURDATE()),
('Exhibition Design', NULL, 'system', CURDATE(), 'system', CURDATE()),
('Visitor Services', NULL, 'system', CURDATE(), 'system', CURDATE()),
('Education', NULL, 'system', CURDATE(), 'system', CURDATE()),
('Marketing', NULL, 'system', CURDATE(), 'system', CURDATE());

INSERT INTO Employee (Last_Name, First_Name, Date_Hired, Email, Employee_Address, Date_of_Birth, Salary, Employee_Role, Department_ID, Created_By, Created_At) VALUES
-- Curatorial (Department_ID = 1)
('Chen', 'Wei', '2020-03-15', 'wei.chen@museum.org', '123 Museum Ave, New York, NY', '1975-06-10', 85000.00, 'Chief Curator', 1, 'system', CURDATE()),
('Rodriguez', 'Elena', '2021-07-22', 'elena.rodriguez@museum.org', '456 Gallery St, New York, NY', '1982-11-03', 72000.00, 'Associate Curator', 1, 'system', CURDATE()),
('Thompson', 'James', '2019-11-01', 'james.thompson@museum.org', '789 Art Ln, Brooklyn, NY', '1978-02-18', 68000.00, 'Assistant Curator', 1, 'system', CURDATE()),
('Okonkwo', 'Chiamaka', '2022-01-10', 'chiamaka.okonkwo@museum.org', '321 Heritage Dr, Queens, NY', '1985-09-25', 65000.00, 'Curatorial Assistant', 1, 'system', CURDATE()),
('Kowalski', 'Anna', '2018-06-30', 'anna.kowalski@museum.org', '654 Research Blvd, Manhattan, NY', '1970-12-01', 95000.00, 'Senior Curator', 1, 'system', CURDATE()),
-- Conservation (Department_ID = 2)
('Martinez', 'Carlos', '2017-09-12', 'carlos.martinez@museum.org', '147 Restoration Rd, Bronx, NY', '1968-04-22', 78000.00, 'Head Conservator', 2, 'system', CURDATE()),
('Dubois', 'Sophie', '2020-05-18', 'sophie.dubois@museum.org', '258 Preserve Ln, Staten Island, NY', '1980-07-14', 67000.00, 'Painting Cons', 2, 'system', CURDATE()),
('Yamamoto', 'Kenji', '2021-11-03', 'kenji.yamamoto@museum.org', '369 Art Care Ave, New York, NY', '1977-03-09', 64000.00, 'Paper Conservator', 2, 'system', CURDATE()),
('Patel', 'Priya', '2019-04-25', 'priya.patel@museum.org', '741 Science Ct, Jersey City, NJ', '1988-08-30', 62000.00, 'Preventive Cons', 2, 'system', CURDATE()),
('Williams', 'Michael', '2016-12-01', 'michael.williams@museum.org', '852 Treatment Way, Newark, NJ', '1965-05-17', 82000.00, 'Sr Objects Cons', 2, 'system', CURDATE()),
-- Exhibition Design (Department_ID = 3)
('Lopez', 'Isabella', '2019-08-20', 'isabella.lopez@museum.org', '963 Design Pl, New York, NY', '1981-01-26', 75000.00, 'Lead Exhibit Des', 3, 'system', CURDATE()),
('Nguyen', 'Thomas', '2020-10-14', 'thomas.nguyen@museum.org', '159 Exhibit Ave, Long Island City, NY', '1984-09-12', 68000.00, 'Exhibition Designer', 3, 'system', CURDATE()),
('Smith', 'Laura', '2021-02-28', 'laura.smith@museum.org', '357 Gallery Row, Manhattan, NY', '1990-11-05', 59000.00, 'Junior Designer', 3, 'system', CURDATE()),
('Garcia', 'Javier', '2018-07-07', 'javier.garcia@museum.org', '753 Installation St, Brooklyn, NY', '1979-06-19', 71000.00, 'Lighting Designer', 3, 'system', CURDATE()),
('Lee', 'Hannah', '2017-03-19', 'hannah.lee@museum.org', '852 Mounting Dr, Queens, NY', '1972-10-28', 80000.00, 'Production Mgr', 3, 'system', CURDATE()),
-- Visitor Services (Department_ID = 4)
('Brown', 'David', '2022-06-01', 'david.brown@museum.org', '963 Welcome Blvd, New York, NY', '1992-07-30', 48000.00, 'Visitor Svcs Mgr', 4, 'system', CURDATE()),
('Taylor', 'Jessica', '2021-09-15', 'jessica.taylor@museum.org', '147 Ticket Ln, Manhattan, NY', '1995-02-14', 42000.00, 'Front Desk Sup', 4, 'system', CURDATE()),
('Wilson', 'Kevin', '2020-12-10', 'kevin.wilson@museum.org', '258 Guest St, Brooklyn, NY', '1988-12-05', 38000.00, 'Guest Svcs Assoc', 4, 'system', CURDATE()),
('Anderson', 'Maria', '2019-10-22', 'maria.anderson@museum.org', '369 Info Way, Queens, NY', '1985-03-22', 45000.00, 'Membership Coor', 4, 'system', CURDATE()),
('Thomas', 'Robert', '2018-04-05', 'robert.thomas@museum.org', '741 Hospitality Ave, Bronx, NY', '1976-09-11', 52000.00, 'Group Sales Coord', 4, 'system', CURDATE()),
('Jackson', 'Linda', '2023-01-17', 'linda.jackson@museum.org', '852 Concierge Ct, Staten Island, NY', '1998-05-02', 36000.00, 'Welcome Ambass', 4, 'system', CURDATE()),
-- Education (Department_ID = 5)
('White', 'Patricia', '2016-11-11', 'patricia.white@museum.org', '963 Learning Ln, New York, NY', '1969-08-19', 72000.00, 'Dir of Education', 5, 'system', CURDATE()),
('Harris', 'Christopher', '2019-05-30', 'christopher.harris@museum.org', '147 Teach St, Brooklyn, NY', '1983-04-07', 58000.00, 'School Prog Mgr', 5, 'system', CURDATE()),
('Martin', 'Amanda', '2020-08-26', 'amanda.martin@museum.org', '258 Family Ave, Queens, NY', '1987-10-15', 54000.00, 'Family Prog Coord', 5, 'system', CURDATE()),
('Robinson', 'Daniel', '2021-12-13', 'daniel.robinson@museum.org', '369 Outreach Dr, Bronx, NY', '1991-01-23', 51000.00, 'Community Engage', 5, 'system', CURDATE()),
('Clark', 'Sarah', '2018-09-04', 'sarah.clark@museum.org', '741 Youth Pl, Manhattan, NY', '1974-06-29', 67000.00, 'Teen Prog Lead', 5, 'system', CURDATE()),
('Lewis', 'Brandon', '2022-04-19', 'brandon.lewis@museum.org', '852 Lecture Hall Rd, Staten Island, NY', '1994-11-17', 46000.00, 'Education Asst', 5, 'system', CURDATE()),
-- Marketing (Department_ID = 6)
('Walker', 'Nancy', '2017-02-14', 'nancy.walker@museum.org', '963 Brand Blvd, New York, NY', '1971-12-03', 88000.00, 'Marketing Dir', 6, 'system', CURDATE()),
('Hall', 'Gregory', '2019-09-09', 'gregory.hall@museum.org', '147 Social Ln, Brooklyn, NY', '1986-05-26', 65000.00, 'Social Media Mgr', 6, 'system', CURDATE()),
('Allen', 'Rebecca', '2020-11-01', 'rebecca.allen@museum.org', '258 PR Way, Queens, NY', '1989-07-18', 60000.00, 'PR Specialist', 6, 'system', CURDATE()),
('Young', 'Jason', '2018-06-22', 'jason.young@museum.org', '369 Digital Ave, Manhattan, NY', '1982-09-09', 72000.00, 'Digital Mktg Mgr', 6, 'system', CURDATE()),
('King', 'Michelle', '2021-03-17', 'michelle.king@museum.org', '741 Content Dr, Bronx, NY', '1993-02-28', 55000.00, 'Content Creator', 6, 'system', CURDATE()),
('Scott', 'Brian', '2022-08-08', 'brian.scott@museum.org', '852 Analytics St, Staten Island, NY', '1990-12-12', 49000.00, 'Marketing Coord', 6, 'system', CURDATE());

-- Update department managers (each manager must be an employee in that department)
UPDATE Department SET Manager_ID = (SELECT Employee_ID FROM Employee WHERE Employee_Role = 'Chief Curator' AND Department_ID = 1) WHERE Department_ID = 1;
UPDATE Department SET Manager_ID = (SELECT Employee_ID FROM Employee WHERE Employee_Role = 'Head Conservator' AND Department_ID = 2) WHERE Department_ID = 2;
UPDATE Department SET Manager_ID = (SELECT Employee_ID FROM Employee WHERE Employee_Role = 'Lead Exhibit Des' AND Department_ID = 3) WHERE Department_ID = 3;
UPDATE Department SET Manager_ID = (SELECT Employee_ID FROM Employee WHERE Employee_Role = 'Visitor Svcs Mgr' AND Department_ID = 4) WHERE Department_ID = 4;
UPDATE Department SET Manager_ID = (SELECT Employee_ID FROM Employee WHERE Employee_Role = 'Dir of Education' AND Department_ID = 5) WHERE Department_ID = 5;
UPDATE Department SET Manager_ID = (SELECT Employee_ID FROM Employee WHERE Employee_Role = 'Marketing Dir' AND Department_ID = 6) WHERE Department_ID = 6;