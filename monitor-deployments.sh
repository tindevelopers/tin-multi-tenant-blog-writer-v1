#!/bin/bash

# Monitor Vercel deployments for all three branches
# Checks: develop (Preview), staging (Preview), main (Production)

echo "Monitoring Vercel deployments for all branches..."
echo "=================================================="
echo ""

check_count=0
max_checks=60  # Check for up to 5 minutes (60 checks * 5 seconds)

while [ $check_count -lt $max_checks ]; do
  check_count=$((check_count + 1))
  echo "[Check $check_count] $(date '+%H:%M:%S')"
  
  # Get latest deployments for each branch
  DEVELOP_STATUS=$(vercel ls 2>&1 | grep -E "develop|Preview" | head -1 | grep -oE "(Building|Ready|Error|Queued)" | head -1)
  STAGING_STATUS=$(vercel ls 2>&1 | grep -E "staging|Preview" | head -1 | grep -oE "(Building|Ready|Error|Queued)" | head -1)
  PROD_STATUS=$(vercel ls 2>&1 | grep -E "Production" | head -1 | grep -oE "(Building|Ready|Error|Queued)" | head -1)
  
  echo "  Develop (Preview): ${DEVELOP_STATUS:-Not found}"
  echo "  Staging (Preview): ${STAGING_STATUS:-Not found}"
  echo "  Main (Production): ${PROD_STATUS:-Not found}"
  echo ""
  
  # Check if all are Ready
  if [[ "$DEVELOP_STATUS" == "Ready" ]] && [[ "$STAGING_STATUS" == "Ready" ]] && [[ "$PROD_STATUS" == "Ready" ]]; then
    echo "✅ All deployments successful!"
    exit 0
  fi
  
  # Check if any failed
  if [[ "$DEVELOP_STATUS" == "Error" ]] || [[ "$STAGING_STATUS" == "Error" ]] || [[ "$PROD_STATUS" == "Error" ]]; then
    echo "❌ One or more deployments failed!"
    vercel ls 2>&1 | head -10
    exit 1
  fi
  
  sleep 5
done

echo "⏱️  Timeout reached. Checking final status..."
vercel ls 2>&1 | head -10
exit 1

