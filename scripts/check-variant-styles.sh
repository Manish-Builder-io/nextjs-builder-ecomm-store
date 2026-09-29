#!/usr/bin/env bash
# Usage: scripts/check-variant-styles.sh [url]
# Prints byte offsets of <template data-variant-id>, data-emotion-css style tags and css-* classes.
URL="${1:-http://localhost:3000/en-US/variant-container-repro/}"
OUT="$(mktemp)"; curl -sL "$URL" -o "$OUT"
echo "== templates"; grep -bo '<template data-variant-id="[^"]*"' "$OUT"
echo "== emotion style tags"; grep -bo 'data-emotion-css="[^"]*"' "$OUT"
echo "== css classes (unique)"; grep -o 'class="[^"]*css-[a-z0-9]*[^"]*"' "$OUT" | grep -o 'css-[a-z0-9]*' | sort | uniq -c
rm "$OUT"
