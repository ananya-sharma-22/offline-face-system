#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

URL="http://localhost:5055/web_terminal/"

if lsof -iTCP:5055 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Offline Bio-Terminal is already running."
  echo "Open: $URL"
  command -v open >/dev/null 2>&1 && open "$URL" >/dev/null 2>&1 || true
  exit 0
fi

echo "Starting Offline Bio-Terminal..."
echo "Open: $URL"
command -v open >/dev/null 2>&1 && open "$URL" >/dev/null 2>&1 || true
python3 -m http.server 5055
