#!/usr/bin/env sh
# Copies shared API types from the backend repo. Point CALORIE_TRACKER_BACKEND_ROOT at your checkout
# (default: sibling directory ../calorie-tracker-backend).
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="${CALORIE_TRACKER_BACKEND_ROOT:-$ROOT/../calorie-tracker-backend}"
SRC="$BACKEND/types/index.d.ts"
DEST="$ROOT/types/index.d.ts"
if [ ! -f "$SRC" ]; then
  echo "Missing $SRC — set CALORIE_TRACKER_BACKEND_ROOT or clone the backend next to this repo." >&2
  exit 1
fi
cp "$SRC" "$DEST"
echo "Synced types: $SRC -> $DEST"
