-- Post-insert backfill + daily expiry event for Membership.
-- Run AFTER all insert files so existing rows get correct Status values.
-- Schema changes (Status column) are in 001_create_database.sql.
-- Triggers are in 008_triggers.sql.

USE museumdb;

-- Backfill: the BEFORE INSERT trigger already set Date_Exited when rows were
-- inserted above, but Status was set to 'Active' for everyone. Now flip any
-- member whose Date_Exited has already passed to 'Expired'.
UPDATE Membership
SET Status = 'Expired'
WHERE Status = 'Active'
  AND Date_Exited IS NOT NULL
  AND Date_Exited < CURDATE();


-- MySQL Event: runs every day and expires memberships automatically.
-- This is the "over 1 year -> expired" automation the TA asked for.
-- Requires event_scheduler = ON on the server.
-- For local MySQL Workbench: run  SET GLOBAL event_scheduler = ON;  once.
DROP EVENT IF EXISTS evt_expire_memberships;
CREATE EVENT evt_expire_memberships
  ON SCHEDULE EVERY 1 DAY
  STARTS CURRENT_TIMESTAMP
  DO
    UPDATE Membership
    SET Status = 'Expired'
    WHERE Status = 'Active'
      AND Date_Exited IS NOT NULL
      AND Date_Exited < CURDATE();
