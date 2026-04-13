#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v mysql >/dev/null 2>&1; then
  echo "ERROR: 'mysql' was not found on your PATH." >&2
  exit 1
fi

MYSQL_HOST="${MYSQL_HOST:-localhost}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASS="${MYSQL_PASS:-}"
MYSQL_DB="${MYSQL_DB:-museumdb}"

run_sql_file() {
  local label=$1
  local file_name=$2

  if [[ ! -f "$SCRIPT_DIR/$file_name" ]]; then
    echo "ERROR: Required file not found: $SCRIPT_DIR/$file_name" >&2
    exit 1
  fi

  echo "$label $file_name"
  MYSQL_PWD="$MYSQL_PASS" mysql \
    -h "$MYSQL_HOST" \
    -P "$MYSQL_PORT" \
    -u "$MYSQL_USER" \
    "$MYSQL_DB" < "$SCRIPT_DIR/$file_name"
}

echo "========================================="
echo "  Museum DB - Run New SQL Files"
echo "========================================="
echo

run_sql_file "[1/3]" "sqlFiles/007_new_tables.sql"
run_sql_file "[2/3]" "sqlFiles/008_triggers.sql"
run_sql_file "[3/3]" "sqlFiles/009_reports.sql"

echo
echo "========================================="
echo "  SUCCESS! Files 007-009 ran."
echo "========================================="
