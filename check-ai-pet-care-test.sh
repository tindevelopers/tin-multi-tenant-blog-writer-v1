#!/bin/bash

# Check the status of the AI Pet Care test

echo "🔍 Checking AI Pet Care Test Status..."
echo ""

if [ -f test-ai-pet-care-result.txt ]; then
  FILE_SIZE=$(wc -c < test-ai-pet-care-result.txt)
  FILE_LINES=$(wc -l < test-ai-pet-care-result.txt)
  
  echo "📄 Output file: test-ai-pet-care-result.txt"
  echo "   Size: $FILE_SIZE bytes"
  echo "   Lines: $FILE_LINES"
  echo ""
  
  if [ $FILE_SIZE -gt 0 ]; then
    # Check for HTTP status
    if grep -q "HTTP Status:" test-ai-pet-care-result.txt; then
      HTTP_CODE=$(grep "HTTP Status:" test-ai-pet-care-result.txt | tail -1 | awk '{print $3}')
      TIME_TAKEN=$(grep "Total Time:" test-ai-pet-care-result.txt | tail -1 | awk '{print $3}')
      
      echo "✅ Test completed!"
      echo "   HTTP Status: $HTTP_CODE"
      echo "   Time Taken: ${TIME_TAKEN}s"
      echo ""
      
      if [ "$HTTP_CODE" = "200" ]; then
        echo "=== Extracting JSON response ==="
        # Extract JSON part (before HTTP Status line)
        grep -v "HTTP Status:" test-ai-pet-care-result.txt | grep -v "Total Time:" > test-ai-pet-care.json 2>/dev/null
        
        if command -v jq &> /dev/null && [ -f test-ai-pet-care.json ]; then
          echo ""
          echo "📊 Response Summary:"
          echo "==================="
          jq -r '.title // "N/A"' test-ai-pet-care.json 2>/dev/null | sed 's/^/  Title: /'
          jq -r '.word_count // "N/A"' test-ai-pet-care.json 2>/dev/null | sed 's/^/  Word Count: /'
          jq -r '.seo_score // "N/A"' test-ai-pet-care.json 2>/dev/null | sed 's/^/  SEO Score: /'
          jq -r '.readability_score // "N/A"' test-ai-pet-care.json 2>/dev/null | sed 's/^/  Readability Score: /'
          jq -r '.quality_score // "N/A"' test-ai-pet-care.json 2>/dev/null | sed 's/^/  Quality Score: /'
          jq -r '.total_cost // 0' test-ai-pet-care.json 2>/dev/null | sed 's/^/  Total Cost: $/'
          jq -r '.total_tokens // "N/A"' test-ai-pet-care.json 2>/dev/null | sed 's/^/  Total Tokens: /'
          jq -r '.generation_time // "N/A"' test-ai-pet-care.json 2>/dev/null | sed 's/^/  Generation Time: /s'
          echo ""
          echo "📈 Enhanced Features:"
          jq -r '.progress_updates | length // 0' test-ai-pet-care.json 2>/dev/null | sed 's/^/  Progress Updates: /'
          jq -r '.citations | length // 0' test-ai-pet-care.json 2>/dev/null | sed 's/^/  Citations: /'
          jq -r '.semantic_keywords | length // 0' test-ai-pet-care.json 2>/dev/null | sed 's/^/  Semantic Keywords: /'
          echo ""
          echo "📝 Content Preview (first 300 chars):"
          jq -r '.content // ""' test-ai-pet-care.json 2>/dev/null | head -c 300 | sed 's/^/  /'
          echo "..."
          echo ""
          echo "💾 Full response saved to: test-ai-pet-care.json"
        else
          echo "=== Raw Response (last 50 lines) ==="
          tail -50 test-ai-pet-care-result.txt
        fi
      else
        echo "❌ Error response received (HTTP $HTTP_CODE)"
        echo ""
        echo "=== Error Details ==="
        grep -v "HTTP Status:" test-ai-pet-care-result.txt | grep -v "Total Time:" | tail -30
      fi
    else
      echo "⏳ Test still running... (no HTTP status found yet)"
      echo ""
      echo "=== Last 20 lines of output ==="
      tail -20 test-ai-pet-care-result.txt
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

