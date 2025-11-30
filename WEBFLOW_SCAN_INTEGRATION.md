# Webflow Structure Scan Integration

## ✅ Status: Fully Integrated

The Webflow structure scanning system is **fully integrated** into the content enhancement workflow for intelligent hyperlink insertion.

---

## 📍 Endpoints

### 1. Scan Webflow Structure
**Endpoint:** `POST /api/integrations/webflow/scan-structure`

**Purpose:** Scans Webflow site to discover all CMS collections, CMS items, and static pages.

**Request:**
```javascript
POST /api/integrations/webflow/scan-structure
// Optional: { "site_id": "your-site-id" }
// If site_id not provided, uses site_id from integration config
```

**Response:**
```json
{
  "success": true,
  "scan_id": "uuid",
  "status": "scanning",
  "message": "Scan started successfully",
  "site_id": "your-site-id"
}
```

**Features:**
- Automatically fetches `site_id` from Webflow integration config if not provided
- Creates scan record in `webflow_structure_scans` table
- Performs scan asynchronously (non-blocking)
- Stores results: collections, static pages, CMS items, and combined `existing_content` array

---

### 2. Get Scan Status/Results
**Endpoint:** `GET /api/integrations/webflow/scan-structure`

**Query Parameters:**
- `scan_id` - Get specific scan by ID
- `site_id` - Get latest scans for a site
- (no params) - Get all scans for organization

**Response:**
```json
{
  "success": true,
  "scan": {
    "scan_id": "uuid",
    "site_id": "site-id",
    "status": "completed",
    "collections_count": 5,
    "static_pages_count": 12,
    "cms_items_count": 45,
    "total_content_items": 57,
    "existing_content": [...], // Array of CMS items and static pages
    "scan_completed_at": "2025-01-16T..."
  }
}
```

---

## 🔄 Integration Flow

### Phase 3: Content Enhancement (`/api/workflow/enhance-content`)

The hyperlink insertion happens automatically during Phase 3 of the content generation workflow:

```
1. Content Enhancement Request
   ↓
2. insertInternalLinks() function called
   ↓
3. Get Webflow Integration Credentials
   ↓
4. Check for Stored Scan (from webflow_structure_scans table)
   ├─ ✅ Found: Use stored scan data
   └─ ❌ Not Found: Discover on-the-fly + trigger background scan
   ↓
5. Analyze Hyperlink Opportunities
   ├─ Extract anchor texts from headings and keywords
   ├─ Match with Webflow CMS items and static pages
   └─ Score relevance (0-100)
   ↓
6. Insert Hyperlinks
   ├─ Uses OpenAI polish function (/api/v1/content/polish) if available
   └─ Falls back to simple insertion if polish unavailable
   ↓
7. Return Enhanced Content with Internal Links
```

---

## 📊 Data Flow

### 1. Scan Storage
Scans are stored in `webflow_structure_scans` table with:
- `collections` - Array of WebflowCollection objects
- `static_pages` - Array of WebflowPage objects  
- `existing_content` - Combined array of CMS items + static pages
- Statistics: `collections_count`, `static_pages_count`, `cms_items_count`, `total_content_items`

### 2. Content Structure Format
Each item in `existing_content` array has:
```typescript
{
  type: 'cms' | 'static',
  title: string,
  url: string,
  slug: string,
  keywords: string[],
  description?: string,
  // ... other metadata
}
```

### 3. Hyperlink Matching Algorithm
The system matches anchor texts to Webflow pages using:
- **Exact title match**: Score 100
- **Title contains anchor**: Score 80
- **Keyword match**: Score 70
- **Keyword contains anchor**: Score 60
- **Slug match**: Score 50
- **Partial keyword match**: Score 40+
- **CMS boost**: +5 points (CMS items prioritized)

---

## 🔧 Key Functions

### `insertInternalLinks()` 
**Location:** `src/app/api/workflow/enhance-content/route.ts`

**Flow:**
1. Gets Webflow integration credentials
2. Fetches stored scan or discovers on-the-fly
3. Analyzes hyperlink opportunities
4. Inserts hyperlinks using polish function
5. Returns content with internal links

### `analyzeHyperlinkOpportunities()`
**Location:** `src/lib/integrations/webflow-hyperlink-service.ts`

**Purpose:** Analyzes content and finds relevant hyperlink opportunities by:
- Extracting anchor texts from headings and keywords
- Matching with Webflow CMS items and static pages
- Scoring relevance (0-100)
- Returning top 10 suggestions

### `insertHyperlinksWithPolish()`
**Location:** `src/lib/integrations/webflow-hyperlink-service.ts`

**Purpose:** Inserts hyperlinks intelligently:
- Uses OpenAI polish endpoint (`/api/v1/content/polish`) if available
- Falls back to simple HTML insertion if polish unavailable
- Ensures natural link placement

### `discoverWebflowStructure()`
**Location:** `src/lib/integrations/webflow-structure-discovery.ts`

**Purpose:** Discovers Webflow site structure:
- Fetches CMS collections and items
- Fetches static pages
- Combines into `existing_content` array
- Returns structured data for hyperlink insertion

---

## 🎯 Usage in Workflow

### Automatic Integration
The hyperlink insertion is **automatically triggered** during Phase 3:

```typescript
// In enhance-content route.ts
enhancedContent = await insertInternalLinks(
  enhancedContent, 
  finalTitle, 
  keywords, 
  orgId  // Required for Webflow integration lookup
);
```

### Manual Trigger
You can also manually trigger a scan:

```javascript
// From browser console or API client
fetch('/api/integrations/webflow/scan-structure', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ site_id: 'your-site-id' })
})
```

---

## ✅ Verification Checklist

- [x] Scan endpoint exists: `/api/integrations/webflow/scan-structure`
- [x] Scan stores results in `webflow_structure_scans` table
- [x] Enhance-content workflow uses stored scans
- [x] Falls back to on-the-fly discovery if no scan exists
- [x] Triggers background scans for future use
- [x] Analyzes hyperlink opportunities intelligently
- [x] Inserts hyperlinks using OpenAI polish function
- [x] Supports both CMS items and static pages
- [x] Handles errors gracefully (continues without links on failure)

---

## 📝 Notes

1. **Performance:** Stored scans are preferred for performance. On-the-fly discovery is slower but ensures fresh data.

2. **Background Scans:** When no stored scan exists, the system triggers a background scan for future use (non-blocking).

3. **Error Handling:** If hyperlink insertion fails, the workflow continues with original content (no links added).

4. **Integration Required:** Hyperlink insertion only works if:
   - Organization has active Webflow integration
   - Integration has valid `api_key` and `site_id` in config

5. **Scan Frequency:** Scans are stored with `next_scan_at` timestamp (7 days from completion). You can trigger rescans manually.

---

## 🚀 Next Steps

The system is fully functional. To use it:

1. **Ensure Webflow Integration is Active:**
   - Go to Admin Panel → Integrations
   - Verify Webflow integration is active
   - Ensure `site_id` is configured

2. **Trigger Initial Scan:**
   - Use the scan endpoint or UI component
   - Wait for scan to complete (check status via GET endpoint)

3. **Content Generation:**
   - Generate content through workflow
   - Phase 3 will automatically insert hyperlinks
   - Links will point to relevant CMS items and static pages

---

**Status:** ✅ **READY TO USE**

