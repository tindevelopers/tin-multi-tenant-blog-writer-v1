#!/bin/bash

# Check the status of the running test

echo "🔍 Checking test status..."
echo ""

if [ -f test-result-raw.txt ]; then
  FILE_SIZE=$(wc -c < test-result-raw.txt)
  FILE_LINES=$(wc -l < test-result-raw.txt)
  
  echo "📄 Output file: test-result-raw.txt"
  echo "   Size: $FILE_SIZE bytes"
  echo "   Lines: $FILE_LINES"
  echo ""
  
  if [ $FILE_SIZE -gt 0 ]; then
    echo "=== Last 50 lines of output ==="
    tail -50 test-result-raw.txt
    echo ""
    
    # Check for HTTP status
    if grep -q "HTTP Status:" test-result-raw.txt; then
      echo "✅ Test completed!"
      HTTP_CODE=$(grep "HTTP Status:" test-result-raw.txt | tail -1 | awk '{print $3}')
      echo "   HTTP Status: $HTTP_CODE"
      
      if [ "$HTTP_CODE" = "200" ]; then
        echo ""
        echo "=== Parsing JSON response ==="
        # Extract JSON part (before HTTP Status line)
        head -n -2 test-result-raw.txt > test-result.json 2>/dev/null || cat test-result-raw.txt > test-result.json
        
        if command -v jq &> /dev/null; then
          echo ""
          echo "📊 Response Summary:"
          jq -r '.title // "N/A"' test-result.json 2>/dev/null | sed 's/^/  Title: /'
          jq -r '.word_count // "N/A"' test-result.json 2>/dev/null | sed 's/^/  Word Count: /'
          jq -r '.seo_score // "N/A"' test-result.json 2>/dev/null | sed 's/^/  SEO Score: /'
          jq -r '.readability_score // "N/A"' test-result.json 2>/dev/null | sed 's/^/  Readability: /'
          jq -r '.total_cost // 0' test-result.json 2>/dev/null | sed 's/^/  Total Cost: $/'
          jq -r '.progress_updates | length // 0' test-result.json 2>/dev/null | sed 's/^/  Progress Updates: /'
          jq -r '.citations | length // 0' test-result.json 2>/dev/null | sed 's/^/  Citations: /'
          jq -r '.semantic_keywords | length // 0' test-result.json 2>/dev/null | sed 's/^/  Semantic Keywords: /'
        fi
      else
        echo "❌ Error response received"
        echo ""
        echo "=== Error Details ==="
        head -n -2 test-result-raw.txt | tail -20
      fi
    else
      echo "⏳ Test still running... (no HTTP status found yet)"
    fi
  else
    echo "⏳ Test is running... (file is empty or still writing)"
  fi
else
  echo "⏳ Test file not found - test may not have started yet"
fi

echo ""
echo "=== Checking for running curl processes ==="
CURL_COUNT=$(ps aux | grep -i "curl.*blog-writer" | grep -v grep | wc -l | tr -d ' ')
if [ "$CURL_COUNT" -gt 0 ]; then
  echo "🔄 Test is still running ($CURL_COUNT curl process(es) active)"
else
  echo "✅ No active test processes found"
fi

