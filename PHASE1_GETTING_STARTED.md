# Phase 1: Getting Started Guide
## Advanced Keyword Research Engine

Welcome to Phase 1 of the Content Strategy Enhancement Plan! This guide will help you get up and running with the new keyword research features.

---

## 🚀 Quick Start (5 minutes)

### 1. Apply Database Migration

```bash
cd /Users/gene/Projects/tin-multi-tenant-blog-writer-v1

# If using Supabase CLI
supabase db push

# Or manually run the migration file in Supabase Studio
# File: supabase/migrations/20251014200000_keyword_research_phase1.sql
```

### 2. Verify Blog Writer API Connection

```bash
curl https://blog-writer-api-dev-613248238610.europe-west1.run.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-14T..."
}
```

### 3. Start Development Server

```bash
npm run dev
```

### 4. Access the Feature

Navigate to: **http://localhost:3000/admin/seo**

---

## 📖 User Tutorial

### Step 1: Enter Primary Keyword

1. Go to the **Research** tab
2. Enter your primary keyword (e.g., "content marketing strategy")
3. Select target location (default: United States)
4. Select language (default: English)
5. Click **Research Keywords**

### Step 2: Review Keyword Variations

1. Click the **Keywords** tab
2. You'll see a comprehensive table with:
   - All keyword variations
   - Monthly Search Volume (MSV)
   - Keyword Difficulty (0-100)
   - Competition Level (LOW/MEDIUM/HIGH)
   - Easy Win Score (0-100)
   - High Value Score (0-100)
   - Cost Per Click (CPC)

### Step 3: Filter & Sort

**View Modes**:
- **All Keywords**: See everything
- **Easy Wins**: Only keywords with Easy Win Score ≥ 60
- **High Value**: Only keywords with High Value Score ≥ 60

**Sorting**:
- Click any column header to sort
- Click again to reverse sort direction

**Text Search**:
- Use the search box to filter keywords
- Searches within keyword text

**Competition Filter**:
- Filter by LOW, MEDIUM, or HIGH competition
- Select from dropdown

### Step 4: Select Keywords for Content

1. Check the box next to keywords you want to use
2. Or click "Select All" to select all visible keywords
3. Selected count appears at the bottom
4. Click **Create Content** to proceed (Phase 2 feature)

### Step 5: View Content Clusters

1. Click the **Clusters** tab
2. See automatically generated content clusters:
   - **Pillar Content**: High-volume keywords suitable for comprehensive articles
   - **Supporting Content**: Related keywords for supporting articles
   - **Long-tail**: Specific, low-competition keywords

3. Each cluster shows:
   - Authority Potential score
   - Total search volume
   - Average difficulty
   - Keywords in cluster
   - Content strategy recommendations

---

## 🎯 Understanding the Metrics

### Easy Win Score (0-100)

**What it measures**: How easy it is to rank for this keyword

**High Score (80-100)** 🟢:
- Low difficulty
- Decent search volume
- Low competition
- **Action**: Create content ASAP - quick ranking opportunity

**Medium Score (60-79)** 🔵:
- Moderate difficulty
- Good search volume
- Medium competition
- **Action**: Good targets for building authority

**Low Score (0-59)** ⚪:
- High difficulty OR low volume OR high competition
- **Action**: Consider for long-term strategy only

### High Value Score (0-100)

**What it measures**: Commercial value and traffic potential

**High Score (80-100)** 🟢:
- High search volume
- Good CPC (Cost Per Click)
- Reasonable difficulty
- **Action**: High ROI potential - prioritize if resources allow

**Medium Score (60-79)** 🔵:
- Good volume or CPC
- Moderate difficulty
- **Action**: Solid long-term investments

**Low Score (0-59)** ⚪:
- Low volume AND low CPC
- **Action**: Skip unless strategically important

### Authority Potential (0-100)

**Cluster-level metric** - How well this cluster can build topical authority

**High Potential (80-100)**:
- Many related keywords
- High total volume
- Manageable difficulty
- **Action**: Create pillar content + 5-10 supporting articles

**Medium Potential (60-79)**:
- Good keyword set
- Decent volume
- **Action**: Create focused content series

**Low Potential (0-59)**:
- Few keywords OR very difficult
- **Action**: Not a priority for cluster strategy

---

## 💡 Best Practices

### Research Strategy

1. **Start Broad**
   - Begin with 1-2 seed keywords
   - Let the system find variations
   - You'll typically get 50-200 keyword ideas

2. **Identify Easy Wins First**
   - Switch to "Easy Wins" view mode
   - These are your quick ranking opportunities
   - Great for building initial authority

3. **Find High Value Opportunities**
   - Switch to "High Value" view mode
   - These keywords drive revenue
   - Prioritize if you have resources

4. **Review Clusters**
   - Check Clusters tab for pillar content opportunities
   - Focus on high Authority Potential clusters
   - Build comprehensive content series

5. **Mix and Match**
   - Balance easy wins with high-value targets
   - Create mix of pillar and supporting content
   - Build topical authority systematically

### Content Planning

**For Pillar Content** (based on high authority clusters):
- Target word count: 3,000+ words
- Include 5-10 related keywords naturally
- Create comprehensive, authoritative guide
- Link to supporting articles

**For Supporting Content** (based on cluster keywords):
- Target word count: 1,000-2,000 words
- Focus on specific aspect of pillar topic
- Link back to pillar article
- Link to related supporting articles

**For Easy Wins**:
- Quick articles: 800-1,500 words
- Target low-difficulty keywords
- Publish quickly to capture rankings
- Build initial domain authority

---

## 🔧 Troubleshooting

### "Research Error" appears

**Possible causes**:
1. Blog Writer API is down
2. Invalid keyword format
3. Network connectivity issue

**Solutions**:
1. Check API health: `curl https://blog-writer-api-dev-613248238610.europe-west1.run.app/health`
2. Try a different keyword
3. Check your internet connection
4. Wait a moment and try again

### No keywords found

**Possible causes**:
1. Very niche/specific keyword with no variations
2. Keyword not in DataForSEO database
3. API issue

**Solutions**:
1. Try a broader keyword
2. Check spelling
3. Try a related keyword
4. Check API logs

### Slow research (>30 seconds)

**Possible causes**:
1. Keyword with many variations (>100)
2. Multiple simultaneous requests
3. API rate limiting

**Solutions**:
1. Be patient - comprehensive research takes time
2. Avoid multiple simultaneous research requests
3. This is normal for popular keywords

### No clusters appear

**Possible causes**:
1. Keywords too dissimilar
2. Not enough keywords found (<10)

**Solutions**:
1. Try a broader seed keyword
2. Clusters appear automatically when enough related keywords are found
3. Algorithm looks for semantic similarity

---

## 📊 Export & Reporting

### CSV Export

1. Click **Export CSV** button in keywords table
2. File downloads with all visible keywords
3. Includes all metrics (MSV, difficulty, scores, etc.)
4. Use for reporting or external analysis

**CSV Columns**:
- Keyword
- Search Volume
- Difficulty
- Competition
- Easy Win Score
- High Value Score
- CPC

### Reporting Tips

- **Easy Wins Report**: Filter to Easy Wins, export, prioritize top 10-20
- **High Value Report**: Filter to High Value, export, analyze ROI potential
- **Cluster Report**: Screenshot clusters with recommendations
- **Progress Tracking**: Re-research same keywords monthly to track changes

---

## 🎓 Advanced Features

### API Integration

The system uses the existing Blog Writer API which already integrates with DataForSEO. You don't need separate DataForSEO credentials.

**Endpoints used**:
- `/api/v1/keywords/analyze` - Analyze keyword difficulty and metrics
- `/api/v1/keywords/suggest` - Get keyword variations
- `/api/v1/keywords/extract` - Extract keywords from content

### Custom Scoring

If you want to adjust how Easy Win and High Value scores are calculated, edit:

File: `/src/lib/keyword-research-enhanced.ts`

Functions:
- `calculateEasyWinScore()` - Line ~125
- `calculateHighValueScore()` - Line ~145

Adjust the weight constants (currently 0.5, 0.3, 0.2) to change how metrics are prioritized.

### Clustering Algorithm

The semantic clustering algorithm can be customized in:

File: `/src/lib/keyword-research-enhanced.ts`
Function: `createClusters()` - Line ~180

Current logic:
- Groups keywords by word similarity
- Identifies pillar keywords (volume > 10,000, difficulty < 70)
- Maximum 10 keywords per cluster
- Similarity threshold: 0.5 (50% word overlap)

---

## 🔐 Security Notes

### Multi-Tenancy

All data is automatically isolated by organization:
- Your keywords are only visible to your organization
- RLS (Row Level Security) enforces this at database level
- Even database administrators cannot bypass RLS policies

### Data Privacy

- Keyword research data stored in your Supabase instance
- API calls to Blog Writer API are stateless
- No keyword data shared between organizations
- Full audit trail via database timestamps

---

## 📞 Support & Resources

### Documentation
- [Phase 1 Implementation Summary](./PHASE1_IMPLEMENTATION_SUMMARY.md)
- [Complete Enhancement Plan](./CONTENT_STRATEGY_ENHANCEMENT_PLAN.md)
- [Blog Writer API Docs](https://blog-writer-api-dev-613248238610.europe-west1.run.app/docs)

### Files Reference
- UI Components: `/src/components/keyword-research/`
- Core Service: `/src/lib/keyword-research-enhanced.ts`
- React Hooks: `/src/hooks/useEnhancedKeywordResearch.ts`
- Database Schema: `/supabase/migrations/20251014200000_keyword_research_phase1.sql`
- Admin Page: `/src/app/admin/seo/page.tsx`

### Next Steps

Once you're comfortable with Phase 1:
1. **Phase 2**: Content Cluster Strategy Engine (Weeks 3-4)
2. **Phase 3**: Enhanced Blog Generation with Stability AI (Weeks 5-6)
3. **Phase 4**: Webflow Site Analysis & Interlinking (Weeks 7-8)
4. **Phase 5**: Advanced Analytics & Optimization (Weeks 9-10)

---

**Happy researching! 🚀**

Questions? Review the implementation summary or check the API documentation for more details.

