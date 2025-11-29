# Keyword Storage & Search UI Guide

## 🎯 Quick Access Links

### 1. **SEO Tools Page** (Main Keyword Research)
- **Path:** `/admin/seo`
- **Sidebar Navigation:** Analytics & SEO → SEO Tools
- **Features:**
  - Primary keyword input field
  - **Search Type Selector** (Traditional SEO, AI Search, or Both)
  - Location and language selection
  - Real-time keyword research
  - Results automatically stored in database

### 2. **Keyword Storage & History** (View Stored Keywords)
- **Path:** `/admin/seo/keywords`
- **Sidebar Navigation:** Analytics & SEO → Keyword Storage
- **Features:**
  - View all stored keyword research results
  - Search stored keywords
  - Filter by search type, location, language
  - View detailed keyword metrics
  - Cache flush functionality
  - Pagination support

## 🔍 How to Use Search Types

### Traditional SEO Search
- **What it does:** Returns Google search volume, keyword difficulty, competition, CPC
- **When to use:** For traditional SEO content planning
- **Data source:** DataForSEO Google Ads API

### AI Search
- **What it does:** Returns AI search volume, LLM mentions, AI optimization scores
- **When to use:** For optimizing content for AI search engines (ChatGPT, Google AI)
- **Data source:** DataForSEO AI Optimization API

### Both (Recommended)
- **What it does:** Combines Traditional SEO + AI Search data
- **When to use:** For comprehensive keyword research covering both traditional and AI search
- **Data source:** Both APIs combined

## 📍 Where to Find Everything

### Step 1: Access SEO Tools
1. Open the sidebar menu
2. Navigate to **"Analytics & SEO"** section
3. Click **"SEO Tools"**

### Step 2: Perform Keyword Research
1. On the SEO Tools page, you'll see the **"Research"** tab (default)
2. Enter your primary keyword in the input field
3. Select your target **Location** (e.g., United States)
4. Select your **Language** (e.g., English)
5. **Choose Search Type:**
   - Click **"Traditional SEO"** for Google search data
   - Click **"AI Search"** for AI search data
   - Click **"Both"** for combined data (recommended)
6. Click **"Research Keywords"** button

### Step 3: View Stored Keywords
1. From the sidebar, navigate to **"Analytics & SEO"** → **"Keyword Storage"**
   - OR click the **"Research History"** button in the SEO Tools page header
2. You'll see all your stored keyword research results
3. Use the search bar to find specific keywords
4. Use filters to narrow down by:
   - Search Type (Traditional, AI, Both)
   - Location
   - Language
5. Click **"View Details"** on any result to see:
   - All keyword terms
   - Search volumes (Traditional & AI)
   - Keyword difficulty
   - Competition scores
   - CPC data
   - AI optimization scores

## 🎨 UI Components

### Search Type Selector
Located in the Primary Keyword Input form on the SEO Tools page:
- **Traditional SEO:** Blue card with search icon
- **AI Search:** Purple card with sparkles icon  
- **Both:** Green card with both icons

### Keyword Storage Page Features
- **Search Bar:** Top of page, search by keyword name
- **Filters Button:** Expandable filter panel
- **Research Results Cards:** Each card shows:
  - Keyword name
  - Search type badge
  - Location & language
  - Created date
  - Keyword count
  - Quick stats (Search Volume, Difficulty, AI Volume, AI Score)
- **View Details Modal:** Click any card to see full keyword term table

## 💾 Data Storage

All keyword research results are automatically:
- **Cached** for 90 days (reduces API calls)
- **Stored** in database (`keyword_research_results` table)
- **Individual keywords** stored in `keyword_terms` table
- **Accessible** via the Keyword Storage page

## 🔄 Cache Management

- **Cache Duration:** 90 days
- **Flush Cache:** Click "Flush Cache" button on Keyword Storage page
- **Auto-refresh:** Click "Refresh" button to reload data

## 📊 Data Display

### Keyword Metrics Shown:
- **Traditional:**
  - Search Volume
  - Global Search Volume
  - Keyword Difficulty (0-100)
  - Competition (0-1 scale)
  - CPC (Cost Per Click)
  - Search Intent
  - Trend Score

- **AI:**
  - AI Search Volume
  - AI Optimization Score (0-100)
  - AI Mentions Count
  - AI Platform (ChatGPT/Google)
  - Ranking Score
  - Opportunity Score

## 🚀 Quick Tips

1. **Start with "Both"** search type to get comprehensive data
2. **Use filters** on Keyword Storage page to find specific research sessions
3. **View Details** to see all related and matching terms
4. **Cache flush** only when you need fresh data (results cached for 90 days)
5. **Search bar** works on keyword names, not metrics

## 🐛 Troubleshooting

**Can't see Search Type Selector?**
- Make sure you're on the SEO Tools page (`/admin/seo`)
- Check the "Research" tab is active
- The selector appears below Location/Language fields

**Can't find Keyword Storage page?**
- Check sidebar: Analytics & SEO → Keyword Storage
- Direct URL: `/admin/seo/keywords`
- Or click "Research History" button on SEO Tools page

**Search not working?**
- Make sure you've performed at least one keyword research
- Check filters aren't too restrictive
- Try refreshing the page

