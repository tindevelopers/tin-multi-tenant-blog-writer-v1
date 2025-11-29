# Test: Store "7 Dwarfs" Keyword Research

## Quick Test Command

### Step 1: Get Your Auth Cookie

1. Open your browser and navigate to `http://localhost:3000`
2. Log in to your account
3. Open DevTools (F12 or Cmd+Option+I)
4. Go to **Application** → **Cookies** → `http://localhost:3000`
5. Find the cookie named `sb-*-auth-token` (where `*` is your Supabase project ID)
6. Copy the **Value** of this cookie

### Step 2: Test the Endpoint

Replace `YOUR_AUTH_COOKIE` with the cookie value you copied:

```bash
curl -X POST http://localhost:3000/api/keywords/store \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-YOUR_PROJECT_ID-auth-token=YOUR_AUTH_COOKIE" \
  -d '{
    "keyword": "7 dwarfs",
    "location": "United States",
    "language": "en",
    "search_type": "traditional",
    "traditional_data": {
      "keyword": "7 dwarfs",
      "search_volume": 50000,
      "keyword_difficulty": 30,
      "competition": 0.3,
      "cpc": 1.5,
      "related_keywords": ["snow white", "disney characters", "seven dwarfs", "Doc", "Grumpy", "Happy", "Sleepy", "Bashful", "Sneezy", "Dopey"]
    },
    "related_terms": [
      {
        "keyword": "Doc",
        "search_volume": 10000,
        "keyword_difficulty": 25,
        "competition": 0.2,
        "cpc": 1.2,
        "parent_topic": "7 dwarfs"
      },
      {
        "keyword": "Grumpy",
        "search_volume": 15000,
        "keyword_difficulty": 28,
        "competition": 0.25,
        "cpc": 1.3,
        "parent_topic": "7 dwarfs"
      },
      {
        "keyword": "Happy",
        "search_volume": 12000,
        "keyword_difficulty": 26,
        "competition": 0.22,
        "cpc": 1.25,
        "parent_topic": "7 dwarfs"
      },
      {
        "keyword": "Sleepy",
        "search_volume": 11000,
        "keyword_difficulty": 24,
        "competition": 0.2,
        "cpc": 1.2,
        "parent_topic": "7 dwarfs"
      },
      {
        "keyword": "Bashful",
        "search_volume": 8000,
        "keyword_difficulty": 22,
        "competition": 0.18,
        "cpc": 1.1,
        "parent_topic": "7 dwarfs"
      },
      {
        "keyword": "Sneezy",
        "search_volume": 9000,
        "keyword_difficulty": 23,
        "competition": 0.19,
        "cpc": 1.15,
        "parent_topic": "7 dwarfs"
      },
      {
        "keyword": "Dopey",
        "search_volume": 13000,
        "keyword_difficulty": 27,
        "competition": 0.23,
        "cpc": 1.28,
        "parent_topic": "7 dwarfs"
      }
    ]
  }'
```

### Expected Response

```json
{
  "success": true,
  "id": "uuid-here",
  "message": "Keyword research stored successfully"
}
```

## Verify the Data Was Stored

### Option 1: Via API

```bash
curl -X GET "http://localhost:3000/api/keywords/research-results?keyword=7%20dwarfs" \
  -H "Cookie: sb-YOUR_PROJECT_ID-auth-token=YOUR_AUTH_COOKIE"
```

### Option 2: Via UI

1. Navigate to `http://localhost:3000/admin/seo/keywords`
2. Search for "7 dwarfs"
3. Click on the research result to see all 7 dwarfs as keyword terms

### Option 3: Via Debug Endpoint

```bash
curl -X GET "http://localhost:3000/api/keywords/list?research_result_id=RESEARCH_RESULT_ID" \
  -H "Cookie: sb-YOUR_PROJECT_ID-auth-token=YOUR_AUTH_COOKIE"
```

## Expected Database Structure

After successful storage, you should have:

1. **1 Research Result** in `keyword_research_results`:
   - Keyword: "7 dwarfs"
   - Location: "United States"
   - Language: "en"
   - Search Type: "traditional"

2. **7 Keyword Terms** in `keyword_terms`:
   - Doc
   - Grumpy
   - Happy
   - Sleepy
   - Bashful
   - Sneezy
   - Dopey

Each term will have:
- `search_volume`
- `keyword_difficulty`
- `competition`
- `cpc`
- `parent_topic`: "7 dwarfs"

## Test Script

Save this as `test-7-dwarfs.sh` and make it executable:

```bash
#!/bin/bash

# Set your auth cookie here
AUTH_COOKIE="sb-YOUR_PROJECT_ID-auth-token=YOUR_COOKIE_VALUE"

echo "🧪 Testing 7 Dwarfs Storage..."
echo ""

# Store the data
RESPONSE=$(curl -s -X POST http://localhost:3000/api/keywords/store \
  -H "Content-Type: application/json" \
  -H "Cookie: $AUTH_COOKIE" \
  -d '{
    "keyword": "7 dwarfs",
    "location": "United States",
    "language": "en",
    "search_type": "traditional",
    "traditional_data": {
      "keyword": "7 dwarfs",
      "search_volume": 50000,
      "keyword_difficulty": 30,
      "competition": 0.3,
      "cpc": 1.5
    },
    "related_terms": [
      {"keyword": "Doc", "search_volume": 10000, "keyword_difficulty": 25, "competition": 0.2, "cpc": 1.2, "parent_topic": "7 dwarfs"},
      {"keyword": "Grumpy", "search_volume": 15000, "keyword_difficulty": 28, "competition": 0.25, "cpc": 1.3, "parent_topic": "7 dwarfs"},
      {"keyword": "Happy", "search_volume": 12000, "keyword_difficulty": 26, "competition": 0.22, "cpc": 1.25, "parent_topic": "7 dwarfs"},
      {"keyword": "Sleepy", "search_volume": 11000, "keyword_difficulty": 24, "competition": 0.2, "cpc": 1.2, "parent_topic": "7 dwarfs"},
      {"keyword": "Bashful", "search_volume": 8000, "keyword_difficulty": 22, "competition": 0.18, "cpc": 1.1, "parent_topic": "7 dwarfs"},
      {"keyword": "Sneezy", "search_volume": 9000, "keyword_difficulty": 23, "competition": 0.19, "cpc": 1.15, "parent_topic": "7 dwarfs"},
      {"keyword": "Dopey", "search_volume": 13000, "keyword_difficulty": 27, "competition": 0.23, "cpc": 1.28, "parent_topic": "7 dwarfs"}
    ]
  }')

echo "$RESPONSE" | jq .

# Extract the research result ID
RESULT_ID=$(echo "$RESPONSE" | jq -r '.id')

if [ "$RESULT_ID" != "null" ] && [ "$RESULT_ID" != "" ]; then
  echo ""
  echo "✅ Success! Research Result ID: $RESULT_ID"
  echo ""
  echo "🔍 Verifying stored data..."
  
  # Verify the data
  VERIFY=$(curl -s -X GET "http://localhost:3000/api/keywords/list?research_result_id=$RESULT_ID" \
    -H "Cookie: $AUTH_COOKIE")
  
  TERM_COUNT=$(echo "$VERIFY" | jq '.terms | length')
  echo "✅ Found $TERM_COUNT keyword terms"
  echo ""
  echo "📊 Terms:"
  echo "$VERIFY" | jq -r '.terms[] | "   - \(.keyword) (SV: \(.search_volume), KD: \(.keyword_difficulty))"'
else
  echo ""
  echo "❌ Failed to store data"
fi
```

Make it executable and run:
```bash
chmod +x test-7-dwarfs.sh
./test-7-dwarfs.sh
```

## Troubleshooting

### Error: Unauthorized (401)
- Make sure you're logged in to the application
- Copy the correct auth cookie value
- The cookie name format is: `sb-{project-id}-auth-token`

### Error: RLS Policy Violation
- Ensure you're using an authenticated user's cookie
- The RLS policies require the user_id to match the authenticated user

### No Data Appearing
- Check the research result was created: `/api/keywords/research-results`
- Check the keyword terms: `/api/keywords/list?research_result_id={id}`
- Verify in the UI at `/admin/seo/keywords`

