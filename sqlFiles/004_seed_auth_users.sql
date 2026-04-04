INSERT INTO
    Membership (
        Membership_ID,
        Last_Name,
        First_Name,
        Phone_Number,
        Email,
        Date_Joined,
        Created_By,
        Created_At
    )
VALUES (
        1,
        'Member',
        'Museum',
        '7135550101',
        'member@example.com',
        CURRENT_DATE,
        'seed',
        CURRENT_DATE
    )
ON DUPLICATE KEY UPDATE
    Last_Name = VALUES(Last_Name),
    First_Name = VALUES(First_Name),
    Phone_Number = VALUES(Phone_Number),
    Email = VALUES(Email),
    Date_Joined = VALUES(Date_Joined),
    Created_By = VALUES(Created_By),
    Created_At = VALUES(Created_At);

INSERT INTO
    Employee (
        Employee_ID,
        Last_Name,
        First_Name,
        Date_Hired,
        Email,
        Hourly_Pay,
        Employee_Role,
        Supervisor_ID,
        Department_ID,
        Created_By,
        Created_At
    )
VALUES (
        1,
        'Employee',
        'Staff',
        CURRENT_DATE,
        'employee@example.com',
        18.50,
        'employee',
        NULL,
        NULL,
        'seed',
        CURRENT_DATE
    ),
    (
        2,
        'Supervisor',
        'Lead',
        CURRENT_DATE,
        'supervisor@example.com',
        27.50,
        'supervisor',
        1,
        NULL,
        'seed',
        CURRENT_DATE
    ),
    (
        3,
        'Admissions',
        'Clerk',
        CURRENT_DATE,
        'admissions@example.com',
        15.00,
        'admissions',
        NULL,
        NULL,
        'seed',
        CURRENT_DATE
    ),
    (
        4,
        'Giftshop',
        'Worker',
        CURRENT_DATE,
        'giftshop@example.com',
        15.00,
        'giftshop',
        NULL,
        NULL,
        'seed',
        CURRENT_DATE
    ),
    (
        5,
        'Cafe',
        'Barista',
        CURRENT_DATE,
        'cafe@example.com',
        15.00,
        'cafe',
        NULL,
        NULL,
        'seed',
        CURRENT_DATE
    )
ON DUPLICATE KEY UPDATE
    Last_Name = VALUES(Last_Name),
    First_Name = VALUES(First_Name),
    Date_Hired = VALUES(Date_Hired),
    Email = VALUES(Email),
    Hourly_Pay = VALUES(Hourly_Pay),
    Employee_Role = VALUES(Employee_Role),
    Supervisor_ID = VALUES(Supervisor_ID),
    Department_ID = VALUES(Department_ID),
    Created_By = VALUES(Created_By),
    Created_At = VALUES(Created_At);

INSERT INTO
    users (
        name,
        email,
        password,
        role,
        is_active,
        membership_id
    )
VALUES (
        'Museum Member',
        'member@example.com',
        'member123',
        'user',
        TRUE,
        1
    )
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    password = VALUES(password),
    role = VALUES(role),
    is_active = VALUES(is_active),
    membership_id = VALUES(membership_id);

INSERT INTO
    users (
        name,
        email,
        password,
        role,
        is_active,
        employee_id
    )
VALUES (
        'Staff Employee',
        'employee@example.com',
        'employee123',
        'employee',
        TRUE,
        1
    ),
    (
        'Lead Supervisor',
        'supervisor@example.com',
        'supervisor123',
        'supervisor',
        TRUE,
        2
    ),
    (
        'Clerk',
        'admissions@example.com',
        'admissions123',
        'admissions',
        TRUE,
        3
    ),
    (
        'Worker',
        'giftshop@example.com',
        'giftshop123',
        'giftshop',
        TRUE,
        4
    ),
    (
        'Barista',
        'cafe@example.com',
        'cafe123',
        'cafe',
        TRUE,
        5
    )

ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    password = VALUES(password),
    role = VALUES(role),
    is_active = VALUES(is_active),
    employee_id = VALUES(employee_id);