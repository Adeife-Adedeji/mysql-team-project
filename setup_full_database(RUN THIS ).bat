@echo off
echo =========================================
echo   Museum DB - FULL System Setup
echo =========================================
echo.
echo This drops and fully rebuilds museumdb from scratch.
echo (All schema files + all insert files will be run)
echo.
 
echo Where do you want to connect?
echo   [1] Local
echo   [2] Hosted
echo.
set /p CHOICE=Enter 1 or 2: 
 
if "%CHOICE%"=="1" goto local
if "%CHOICE%"=="2" goto hosted
 
echo.
echo ERROR: Invalid choice. Please enter 1 or 2.
pause
exit /b 1
 
:local
set /p MYSQL_HOST=Enter MySQL host: 
if "%MYSQL_HOST%"=="" (
    echo ERROR: Host cannot be empty.
    pause
    exit /b 1
)
set /p MYSQL_PORT=Enter MySQL port: 
if "%MYSQL_PORT%"=="" (
    echo ERROR: Port cannot be empty.
    pause
    exit /b 1
)
set /p MYSQL_USER=Enter MySQL username: 
if "%MYSQL_USER%"=="" (
    echo ERROR: Username cannot be empty.
    pause
    exit /b 1
)
set /p MYSQL_PASS=Enter MySQL password: 
set /p MYSQL_DB=Enter database name: 
if "%MYSQL_DB%"=="" (
    echo ERROR: Database name cannot be empty.
    pause
    exit /b 1
)
set SSL_FLAG=
goto run
 
:hosted
set /p MYSQL_HOST=Enter MySQL host: 
if "%MYSQL_HOST%"=="" (
    echo ERROR: Host cannot be empty.
    pause
    exit /b 1
)
set /p MYSQL_PORT=Enter MySQL port: 
if "%MYSQL_PORT%"=="" (
    echo ERROR: Port cannot be empty.
    pause
    exit /b 1
)
set /p MYSQL_USER=Enter MySQL username: 
if "%MYSQL_USER%"=="" (
    echo ERROR: Username cannot be empty.
    pause
    exit /b 1
)
set /p MYSQL_PASS=Enter MySQL password: 
set /p MYSQL_DB=Enter database name: 
if "%MYSQL_DB%"=="" (
    echo ERROR: Database name cannot be empty.
    pause
    exit /b 1
)
echo.
echo Require SSL?
echo   [1] Yes
echo   [2] No
echo.
set /p SSL_CHOICE=Enter 1 or 2: 
if "%SSL_CHOICE%"=="1" set SSL_FLAG=--ssl-mode=REQUIRED
if "%SSL_CHOICE%"=="2" set SSL_FLAG=
if not "%SSL_CHOICE%"=="1" if not "%SSL_CHOICE%"=="2" (
    echo ERROR: Invalid choice. Please enter 1 or 2.
    pause
    exit /b 1
)
goto run
 
:run
set MYSQL="C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
 
if not exist %MYSQL% (
    echo.
    echo ERROR: mysql.exe not found at %MYSQL%
    echo Please update the MYSQL path in this script to match your installation.
    pause
    exit /b 1
)
 
echo.
echo Connecting to: %MYSQL_HOST%:%MYSQL_PORT% as %MYSQL_USER% on database %MYSQL_DB%
echo.
 
if not exist sqlFiles\001_create_database.sql (
    echo ERROR: sqlFiles\001_create_database.sql not found.
    echo Make sure you are running this script from the mysql-team-project-main folder.
    pause
    exit /b 1
)
 
echo [0/17] Dropping old database for a clean rebuild...
%MYSQL% -h %MYSQL_HOST% -P %MYSQL_PORT% -u %MYSQL_USER% -p%MYSQL_PASS% %SSL_FLAG% -e "DROP DATABASE IF EXISTS %MYSQL_DB%;"
if %ERRORLEVEL% NEQ 0 goto error
 
echo [1/17] sqlFiles\001_create_database.sql
%MYSQL% -h %MYSQL_HOST% -P %MYSQL_PORT% -u %MYSQL_USER% -p%MYSQL_PASS% %SSL_FLAG% < sqlFiles\001_create_database.sql
if %ERRORLEVEL% NEQ 0 goto error
 
echo [2/17] sqlFiles\002_add_users_table.sql
%MYSQL% -h %MYSQL_HOST% -P %MYSQL_PORT% -u %MYSQL_USER% -p%MYSQL_PASS% %SSL_FLAG% %MYSQL_DB% < sqlFiles\002_add_users_table.sql
if %ERRORLEVEL% NEQ 0 goto error
 
echo [3/17] sqlFiles\003_extend_users_for_auth.sql
%MYSQL% -h %MYSQL_HOST% -P %MYSQL_PORT% -u %MYSQL_USER% -p%MYSQL_PASS% %SSL_FLAG% %MYSQL_DB% < sqlFiles\003_extend_users_for_auth.sql
if %ERRORLEVEL% NEQ 0 goto error
 
echo [4/17] sqlFiles\005_manager_notif.sql
%MYSQL% -h %MYSQL_HOST% -P %MYSQL_PORT% -u %MYSQL_USER% -p%MYSQL_PASS% %SSL_FLAG% %MYSQL_DB% < sqlFiles\005_manager_notif.sql
if %ERRORLEVEL% NEQ 0 goto error
 
echo [5/17] sqlFiles\006_trigger_violation_log.sql
%MYSQL% -h %MYSQL_HOST% -P %MYSQL_PORT% -u %MYSQL_USER% -p%MYSQL_PASS% %SSL_FLAG% %MYSQL_DB% < sqlFiles\006_trigger_violation_log.sql
if %ERRORLEVEL% NEQ 0 goto error
 
echo [6/17] sqlFiles\007_new_tables.sql
%MYSQL% -h %MYSQL_HOST% -P %MYSQL_PORT% -u %MYSQL_USER% -p%MYSQL_PASS% %SSL_FLAG% %MYSQL_DB% < sqlFiles\007_new_tables.sql
if %ERRORLEVEL% NEQ 0 goto error
 
echo [7/17] sqlFiles\008_triggers.sql
%MYSQL% -h %MYSQL_HOST% -P %MYSQL_PORT% -u %MYSQL_USER% -p%MYSQL_PASS% %SSL_FLAG% %MYSQL_DB% < sqlFiles\008_triggers.sql
if %ERRORLEVEL% NEQ 0 goto error
 
echo [8/17] sqlFiles\009_reports.sql
%MYSQL% -h %MYSQL_HOST% -P %MYSQL_PORT% -u %MYSQL_USER% -p%MYSQL_PASS% %SSL_FLAG% %MYSQL_DB% < sqlFiles\009_reports.sql
if %ERRORLEVEL% NEQ 0 goto error
 
echo [9/17] insert_sql_files\001_employee_insert.sql
%MYSQL% -h %MYSQL_HOST% -P %MYSQL_PORT% -u %MYSQL_USER% -p%MYSQL_PASS% %SSL_FLAG% %MYSQL_DB% < insert_sql_files\001_employee_insert.sql
if %ERRORLEVEL% NEQ 0 goto error
 
echo [10/17] insert_sql_files\002_artists_insert.sql
%MYSQL% -h %MYSQL_HOST% -P %MYSQL_PORT% -u %MYSQL_USER% -p%MYSQL_PASS% %SSL_FLAG% %MYSQL_DB% < insert_sql_files\002_artists_insert.sql
if %ERRORLEVEL% NEQ 0 goto error
 
echo [11/17] insert_sql_files\003_exhibition_insert.sql
%MYSQL% -h %MYSQL_HOST% -P %MYSQL_PORT% -u %MYSQL_USER% -p%MYSQL_PASS% %SSL_FLAG% %MYSQL_DB% < insert_sql_files\003_exhibition_insert.sql
if %ERRORLEVEL% NEQ 0 goto error
 
echo [12/17] insert_sql_files\004_schedule.sql
%MYSQL% -h %MYSQL_HOST% -P %MYSQL_PORT% -u %MYSQL_USER% -p%MYSQL_PASS% %SSL_FLAG% %MYSQL_DB% < insert_sql_files\004_schedule.sql
if %ERRORLEVEL% NEQ 0 goto error
 
echo [13/17] insert_sql_files\005_members_insert.sql
%MYSQL% -h %MYSQL_HOST% -P %MYSQL_PORT% -u %MYSQL_USER% -p%MYSQL_PASS% %SSL_FLAG% %MYSQL_DB% < insert_sql_files\005_members_insert.sql
if %ERRORLEVEL% NEQ 0 goto error
 
echo [14/17] insert_sql_files\006_artwork_loans.sql
%MYSQL% -h %MYSQL_HOST% -P %MYSQL_PORT% -u %MYSQL_USER% -p%MYSQL_PASS% %SSL_FLAG% %MYSQL_DB% < insert_sql_files\006_artwork_loans.sql
if %ERRORLEVEL% NEQ 0 goto error
 
echo [15/17] insert_sql_files\007_sale_insert.sql
%MYSQL% -h %MYSQL_HOST% -P %MYSQL_PORT% -u %MYSQL_USER% -p%MYSQL_PASS% %SSL_FLAG% %MYSQL_DB% < insert_sql_files\007_sale_insert.sql
if %ERRORLEVEL% NEQ 0 goto error
 
echo [16/17] insert_sql_files\008_registrations_inserts.sql
%MYSQL% -h %MYSQL_HOST% -P %MYSQL_PORT% -u %MYSQL_USER% -p%MYSQL_PASS% %SSL_FLAG% %MYSQL_DB% < insert_sql_files\008_registrations_inserts.sql
if %ERRORLEVEL% NEQ 0 goto error
 
echo [17/17] sqlFiles\004_seed_auth_users.sql (Login Credentials)
%MYSQL% -h %MYSQL_HOST% -P %MYSQL_PORT% -u %MYSQL_USER% -p%MYSQL_PASS% %SSL_FLAG% %MYSQL_DB% < sqlFiles\004_seed_auth_users.sql
if %ERRORLEVEL% NEQ 0 goto error
 
echo.
echo =========================================
echo   SUCCESS! Database is fully set up.
echo =========================================
pause
exit /b 0
 
:error
echo.
echo =========================================
echo   ERROR: Something went wrong (see above)
echo =========================================
pause
exit /b 1
