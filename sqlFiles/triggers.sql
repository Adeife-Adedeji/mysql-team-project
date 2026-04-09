-- checks to ensure that the number of registrations for an event does not exceed the maximum capacity of the event
--@Block
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
END;

-- trigger to check if artist has been added already
--@Block
CREATE TRIGGER trigger_check_artist_exists
BEFORE INSERT ON Artist
FOR EACH ROW
BEGIN
    IF EXISTS (
        SELECT 1 FROM Artist
        WHERE Artist_Name = NEW.Artist_Name
          AND Date_of_Birth = NEW.Date_of_Birth
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Artist already exists in the database';
    END IF;
END;

--@Block
-- prevent using membership after expiration date
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
END;

--@Block
-- prevent scheduling an employee for overlapping shifts
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
END;

--@Block
-- prevent deleting artwork that is currently on display in an exhibition
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
END;

--@Block
-- prevent date of death from being before date of birth for artists
CREATE TRIGGER trigger_check_artist_dates
BEFORE INSERT ON Artist
FOR EACH ROW
BEGIN
    IF NEW.Date_of_Death IS NOT NULL AND NEW.Date_of_Death < NEW.Date_of_Birth THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Date of death cannot be before date of birth';
    END IF;
END;

--@Block
-- trigger to reduce stock quantity in gift shop when a sale is made
CREATE TRIGGER trigger_reduce_gift_shop_stock
AFTER INSERT ON Gift_Shop_Sale_Line
FOR EACH ROW
BEGIN
    UPDATE Gift_Shop_Item
    SET Stock_Quantity = Stock_Quantity - NEW.Quantity
    WHERE Gift_Shop_Item_ID = NEW.Gift_Shop_Item_ID;
END;

--@Block
-- keep gift shop stock accurate when a sale line is edited
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
END;

--@Block
-- restore stock if a sale line is removed
CREATE TRIGGER trigger_restore_gift_shop_stock
AFTER DELETE ON Gift_Shop_Sale_Line
FOR EACH ROW
BEGIN
    UPDATE Gift_Shop_Item
    SET Stock_Quantity = Stock_Quantity + OLD.Quantity
    WHERE Gift_Shop_Item_ID = OLD.Gift_Shop_Item_ID;
END;

--@Block
-- trigger to alert manager when stock quantity of an item in the gift shop is low
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
END;

--@Block
-- trigger to prevent sale of items in the gift shop if stock quantity is insufficient
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
END;

--@Block
-- trigger to alert manager when an employee's salary exceeds that of their supervisor
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
END;
