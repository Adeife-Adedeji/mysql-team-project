-- Patch: drop CHECK constraints that were replaced by triggers.
-- Run this once against an existing database that was set up before this change.
-- Safe to re-run: IF EXISTS prevents errors if already dropped.

USE museumdb;

-- Drop the auto-named CHECK constraint on Event (end_Date >= start_Date)
-- Now enforced by trigger_check_event_dates / trigger_check_event_dates_update
ALTER TABLE Event DROP CHECK event_chk_1;

-- Drop the auto-named CHECK constraint on Artwork_Loan (End_Date >= Start_Date)
-- Now enforced by trigger_check_loan_dates
ALTER TABLE Artwork_Loan DROP CHECK artwork_loan_chk_1;

-- Drop the auto-named CHECK constraint on Schedule (End_Time > Start_Time)
-- Now enforced by trigger_check_schedule_times / trigger_check_schedule_times_update
ALTER TABLE Schedule DROP CHECK schedule_chk_1;

-- Drop the auto-named CHECK constraint on Tour (End_Time > Start_Time)
-- Now enforced by trigger_check_tour_times
ALTER TABLE Tour DROP CHECK tour_chk_1;
