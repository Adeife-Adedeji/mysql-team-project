-- HOW TO RUN: In MySQL Workbench use File > Run SQL Script (NOT the query editor lightning bolt)
-- The DELIMITER command only works via File > Run SQL Script

USE museumdb;

DELIMITER $$

DROP PROCEDURE IF EXISTS ReportArtworkByArtist$$
CREATE PROCEDURE ReportArtworkByArtist()
BEGIN
    SELECT
        AR.Artist_Name,
        AW.Title,
        AW.Type,
        AW.Date_Created,
        AW.Time_Period,
        AW.Art_Style
    FROM Artist AS AR
    JOIN Artwork AS AW
        ON AR.Artist_ID = AW.Artist_ID
    ORDER BY AR.Artist_Name, AW.Title;
END$$

DROP PROCEDURE IF EXISTS ReportEmployeeByDepartment$$
CREATE PROCEDURE ReportEmployeeByDepartment()
BEGIN
    SELECT
        E.Employee_ID,
        CONCAT(E.First_Name, ' ', E.Last_Name) AS Employee_Name,
        E.Employee_Role,
        E.Date_Hired,
        E.Hourly_Pay,
        E.Salary,
        D.Department_ID,
        D.Department_Name,
        CONCAT(S.First_Name, ' ', S.Last_Name) AS Supervisor_Name
    FROM Employee AS E
    LEFT JOIN department AS D
        ON E.Department_ID = D.Department_ID
    LEFT JOIN Employee AS S
        ON E.Supervisor_ID = S.Employee_ID
    ORDER BY D.Department_Name, E.Last_Name, E.First_Name;
END$$

DROP PROCEDURE IF EXISTS ReportTicketSales$$
CREATE PROCEDURE ReportTicketSales()
BEGIN
    SELECT
        T.Ticket_ID,
        T.Purchase_type,
        T.Purchase_Date,
        T.Visit_Date,
        CONCAT(T.First_Name, ' ', T.Last_Name) AS Customer_Name,
        T.Email,
        T.Payment_method,
        T.Membership_ID,
        TL.Ticket_line_ID,
        TL.Ticket_Type,
        TL.Quantity,
        TL.Price_per_ticket,
        TL.Total_sum_of_ticket,
        EX.Exhibition_ID,
        EX.Exhibition_Name
    FROM Ticket AS T
    JOIN ticket_line AS TL
        ON T.Ticket_ID = TL.Ticket_ID
    LEFT JOIN Exhibition AS EX
        ON TL.Exhibition_ID = EX.Exhibition_ID
    ORDER BY T.Purchase_Date DESC, T.Ticket_ID;
END$$

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
