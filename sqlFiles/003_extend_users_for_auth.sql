ALTER TABLE users
    ADD COLUMN password VARCHAR(255) NOT NULL DEFAULT 'changeme',
    ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user',
    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN employee_id INT NULL,
    ADD COLUMN membership_id INT NULL;

ALTER TABLE users
    ADD CONSTRAINT chk_users_role
        CHECK (role IN ('user', 'employee', 'supervisor'));

ALTER TABLE users
    ADD CONSTRAINT fk_users_employee
        FOREIGN KEY (employee_id) REFERENCES Employee (Employee_ID)
        ON DELETE SET NULL;

ALTER TABLE users
    ADD CONSTRAINT fk_users_membership
        FOREIGN KEY (membership_id) REFERENCES Membership (Membership_ID)
        ON DELETE SET NULL;

CREATE UNIQUE INDEX uq_users_employee_id
    ON users (employee_id);

CREATE UNIQUE INDEX uq_users_membership_id
    ON users (membership_id);
