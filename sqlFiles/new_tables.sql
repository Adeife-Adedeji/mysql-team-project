-- Run this ONCE in MySQL Workbench to add the new tables, triggers, and stored procedures.
-- Safe to run on an existing museum_db that already has the original  tables.

USE museum_db;

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

-- Added: Triggers and Stored Procedures
DELIMITER $$

-- Added: Trigger: Auto Flag Restoration
DROP TRIGGER IF EXISTS trigger_auto_flag_restoration$$
CREATE TRIGGER trigger_auto_flag_restoration
BEFORE INSERT ON Artwork_Condition_Report
FOR EACH ROW
BEGIN
    IF NEW.Condition_Status IN ('Poor', 'Critical') THEN
        SET NEW.Restoration_Required = TRUE;
    END IF;
END$$

-- Added: Trigger: Check Artwork On Loan
DROP TRIGGER IF EXISTS trigger_check_artwork_on_loan$$
CREATE TRIGGER trigger_check_artwork_on_loan
BEFORE INSERT ON Exhibition_Artwork
FOR EACH ROW
BEGIN
    IF EXISTS (
        SELECT 1
        FROM Artwork_Loan
        WHERE Artwork_ID = NEW.Artwork_ID
          AND Loan_Type  = 'Outgoing'
          AND Status     = 'Active'
          AND CURDATE() BETWEEN Start_Date AND End_Date
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot assign artwork to exhibition: it is currently on outgoing loan to another institution';
    END IF;
END$$

-- Added: Trigger: Check Tour Capacity
DROP TRIGGER IF EXISTS trigger_check_tour_capacity$$
CREATE TRIGGER trigger_check_tour_capacity
BEFORE INSERT ON Tour_Registration
FOR EACH ROW
BEGIN
    IF (
        (SELECT COUNT(*)
         FROM Tour_Registration
         WHERE Tour_ID = NEW.Tour_ID)
        >=
        (SELECT Max_Capacity
         FROM Tour
         WHERE Tour_ID = NEW.Tour_ID)
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Tour is at full capacity';
    END IF;
END$$

-- Added: Report Artwork Conditions
DROP PROCEDURE IF EXISTS ReportArtworkConditions$$
CREATE PROCEDURE ReportArtworkConditions()
BEGIN
    SELECT
        AW.Artwork_ID,
        AW.Title,
        AR.Artist_Name,
        CR.Condition_Status,
        CR.Report_Date,
        CR.Restoration_Required,
        CONCAT(E.First_Name, ' ', E.Last_Name) AS Inspector_Name
    FROM Artwork AW
    JOIN Artist AR ON AW.Artist_ID = AR.Artist_ID
    LEFT JOIN Artwork_Condition_Report CR
        ON AW.Artwork_ID = CR.Artwork_ID
        AND CR.Report_ID = (
            SELECT Report_ID
            FROM Artwork_Condition_Report
            WHERE Artwork_ID = AW.Artwork_ID
            ORDER BY Report_Date DESC
            LIMIT 1
        )
    LEFT JOIN Employee E ON CR.Inspector_ID = E.Employee_ID
    ORDER BY
        FIELD(CR.Condition_Status, 'Critical', 'Poor', 'Fair', 'Good', 'Excellent'),
        AW.Title;
END$$

-- Added: Report Active Loans
DROP PROCEDURE IF EXISTS ReportActiveLoans$$
CREATE PROCEDURE ReportActiveLoans()
BEGIN
    SELECT
        AL.Loan_ID,
        AW.Title           AS Artwork_Title,
        AR.Artist_Name,
        I.Institution_Name,
        AL.Loan_Type,
        AL.Start_Date,
        AL.End_Date,
        AL.Insurance_Value,
        AL.Status,
        CONCAT(E.First_Name, ' ', E.Last_Name) AS Approved_By_Name
    FROM Artwork_Loan AL
    JOIN Artwork     AW ON AL.Artwork_ID     = AW.Artwork_ID
    JOIN Artist      AR ON AW.Artist_ID      = AR.Artist_ID
    JOIN Institution I  ON AL.Institution_ID = I.Institution_ID
    LEFT JOIN Employee E ON AL.Approved_By   = E.Employee_ID
    WHERE AL.Status = 'Active'
    ORDER BY AL.End_Date ASC;
END$$

DELIMITER ;
