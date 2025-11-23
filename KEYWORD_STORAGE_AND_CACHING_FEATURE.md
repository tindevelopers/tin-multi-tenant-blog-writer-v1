# Keyword Storage and Caching Feature

## Overview

This feature adds comprehensive keyword research storage and caching capabilities, allowing users to:
- Choose between Traditional SEO search, AI search, or Both
- Automatically store all keyword research results in Supabase
- Cache results for 7 days to reduce API calls
- Store related terms and matching terms for traditional search
- Retrieve stored keywords with full metrics (Ahrefs/SpyFu style)

## Database Schema

### Tables Created

1. **keyword_cache** - 7-day cache for keyword research results
   - Stores traditional and AI data
   - Includes related terms
   - Auto-expires after 7 days
   - Tracks hit count and last accessed

2. **keyword_research_results** - Full storage of keyword research
   - Stores complete research results
   - Includes traditional SEO metrics
   - Includes AI optimization metrics
   - Stores related and matching terms
   - Full API response for replay

3. **keyword_terms** - Individual keyword storage (Ahrefs/SpyFu style)
   - Each keyword stored with full metrics
   - Supports filtering and querying
   - Tracks related/matching term relationships
   - Stores both traditional and AI metrics

## API Endpoints

### POST /api/keywords/store
Store keyword research results with automatic caching.

**Request:**
```json
{
  "keyword": "pet groomers in miami",
  "location": "United States",
  "language": "en",
  "search_type": "traditional", // or "ai" or "both"
  "traditional_data": { ... },
  "ai_data": { ... },
  "related_terms": [ ... ],
  "matching_terms": [ ... ],
  "auto_cache": true
}
```

**Response:**
```json
{
  "success": true,
  "id": "uuid",
  "message": "Keyword research stored successfully"
}
```

### GET /api/keywords/retrieve
Retrieve keyword research from cache or database.

**Query Parameters:**
- `keyword` (required) - The keyword to retrieve
- `location` (optional) - Default: "United States"
- `language` (optional) - Default: "en"
- `search_type` (optional) - "traditional", "ai", or "both"
- `use_cache` (optional) - Default: true

**Response:**
```json
{
  "success": true,
  "data": {
    "keyword": "pet groomers in miami",
    "traditional_data": { ... },
    "ai_data": { ... },
    "related_terms": [ ... ]
  },
  "source": "cache" // or "database" or "api"
}
```

### GET /api/keywords/list
List all keyword terms for the authenticated user.

**Query Parameters:**
- `search_type` (optional) - Filter by search type
- `location` (optional) - Filter by location
- `language` (optional) - Filter by language
- `parent_keyword` (optional) - Filter by parent keyword
- `is_related_term` (optional) - Filter related terms
- `is_matching_term` (optional) - Filter matching terms
- `min_search_volume` (optional) - Minimum search volume
- `max_difficulty` (optional) - Maximum keyword difficulty

**Response:**
```json
{
  "success": true,
  "count": 150,
  "terms": [ ... ]
}
```

## Usage

### Frontend Component

```tsx
import SearchTypeSelector from '@/components/keywords/SearchTypeSelector';

function KeywordResearchPage() {
  const [searchType, setSearchType] = useState<SearchType>('traditional');

  return (
    <SearchTypeSelector
      value={searchType}
      onChange={setSearchType}
      showBothOption={true}
    />
  );
}
```

### Service Usage

```typescript
import keywordResearchWithStorage from '@/lib/keyword-research-with-storage';

// Research keyword with automatic caching and storage
const result = await keywordResearchWithStorage.researchKeyword(
  'pet groomers in miami',
  {
    searchType: 'both', // 'traditional', 'ai', or 'both'
    location: 'United States',
    language: 'en',
    autoStore: true, // Automatically store results
    useCache: true, // Check cache first
    includeRelatedTerms: true, // Include related terms for traditional search
  }
);

// Result includes:
// - traditionalData: Traditional SEO metrics
// - aiData: AI optimization metrics
// - relatedTerms: Related keywords with full data
// - matchingTerms: Matching keywords with full data
// - source: 'cache', 'database', or 'api'
// - cached: boolean
```

### Direct API Usage

```typescript
// Store keyword research
const storeResponse = await fetch('/api/keywords/store', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    keyword: 'pet groomers in miami',
    search_type: 'both',
    traditional_data: { ... },
    ai_data: { ... },
    related_terms: [ ... ],
  }),
});

// Retrieve keyword research
const retrieveResponse = await fetch(
  '/api/keywords/retrieve?keyword=pet+groomers+in+miami&search_type=both'
);
const data = await retrieveResponse.json();

// List user's keywords
const listResponse = await fetch(
  '/api/keywords/list?search_type=traditional&min_search_volume=100'
);
const keywords = await listResponse.json();
```

## Features

### 7-Day Caching
- Results are cached for 7 days
- Cache is checked before making API calls
- Cache automatically expires after 7 days
- Hit count and last accessed are tracked

### Automatic Storage
- All keyword research is automatically stored in database
- Includes full API responses for replay
- Stores both traditional and AI data
- Preserves all metrics and related terms

### Related Terms Support
- Traditional search includes related terms
- Each related term stored with full metrics
- Supports filtering by related/matching terms
- Similar to Ahrefs/SpyFu keyword tables

### Comprehensive Data Storage
- Stores all keyword metrics (search volume, difficulty, competition, CPC, etc.)
- Includes SERP features and trends
- Stores AI optimization scores and LLM mentions
- Full historical data (monthly searches, trends)

## Database Functions

### get_cached_keyword()
Retrieves cached keyword data if not expired.

```sql
SELECT * FROM get_cached_keyword(
  'pet groomers in miami',
  'United States',
  'en',
  'traditional',
  'user-uuid'
);
```

### clean_expired_keyword_cache()
Removes expired cache entries (older than 7 days).

```sql
SELECT clean_expired_keyword_cache();
```

## Migration

Run the migration to create the tables:

```bash
# Apply migration
psql -d your_database -f supabase/migrations/20250124000000_enhanced_keyword_storage_with_caching.sql
```

Or apply via Supabase Dashboard SQL Editor.

## Benefits

1. **Reduced API Costs** - 7-day cache reduces redundant API calls
2. **Faster Results** - Cached results return instantly
3. **Data Persistence** - All research stored for future reference
4. **Comprehensive Metrics** - Full Ahrefs/SpyFu-style data storage
5. **Related Terms** - Automatic storage of related and matching terms
6. **Flexible Search** - Choose traditional, AI, or both search types

## Future Enhancements

- [ ] Bulk keyword import/export
- [ ] Keyword comparison tools
- [ ] Historical trend analysis
- [ ] Keyword clustering and grouping
- [ ] Export to CSV/Excel
- [ ] Keyword alerts and monitoring

