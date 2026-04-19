USE museumdb;

INSERT INTO users (id, name, email, password, role, is_active, employee_id, membership_id)
VALUES
    (1, 'John Smith', 'member@example.com', 'member123', 'user', TRUE, NULL, 2),
    (2, 'Adeife Adedeji', 'adeade87@gmail.com', 'art4532@', 'supervisor', TRUE, 1, NULL),
    (3, 'Chase Beeler', 'chabee98@gmail.com', 'finder2413@', 'curator', TRUE, 3, NULL),
    (4, 'Elena Rodriguez', 'elerod49@gmail.com', 'fluffy302@', 'employee', TRUE, 2, NULL),
    (5, 'Michel Castellanos', 'michcast84@gmail.com', 'express30@', 'admissions', TRUE, 16, NULL),
    (6, 'Quan Nguyen', 'quangu32@gmail.com', 'thunder12@', 'giftshop', TRUE, 17, NULL),
    (7, 'Silvano Chavez', 'silcha38@gmail.com', 'Spidy243@', 'cafe', TRUE, 18, NULL),
    (8, 'Nancy Walker', 'marketing@example.com', 'marketing123', 'supervisor', TRUE, 28, NULL),
    (9, 'Hong Quan Nguyen', 'test@gmail.com', 'art4532@', 'user', TRUE, NULL, NULL),
    (10, 'Hong Quan Nguyen', 'test1@gmail.com', 'Binkhung123123', 'user', TRUE, NULL, NULL),
    (11, 'Silvano Chavez', 'chavezbrojr@gmail.com', 'spidy123', 'user', TRUE, NULL, NULL),
    (12, 'Hong Quan Nguyen', 'test3@gmail.com', 'Binkhung123123.', 'user', TRUE, NULL, NULL),
    (13, 'Member Test', 'lorainedrive@gmail.com', '123123', 'user', TRUE, NULL, NULL),
    (14, 'John Doe', 'example@example.com', 'password123', 'user', TRUE, NULL, NULL),
    (15, 'John Doe', 'example1@example.com', 'password123', 'user', TRUE, NULL, NULL),
    (16, 'John Doe', 'example3@example.com', 'password123', 'user', TRUE, NULL, NULL),
    (17, 'John Doe', 'johndoe@mail.com', 'password123', 'user', TRUE, NULL, NULL),
    (18, 'test test', 'test1@mail.com', 'password', 'user', TRUE, NULL, NULL)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    email = VALUES(email),
    password = VALUES(password),
    role = VALUES(role),
    is_active = VALUES(is_active),
    employee_id = VALUES(employee_id),
    membership_id = VALUES(membership_id);
