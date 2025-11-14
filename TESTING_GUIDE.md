# Testing Guide - New API Features

**Date**: 2025-01-XX  
**Test Page**: `/admin/test-api-features`

---

## 🚀 Quick Start

1. **Start your development server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Navigate to the test page**:
   ```
   http://localhost:3000/admin/test-api-features
   ```

3. **Test each feature** using the tabs at the top of the page.

---

## 📋 Testing Checklist

### 1. Content Analysis (`/api/blog-writer/analyze`)

**Test Steps**:
1. Go to the **Analyze** tab
2. Enter test content in the "Test Content" area (or use the default)
3. Enter a topic (e.g., "artificial intelligence")
4. Enter keywords (comma-separated, e.g., "AI, machine learning, deep learning")
5. Click **"Analyze Content"** button
6. **Expected Results**:
   - ✅ Analysis panel shows readability, SEO, and quality scores
   - ✅ Word count, reading time, headings, links, images counts displayed
   - ✅ Recommendations appear (if any)
   - ✅ Missing keywords displayed (if any)

**What to Check**:
- [ ] API call succeeds (check browser Network tab)
- [ ] Scores are displayed (0-100 range)
- [ ] All statistics are shown
- [ ] Recommendations are actionable
- [ ] Error handling works (try with empty content)

---

### 2. Content Optimization (`/api/blog-writer/optimize`)

**Test Steps**:
1. Go to the **Optimize** tab
2. Enter test content
3. Enter topic and keywords
4. Select optimization goals (SEO, readability, keywords)
5. Click **"Optimize Content"** button
6. **Expected Results**:
   - ✅ Before/after scores comparison displayed
   - ✅ Changes made list appears
   - ✅ Improvements listed
   - ✅ "Accept Optimized Content" button updates the test content area

**What to Check**:
- [ ] API call succeeds
- [ ] Before/after scores show improvement
- [ ] Changes are clearly described
- [ ] Accept button updates content
- [ ] Error handling works

---

### 3. Topic Recommendations (`/api/blog-writer/topics/recommend`)

**Test Steps**:
1. Go to the **Topics** tab
2. Enter keywords (one per line, e.g., "artificial intelligence", "machine learning")
3. Click **"Get Topic Recommendations"** button
4. **Expected Results**:
   - ✅ List of recommended topics displayed
   - ✅ Each topic shows: title, description, keywords, search volume, difficulty, estimated traffic
   - ✅ Topics are relevant to input keywords

**What to Check**:
- [ ] API call succeeds
- [ ] Topics are relevant
- [ ] All topic metadata is displayed
- [ ] Error handling works (try with empty keywords)

---

### 4. Content Metadata Components

**Test Steps** (on Analyze tab):
1. Scroll down to see metadata components
2. **Table of Contents**:
   - ✅ Shows hierarchical headings
   - ✅ Clicking headings scrolls to section (if content is on page)
3. **Image Gallery**:
   - ✅ Featured image displayed
   - ✅ Section images in grid
   - ✅ Alt text shown
4. **Link Validation Panel**:
   - ✅ Internal/external links categorized
   - ✅ Invalid links highlighted
   - ✅ Links are clickable
5. **Quality Dimensions**:
   - ✅ All dimensions displayed with scores
   - ✅ Progress bars show visually
   - ✅ Color coding (green/yellow/red) based on score

**What to Check**:
- [ ] All components render correctly
- [ ] TOC navigation works
- [ ] Images load (placeholder images should work)
- [ ] Link validation correctly identifies invalid links
- [ ] Quality dimensions are visually clear

---

### 5. SEO Metadata Editor

**Test Steps**:
1. Go to the **Metadata** tab
2. Edit Open Graph fields:
   - OG Title
   - OG Description
   - OG Image URL
3. Select Twitter Card type
4. Enter Canonical URL
5. Click **"Save"** button
6. **Expected Results**:
   - ✅ "Saved" confirmation appears
   - ✅ Structured data preview shows JSON
   - ✅ All fields persist

**What to Check**:
- [ ] All fields are editable
- [ ] Save button works
- [ ] Structured data preview is readable
- [ ] Validation works (URLs, etc.)

---

### 6. Product Research UI Controls

**Test Steps**:
1. Navigate to `/admin/workflow/editor`
2. Scroll to "Product Research Features" section
3. Toggle "Enable Product Research"
4. **Expected Results**:
   - ✅ Research depth selector appears
   - ✅ All feature checkboxes appear
   - ✅ All options are selectable
   - ✅ Options persist when generating content

**What to Check**:
- [ ] Toggle works
- [ ] All checkboxes are functional
- [ ] Research depth selector works
- [ ] Options are sent to API (check Network tab when generating)

---

## 🔍 API Endpoint Testing

### Direct API Testing (using curl or Postman)

#### 1. Content Analysis
```bash
curl -X POST http://localhost:3000/api/blog-writer/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "content": "This is a test blog post about AI and machine learning.",
    "topic": "artificial intelligence",
    "keywords": ["AI", "machine learning"],
    "target_audience": "developers"
  }'
```

#### 2. Content Optimization
```bash
curl -X POST http://localhost:3000/api/blog-writer/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "content": "This is a test blog post about AI.",
    "topic": "artificial intelligence",
    "keywords": ["AI", "machine learning"],
    "optimization_goals": ["seo", "readability"]
  }'
```

#### 3. Topic Recommendations
```bash
curl -X POST http://localhost:3000/api/blog-writer/topics/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["artificial intelligence", "machine learning"],
    "count": 5
  }'
```

---

## 🐛 Troubleshooting

### API Returns 503 Error
- **Cause**: Cloud Run service is not healthy or starting up
- **Solution**: Check `/api/cloud-run/health` endpoint first
- **Fix**: Wait for service to become healthy, or check Cloud Run logs

### API Returns 401/403 Error
- **Cause**: Authentication issue
- **Solution**: Make sure you're logged in and have proper permissions
- **Fix**: Check Supabase auth session

### API Returns 422 Error
- **Cause**: Validation error (missing required fields, invalid format)
- **Solution**: Check request body matches expected format
- **Fix**: Review API route validation logic

### Components Not Rendering
- **Cause**: Missing dependencies or TypeScript errors
- **Solution**: Check browser console for errors
- **Fix**: Run `npm run build` to check for TypeScript errors

### Images Not Loading
- **Cause**: Placeholder URLs may be blocked
- **Solution**: Use real image URLs or check CORS settings
- **Fix**: Replace placeholder URLs with actual image URLs

---

## ✅ Success Criteria

All features are working correctly if:

1. ✅ All API endpoints return 200 status codes
2. ✅ All components render without errors
3. ✅ Data flows correctly from API → Components → UI
4. ✅ Error handling displays user-friendly messages
5. ✅ Loading states show during API calls
6. ✅ Results are displayed correctly
7. ✅ User interactions (clicks, form inputs) work as expected

---

## 📊 Expected API Response Formats

### Content Analysis Response
```json
{
  "readability_score": 85,
  "seo_score": 78,
  "quality_score": 82,
  "keyword_density": {
    "AI": 0.05,
    "machine learning": 0.03
  },
  "missing_keywords": ["deep learning", "neural networks"],
  "recommendations": [
    "Add more internal links",
    "Improve heading structure"
  ],
  "word_count": 500,
  "reading_time_minutes": 2,
  "headings_count": 5,
  "links_count": 3,
  "images_count": 2
}
```

### Content Optimization Response
```json
{
  "optimized_content": "...",
  "changes_made": [
    {
      "type": "keyword_optimization",
      "description": "Added missing keyword 'deep learning'",
      "location": "paragraph 2"
    }
  ],
  "before_scores": {
    "readability": 75,
    "seo": 70
  },
  "after_scores": {
    "readability": 85,
    "seo": 80
  },
  "improvements": [
    "Improved keyword density",
    "Enhanced readability"
  ]
}
```

### Topic Recommendations Response
```json
{
  "topics": [
    {
      "title": "Complete Guide to Machine Learning",
      "description": "A comprehensive guide covering all aspects of ML",
      "keywords": ["machine learning", "AI", "algorithms"],
      "search_volume": 12000,
      "difficulty": "medium",
      "content_angle": "educational",
      "estimated_traffic": 5000
    }
  ]
}
```

---

## 🎯 Next Steps After Testing

Once all tests pass:

1. **Integrate components into draft view** (`/admin/drafts/view/[id]`)
2. **Add topic recommendations to workflow** objective page
3. **Enhance error handling** based on test results
4. **Add loading skeletons** for better UX
5. **Optimize API calls** if performance issues found

---

## 📝 Test Results Template

Use this template to document your test results:

```
Date: __________
Tester: __________

✅ Content Analysis: PASS / FAIL
   Notes: __________

✅ Content Optimization: PASS / FAIL
   Notes: __________

✅ Topic Recommendations: PASS / FAIL
   Notes: __________

✅ Content Metadata Components: PASS / FAIL
   Notes: __________

✅ SEO Metadata Editor: PASS / FAIL
   Notes: __________

✅ Product Research UI: PASS / FAIL
   Notes: __________

Issues Found:
1. __________
2. __________

Overall Status: ✅ READY / ⚠️ NEEDS FIXES
```

---

**Happy Testing!** 🚀

