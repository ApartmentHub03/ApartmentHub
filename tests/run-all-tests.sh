#!/usr/bin/env bash
# ============================================================================
# ApartmentHub — Load & Performance Test Runner
# ============================================================================
#
# Usage:   bash tests/run-all-tests.sh
#
# What it does:
#   1. Installs dev dependencies (artillery, lighthouse, chrome-launcher)
#   2. Starts the Next.js dev server in the background
#   3. Runs Artillery load tests against the frontend (localhost:3000)
#   4. Runs Artillery load tests against Supabase Edge Functions
#   5. Runs Lighthouse performance audits
#   6. Runs Next.js bundle size analysis
#   7. Stops the dev server
#   8. Prints a combined summary
# ============================================================================

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   ApartmentHub — Load & Performance Test Suite          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ---------------------------------------------------------------------------
# 1. Install dependencies
# ---------------------------------------------------------------------------
echo -e "${YELLOW}📦  Installing test dependencies...${NC}"
npm install --save-dev artillery artillery-plugin-expect lighthouse chrome-launcher 2>/dev/null || true

# ---------------------------------------------------------------------------
# 2. Start the dev server
# ---------------------------------------------------------------------------
echo -e "${YELLOW}🚀  Starting Next.js dev server on port 3000...${NC}"
npx next dev --port 3000 &
DEV_PID=$!
# Give it time to compile
echo "   Waiting 15 seconds for the dev server to be ready..."
sleep 15

# Check if the server is actually responding
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|304"; then
  echo -e "   ${GREEN}✅  Dev server is responding!${NC}"
else
  echo -e "   ${YELLOW}⚠️  Dev server may still be compiling. Continuing anyway...${NC}"
fi

# ---------------------------------------------------------------------------
# 3. Artillery — Frontend load tests
# ---------------------------------------------------------------------------
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  🔫  Artillery: Frontend Page Load Tests${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""

mkdir -p tests/load

npx artillery run tests/load/frontend.yml \
  --output tests/load/frontend-report.json \
  2>&1 || echo -e "${RED}⚠️  Frontend load test had issues${NC}"

if [ -f tests/load/frontend-report.json ]; then
  npx artillery report tests/load/frontend-report.json \
    --output tests/load/frontend-report.html 2>/dev/null || true
  echo -e "   ${GREEN}📄  Report: tests/load/frontend-report.html${NC}"
fi

# ---------------------------------------------------------------------------
# 4. Artillery — Supabase Edge Function tests
# ---------------------------------------------------------------------------
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  🔫  Artillery: Supabase Edge Function Tests${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""

npx artillery run tests/load/supabase.yml \
  --output tests/load/supabase-report.json \
  2>&1 || echo -e "${RED}⚠️  Supabase load test had issues${NC}"

if [ -f tests/load/supabase-report.json ]; then
  npx artillery report tests/load/supabase-report.json \
    --output tests/load/supabase-report.html 2>/dev/null || true
  echo -e "   ${GREEN}📄  Report: tests/load/supabase-report.html${NC}"
fi

# ---------------------------------------------------------------------------
# 5. Artillery — Webhook throughput tests
# ---------------------------------------------------------------------------
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  🔫  Artillery: Webhook Throughput Tests${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""

npx artillery run tests/load/webhooks.yml \
  --output tests/load/webhook-report.json \
  2>&1 || echo -e "${RED}⚠️  Webhook load test had issues${NC}"

if [ -f tests/load/webhook-report.json ]; then
  npx artillery report tests/load/webhook-report.json \
    --output tests/load/webhook-report.html 2>/dev/null || true
  echo -e "   ${GREEN}📄  Report: tests/load/webhook-report.html${NC}"
fi

# ---------------------------------------------------------------------------
# 6. Lighthouse Performance Audit
# ---------------------------------------------------------------------------
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  🔦  Lighthouse: Core Web Vitals Audit${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""

node tests/performance/lighthouse-audit.js 2>&1 || echo -e "${RED}⚠️  Lighthouse audit had issues${NC}"

# ---------------------------------------------------------------------------
# 7. Bundle Size Analysis
# ---------------------------------------------------------------------------
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  📦  Next.js Bundle Size Analysis${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""

node tests/performance/bundle-analysis.js 2>&1 || echo -e "${RED}⚠️  Bundle analysis had issues${NC}"

# ---------------------------------------------------------------------------
# 8. Cleanup — stop dev server
# ---------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}🛑  Stopping dev server (PID: $DEV_PID)...${NC}"
kill "$DEV_PID" 2>/dev/null || true
wait "$DEV_PID" 2>/dev/null || true

# ---------------------------------------------------------------------------
# 9. Final summary
# ---------------------------------------------------------------------------
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║            ✅  ALL TESTS COMPLETE                       ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  Generated reports:"
echo "    • tests/load/frontend-report.html        (Artillery — pages)"
echo "    • tests/load/supabase-report.html         (Artillery — edge fns)"
echo "    • tests/load/webhook-report.html          (Artillery — webhooks)"
echo "    • tests/performance/lighthouse-results.json"
echo "    • tests/performance/bundle-results.json"
echo ""
echo -e "${CYAN}  Open the .html reports in a browser for interactive charts.${NC}"
echo ""
