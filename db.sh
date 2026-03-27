#!/usr/bin/env bash
set -euo pipefail

MAIN_DB="./data/hn.sqlite"
SEARCH_DB="./data/search.sqlite"
VFS_LIB="./data/zstd_vfs.so"

SQLITE_CMD=(sqlite3)

# Build init commands
INIT_ARGS=()

if [[ -f "$VFS_LIB" ]]; then
  MAIN_DB="${MAIN_DB}?vfs=zstd"
  SEARCH_DB="${SEARCH_DB}?vfs=zstd"
  INIT_ARGS+=("-cmd" ".load $VFS_LIB")
fi

INIT_ARGS+=("-cmd" "ATTACH DATABASE '${SEARCH_DB}' AS search;")

# If a single argument is passed → execute immediately
if [[ $# -eq 1 ]]; then
  "${SQLITE_CMD[@]}" "${INIT_ARGS[@]}" "$MAIN_DB" "$1"
else
  # Interactive session (stdin stays open)
  exec "${SQLITE_CMD[@]}" "${INIT_ARGS[@]}" "$MAIN_DB"
fi
