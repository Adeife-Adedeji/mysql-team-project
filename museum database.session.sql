--Below are tables with no foreign keys
--@Block,
CREATE TABLE Department (
    Department_ID INT PRIMARY KEY NOT NULL,
    Department_Name VARCHAR(30) NOT NULL,
    Manager_ID INT NULL,
    Created_By VARCHAR(30),
    Created_At DATE,
    Updated_By VARCHAR(30),
    Updated_AT DATE
);

--@Block
CREATE TABLE Artist(
    Artist_ID INT PRIMARY KEY NOT NULL,
    Artist_Name VARCHAR(30) NOT NULL,
    Date_of_Birth DATE,
    Date_of_Death DATE NULL,
    Birth_Place VARCHAR(30)
);

--@Block
CREATE TABLE Exhibition(
    Exhibition_ID INT PRIMARY KEY NOT NULL,
    Exhibition_Name VARCHAR(50) NOT NULL,
    Starting_Date DATE NOT NULL,
    Ending_Date DATE NOT NULL
);

--@Block
CREATE TABLE Gift_Shop_Item(
    Gift_Shop_Item INT PRIMARY KEY NOT NULL,
    Name_of_Item VARCHAR(30),
    Price_of_Item DECIMAL(4,2),
    Category VARCHAR(30),
    Stock_Quantity INT NULL,
    Created_By VARCHAR(30),
    Created_At DATE,
    Updated_By VARCHAR(30),
    Updated_AT DATE
);

--@Block
CREATE TABLE Food(
    Food_ID INT PRIMARY KEY NOT NULL,
    Food_Name VARCHAR(30),
    Food_Price DECIMAL(4,2),
    Created_By VARCHAR(30),
    Created_At DATE,
    Updated_By VARCHAR(30),
    Updated_AT DATE
);

--@Block
CREATE TABLE Membership(
    Membership_ID INT PRIMARY KEY NOT NULL,
    Last_Name VARCHAR(30) NOT NULL,
    First_Name VARCHAR(30) NOT NULL,
    Phone_Number VARCHAR(10),
    Email VARCHAR(50),
    Date_Joined DATE,
    Date_Exited DATE NULL,
    Created_By VARCHAR(30),
    Created_At DATE,
    Updated_By VARCHAR(30),
    Updated_AT DATE
);

-- Below are tales with foreign keys
--@block

CREATE TABLE Employee (
    Employee_ID INT PRIMARY KEY NOT NULL,
    Last_Name VARCHAR(30),
    First_Name VARCHAR(30),
    Date_Hired DATE,
    Email VARCHAR(50),
    Employee_Address VARCHAR(50),
    Date_of_Birth DATE,
    Hourly_Pay DECIMAL (6,2),
    Salary DECIMAL(10, 2),
    Employee_Role VARCHAR(20),
    Supervisor_ID INT NULL, 
    Department_ID INT NULL,
    Created_By VARCHAR(30),
    Created_At DATE,
    Updated_By VARCHAR(30),
    Updated_AT DATE,

    CONSTRAINT fk_Employee_Supervisor
    FOREIGN KEY (Supervisor_ID) REFERENCES Employee(Employee_ID)
    ON DELETE SET NULL,

    CONSTRAINT fk_Employee_Department
    FOREIGN KEY (Department_ID) REFERENCES Department(Department_ID)
    ON DELETE SET NULL
);

-- @Block
CREATE TABLE ARTWORK(
    artwork_ID INT PRIMARY KEY NOT NULL,
    title VARCHAR(30) NOT NULL,
    type VARCHAR(30) NOT NULL,
    Date_Created DATE,
    Time_Period VARCHAR(30),
    Art_Style VARCHAR(30),
    Artist_ID INT NOT NULL,
    Created_By VARCHAR(30),
    Created_At DATE,
    Updated_By VARCHAR(30),
    Updated_AT DATE,
    
    CONSTRAINT fk_Artwork_Artist
    FOREIGN KEY (Artist_ID) REFERENCES Artist(Artist_ID)
);

-- @Block
CREATE TABLE Exhibition_Artwork(
    Exhibition_Artwork_ID INT PRIMARY KEY NOT NULL,
    Display_Room VARCHAR(30),
    Date_Installed DATE,
    Exhibition_ID INT,
    Artwork_ID INT,
    Created_By VARCHAR(30),
    Created_At DATE,
    Updated_By VARCHAR(30),
    Updated_AT DATE,

    CONSTRAINT fk_Exhibition_Artwork_Exhibition
    FOREIGN KEY (Exhibition_ID) REFERENCES Exhibition(Exhibition_ID),
    
    CONSTRAINT fk_Exhibition_Artwork_Artwork
    FOREIGN KEY (Artwork_ID) REFERENCES Artwork(Artwork_ID)
);

-- @Block
CREATE TABLE ticket(
    Ticket_ID INT PRIMARY KEY NOT NULL,
    Purchase_type VARCHAR(30),
    Purchase_Date DATE,
    Visit_Date DATE,
    Last_Name VARCHAR(30),
    First_Name VARCHAR(30),
    phone_number VARCHAR(10),
    Email VARCHAR(50),
    payment_method VARCHAR(30),
    membership_ID INT NULL,
    created_by VARCHAR(30),
    created_at DATE,
    updated_by VARCHAR(30),
    updated_at DATE,
    
    CONSTRAINT fk_ticket_Membership
    FOREIGN KEY (Membership_ID) REFERENCES Membership(Membership_ID)
);

-- @Block
CREATE TABLE ticket_line(
    ticket_line_ID INT PRIMARY KEY NOT NULL,
    ticket_Type VARCHAR(30),
    Quantity INT,
    price_per_ticket DECIMAL(6,2),
    Ticket_ID INT NOT NULL,
    total_sum_of_ticket DECIMAL(6,2) GENERATED ALWAYS AS (Quantity * price_per_ticket) STORED,
    exhibition_ID INT NULL,
    created_by VARCHAR(30),
    created_at DATE,
    updated_by VARCHAR(30),
    updated_at DATE,
    
    CONSTRAINT fk_ticket_line_ticket
    FOREIGN KEY (ticket_ID) REFERENCES ticket(ticket_ID),
    
    CONSTRAINT fk_ticket_line_exhibition
    FOREIGN KEY (exhibition_ID) REFERENCES exhibition(exhibition_ID)
);

-- @Block
CREATE TABLE Event (
    event_ID INT PRIMARY KEY NOT NULL,
    event_Name VARCHAR(30) NOT NULL,
    start_Date DATE,
    end_Date DATE,
    member_only BOOLEAN,
    coordinator_ID INT NULL,
    created_by VARCHAR(30),
    created_at DATE,    
    updated_by VARCHAR(30),
    updated_at DATE,
    Max_capacity INT NOT NULL,
    
    CONSTRAINT chk_capacity CHECK (Max_capacity>0),
    
    CONSTRAINT fk_Event_Coordinator
    FOREIGN KEY(coordinator_ID) REFERENCES Employee(Employee_ID)
);

-- @Block
CREATE TABLE event_registration(
    Event_Registration_ID INT PRIMARY KEY NOT NULL,
    Registration_Date DATE,
    Event_ID INT,
    Membership_ID INT,
    Ticket_ID INT,
    Created_By VARCHAR(30),
    Created_At DATE,
    Updated_By VARCHAR(30),
    Updated_At DATE,
    
    CONSTRAINT fk_Reg_Event
    FOREIGN KEY (Event_ID) REFERENCES Event(Event_ID),
    
    CONSTRAINT fk_Reg_Membership
    FOREIGN KEY (Membership_ID) REFERENCES Membership(Membership_ID),
    
    CONSTRAINT fk_Reg_Ticket
    FOREIGN KEY (Ticket_ID) REFERENCES Ticket(Ticket_ID)
);

--@Block, this is for circular foreign keys after tables have been made

ALTER TABLE Department
ADD CONSTRAINT fk_Employee_Manager
FOREIGN KEY (Manager_ID) REFERENCES Employee(Employee_ID)
ON DELETE SET NULL;

