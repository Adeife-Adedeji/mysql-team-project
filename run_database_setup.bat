@echo off
echo =========================================
echo   Museum DB - Run New SQL Files
echo =========================================
echo.
echo This runs files 007, 008, 009 only.
echo (001-006 should already be set up)
echo.

set /p MYSQL_USER=Enter MySQL username (default: root):
if "%MYSQL_USER%"=="" set MYSQL_USER=root

set /p MYSQL_PASS=Enter MySQL password:

set MYSQL="C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"

echo.

echo [1/3] 007_new_tables.sql
%MYSQL% -u %MYSQL_USER% -p%MYSQL_PASS% museumdb < sqlFiles\007_new_tables.sql
if %ERRORLEVEL% NEQ 0 goto error

echo [2/3] 008_triggers.sql
%MYSQL% -u %MYSQL_USER% -p%MYSQL_PASS% museumdb < sqlFiles\008_triggers.sql
if %ERRORLEVEL% NEQ 0 goto error

echo [3/3] 009_reports.sql
%MYSQL% -u %MYSQL_USER% -p%MYSQL_PASS% museumdb < sqlFiles\009_reports.sql
if %ERRORLEVEL% NEQ 0 goto error

echo.
echo =========================================
echo   Done! New tables and triggers loaded.
echo =========================================
pause
exit /b 0

:error
echo.
echo ERROR: Something went wrong on the step above.
pause
exit /b 1
