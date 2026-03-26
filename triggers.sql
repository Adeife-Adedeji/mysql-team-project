-- checks to ensure that the number of registrations for an event does not exceed the maximum capacity of the event
--@Block
CREATE TRIGGER trigger_check_event_capacity
BEFORE INSERT ON event_registration
FOR EACH ROW
BEGIN
    IF (
        (SELECT COUNT(*) 
         FROM event_registration 
         WHERE Event_ID = NEW.Event_ID)
        >=
        (SELECT Max_capacity 
         FROM Event 
         WHERE Event_ID = NEW.Event_ID)
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Event capacity exceeded';
    END IF;
END;
-- 
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
-- Auto fill ticket info from membership when creating a ticket
CREATE TRIGGER trigger_auto_fill_ticket_info
BEFORE INSERT ON Ticket
FOR EACH ROW
BEGIN
    IF NEW.Membership_ID iS NOT NULL THEN
        SET NEW.Last_Name = (
            SELECT Last_Name FROM Membership
            WHERE Membership_ID = NEW.Membership_ID);
        SET NEW.First_Name = (
            SELECT First_Name FROM Membership
            WHERE Membership_ID = NEW.Membership_ID);
        SET NEW.Email = (
            SELECT Email FROM Membership
            WHERE Membership_ID = NEW.Membership_ID);
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