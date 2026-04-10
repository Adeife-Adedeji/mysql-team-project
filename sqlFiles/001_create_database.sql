CREATE DATABASE IF NOT EXISTS museumdb;
USE museumdb;

-- Tables with no foreign keys

CREATE TABLE IF NOT EXISTS Department (
    Department_ID INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    Department_Name VARCHAR(30) NOT NULL,
    Manager_ID INT NULL,
    Created_By VARCHAR(30),
    Created_At DATE,
    Updated_By VARCHAR(30),
    Updated_AT DATE
);

CREATE TABLE IF NOT EXISTS Artist (
    Artist_ID INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    Artist_Name VARCHAR(30) NOT NULL,
    Date_of_Birth DATE,
    Date_of_Death DATE NULL,
    Birth_Place VARCHAR(30)
);

CREATE TABLE IF NOT EXISTS Exhibition (
    Exhibition_ID INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    Exhibition_Name VARCHAR(50) NOT NULL,
    Starting_Date DATE NOT NULL,
    Ending_Date DATE NOT NULL,
    CHECK (Ending_Date >= Starting_Date)
);

CREATE TABLE IF NOT EXISTS Gift_Shop_Item (
    Gift_Shop_Item_ID INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    Name_of_Item VARCHAR(30),
    Price_of_Item DECIMAL(10, 2),
    Category VARCHAR(30),
    Stock_Quantity INT,
    Created_By VARCHAR(30),
    Created_At DATE,
    Updated_By VARCHAR(30),
    Updated_AT DATE,
    CHECK (Stock_Quantity >= 0)
);

CREATE TABLE IF NOT EXISTS Food (
    Food_ID INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    Food_Name VARCHAR(30),
    Food_Price DECIMAL(4, 2) NOT NULL,
    Created_By VARCHAR(30),
    Created_At DATE,
    Updated_By VARCHAR(30),
    Updated_AT DATE,
    CHECK (Food_Price >= 0)
);

CREATE TABLE IF NOT EXISTS Membership (
    Membership_ID INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    Last_Name VARCHAR(30) NOT NULL,
    First_Name VARCHAR(30) NOT NULL,
    Phone_Number VARCHAR(10),
    Email VARCHAR(50) UNIQUE,
    Date_Joined DATE,
    Date_Exited DATE NULL,
    Created_By VARCHAR(30),
    Created_At DATE,
    Updated_By VARCHAR(30),
    Updated_AT DATE,
    CHECK (
        Date_Exited IS NULL
        OR Date_Exited >= Date_Joined
    )
);

-- Tables with foreign keys

CREATE TABLE IF NOT EXISTS Employee (
    Employee_ID INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    Last_Name VARCHAR(30) NOT NULL,
    First_Name VARCHAR(30) NOT NULL,
    Date_Hired DATE NOT NULL,
    Email VARCHAR(50) UNIQUE,
    Employee_Address VARCHAR(50),
    Date_of_Birth DATE,
    Hourly_Pay DECIMAL(6, 2),
    Salary DECIMAL(10, 2),
    Employee_Role VARCHAR(20),
    Supervisor_ID INT NULL,
    Department_ID INT NULL,
    Created_By VARCHAR(30),
    Created_At DATE,
    Updated_By VARCHAR(30),
    Updated_AT DATE,
    CHECK (
        (
            Hourly_Pay IS NOT NULL
            AND Salary IS NULL
        )
        OR (
            Hourly_Pay IS NULL
            AND Salary IS NOT NULL
        )
    ),
    CONSTRAINT fk_Employee_Supervisor FOREIGN KEY (Supervisor_ID) REFERENCES Employee (Employee_ID) ON DELETE SET NULL,
    CONSTRAINT fk_Employee_Department FOREIGN KEY (Department_ID) REFERENCES Department (Department_ID) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ARTWORK (
    Artwork_ID INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    Title VARCHAR(30) NOT NULL,
    Type VARCHAR(30) NOT NULL,
    Date_Created DATE,
    Time_Period VARCHAR(30),
    Art_Style VARCHAR(30),
    Artist_ID INT NOT NULL,
    Created_By VARCHAR(30),
    Created_At DATE,
    Updated_By VARCHAR(30),
    Updated_AT DATE,
    CONSTRAINT fk_Artwork_Artist FOREIGN KEY (Artist_ID) REFERENCES Artist (Artist_ID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Exhibition_Artwork (
    Exhibition_Artwork_ID INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    Display_Room VARCHAR(30),
    Date_Installed DATE,
    Exhibition_ID INT NOT NULL,
    Artwork_ID INT NOT NULL,
    Created_By VARCHAR(30),
    Created_At DATE,
    Updated_By VARCHAR(30),
    Updated_AT DATE,
    UNIQUE (exhibition_ID, Artwork_ID),
    CONSTRAINT fk_Exhibition_Artwork_Exhibition FOREIGN KEY (Exhibition_ID) REFERENCES Exhibition (Exhibition_ID),
    CONSTRAINT fk_Exhibition_Artwork_Artwork FOREIGN KEY (Artwork_ID) REFERENCES Artwork (Artwork_ID)
);

CREATE TABLE IF NOT EXISTS Ticket (
    Ticket_ID INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    Purchase_type VARCHAR(30),
    Purchase_Date DATE NOT NULL,
    Visit_Date DATE NOT NULL,
    Last_Name VARCHAR(30),
    First_Name VARCHAR(30),
    Phone_number VARCHAR(10),
    Email VARCHAR(50) UNIQUE,
    Payment_method VARCHAR(30),
    Membership_ID INT NULL,
    Created_by VARCHAR(30),
    Created_at DATE,
    Updated_by VARCHAR(30),
    Updated_at DATE,
    CHECK (Visit_Date >= Purchase_Date),
    CONSTRAINT fk_ticket_Membership FOREIGN KEY (Membership_ID) REFERENCES Membership (Membership_ID)
);

CREATE TABLE IF NOT EXISTS ticket_line (
    Ticket_line_ID INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    Ticket_Type VARCHAR(30),
    Quantity INT NOT NULL CHECK (Quantity > 0),
    Price_per_ticket DECIMAL(6, 2) NOT NULL CHECK (price_per_ticket >= 0),
    Ticket_ID INT NOT NULL,
    Total_sum_of_ticket DECIMAL(6, 2) GENERATED ALWAYS AS (Quantity * price_per_ticket) STORED,
    Exhibition_ID INT NULL,
    Created_by VARCHAR(30),
    Created_at DATE,
    Updated_by VARCHAR(30),
    Updated_at DATE,
    CONSTRAINT fk_ticket_line_ticket FOREIGN KEY (ticket_ID) REFERENCES ticket (ticket_ID),
    CONSTRAINT fk_ticket_line_exhibition FOREIGN KEY (exhibition_ID) REFERENCES exhibition (exhibition_ID)
);

CREATE TABLE IF NOT EXISTS Event (
    event_ID INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    event_Name VARCHAR(30) NOT NULL,
    start_Date DATE NOT NULL,
    end_Date DATE NOT NULL,
    member_only BOOLEAN,
    coordinator_ID INT NULL,
    created_by VARCHAR(30),
    created_at DATE,
    updated_by VARCHAR(30),
    updated_at DATE,
    Max_capacity INT NOT NULL,
    CONSTRAINT chk_capacity CHECK (Max_capacity > 0),
    CHECK (end_Date >= start_Date),
    CONSTRAINT fk_Event_Coordinator FOREIGN KEY (coordinator_ID) REFERENCES Employee (Employee_ID)
);

CREATE TABLE IF NOT EXISTS event_registration (
    Event_Registration_ID INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    Registration_Date DATE NOT NULL,
    Event_ID INT NOT NULL,
    Membership_ID INT NOT NULL,
    Ticket_ID INT NOT NULL,
    Created_By VARCHAR(30),
    Created_At DATE,
    Updated_By VARCHAR(30),
    Updated_At DATE,
    UNIQUE (Event_ID, Membership_ID),
    CONSTRAINT fk_Reg_Event FOREIGN KEY (Event_ID) REFERENCES Event (Event_ID),
    CONSTRAINT fk_Reg_Membership FOREIGN KEY (Membership_ID) REFERENCES Membership (Membership_ID),
    CONSTRAINT fk_Reg_Ticket FOREIGN KEY (Ticket_ID) REFERENCES Ticket (Ticket_ID)
);

CREATE TABLE IF NOT EXISTS Schedule (
    Schedule_ID INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    Shift_Date DATE,
    Start_Time TIME,
    End_Time TIME,
    Employee_ID INT NOT NULL,
    Exhibition_ID INT NOT NULL,
    Duty VARCHAR(20),
    Created_By VARCHAR(30),
    Created_At DATE,
    Updated_By VARCHAR(30),
    Updated_At DATE,
    CHECK (End_Time > Start_Time),
    CONSTRAINT fk_Schedule_Employee FOREIGN KEY (Employee_ID) REFERENCES Employee (Employee_ID),
    CONSTRAINT fk_Schedule_Exhibition FOREIGN KEY (Exhibition_ID) REFERENCES Exhibition (Exhibition_ID)
);

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

CREATE TABLE IF NOT EXISTS Gift_Shop_Sale (
    Gift_Shop_Sale_ID INT AUTO_INCREMENT PRIMARY KEY,
    Sale_Date DATE NOT NULL,
    Employee_ID INT NOT NULL,
    Created_By VARCHAR(30),
    Created_At DATE,
    Updated_By VARCHAR(30),
    Updated_At DATE NULL,
    CONSTRAINT fk_Gift_Shop_Sale_EMPLOYEE FOREIGN KEY (Employee_ID) REFERENCES Employee (Employee_ID) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS Gift_Shop_Sale_Line (
    Gift_Shop_Sale_Line_ID INT AUTO_INCREMENT PRIMARY KEY,
    Price_When_Item_is_Sold DECIMAL(10, 2) NOT NULL,
    Quantity INT NOT NULL,
    Total_Sum_For_Gift_Shop_Sale DECIMAL(10, 2) NOT NULL,
    Gift_Shop_Sale_ID INT NOT NULL,
    Gift_Shop_Item_ID INT NOT NULL,
    Created_By VARCHAR(30),
    Created_At DATE,
    Updated_By VARCHAR(30) NULL,
    Updated_At DATE NULL,
    CONSTRAINT fk_Gift_Shop_Sale_Line_Sale FOREIGN KEY (Gift_Shop_Sale_ID) REFERENCES Gift_Shop_Sale (Gift_Shop_Sale_ID) ON DELETE CASCADE,
    CONSTRAINT fk_Gift_Shop_Sale_Line_Item FOREIGN KEY (Gift_Shop_Item_ID) REFERENCES Gift_Shop_Item (Gift_Shop_Item_ID) ON DELETE RESTRICT,
    CONSTRAINT chk_Gift_Shop_Sale_Line_Qty CHECK (Quantity > 0),
    CONSTRAINT chk_Gift_Shop_Sale_Line_Price CHECK (Price_When_Item_is_Sold >= 0),
    CONSTRAINT chk_Gift_Shop_Sale_Line_Total CHECK (
        Total_Sum_For_Gift_Shop_Sale = Quantity * Price_When_Item_is_Sold
    )
);

CREATE TABLE IF NOT EXISTS Food_Sale (
    Food_Sale_ID INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    Sale_Date DATE,
    Employee_ID INT NOT NULL,
    Created_By VARCHAR(30),
    Created_At DATE,
    Updated_By VARCHAR(30),
    Updated_At DATE,
    CONSTRAINT fk_Food_sale_Employee FOREIGN KEY (Employee_ID) REFERENCES Employee (Employee_ID)
);

CREATE TABLE IF NOT EXISTS Food_Sale_Line (
    Food_Sale_Line_ID INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    Price_When_Food_Was_Sold DECIMAL(10, 2) NOT NULL,
    Quantity INT NOT NULL,
    Food_Sale_ID INT NOT NULL,
    Food_ID INT NOT NULL,
    Created_By VARCHAR(30),
    Created_At DATE,
    Updated_By VARCHAR(30),
    Updated_At DATE,
    CHECK (Quantity > 0),
    CHECK (Price_When_Food_Was_Sold >= 0),
    CONSTRAINT fk_Food_Sale_Line_Sale FOREIGN KEY (Food_Sale_ID) REFERENCES Food_Sale (Food_Sale_ID) ON DELETE CASCADE,
    CONSTRAINT fk_Food_Sale_Line_Food FOREIGN KEY (Food_ID) REFERENCES Food (Food_ID) ON DELETE RESTRICT
);

-- Circular foreign key: added after tables are created (safe to re-run)
SET @fk_exists = (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'Department'
      AND CONSTRAINT_NAME = 'fk_Employee_Manager'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @drop_sql = IF(@fk_exists > 0, 'ALTER TABLE Department DROP FOREIGN KEY fk_Employee_Manager', 'SELECT 1');
PREPARE stmt FROM @drop_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE Department
ADD CONSTRAINT fk_Employee_Manager FOREIGN KEY (Manager_ID) REFERENCES Employee (Employee_ID) ON DELETE SET NULL;
