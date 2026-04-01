--Below are tables with no foreign keys
--@Block
CREATE TABLE Department (
    Department_ID INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    Department_Name VARCHAR(30) NOT NULL,
    Manager_ID INT NULL,
    Created_By VARCHAR(30),
    Created_At DATE,
    Updated_By VARCHAR(30),
    Updated_AT DATE
);

CREATE TABLE Artist (
    Artist_ID INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    Artist_Name VARCHAR(30) NOT NULL,
    Date_of_Birth DATE,
    Date_of_Death DATE NULL,
    Birth_Place VARCHAR(30)
);

CREATE TABLE Exhibition (
    Exhibition_ID INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    Exhibition_Name VARCHAR(50) NOT NULL,
    Starting_Date DATE NOT NULL,
    Ending_Date DATE NOT NULL,
    CHECK (Ending_Date >= Starting_Date)
);

CREATE TABLE Gift_Shop_Item (
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

CREATE TABLE Food (
    Food_ID INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    Food_Name VARCHAR(30),
    Food_Price DECIMAL(4, 2) NOT NULL,
    Created_By VARCHAR(30),
    Created_At DATE,
    Updated_By VARCHAR(30),
    Updated_AT DATE,
    CHECK (Food_Price >= 0)
);

CREATE TABLE Membership (
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

-- Below are tables with foreign keys
--@block

CREATE TABLE Employee (
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

CREATE TABLE ARTWORK (
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

CREATE TABLE Exhibition_Artwork (
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

CREATE TABLE Ticket (
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

CREATE TABLE ticket_line (
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

CREATE TABLE Event (
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

CREATE TABLE event_registration (
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

CREATE TABLE Schedule (
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

CREATE TABLE Gift_Shop_Sale (
    Gift_Shop_Sale_ID INT AUTO_INCREMENT PRIMARY KEY,
    Sale_Date DATE NOT NULL,
    Employee_ID INT NOT NULL,
    Created_By VARCHAR(30),
    Created_At DATE,
    Updated_By VARCHAR(30),
    Updated_At DATE NULL,
    CONSTRAINT fk_Gift_Shop_Sale_EMPLOYEE FOREIGN KEY (Employee_ID) REFERENCES Employee (Employee_ID) ON DELETE RESTRICT
);

CREATE TABLE Gift_Shop_Sale_Line (
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

CREATE TABLE Food_Sale (
    Food_Sale_ID INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    Sale_Date DATE,
    Employee_ID INT NOT NULL,
    Created_By VARCHAR(30),
    Created_At DATE,
    Updated_By VARCHAR(30),
    Updated_At DATE,
    CONSTRAINT fk_Food_sale_Employee FOREIGN KEY (Employee_ID) REFERENCES Employee (Employee_ID)
);

CREATE TABLE Food_Sale_Line (
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

--@Block, this is for circular foreign keys after tables have been made

ALTER TABLE Department
ADD CONSTRAINT fk_Employee_Manager FOREIGN KEY (Manager_ID) REFERENCES Employee (Employee_ID) ON DELETE SET NULL;