-- reports artwork by artis, employees by department and ticket sales report
--@block
CREATE PROCEDURE ReportArtworkByArtist()
BEGIN
    SELECT
        AR.Artist_ID,
        AR.Artist_Name,
        AW.Artwork_ID,
        AW.Title,
        AW.Type,
        AW.Date_Created,
        AW.Time_Period,
        AW.Art_Style
    FROM Artist AS AR
    JOIN Artwork AS AW
        ON AR.Artist_ID = AW.Artist_ID
    ORDER BY AR.Artist_Name, AW.Title;
END;
--@block
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
    LEFT JOIN department as D
        ON E.Department_ID = D.Department_ID
    LEFT JOIN Employee AS S
        ON E.Supervisor_ID = S.Employee_ID
    ORDER BY D.Department_Name, E.Last_Name, E.First_Name;
END;
--@block
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
    Join ticket_line as TL
        ON T.Ticket_ID = TL.Ticket_ID
    LEFT JOIN Exhibition AS EX
        ON TL.Exhibition_ID = EX.Exhibition_ID
    ORDER BY T.Purchase_Date DESC, T.Ticket_ID;
END;