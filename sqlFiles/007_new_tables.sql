-- HOW TO RUN: In MySQL Workbench use File > Run SQL Script (NOT the query editor lightning bolt)
-- Safe to run on an existing museumdb that already has the original tables (uses IF NOT EXISTS).

USE museumdb;

-- Added: Artwork Condition Report Table
CREATE TABLE IF NOT EXISTS Artwork_Condition_Report (
    Report_ID            INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    Artwork_ID           INT NOT NULL,
    Condition_Status     ENUM('Excellent', 'Good', 'Fair', 'Poor', 'Critical') NOT NULL,
    Report_Date          DATE NOT NULL,
    Inspector_ID         INT NULL,
    Restoration_Required BOOLEAN NOT NULL DEFAULT FALSE,
    Notes                TEXT,
    Created_By           VARCHAR(30),
    Created_At           DATE,
    Updated_By           VARCHAR(30),
    Updated_At           DATE,
    CONSTRAINT fk_condition_artwork
        FOREIGN KEY (Artwork_ID)   REFERENCES Artwork   (Artwork_ID)   ON DELETE CASCADE,
    CONSTRAINT fk_condition_inspector
        FOREIGN KEY (Inspector_ID) REFERENCES Employee  (Employee_ID)  ON DELETE SET NULL
);

-- Added: Institution Table
CREATE TABLE IF NOT EXISTS Institution (
    Institution_ID   INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    Institution_Name VARCHAR(100) NOT NULL,
    Contact_Name     VARCHAR(60),
    Contact_Email    VARCHAR(50),
    Contact_Phone    VARCHAR(15),
    City             VARCHAR(50),
    Country          VARCHAR(50),
    Created_By       VARCHAR(30),
    Created_At       DATE,
    Updated_By       VARCHAR(30),
    Updated_At       DATE
);

-- Added: Artwork Loan Table
CREATE TABLE IF NOT EXISTS Artwork_Loan (
    Loan_ID          INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    Artwork_ID       INT NOT NULL,
    Institution_ID   INT NOT NULL,
    Loan_Type        ENUM('Outgoing', 'Incoming') NOT NULL,
    Start_Date       DATE NOT NULL,
    End_Date         DATE NOT NULL,
    Insurance_Value  DECIMAL(12, 2) NULL,
    Status           ENUM('Active', 'Returned', 'Cancelled') NOT NULL DEFAULT 'Active',
    Approved_By      INT NULL,
    Notes            TEXT,
    Created_By       VARCHAR(30),
    Created_At       DATE,
    Updated_By       VARCHAR(30),
    Updated_At       DATE,
    CHECK (End_Date >= Start_Date),
    CHECK (Insurance_Value IS NULL OR Insurance_Value >= 0),
    CONSTRAINT fk_loan_artwork
        FOREIGN KEY (Artwork_ID)      REFERENCES Artwork     (Artwork_ID)      ON DELETE RESTRICT,
    CONSTRAINT fk_loan_institution
        FOREIGN KEY (Institution_ID)  REFERENCES Institution (Institution_ID)  ON DELETE RESTRICT,
    CONSTRAINT fk_loan_approver
        FOREIGN KEY (Approved_By)     REFERENCES Employee    (Employee_ID)     ON DELETE SET NULL
);

-- Added: Tour Table
CREATE TABLE IF NOT EXISTS Tour (
    Tour_ID       INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    Tour_Name     VARCHAR(60) NOT NULL,
    Tour_Date     DATE NOT NULL,
    Start_Time    TIME NOT NULL,
    End_Time      TIME NOT NULL,
    Max_Capacity  INT NOT NULL,
    Guide_ID      INT NULL,
    Exhibition_ID INT NULL,
    Language      VARCHAR(30) NOT NULL DEFAULT 'English',
    Created_By    VARCHAR(30),
    Created_At    DATE,
    Updated_By    VARCHAR(30),
    Updated_At    DATE,
    CHECK (End_Time > Start_Time),
    CHECK (Max_Capacity > 0),
    CONSTRAINT fk_tour_guide
        FOREIGN KEY (Guide_ID)      REFERENCES Employee   (Employee_ID)   ON DELETE SET NULL,
    CONSTRAINT fk_tour_exhibition
        FOREIGN KEY (Exhibition_ID) REFERENCES Exhibition (Exhibition_ID) ON DELETE SET NULL
);

-- Added: Tour Registration Table
CREATE TABLE IF NOT EXISTS Tour_Registration (
    Tour_Registration_ID INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    Tour_ID              INT NOT NULL,
    Membership_ID        INT NOT NULL,
    Registration_Date    DATE NOT NULL,
    Created_By           VARCHAR(30),
    Created_At           DATE,
    UNIQUE (Tour_ID, Membership_ID),
    CONSTRAINT fk_tour_reg_tour
        FOREIGN KEY (Tour_ID)       REFERENCES Tour       (Tour_ID)       ON DELETE CASCADE,
    CONSTRAINT fk_tour_reg_member
        FOREIGN KEY (Membership_ID) REFERENCES Membership (Membership_ID) ON DELETE CASCADE
);

-- NOTE: Triggers and stored procedures for these tables are defined in
-- triggers.sql and reports.sql respectively. Run those files after this one.
