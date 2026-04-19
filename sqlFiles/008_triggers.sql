USE museumdb;

DELIMITER $$

-- Trigger: block event registration when event is full
-- Counts current signups and compares to Max_capacity from the Event table.
-- current_count >= max_cap fires SIGNAL to block the insert.
-- If this registration fills the last spot (current_count + 1 > max_cap), notifies the manager.
-- changed event_name to e_event_name which prevented the message from appearing in the notification tab
DROP TRIGGER IF EXISTS trigger_check_event_capacity$$
CREATE TRIGGER trigger_check_event_capacity
BEFORE INSERT ON event_registration
FOR EACH ROW
BEGIN
    DECLARE current_count INT;
    DECLARE max_cap INT;
    DECLARE e_event_name VARCHAR(30);

    SELECT COUNT(*) INTO current_count
    FROM event_registration
    WHERE Event_ID = NEW.Event_ID;

    SELECT Max_capacity, event_Name INTO max_cap, e_event_name
    FROM Event
    WHERE Event_ID = NEW.Event_ID;

    IF(
        current_count >= max_cap
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Event is fully booked';
    END IF;

    IF(
        current_count + 1 >= max_cap
    ) THEN
        INSERT INTO manager_notifications (source_table, source_id, message)
        VALUES ('Event', NEW.Event_ID, CONCAT('Event "', e_event_name, '" is now fully booked'));
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

    IF NEW.Stock_Quantity = 0 AND OLD.Stock_Quantity > 0 THEN
        INSERT INTO manager_notifications (source_table, source_id, message)
        VALUES (
            'Gift_Shop_Item',
            NEW.Gift_Shop_Item_ID,
            CONCAT('Out of stock alert: "', NEW.Name_of_Item, '" is now out of stock.')
        );
    END IF;
END$$

-- Trigger: alert manager when an employee earns more than their supervisor
-- Subquery looks up the supervisor's salary using NEW.Supervisor_ID and compares inline.
-- No SIGNAL here, the employee is still saved, management just gets notified.
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

    IF NEW.Stock_Quantity = 0 AND OLD.Stock_Quantity > 0 THEN
        INSERT INTO manager_notifications (source_table, source_id, message)
        VALUES ('Food', NEW.Food_ID,
            CONCAT('Out of stock alert: "', NEW.Food_Name, '" is now out of stock.'));
    END IF;
END$$

-- below are triggers that are more like constraints, I was too lazy to make them into their own file

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


-- Trigger: auto-set expiry date to 1 year from Date_Joined on INSERT
-- Staff only fills in Date_Joined — expiry is calculated automatically.
-- Also forces Status = 'Active' so every new member starts clean.
DROP TRIGGER IF EXISTS trigger_membership_set_expiry$$
CREATE TRIGGER trigger_membership_set_expiry
BEFORE INSERT ON Membership
FOR EACH ROW
BEGIN
    IF NEW.Date_Joined IS NOT NULL THEN
        SET NEW.Date_Exited = DATE_ADD(NEW.Date_Joined, INTERVAL 1 YEAR);
    END IF;
    SET NEW.Status = 'Active';
END$$

-- Trigger: recalculate expiry if Date_Joined is edited on UPDATE
-- Only recalculates when Date_Joined itself changed and member is not Cancelled.
-- This does NOT fire during renewals, which set Date_Exited directly without
-- changing Date_Joined, so the renewal value is preserved.
DROP TRIGGER IF EXISTS trigger_membership_update_expiry$$
CREATE TRIGGER trigger_membership_update_expiry
BEFORE UPDATE ON Membership
FOR EACH ROW
BEGIN
    IF NEW.Date_Joined != OLD.Date_Joined AND NEW.Status != 'Cancelled' THEN
        SET NEW.Date_Exited = DATE_ADD(NEW.Date_Joined, INTERVAL 1 YEAR);
    END IF;
END$$

-- Trigger: block ticket sale if membership is not active
-- Status is now the authoritative field. 'Active' = valid, 'Expired'/'Cancelled' = blocked.
-- The old Date_Exited < Visit_Date check is removed because Date_Exited is now auto-set
-- by trigger_membership_set_expiry and the daily event manages Status transitions.
DROP TRIGGER IF EXISTS trigger_check_membership_validity$$
CREATE TRIGGER trigger_check_membership_validity
BEFORE INSERT ON Ticket
FOR EACH ROW
BEGIN
    IF NEW.Membership_ID IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM Membership
            WHERE Membership_ID = NEW.Membership_ID
              AND Status != 'Active'
        ) THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Membership is expired or cancelled';
        END IF;
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

DROP TRIGGER IF EXISTS trigger_check_gift_shop_stock_update$$
CREATE TRIGGER trigger_check_gift_shop_stock_update
BEFORE UPDATE ON Gift_Shop_Sale_Line
FOR EACH ROW
BEGIN
    DECLARE available INT;

    SELECT Stock_Quantity INTO available
    FROM Gift_Shop_Item
    WHERE Gift_Shop_Item_ID = NEW.Gift_Shop_Item_ID;

    IF NEW.Gift_Shop_Item_ID = OLD.Gift_Shop_Item_ID THEN
        SET available = available + OLD.Quantity;
    END IF;

    IF available < NEW.Quantity THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Insufficient stock for this item';
    END IF;
END$$

DROP TRIGGER IF EXISTS trigger_prevent_negative_gift_shop_stock_insert$$
CREATE TRIGGER trigger_prevent_negative_gift_shop_stock_insert
BEFORE INSERT ON Gift_Shop_Item
FOR EACH ROW
BEGIN
    IF NEW.Stock_Quantity < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Gift shop stock cannot be negative';
    END IF;
END$$

DROP TRIGGER IF EXISTS trigger_prevent_negative_gift_shop_stock_update$$
CREATE TRIGGER trigger_prevent_negative_gift_shop_stock_update
BEFORE UPDATE ON Gift_Shop_Item
FOR EACH ROW
BEGIN
    IF NEW.Stock_Quantity < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Gift shop stock cannot be negative';
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

DROP TRIGGER IF EXISTS trigger_check_food_stock_update$$
CREATE TRIGGER trigger_check_food_stock_update
BEFORE UPDATE ON Food_Sale_Line
FOR EACH ROW
BEGIN
    DECLARE available INT;
    SELECT Stock_Quantity INTO available FROM Food WHERE Food_ID = NEW.Food_ID;

    IF NEW.Food_ID = OLD.Food_ID THEN
        SET available = available + OLD.Quantity;
    END IF;

    IF available < NEW.Quantity THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Insufficient food stock for this item';
    END IF;
END$$

DROP TRIGGER IF EXISTS trigger_prevent_negative_food_stock_insert$$
CREATE TRIGGER trigger_prevent_negative_food_stock_insert
BEFORE INSERT ON Food
FOR EACH ROW
BEGIN
    IF NEW.Stock_Quantity < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Food stock cannot be negative';
    END IF;
END$$

DROP TRIGGER IF EXISTS trigger_prevent_negative_food_stock_update$$
CREATE TRIGGER trigger_prevent_negative_food_stock_update
BEFORE UPDATE ON Food
FOR EACH ROW
BEGIN
    IF NEW.Stock_Quantity < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Food stock cannot be negative';
    END IF;
END$$

-- Trigger: prevent exhibition end date from being before start date (UPDATE)
-- The INSERT case is already covered by trigger_check_exhibition_dates above.
DROP TRIGGER IF EXISTS trigger_check_exhibition_dates_update$$
CREATE TRIGGER trigger_check_exhibition_dates_update
BEFORE UPDATE ON Exhibition
FOR EACH ROW
BEGIN
    IF NEW.Ending_Date < NEW.Starting_Date THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Exhibition end date cannot be before start date';
    END IF;
END$$

-- Trigger: prevent schedule shift end time from being before start time (INSERT)
-- Replaces the CHECK constraint so violations can be logged by the application.
DROP TRIGGER IF EXISTS trigger_check_schedule_times$$
CREATE TRIGGER trigger_check_schedule_times
BEFORE INSERT ON Schedule
FOR EACH ROW
BEGIN
    IF NEW.End_Time <= NEW.Start_Time THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Shift end time must be after start time';
    END IF;
END$$

-- Trigger: prevent schedule shift end time from being before start time (UPDATE)
DROP TRIGGER IF EXISTS trigger_check_schedule_times_update$$
CREATE TRIGGER trigger_check_schedule_times_update
BEFORE UPDATE ON Schedule
FOR EACH ROW
BEGIN
    IF NEW.End_Time <= NEW.Start_Time THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Shift end time must be after start time';
    END IF;
END$$

-- Trigger: prevent tour end time from being before start time (INSERT)
-- Replaces the CHECK constraint so violations can be logged by the application.
DROP TRIGGER IF EXISTS trigger_check_tour_times$$
CREATE TRIGGER trigger_check_tour_times
BEFORE INSERT ON Tour
FOR EACH ROW
BEGIN
    IF NEW.End_Time <= NEW.Start_Time THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Tour end time must be after start time';
    END IF;
END$$

-- Trigger: prevent event end date from being before start date (INSERT)
-- Replaces the CHECK constraint so the violation can be logged by the application.
DROP TRIGGER IF EXISTS trigger_check_event_dates$$
CREATE TRIGGER trigger_check_event_dates
BEFORE INSERT ON Event
FOR EACH ROW
BEGIN
    IF NEW.end_Date < NEW.start_Date THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Event end date cannot be before start date';
    END IF;
END$$

-- Trigger: prevent event end date from being before start date (UPDATE)
-- Same rule as the insert trigger but fires when an existing event is edited.
DROP TRIGGER IF EXISTS trigger_check_event_dates_update$$
CREATE TRIGGER trigger_check_event_dates_update
BEFORE UPDATE ON Event
FOR EACH ROW
BEGIN
    IF NEW.end_Date < NEW.start_Date THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Event end date cannot be before start date';
    END IF;
END$$

-- Trigger: prevent artwork loan end date from being before start date
-- Replaces the CHECK constraint so the violation can be logged by the application.
DROP TRIGGER IF EXISTS trigger_check_loan_dates$$
CREATE TRIGGER trigger_check_loan_dates
BEFORE INSERT ON Artwork_Loan
FOR EACH ROW
BEGIN
    IF NEW.End_Date < NEW.Start_Date THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Loan end date cannot be before start date';
    END IF;
END$$

DELIMITER ;
