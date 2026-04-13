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

  require_file "$SCRIPT_DIR/$file_name"
  echo "$label $file_name"
  MYSQL_PWD="$MYSQL_PASS" mysql \
    -h "$MYSQL_HOST" \
    -P "$MYSQL_PORT" \
    -u "$MYSQL_USER" \
    ${SSL_FLAG:+$SSL_FLAG} \
    "$MYSQL_DB" < "$SCRIPT_DIR/$file_name"
}

if ! command -v mysql >/dev/null 2>&1; then
  echo "ERROR: 'mysql' was not found on your PATH." >&2
  exit 1
fi

echo "========================================="
echo "  Museum DB - Run New SQL Files"
echo "========================================="
echo
echo "This runs files 007, 008, 009 only."
echo "(001-006 should already be set up)"

CHOICE="${1:-${CONNECTION_MODE:-}}"

case "$CHOICE" in
  local|LOCAL) CHOICE="1" ;;
  hosted|HOSTED) CHOICE="2" ;;
esac

if [[ -z "$CHOICE" ]]; then
  echo
  echo "Where do you want to connect?"
  echo "  [1] Local"
  echo "  [2] Hosted"
  echo

  if [[ ! -t 0 ]]; then
    echo "ERROR: No interactive terminal detected." >&2
    echo "Run this from a terminal, or pass 'local' or 'hosted' as the first argument." >&2
    exit 1
  fi

  read -r -p "Enter 1 or 2: " CHOICE
fi

case "$CHOICE" in
  1)
    echo
    echo "Mode: Local"
    prompt_default MYSQL_HOST "Enter MySQL host" "localhost"
    prompt_default MYSQL_PORT "Enter MySQL port" "3306"
    prompt_default MYSQL_USER "Enter MySQL username" "root"
    prompt_password MYSQL_PASS "Enter MySQL password"
    prompt_default MYSQL_DB "Enter database name" "museumdb"
    SSL_FLAG=""
    ;;
  2)
    echo
    echo "Mode: Hosted"
    prompt_default MYSQL_HOST "Enter MySQL host"
    prompt_default MYSQL_PORT "Enter MySQL port" "3306"
    prompt_default MYSQL_USER "Enter MySQL username"
    prompt_password MYSQL_PASS "Enter MySQL password"
    prompt_default MYSQL_DB "Enter database name" "museumdb"
    echo
    echo "Require SSL?"
    echo "  [1] Yes"
    echo "  [2] No"
    echo
    read -r -p "Enter 1 or 2: " SSL_CHOICE
    case "$SSL_CHOICE" in
      1) SSL_FLAG="--ssl-mode=REQUIRED" ;;
      2) SSL_FLAG="" ;;
      *)
        echo "ERROR: Invalid SSL choice. Please enter 1 or 2." >&2
        exit 1
        ;;
    esac
    ;;
  *)
    echo "ERROR: Invalid choice. Please enter 1 or 2." >&2
    exit 1
    ;;
esac

if [[ -z "${MYSQL_HOST:-}" || -z "${MYSQL_PORT:-}" || -z "${MYSQL_USER:-}" || -z "${MYSQL_DB:-}" ]]; then
  echo "ERROR: Host, port, username, and database name are required." >&2
  exit 1
fi

echo
echo "Connecting to: $MYSQL_HOST:$MYSQL_PORT as $MYSQL_USER on database $MYSQL_DB"
echo

run_sql_file "[1/3]" "sqlFiles/007_new_tables.sql"
run_sql_file "[2/3]" "sqlFiles/008_triggers.sql"
run_sql_file "[3/3]" "sqlFiles/009_reports.sql"

echo
echo "========================================="
echo "  Done! New tables and triggers loaded."
echo "========================================="
