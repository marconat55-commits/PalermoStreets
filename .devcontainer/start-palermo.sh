#!/usr/bin/env bash
set -euo pipefail

if curl --fail --silent --show-error http://127.0.0.1:5173/ >/dev/null 2>&1; then
  exit 0
fi

nohup npm run dev -- --host 0.0.0.0 > /tmp/palermo-streets-vite.log 2>&1 &
echo $! > /tmp/palermo-streets-vite.pid
