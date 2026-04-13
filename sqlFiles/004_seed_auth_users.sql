USE museumdb;

-- 1. Create Login Users for Members
-- Points to Membership IDs from 005_members_insert.sql (2-6)
INSERT INTO users (name, email, password, role, is_active, membership_id)
VALUES 
    ('John Smith', 'member@example.com', 'member123', 'user', TRUE, 2)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    password = VALUES(password),
    role = VALUES(role),
    is_active = VALUES(is_active),
    membership_id = VALUES(membership_id);

-- 2. Create Login Users for Staff
-- Points to Employee IDs from 001_employee_insert.sql (1-36)
INSERT INTO users (name, email, password, role, is_active, employee_id)
VALUES 
    ('Wei Chen', 'supervisor@example.com', 'supervisor123', 'supervisor', TRUE, 1),
    ('Elena Rodriguez', 'employee@example.com', 'employee123', 'employee', TRUE, 2),
    ('David Brown', 'admissions@example.com', 'admissions123', 'admissions', TRUE, 16),
    ('Jessica Taylor', 'giftshop@example.com', 'giftshop123', 'giftshop', TRUE, 17),
    ('Kevin Wilson', 'cafe@example.com', 'cafe123', 'cafe', TRUE, 18),
    ('Nancy Walker', 'marketing@example.com', 'marketing123', 'supervisor', TRUE, 28)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    password = VALUES(password),
    role = VALUES(role),
    is_active = VALUES(is_active),
    employee_id = VALUES(employee_id);
