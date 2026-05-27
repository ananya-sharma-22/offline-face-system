#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

UI_URL="http://localhost:5055/web_terminal/"

if ! lsof -iTCP:8080 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Starting lightweight local AI bridge on http://localhost:8080 ..."
  python3 backend/api/lightweight_server.py >/tmp/offline_face_api.log 2>&1 &
else
  echo "Local AI API already running on http://localhost:8080"
fi

if ! lsof -iTCP:5055 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Starting Bio-Terminal UI on $UI_URL ..."
  python3 -m http.server 5055
else
  echo "Bio-Terminal UI already running."
  echo "Open: $UI_URL"
  command -v open >/dev/null 2>&1 && open "$UI_URL" >/dev/null 2>&1 || true
fi
