#!/bin/bash
# CI script for clone detection with threshold enforcement

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration (override with env vars)
MAX_CLONE_PAIRS=${NLCI_MAX_CLONE_PAIRS:-10}
MAX_CLONE_PERCENTAGE=${NLCI_MAX_CLONE_PERCENTAGE:-5.0}
FAIL_ON_CLONES=${NLCI_FAIL_ON_CLONES:-true}
CONFIG_FILE=${NLCI_CONFIG:-.nlcirc.json}
SCAN_DIR=${NLCI_SCAN_DIR:-src/}
OUTPUT_JSON="clones.json"
OUTPUT_HTML="clones-report.html"

echo "🔍 NLCI Clone Detection CI Check"
echo "=================================="
echo "Configuration:"
echo "  Max Clone Pairs: $MAX_CLONE_PAIRS"
echo "  Max Clone %: $MAX_CLONE_PERCENTAGE"
echo "  Fail on Clones: $FAIL_ON_CLONES"
echo "  Scan Directory: $SCAN_DIR"
echo ""

# Check if NLCI CLI is installed
if ! command -v nlci &> /dev/null; then
    echo -e "${RED}❌ NLCI CLI not found. Installing...${NC}"
    npm install -g @nlci/cli || {
        echo -e "${RED}Failed to install NLCI CLI${NC}"
        exit 1
    }
fi

# Verify config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${YELLOW}⚠️  Config file not found: $CONFIG_FILE${NC}"
    echo "Using default configuration"
fi

# Step 1: Scan for clones
echo "📊 Scanning for code clones..."
if ! nlci scan "$SCAN_DIR" --config "$CONFIG_FILE"; then
    echo -e "${RED}❌ Scan failed${NC}"
    exit 1
fi

# Step 2: Generate reports
echo "📝 Generating reports..."
if ! nlci report --format json --output "$OUTPUT_JSON"; then
    echo -e "${RED}❌ Report generation failed${NC}"
    exit 1
fi

if ! nlci report --format html --output "$OUTPUT_HTML"; then
    echo -e "${YELLOW}⚠️  HTML report generation failed (continuing)${NC}"
fi

# Step 3: Parse results
if [ ! -f "$OUTPUT_JSON" ]; then
    echo -e "${RED}❌ Report file not found: $OUTPUT_JSON${NC}"
    exit 1
fi

CLONE_COUNT=$(jq '.clonePairs | length' "$OUTPUT_JSON")
TOTAL_FILES=$(jq '.filesIndexed' "$OUTPUT_JSON")
CLONE_PERCENTAGE=$(awk "BEGIN {printf \"%.2f\", ($CLONE_COUNT / $TOTAL_FILES) * 100}")

echo ""
echo "📈 Results:"
echo "  Clone Pairs: $CLONE_COUNT"
echo "  Files Scanned: $TOTAL_FILES"
echo "  Clone Percentage: ${CLONE_PERCENTAGE}%"
echo ""

# Step 4: Display top clones
echo "🔝 Top 5 Clone Pairs:"
jq -r '.clonePairs[:5] | to_entries[] | 
  "\(.key + 1). \(.value.cloneType) (\(.value.similarity * 100 | floor)% similar)\n" +
  "   Source: \(.value.source.filePath):\(.value.source.startLine)-\(.value.source.endLine)\n" +
  "   Target: \(.value.target.filePath):\(.value.target.startLine)-\(.value.target.endLine)"' \
  "$OUTPUT_JSON"

echo ""

# Step 5: Check thresholds
THRESHOLD_VIOLATIONS=0

if [ "$CLONE_COUNT" -gt "$MAX_CLONE_PAIRS" ]; then
    echo -e "${RED}❌ Clone pair count exceeds threshold:${NC}"
    echo "   Found: $CLONE_COUNT"
    echo "   Maximum: $MAX_CLONE_PAIRS"
    THRESHOLD_VIOLATIONS=$((THRESHOLD_VIOLATIONS + 1))
fi

if (( $(echo "$CLONE_PERCENTAGE > $MAX_CLONE_PERCENTAGE" | bc -l) )); then
    echo -e "${RED}❌ Clone percentage exceeds threshold:${NC}"
    echo "   Found: ${CLONE_PERCENTAGE}%"
    echo "   Maximum: ${MAX_CLONE_PERCENTAGE}%"
    THRESHOLD_VIOLATIONS=$((THRESHOLD_VIOLATIONS + 1))
fi

# Step 6: Final verdict
echo ""
echo "=================================="
if [ "$THRESHOLD_VIOLATIONS" -gt 0 ]; then
    echo -e "${RED}❌ Clone detection check FAILED${NC}"
    echo "   Threshold violations: $THRESHOLD_VIOLATIONS"
    echo ""
    echo "Actions:"
    echo "  1. Review clones in $OUTPUT_HTML"
    echo "  2. Refactor duplicate code"
    echo "  3. Or adjust thresholds in CI config"
    
    if [ "$FAIL_ON_CLONES" = "true" ]; then
        exit 1
    else
        echo -e "${YELLOW}⚠️  Continuing (FAIL_ON_CLONES=false)${NC}"
    fi
else
    echo -e "${GREEN}✅ Clone detection check PASSED${NC}"
    echo "   No threshold violations detected"
fi

echo ""
echo "📄 Reports generated:"
echo "  - JSON: $OUTPUT_JSON"
echo "  - HTML: $OUTPUT_HTML"

exit 0
