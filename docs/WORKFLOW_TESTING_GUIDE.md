# Workflow Testing Guide

This document provides comprehensive test cases for the multi-phase blog generation workflow and the edit/polish workflow.

## Table of Contents
1. [Multi-Phase Workflow Tests](#multi-phase-workflow-tests)
2. [Edit/Polish Workflow Tests](#editpolish-workflow-tests)
3. [Interlinking Tests](#interlinking-tests)
4. [Site Context Tests](#site-context-tests)

---

## Multi-Phase Workflow Tests

### Phase 1: Site-Aware Content Generation

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| TC1.1: Generate with site context | 1. Navigate to Blog Queue<br>2. Create new blog with topic<br>3. Check generation logs | Content generated with `site_context_used: true` |
| TC1.2: Generate without org_id | 1. Use API directly without org_id | Content generates but without site context |
| TC1.3: Duplicate topic avoidance | 1. Create blog with existing topic<br>2. Check content | Content should differ from existing articles |
| TC1.4: Link opportunities embedded | 1. Generate content<br>2. Check for inline links | Links to related existing content embedded |

### Phase 2: Image Generation

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| TC2.1: Featured image generated | 1. Complete Phase 1<br>2. Run Phase 2 | Featured image URL populated |
| TC2.2: Thumbnail image generated | 1. Complete Phase 2 | Thumbnail image URL populated |
| TC2.3: Inline images inserted | 1. Check content after Phase 2 | Images inserted in H2 sections |

### Phase 3: Content Enhancement & Interlinking

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| TC3.1: SEO metadata generated | 1. Complete Phase 3 | meta_title, meta_description, slug populated |
| TC3.2: Internal links inserted | 1. Check content after Phase 3 | Internal links to published domain |
| TC3.3: Structured data generated | 1. Check seo_data field | JSON-LD schema included |
| TC3.4: Deep interlinking enabled | 1. Check with `deep_interlinking: true` | More relevant links found |

### Phase 4: Publishing Preparation

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| TC4.1: Validation passes | 1. Complete all phases<br>2. Check draft status | Status shows "Ready for Review" |
| TC4.2: Content score calculated | 1. Check metadata | quality_score populated |

---

## Edit/Polish Workflow Tests

These tests verify the polish operations for refining existing content.

### Full Polish Operation

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| TC5.1: Full polish execution | 1. Open draft with content<br>2. Click "Full Polish" | Content improved, SEO fields updated |
| TC5.2: Full polish with links | 1. Run full polish<br>2. Check for new links | Internal links added where appropriate |

### Individual Polish Operations

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| TC6.1: Add internal links only | 1. Click "Add Links" button | Links inserted without other changes |
| TC6.2: Improve readability | 1. Click "Readability" button | Sentence structure improved |
| TC6.3: Enhance SEO | 1. Click "SEO" button | Meta title/description optimized |
| TC6.4: Fix grammar | 1. Click "Fix Grammar" button | Grammar/spelling corrected |
| TC6.5: Strengthen intro | 1. Click "Better Intro" button | Introduction made more compelling |
| TC6.6: Strengthen conclusion | 1. Click "Better Outro" button | Conclusion strengthened with CTA |

---

## Interlinking Tests

### URL Correctness

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| TC7.1: Published domain used | 1. Check inserted links | URLs use custom domain, not `.webflow.io` |
| TC7.2: No staging URLs | 1. Search content for "webflow.io" | No staging domain URLs found |
| TC7.3: Links are clickable | 1. Click internal link | Navigates to correct page |

### Relevance Scoring

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| TC8.1: High relevance links | 1. Check link suggestions | relevance_score > 0.3 for all links |
| TC8.2: Max links respected | 1. Set max_internal_links=3 | Maximum 3 links inserted |
| TC8.3: No duplicate links | 1. Check inserted links | No duplicate URLs |

### Enhanced Interlinking (Deep Analysis)

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| TC9.1: Lazy loading enabled | 1. Enable `deep_interlinking` | Full content fetched for top candidates |
| TC9.2: Better relevance with deep analysis | 1. Compare scores with/without deep analysis | Higher accuracy with deep analysis |

---

## Site Context Tests

### Site Context Retrieval

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| TC10.1: Context from stored scan | 1. Ensure scan exists<br>2. Generate content | Uses stored scan data |
| TC10.2: Fallback without scan | 1. Remove scan<br>2. Generate content | Graceful fallback, content generated |
| TC10.3: Existing titles retrieved | 1. Check logs for existingTitles | Titles from scan included |

### Site-Aware Instructions

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| TC11.1: Unique content generated | 1. Generate with existing titles | New content doesn't duplicate titles |
| TC11.2: Link opportunities in instructions | 1. Check custom instructions sent to LLM | Link targets included |

---

## API Endpoint Tests

### `/api/workflow/generate-content`

```bash
# Test with site context
curl -X POST http://localhost:3000/api/workflow/generate-content \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Test Blog Post",
    "keywords": ["keyword1", "keyword2"],
    "org_id": "your-org-id",
    "use_site_context": true
  }'
```

Expected: `site_context_used: true` in response

### `/api/workflow/enhance-content`

```bash
# Test with interlinking
curl -X POST http://localhost:3000/api/workflow/enhance-content \
  -H "Content-Type: application/json" \
  -d '{
    "content": "<p>Your content here...</p>",
    "title": "Test Title",
    "keywords": ["keyword1"],
    "insert_hyperlinks": true,
    "deep_interlinking": true,
    "max_internal_links": 5,
    "org_id": "your-org-id"
  }'
```

Expected: Links inserted with published domain URLs

### `/api/workflow/polish-content`

```bash
# Test polish operation
curl -X POST http://localhost:3000/api/workflow/polish-content \
  -H "Content-Type: application/json" \
  -d '{
    "content": "<p>Your content here...</p>",
    "title": "Test Title",
    "operation": "full_polish",
    "org_id": "your-org-id"
  }'
```

Expected: Polished content with enhanced metadata

---

## Smoke Test Checklist

Before deploying, run through these critical paths:

- [ ] **New Blog Creation**: Create blog via queue → Verify all 4 phases complete
- [ ] **Edit Existing Draft**: Open draft → Make changes → Save successfully
- [ ] **Phase 1 Generation**: Content generated with site context
- [ ] **Phase 3 Enhancement**: Internal links use correct published domain
- [ ] **Polish Operations**: Each polish button works without errors
- [ ] **URL Correctness**: No `.webflow.io` staging URLs in published content

---

## Troubleshooting

### Common Issues

| Issue | Possible Cause | Solution |
|-------|---------------|----------|
| No site context used | Missing org_id | Ensure org_id passed to API |
| Staging URLs in links | Missing published_domain in scan | Re-run Webflow structure scan |
| LLM polish fails | LLM service not configured | Check OPENAI_API_KEY |
| No links inserted | No scan data or low relevance | Run structure scan, check min_relevance_score |

### Logs to Check

1. **Server Logs**: Check for `site_context_used`, `deepAnalysisEnabled`
2. **Supabase Logs**: Check `webflow_structure_scans` for `published_domain`
3. **Browser Console**: Check for API response errors

---

## Performance Considerations

| Operation | Expected Time | Notes |
|-----------|--------------|-------|
| Phase 1 (Content) | 30-60s | Depends on LLM response time |
| Phase 2 (Images) | 60-120s | Multiple image generations |
| Phase 3 (Enhance) | 10-30s | Faster with stored scan |
| Polish Operation | 5-15s | Single targeted operation |
| Deep Interlinking | +5-10s | Additional API calls for top candidates |

---

*Last Updated: December 2025*


