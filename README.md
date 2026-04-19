# Museum Database Web Application

This project is a museum operations database application for COSC 3380. It includes a populated MySQL database and a web application for managing museum records, member services, staff operations, inventory, sales, events, tours, and reports.

The application is organized around different museum roles. Each role sees a dashboard with the actions and reports that apply to that type of user.

## Project Contents

| Path | Description |
| --- | --- |
| `sqlFiles/` | Database schema, user table setup, seeded login accounts, triggers, stored procedures, views, and membership status logic. |
| `insert_sql_files/` | Sample data used to populate the database. |
| `setup_full_database(RUN THIS ).bat` | Windows script for rebuilding the complete database. |
| `setup_full_database.sh` | macOS/Linux/Git Bash script for rebuilding the complete database. |
| `webapp/` | Web application source code. |
| `webapp/.env.example` | Example database configuration file. |

## Hosted Website

The primary version of the project is hosted on Microsoft Azure. The Azure website link and login credentials are provided separately in the submission email.

The instructions below are for running the same project locally from the submitted source code.

## Local Requirements and Tech Stack

- MySQL 8.0 or compatible MySQL server
- Node.js 18 or newer
- npm
- Built with React

## Local Database Setup

The setup scripts drop the existing `museumdb` database, rebuild the schema, load the sample data, create triggers and reports, and insert the test login accounts.

On Windows:

```bat
setup_full_database(RUN THIS ).bat
```

On macOS, Linux, or Git Bash:

```bash
chmod +x setup_full_database.sh
./setup_full_database.sh
```

The scripts will ask for the MySQL host, port, username, password, and database name. The expected database name for the web app is:

```text
museumdb
```

If the Windows script cannot find MySQL, update the `MYSQL` path inside `setup_full_database(RUN THIS ).bat` to match the local MySQL installation.

## Local Web Application Setup

From the project root:

```bash
cd webapp
npm install
```

Create the environment file:

```bash
copy .env.example .env
```

For macOS/Linux:

```bash
cp .env.example .env
```

Edit `webapp/.env` with the MySQL connection values:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=museumdb
DB_USER=root
DB_PASSWORD=your_password_here
DB_SSL=false
SESSION_SECRET=replace_me
```

Start the web app:

```bash
npm start
```

Open the application at:

```text
http://localhost:3000
```

## User Accounts

The database includes seeded accounts for each application role. Usernames and passwords are provided separately in the submission email.

Seeded roles include:

- Member/User
- Supervisor
- Curator
- Employee
- Admissions Clerk
- Gift Shop Staff
- Cafe Staff
- Marketing/Supervisor

## Data Managed By The Application

The database application supports adding, editing, deleting, searching, and reporting on the following museum data:

- Departments and employees
- Artists and artwork
- Exhibitions and exhibition artwork assignments
- Artwork condition reports and restoration tracking
- Institutions and artwork loans
- Member accounts and membership status
- Tickets and ticket line items
- Events and event registrations
- Tours and tour registrations
- Employee schedules
- Gift shop inventory, sales, and sale line items
- Cafe inventory, orders, and sale line items

## User Roles

| Role | Main Capabilities |
| --- | --- |
| `user` | Member/customer access for memberships, ticket purchases, event registration, tour registration, and public collection browsing. |
| `supervisor` | Management access for most database records, reports, notifications, trigger violation review, staff scheduling, and operational oversight. |
| `curator` | Collection access for artists, artwork, exhibitions, exhibition artwork assignments, loans, and condition reports. |
| `employee` | General staff access for operational tasks such as ticketing, sales, registrations, and collection queries. |
| `admissions` | Admissions access for memberships, ticket selling, ticket reports, and membership reports. |
| `giftshop` | Gift shop access for inventory, sales, sale line items, and gift shop reports. |
| `cafe` | Cafe access for food inventory, cafe orders, sale line items, and cafe reports. |

## Membership Lifecycle & Logic

The application implements a robust membership system with automated lifecycle management:

* **Automatic Expiration:** A MySQL Event (`evt_expire_memberships`) runs every 24 hours to transition members from 'Active' to 'Expired' if their `Date_Exited` has passed.
* **Auto-Calculated Terms:** When a new member is added, a trigger automatically sets their `Date_Exited` to exactly one year from their `Date_Joined` and initializes their status as 'Active'.
* **Transaction Blocking:** Database triggers proactively block any ticket purchases for accounts with 'Expired' or 'Canceled' status. If a blocked transaction is attempted, the system raises a MySQL error (SQLSTATE '45000'), which the web application captures and logs for supervisor review.

## Trigger Constraints

The database uses triggers in `sqlFiles/008_triggers.sql` to enforce important business rules and semantic constraints.

Examples include:

- Blocking duplicate artists and duplicate artwork records.
- Blocking invalid date or time ranges for exhibitions, events, tours, schedules, and loans.
- Blocking event or tour registration when capacity is full.
- Blocking overlapping employee shifts.
- Blocking ticket sales for expired or cancelled memberships.
- Blocking artwork deletion when the artwork is assigned to an exhibition.
- Blocking exhibition assignment when artwork is currently on an active outgoing loan.
- Blocking gift shop or cafe sales when there is not enough stock.
- Preventing negative gift shop and cafe inventory.
- Updating gift shop and cafe stock automatically after sale line inserts, updates, and deletes.
- Marking poor or critical artwork condition reports as requiring restoration.
- Setting membership expiration dates automatically.
- Creating manager notifications for full events, low stock, out-of-stock items, and salary warnings.

When a trigger raises a MySQL error, the web application records the issue in `trigger_violation_log` so supervisors can review it.

## Queries

The application includes several searchable query pages:

- Collection search by title, artist, style, type, or time period
- Artwork current location and condition tracking
- Exhibition date search
- Gift shop inventory search
- Cafe inventory search
- Exhibition staffing lookup

## Reports

The application includes role-based reports with filters and summary totals:

- Consolidated daily revenue across admissions, gift shop, and cafe
- Ticket sales report
- Employees by department
- Revenue by exhibition
- Gift shop revenue by item
- Cafe revenue by item
- Membership status report
- Member activity report
- Event attendance report
- Tour attendance report
- Employee schedule report

The SQL file `sqlFiles/009_reports.sql` also defines stored procedures and the `Consolidated_Revenue` view used by reporting features.

## Implementation Notes

- The web application runs from `webapp/server.js`.
- Database access uses the `mysql2` package.
- Static assets are stored in `webapp/public/`.
- Uploaded images are stored in `webapp/public/uploads/`.
