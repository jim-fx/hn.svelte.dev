#!/usr/bin/env bash

EXT="$(pwd)/data/zstd_vfs.so"
DB="$(pwd)/data/$1"
SQL="$2"

sqlite3 <<EOF
.load $EXT
.open "file:$DB?vfs=zstd"
$SQL
EOF
