# Testing Mode Configuration

## Overview

Testing Mode limits data retrieval during the testing phase to reduce API costs and processing time while still providing sufficient data to test all features.

## How to Enable Testing Mode

### Option 1: Environment Variable (Recommended)

Add to your `.env.local` file:
```bash
NEXT_PUBLIC_TESTING_MODE=true
```

Or for server-side only:
```bash
TESTING_MODE=true
```

### Option 2: Vercel Environment Variables

1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. Add:
   - Name: `NEXT_PUBLIC_TESTING_MODE`
   - Value: `true`
   - Environment: Development, Preview, Production (as needed)

## Testing Limits Applied

When Testing Mode is enabled, the following limits are automatically applied:

### Keyword Research
- **Primary Keywords**: Max 5 per search
- **Suggestions per Keyword**: Max 5 (reduced from 75)
- **Related Keywords**: Max 5 per keyword
- **Long-tail Keywords**: Max 5 per keyword
- **Total Keywords**: Max 25 per session

### Clustering
- **Clusters**: Max 5 per search
- **Keywords per Cluster**: Max 10

### Backlinks (if implemented)
- **Backlinks**: Max 20 per domain
- **Referring Domains**: Max 10
- **Anchor Texts**: Max 10

### SERP Data
- **Results**: Max 10 (top results only)
- **Features**: Max 5

### Trends
- **Monthly Data**: Last 6 months only
- **Historical Comparisons**: Disabled

## Visual Indicator

When Testing Mode is active, a yellow banner appears at the top of the keyword research page showing:
- 🧪 Testing Mode Active
- Brief explanation of the limits

## Cost Savings

**Estimated Reductions:**
- API Calls: 70-80% reduction
- Processing Time: 60-70% reduction
- Data Transfer: 75-85% reduction
- Storage: 70-80% reduction

## Testing Coverage

Despite the limits, Testing Mode still provides:
- ✅ All features testable
- ✅ Complete data flow validation
- ✅ UI component testing
- ✅ API integration verification
- ✅ Error handling validation

## Disabling Testing Mode

Simply remove or set the environment variable to `false`:
```bash
NEXT_PUBLIC_TESTING_MODE=false
```

Or remove it entirely from your environment variables.

## Server-Side Configuration

To mirror this on the server (Blog Writer API), you'll need to:

1. Add similar testing limits to the backend API
2. Check for `TESTING_MODE` environment variable
3. Apply limits before making DataForSEO API calls
4. Return testing mode indicator in responses

The frontend will automatically respect server-side limits if the API returns `testing_mode: true` in responses.

