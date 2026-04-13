#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

require_file() {
  local file_path=$1
  if [[ ! -f "$file_path" ]]; then
    echo "ERROR: Required file not found: $file_path" >&2
    exit 1
  fi
}

prompt_default() {
  local var_name=$1
  local prompt_text=$2
  local default_value=${3:-}
  local current_value=${!var_name-}

  if [[ ${!var_name+x} ]]; then
    return
  fi

  if [[ -n "$default_value" ]]; then
    read -r -p "$prompt_text [$default_value]: " current_value
    printf -v "$var_name" '%s' "${current_value:-$default_value}"
  else
    read -r -p "$prompt_text: " current_value
    printf -v "$var_name" '%s' "$current_value"
  fi
}

prompt_password() {
  local var_name=$1
  local prompt_text=$2
  local current_value=${!var_name-}

  if [[ ${!var_name+x} ]]; then
    return
  fi

  read -r -s -p "$prompt_text: " current_value
  echo
  printf -v "$var_name" '%s' "$current_value"
}

run_sql_file() {
  local label=$1
  local file_name=$2
  local include_db=${3:-1}

  require_file "$SCRIPT_DIR/$file_name"
  echo "$label $file_name"
  if [[ "$include_db" == "1" ]]; then
    MYSQL_PWD="$MYSQL_PASS" mysql \
      -h "$MYSQL_HOST" \
      -P "$MYSQL_PORT" \
      -u "$MYSQL_USER" \
      "$MYSQL_DB" < "$SCRIPT_DIR/$file_name"
  else
    MYSQL_PWD="$MYSQL_PASS" mysql \
      -h "$MYSQL_HOST" \
      -P "$MYSQL_PORT" \
      -u "$MYSQL_USER" < "$SCRIPT_DIR/$file_name"
  fi
}

if ! command -v mysql >/dev/null 2>&1; then
  echo "ERROR: 'mysql' was not found on your PATH." >&2
  exit 1
fi

echo "========================================="
echo "  Museum DB - FULL System Setup"
echo "========================================="
echo

prompt_default MYSQL_HOST "Enter MySQL host" "localhost"
prompt_default MYSQL_PORT "Enter MySQL port" "3306"
prompt_default MYSQL_USER "Enter MySQL username" "root"
prompt_password MYSQL_PASS "Enter MySQL password"
MYSQL_DB="${MYSQL_DB:-museumdb}"

echo
echo "[0/17] Dropping old database for a clean rebuild..."
MYSQL_PWD="$MYSQL_PASS" mysql \
  -h "$MYSQL_HOST" \
  -P "$MYSQL_PORT" \
  -u "$MYSQL_USER" \
  -e "DROP DATABASE IF EXISTS $MYSQL_DB;"

run_sql_file "[1/17]" "sqlFiles/001_create_database.sql" 0
run_sql_file "[2/17]" "sqlFiles/002_add_users_table.sql"
run_sql_file "[3/17]" "sqlFiles/003_extend_users_for_auth.sql"
run_sql_file "[4/17]" "sqlFiles/005_manager_notif.sql"
run_sql_file "[5/17]" "sqlFiles/006_trigger_violation_log.sql"
run_sql_file "[6/17]" "sqlFiles/007_new_tables.sql"
run_sql_file "[7/17]" "sqlFiles/008_triggers.sql"
run_sql_file "[8/17]" "sqlFiles/009_reports.sql"
run_sql_file "[9/17]" "insert_sql_files/001_employee_insert.sql"
run_sql_file "[10/17]" "insert_sql_files/002_artists_insert.sql"
run_sql_file "[11/17]" "insert_sql_files/003_exhibition_insert.sql"
run_sql_file "[12/17]" "insert_sql_files/004_schedule.sql"
run_sql_file "[13/17]" "insert_sql_files/005_members_insert.sql"
run_sql_file "[14/17]" "insert_sql_files/006_artwork_loans.sql"
run_sql_file "[15/17]" "insert_sql_files/007_sale_insert.sql"
run_sql_file "[16/17]" "insert_sql_files/008_registrations_inserts.sql"
run_sql_file "[17/17]" "sqlFiles/004_seed_auth_users.sql"

echo
echo "========================================="
echo "  SUCCESS! Database is fully set up."
echo "========================================="
