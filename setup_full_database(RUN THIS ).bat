@echo off
echo =========================================
echo   Museum DB - FULL System Setup
echo =========================================
echo.

set /p MYSQL_USER=Enter MySQL username (default: root): 
if "%MYSQL_USER%"=="" set MYSQL_USER=root

set /p MYSQL_PASS=Enter MySQL password: 

set MYSQL="C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"

echo.
echo [0/17] Dropping old database for a clean rebuild...
%MYSQL% -u %MYSQL_USER% -p%MYSQL_PASS% -e "DROP DATABASE IF EXISTS museumdb;"

echo [1/17] sqlFiles\001_create_database.sql
%MYSQL% -u %MYSQL_USER% -p%MYSQL_PASS% < sqlFiles\001_create_database.sql
if %ERRORLEVEL% NEQ 0 goto error

echo [2/17] sqlFiles\002_add_users_table.sql
%MYSQL% -u %MYSQL_USER% -p%MYSQL_PASS% museumdb < sqlFiles\002_add_users_table.sql
if %ERRORLEVEL% NEQ 0 goto error

echo [3/17] sqlFiles\003_extend_users_for_auth.sql
%MYSQL% -u %MYSQL_USER% -p%MYSQL_PASS% museumdb < sqlFiles\003_extend_users_for_auth.sql
if %ERRORLEVEL% NEQ 0 goto error

echo [4/17] sqlFiles\005_manager_notif.sql
%MYSQL% -u %MYSQL_USER% -p%MYSQL_PASS% museumdb < sqlFiles\005_manager_notif.sql
if %ERRORLEVEL% NEQ 0 goto error

echo [5/17] sqlFiles\006_trigger_violation_log.sql
%MYSQL% -u %MYSQL_USER% -p%MYSQL_PASS% museumdb < sqlFiles\006_trigger_violation_log.sql
if %ERRORLEVEL% NEQ 0 goto error

echo [6/17] sqlFiles\007_new_tables.sql
%MYSQL% -u %MYSQL_USER% -p%MYSQL_PASS% museumdb < sqlFiles\007_new_tables.sql
if %ERRORLEVEL% NEQ 0 goto error

echo [7/17] sqlFiles\008_triggers.sql
%MYSQL% -u %MYSQL_USER% -p%MYSQL_PASS% museumdb < sqlFiles\008_triggers.sql
if %ERRORLEVEL% NEQ 0 goto error

echo [8/17] sqlFiles\009_reports.sql
%MYSQL% -u %MYSQL_USER% -p%MYSQL_PASS% museumdb < sqlFiles\009_reports.sql
if %ERRORLEVEL% NEQ 0 goto error

echo [9/17] insert_sql_files\001_employee_insert.sql
%MYSQL% -u %MYSQL_USER% -p%MYSQL_PASS% museumdb < insert_sql_files\001_employee_insert.sql
if %ERRORLEVEL% NEQ 0 goto error

echo [10/17] insert_sql_files\002_artists_insert.sql
%MYSQL% -u %MYSQL_USER% -p%MYSQL_PASS% museumdb < insert_sql_files\002_artists_insert.sql
if %ERRORLEVEL% NEQ 0 goto error

echo [11/17] insert_sql_files\003_exhibition_insert.sql
%MYSQL% -u %MYSQL_USER% -p%MYSQL_PASS% museumdb < insert_sql_files\003_exhibition_insert.sql
if %ERRORLEVEL% NEQ 0 goto error

echo [12/17] insert_sql_files\004_schedule.sql
%MYSQL% -u %MYSQL_USER% -p%MYSQL_PASS% museumdb < insert_sql_files\004_schedule.sql
if %ERRORLEVEL% NEQ 0 goto error

echo [13/17] insert_sql_files\005_members_insert.sql
%MYSQL% -u %MYSQL_USER% -p%MYSQL_PASS% museumdb < insert_sql_files\005_members_insert.sql
if %ERRORLEVEL% NEQ 0 goto error

echo [14/17] insert_sql_files\006_artwork_loans.sql
%MYSQL% -u %MYSQL_USER% -p%MYSQL_PASS% museumdb < insert_sql_files\006_artwork_loans.sql
if %ERRORLEVEL% NEQ 0 goto error

echo [15/17] insert_sql_files\007_sale_insert.sql
%MYSQL% -u %MYSQL_USER% -p%MYSQL_PASS% museumdb < insert_sql_files\007_sale_insert.sql
if %ERRORLEVEL% NEQ 0 goto error

echo [16/17] insert_sql_files\008_registrations_inserts.sql
%MYSQL% -u %MYSQL_USER% -p%MYSQL_PASS% museumdb < insert_sql_files\008_registrations_inserts.sql
if %ERRORLEVEL% NEQ 0 goto error

echo [17/17] sqlFiles\004_seed_auth_users.sql (Login Credentials)
%MYSQL% -u %MYSQL_USER% -p%MYSQL_PASS% museumdb < sqlFiles\004_seed_auth_users.sql
if %ERRORLEVEL% NEQ 0 goto error

echo.
echo =========================================
echo   SUCCESS! Database is fully set up.
echo =========================================
pause
exit /b 0

:error
echo.
echo ERROR: Something went wrong on the step above.
pause
exit /b 1
