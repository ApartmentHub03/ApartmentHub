#!/bin/bash
# Test cal.com API: create schedule + in-person event type + video event type
# Usage: ./test-cal.sh
#
# Reads CAL_API_KEY from environment, or falls back to .env.local
# Optional env vars: ADDRESS, SLUG_BASE, BOOKING_DATE

set -e

# --- Load API key ---
if [ -z "$CAL_API_KEY" ] && [ -f ".env.local" ]; then
  CAL_API_KEY=$(grep -E '^CAL_API_KEY=' .env.local | cut -d '=' -f2- | tr -d '"' | tr -d "'")
fi

if [ -z "$CAL_API_KEY" ]; then
  echo "ERROR: CAL_API_KEY not set. Add it to .env.local as: CAL_API_KEY=cal_live_..."
  exit 1
fi

# --- Config (override via env if needed) ---
ADDRESS="${ADDRESS:-Keizersgracht 100, Amsterdam}"
SLUG_BASE="${SLUG_BASE:-keizersgracht100amsterdam}"
BOOKING_DATE="${BOOKING_DATE:-2026-04-10}"

echo "=== Step 1: Creating schedule ==="
SCHEDULE_BODY=$(cat <<EOF
{
  "name": "$ADDRESS",
  "timeZone": "Europe/Amsterdam",
  "availability": [
    {
      "days": ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
      "startTime": "09:00",
      "endTime": "17:00"
    }
  ],
  "isDefault": false
}
EOF
)

SCHEDULE_RESPONSE=$(curl -sS -X POST 'https://api.cal.com/v2/schedules' \
  -H "Authorization: Bearer $CAL_API_KEY" \
  -H 'cal-api-version: 2024-06-11' \
  -H 'Content-Type: application/json' \
  -d "$SCHEDULE_BODY")

echo "$SCHEDULE_RESPONSE" | jq .

SCHEDULE_ID=$(echo "$SCHEDULE_RESPONSE" | jq -r '.data.id // empty')
if [ -z "$SCHEDULE_ID" ]; then
  echo "ERROR: Failed to extract scheduleId from response. Aborting."
  exit 1
fi
echo "✓ Schedule ID: $SCHEDULE_ID"
echo ""

echo "=== Step 2: Creating in-person event type ==="
INPERSON_BODY=$(cat <<EOF
{
  "title": "$ADDRESS (In-Person)",
  "slug": "${SLUG_BASE}-inperson",
  "lengthInMinutes": 30,
  "locations": [
    {"type":"address","address":"$ADDRESS","public":true}
  ],
  "bookingFields": [
    {"type":"phone","slug":"whatsapp","label":"WhatsApp","required":true,"placeholder":"+31 612345678"}
  ],
  "bookingWindow": {"type":"range","value":["$BOOKING_DATE","$BOOKING_DATE"]},
  "scheduleId": $SCHEDULE_ID
}
EOF
)

curl -sS -X POST 'https://api.cal.com/v2/event-types' \
  -H "Authorization: Bearer $CAL_API_KEY" \
  -H 'cal-api-version: 2024-06-14' \
  -H 'Content-Type: application/json' \
  -d "$INPERSON_BODY" | jq .
echo ""

echo "=== Step 3: Creating video event type ==="
VIDEO_BODY=$(cat <<EOF
{
  "title": "$ADDRESS (Video)",
  "slug": "${SLUG_BASE}-video",
  "lengthInMinutes": 30,
  "locations": [
    {"type":"integration","integration":"cal-video"}
  ],
  "bookingFields": [
    {"type":"phone","slug":"whatsapp","label":"WhatsApp","required":true,"placeholder":"+31 612345678"}
  ],
  "bookingWindow": {"type":"range","value":["$BOOKING_DATE","$BOOKING_DATE"]},
  "scheduleId": $SCHEDULE_ID
}
EOF
)

curl -sS -X POST 'https://api.cal.com/v2/event-types' \
  -H "Authorization: Bearer $CAL_API_KEY" \
  -H 'cal-api-version: 2024-06-14' \
  -H 'Content-Type: application/json' \
  -d "$VIDEO_BODY" | jq .
echo ""

echo "✓ Done."
