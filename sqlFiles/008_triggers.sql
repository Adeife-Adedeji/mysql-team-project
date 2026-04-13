-- HOW TO RUN: In MySQL Workbench use File > Run SQL Script (NOT the query editor lightning bolt)
-- The DELIMITER command only works via File > Run SQL Script

USE museumdb;

DELIMITER $$

-- Trigger: block event registration when event is full
-- Counts current signups and compares to Max_capacity from the Event table.
-- current_count >= max_cap fires SIGNAL to block the insert.
-- If this registration fills the last spot (current_count + 1 > max_cap), notifies the manager.
DROP TRIGGER IF EXISTS trigger_check_event_capacity$$
CREATE TRIGGER trigger_check_event_capacity
BEFORE INSERT ON event_registration
FOR EACH ROW
BEGIN
    DECLARE current_count INT;
    DECLARE max_cap INT;
    DECLARE event_name VARCHAR(30);

    SELECT COUNT(*) INTO current_count
    FROM event_registration
    WHERE Event_ID = NEW.Event_ID;

    SELECT Max_capacity, event_Name INTO max_cap, event_name
    FROM Event
    WHERE Event_ID = NEW.Event_ID;

    IF(
        current_count >= max_cap
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Event is fully booked';
    END IF;

    IF(
        current_count + 1 > max_cap
    ) THEN
        INSERT INTO manager_notifications (source_table, source_id, message)
        VALUES ('Event', NEW.Event_ID, CONCAT('Event "', event_name, '" is now fully booked'));
    END IF;
END$$

-- Trigger: prevent adding a duplicate artist
-- SELECT 1 just checks existence. Both name AND birthdate must match,
-- so two artists with the same name but different birthdays are still allowed.
DROP TRIGGER IF EXISTS trigger_check_artist_exists$$
CREATE TRIGGER trigger_check_artist_exists
BEFORE INSERT ON Artist
FOR EACH ROW
BEGIN
    IF EXISTS (
        SELECT 1 FROM Artist
        WHERE Artist_Name = NEW.Artist_Name
          AND Date_of_Birth = NEW.Date_of_Birth
          AND (Date_of_Death = NEW.Date_of_Death OR (Date_of_Death IS NULL AND NEW.Date_of_Death IS NULL))
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Artist already exists in the database';
    END IF;
END$$

-- Trigger: prevent adding duplicate artwork

DROP TRIGGER IF EXISTS trigger_check_artwork_duplicate$$
CREATE TRIGGER trigger_check_artwork_duplicate_insert
BEFORE INSERT ON Artwork
FOR EACH ROW
BEGIN
    IF EXISTS (
        SELECT 1 FROM Artwork
        WHERE Title = NEW.Title
          AND Artist_ID = NEW.Artist_ID
          AND (
                (Date_Created = NEW.Date_Created)
                OR (Date_Created IS NULL AND NEW.Date_Created IS NULL)
              )
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Artwork already exists: same title, artist, and creation date';
    END IF;
END$$

-- trigger: prevent exhbition from ending before it starts
DROP TRIGGER IF EXISTS trigger_check_exhibition_dates$$
CREATE TRIGGER trigger_check_exhibition_dates
BEFORE INSERT ON Exhibition
FOR EACH ROW
BEGIN
    IF NEW.Ending_Date < NEW.Starting_Date THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Exhibition end date cannot be before start date';
    END IF;
END$$

-- Trigger: block ticket sale if membership is expired
-- Only runs if a Membership_ID was provided (IS NOT NULL).
-- Date_Exited < NEW.Visit_Date means the membership expired before the visit date.
DROP TRIGGER IF EXISTS trigger_check_membership_validity$$
CREATE TRIGGER trigger_check_membership_validity
BEFORE INSERT ON Ticket
FOR EACH ROW
BEGIN
    IF NEW.Membership_ID IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM Membership
            WHERE Membership_ID = NEW.Membership_ID
              AND Date_Exited IS NOT NULL
              AND Date_Exited < NEW.Visit_Date
        )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Membership has expired';
    END IF;
END$$

-- Trigger: prevent scheduling an employee for overlapping shifts
-- Checks same employee, same day. The overlap formula is:
-- Start_Time < NEW.End_Time AND End_Time > NEW.Start_Time catches any partial or full overlap.
DROP TRIGGER IF EXISTS trigger_check_employee_schedule$$
CREATE TRIGGER trigger_check_employee_schedule
BEFORE INSERT ON Schedule
FOR EACH ROW
BEGIN
    IF EXISTS (
        SELECT 1 FROM Schedule
        WHERE Employee_ID = NEW.Employee_ID
          AND Shift_Date = NEW.Shift_Date
          AND (
              (Start_Time < NEW.End_Time AND End_Time > NEW.Start_Time)
          )
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Employee has an overlapping shift';
    END IF;
END$$

-- Trigger: block deleting artwork that is on display
-- OLD.Artwork_ID refers to the row being deleted.
-- If a matching row exists in Exhibition_Artwork, the delete is blocked.
DROP TRIGGER IF EXISTS trigger_prevent_artwork_deletion$$
CREATE TRIGGER trigger_prevent_artwork_deletion
BEFORE DELETE ON Artwork
FOR EACH ROW
BEGIN
    IF EXISTS (
        SELECT 1 FROM Exhibition_Artwork
        WHERE Artwork_ID = OLD.Artwork_ID
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot delete artwork that is currently on display in an exhibition';
    END IF;
END$$

-- Trigger: validate artist birth and death dates
-- Only runs if Date_of_Death was provided (IS NOT NULL).
-- If death date is earlier than birth date, SIGNAL blocks the insert.
DROP TRIGGER IF EXISTS trigger_check_artist_dates$$
CREATE TRIGGER trigger_check_artist_dates
BEFORE INSERT ON Artist
FOR EACH ROW
BEGIN
    IF NEW.Date_of_Death IS NOT NULL AND NEW.Date_of_Death < NEW.Date_of_Birth THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Date of death cannot be before date of birth';
    END IF;
END$$

-- Trigger: reduce gift shop stock when a sale is made
-- Fires AFTER insert so the sale line is already saved.
-- Subtracts NEW.Quantity from the item's Stock_Quantity automatically.
DROP TRIGGER IF EXISTS trigger_reduce_gift_shop_stock$$
CREATE TRIGGER trigger_reduce_gift_shop_stock
AFTER INSERT ON Gift_Shop_Sale_Line
FOR EACH ROW
BEGIN
    UPDATE Gift_Shop_Item
    SET Stock_Quantity = Stock_Quantity - NEW.Quantity
    WHERE Gift_Shop_Item_ID = NEW.Gift_Shop_Item_ID;
END$$

-- Trigger: keep stock accurate when a sale line is edited
-- First UPDATE adds OLD.Quantity back (undoes the original sale).
-- Second UPDATE subtracts NEW.Quantity (applies the updated amount).
-- Uses both OLD and NEW in case the item itself was also changed.
DROP TRIGGER IF EXISTS trigger_update_gift_shop_stock$$
CREATE TRIGGER trigger_update_gift_shop_stock
AFTER UPDATE ON Gift_Shop_Sale_Line
FOR EACH ROW
BEGIN
    UPDATE Gift_Shop_Item
    SET Stock_Quantity = Stock_Quantity + OLD.Quantity
    WHERE Gift_Shop_Item_ID = OLD.Gift_Shop_Item_ID;

    UPDATE Gift_Shop_Item
    SET Stock_Quantity = Stock_Quantity - NEW.Quantity
    WHERE Gift_Shop_Item_ID = NEW.Gift_Shop_Item_ID;
END$$

-- Trigger: restore gift shop stock when a sale line is deleted
-- OLD.Quantity holds the quantity from the deleted row.
-- Adds it back to inventory with Stock_Quantity + OLD.Quantity.
DROP TRIGGER IF EXISTS trigger_restore_gift_shop_stock$$
CREATE TRIGGER trigger_restore_gift_shop_stock
AFTER DELETE ON Gift_Shop_Sale_Line
FOR EACH ROW
BEGIN
    UPDATE Gift_Shop_Item
    SET Stock_Quantity = Stock_Quantity + OLD.Quantity
    WHERE Gift_Shop_Item_ID = OLD.Gift_Shop_Item_ID;
END$$

-- Trigger: alert manager when gift shop stock runs low
-- NEW.Stock_Quantity <= 5 AND OLD.Stock_Quantity > 5 means it only fires
-- when crossing the threshold downward, not on every stock update.
DROP TRIGGER IF EXISTS trigger_low_stock_alert$$
CREATE TRIGGER trigger_low_stock_alert
AFTER UPDATE ON Gift_Shop_Item
FOR EACH ROW
BEGIN
    IF NEW.Stock_Quantity <= 5 AND OLD.Stock_Quantity > 5 THEN
        INSERT INTO manager_notifications (source_table, source_id, message)
        VALUES (
            'Gift_Shop_Item',
            NEW.Gift_Shop_Item_ID,
            CONCAT('Low stock alert: "', NEW.Name_of_Item, '" has only ', NEW.Stock_Quantity, ' units remaining.')
        );
    END IF;
END$$

-- Trigger: block gift shop sale if there is not enough stock
-- DECLARE available INT creates a local variable, SELECT ... INTO loads the current stock.
-- If available < NEW.Quantity, not enough stock, so SIGNAL blocks the insert.
DROP TRIGGER IF EXISTS trigger_check_gift_shop_stock$$
CREATE TRIGGER trigger_check_gift_shop_stock
BEFORE INSERT ON Gift_Shop_Sale_Line
FOR EACH ROW
BEGIN
    DECLARE available INT;

    SELECT Stock_Quantity INTO available
    FROM Gift_Shop_Item
    WHERE Gift_Shop_Item_ID = NEW.Gift_Shop_Item_ID;

    IF available < NEW.Quantity THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Insufficient stock for this item';
    END IF;
END$$

-- Trigger: alert manager when an employee earns more than their supervisor
-- Subquery looks up the supervisor's salary using NEW.Supervisor_ID and compares inline.
-- No SIGNAL here — the employee is still saved, management just gets notified.
DROP TRIGGER IF EXISTS trigger_salary_violation$$
CREATE TRIGGER trigger_salary_violation
BEFORE INSERT ON Employee
FOR EACH ROW
BEGIN
    IF NEW.Salary IS NOT NULL AND NEW.Supervisor_ID IS NOT NULL THEN
        IF NEW.Salary > (
            SELECT Salary FROM Employee
            WHERE Employee_ID = NEW.Supervisor_ID
        ) THEN
            INSERT INTO manager_notifications (source_table, source_id, message)
            VALUES (
                'Employee',
                NEW.Supervisor_ID,
                CONCAT('Salary violation: ', NEW.First_Name, ' ', NEW.Last_Name,
                       ' has a higher salary than their supervisor (Employee_ID: ', NEW.Supervisor_ID, ')')
            );
        END IF;
    END IF;
END$$

-- Trigger: auto-flag artwork for restoration when condition is poor or critical
-- IN ('Poor', 'Critical') checks both values at once.
-- SET NEW.Restoration_Required = TRUE changes the column before the row is saved,
-- which is only possible in a BEFORE INSERT trigger.
DROP TRIGGER IF EXISTS trigger_auto_flag_restoration$$
CREATE TRIGGER trigger_auto_flag_restoration
BEFORE INSERT ON Artwork_Condition_Report
FOR EACH ROW
BEGIN
    IF NEW.Condition_Status IN ('Poor', 'Critical') THEN
        SET NEW.Restoration_Required = TRUE;
    END IF;
END$$

-- Trigger: block adding artwork to an exhibition if it is out on loan
-- Loan_Type = 'Outgoing' means we lent it out (incoming loans don't block display).
-- Status = 'Active' ignores returned loans. CURDATE() BETWEEN Start_Date AND End_Date
-- confirms the loan is still ongoing right now.
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

-- Trigger: block tour registration when the tour is full
-- Two inline subqueries: one counts current registrations, the other gets Max_Capacity.
-- If count >= capacity, SIGNAL blocks the insert.
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

-- Trigger: reduce food stock when a sale line is added
-- Fires AFTER insert so the sale line is already saved.
-- Subtracts NEW.Quantity from the food item's Stock_Quantity automatically.
DROP TRIGGER IF EXISTS trigger_reduce_food_stock$$
CREATE TRIGGER trigger_reduce_food_stock
AFTER INSERT ON Food_Sale_Line
FOR EACH ROW
BEGIN
    UPDATE Food SET Stock_Quantity = Stock_Quantity - NEW.Quantity
    WHERE Food_ID = NEW.Food_ID;
END$$

-- Trigger: keep food stock accurate when a sale line is edited
-- Adds OLD.Quantity back (undoes original), then subtracts NEW.Quantity (applies update).
DROP TRIGGER IF EXISTS trigger_update_food_stock$$
CREATE TRIGGER trigger_update_food_stock
AFTER UPDATE ON Food_Sale_Line
FOR EACH ROW
BEGIN
    UPDATE Food SET Stock_Quantity = Stock_Quantity + OLD.Quantity WHERE Food_ID = OLD.Food_ID;
    UPDATE Food SET Stock_Quantity = Stock_Quantity - NEW.Quantity WHERE Food_ID = NEW.Food_ID;
END$$

-- Trigger: restore food stock when a sale line is deleted
-- OLD.Quantity holds the deleted row's quantity; adds it back to inventory.
DROP TRIGGER IF EXISTS trigger_restore_food_stock$$
CREATE TRIGGER trigger_restore_food_stock
AFTER DELETE ON Food_Sale_Line
FOR EACH ROW
BEGIN
    UPDATE Food SET Stock_Quantity = Stock_Quantity + OLD.Quantity WHERE Food_ID = OLD.Food_ID;
END$$

-- Trigger: alert manager when food stock runs low
-- Only fires when crossing the threshold downward, not on every update.
DROP TRIGGER IF EXISTS trigger_low_food_stock_alert$$
CREATE TRIGGER trigger_low_food_stock_alert
AFTER UPDATE ON Food
FOR EACH ROW
BEGIN
    IF NEW.Stock_Quantity <= 5 AND OLD.Stock_Quantity > 5 THEN
        INSERT INTO manager_notifications (source_table, source_id, message)
        VALUES ('Food', NEW.Food_ID,
            CONCAT('Low stock alert: "', NEW.Food_Name, '" has only ', NEW.Stock_Quantity, ' portions remaining.'));
    END IF;
END$$

-- Trigger: block cafe sale if there is not enough food stock
-- SELECT ... INTO loads current stock; SIGNAL blocks the insert if insufficient.
DROP TRIGGER IF EXISTS trigger_check_food_stock$$
CREATE TRIGGER trigger_check_food_stock
BEFORE INSERT ON Food_Sale_Line
FOR EACH ROW
BEGIN
    DECLARE available INT;
    SELECT Stock_Quantity INTO available FROM Food WHERE Food_ID = NEW.Food_ID;
    IF available < NEW.Quantity THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Insufficient food stock for this item';
    END IF;
END$$

DELIMITER ;
