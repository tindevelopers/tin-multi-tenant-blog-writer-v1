# Backend Quality Enhancement Instructions

**Date**: December 26, 2025  
**From**: Frontend Team  
**To**: Backend/API Team  
**Re**: Blog Writer API Quality Improvements

---

## Executive Summary

The frontend has identified several quality issues with blog generation output that require backend fixes. This document outlines the required API changes to:

1. Eliminate AI generation artifacts from content
2. Support multi-site organizations with explicit site selection
3. Improve internal linking accuracy
4. Enhance excerpt/metadata quality

---

## 1. Artifact Prevention (HIGH PRIORITY)

### Problem

The LLM is returning preamble and meta-commentary text that leaks into the final blog content displayed to users.

### Artifacts Currently Observed in API Responses

```
"Here's the enhanced version of the blog post..."
"Here's an enhanced version of..."
"I'll provide a comprehensive enhancement..."
"Addressing the specified tasks..."
"Addressing the specified improvement tasks..."
"Enhancements Made: [list]"
"Key Enhancements: [list]"
"Citations added where appropriate..."
"Methodology Note:..."
"*Last updated: [date]*"
"The revised content..."
"readability concerns:..."
"!AI Marketing..." (malformed image placeholders)
"!Featured Voice AI..." (malformed image placeholders)
"f. 2025" (truncated DataForSEO text)
```

### Required Fix #1: Update LLM System Prompts

Add these explicit instructions to ALL content generation prompts:

```
CRITICAL OUTPUT RULES - FOLLOW EXACTLY:

1. OUTPUT ONLY THE BLOG CONTENT - nothing else
2. DO NOT include ANY preamble such as:
   - "Here's the enhanced version..."
   - "I'll provide..."
   - "Here's a comprehensive..."
   - "Addressing the..."
3. DO NOT include meta-commentary about the content
4. DO NOT include sections like "Enhancements Made" or "Key Points" at the end
5. DO NOT include "Last updated" or similar metadata
6. START DIRECTLY with the blog title (# Title) or first heading
7. END DIRECTLY with the conclusion paragraph - no sign-offs or summaries of changes
8. NO markdown image placeholders without valid URLs - omit images entirely if URLs unavailable
```

### Required Fix #2: Server-Side Sanitization

Add a post-processing sanitization step BEFORE returning any content to the frontend.

**Python implementation:**

```python
import re
from typing import Tuple, List

def sanitize_llm_output(content: str) -> Tuple[str, List[str]]:
    """
    Remove common LLM artifacts before returning to frontend.
    
    Returns:
        Tuple of (sanitized_content, list_of_artifacts_removed)
    """
    artifacts_removed = []
    
    patterns = [
        # Preamble patterns (must be at start or after newline)
        (r"^Here's (?:the |an )?(?:enhanced |revised |updated )?(?:version|content|blog post).*?:\s*\n?", "preamble"),
        (r"^I'll provide.*?:\s*\n?", "preamble"),
        (r"^I will provide.*?:\s*\n?", "preamble"),
        (r"^Addressing the specified.*?:\s*\n?", "preamble"),
        (r"^Let me (?:provide|create|write).*?:\s*\n?", "preamble"),
        
        # Meta-commentary patterns (can appear anywhere)
        (r"Enhancements Made:[\s\S]*?(?=\n\n|\n#|$)", "meta_commentary"),
        (r"Key Enhancements:[\s\S]*?(?=\n\n|\n#|$)", "meta_commentary"),
        (r"Changes Made:[\s\S]*?(?=\n\n|\n#|$)", "meta_commentary"),
        (r"Improvements:[\s\S]*?(?=\n\n|\n#|$)", "meta_commentary"),
        (r"Citations added where appropriate.*?(?=\n|$)", "meta_commentary"),
        (r"Methodology Note:.*?(?=\n|$)", "meta_commentary"),
        (r"\*Last updated:.*?\*", "meta_commentary"),
        (r"The revised content.*?:\s*\n?", "meta_commentary"),
        (r"readability concerns:.*?(?=\n|$)", "meta_commentary"),
        
        # Malformed image placeholders (no URL or empty URL)
        (r"!\[[^\]]*\]\(\s*\)", "malformed_image"),
        (r"^!(?:AI|Featured|Modern|Content)\s+[^\n!]{5,50}(?=\s|\n|$)", "malformed_image"),
        (r"!\s*([A-Z][a-zA-Z\s]{5,40})(?=\n|$)", "malformed_image"),
        
        # Truncated text artifacts (from DataForSEO or other sources)
        (r"\bf\.\s+(?=\d{4})", "truncated_text"),  # "f. 2025" -> "2025"
        (r"\s+\.\s+(?=[a-z])", "broken_punctuation"),  # ". word" -> " word"
    ]
    
    for pattern, artifact_type in patterns:
        matches = re.findall(pattern, content, flags=re.IGNORECASE | re.MULTILINE)
        if matches:
            artifacts_removed.append(f"{artifact_type}: {len(matches)} instance(s)")
            content = re.sub(pattern, '', content, flags=re.IGNORECASE | re.MULTILINE)
    
    # Clean up resulting whitespace
    content = re.sub(r'\n{3,}', '\n\n', content)
    content = content.strip()
    
    return content, artifacts_removed


def sanitize_excerpt(excerpt: str, primary_keyword: str = None) -> str:
    """
    Clean excerpt/meta description of common issues.
    """
    if not excerpt:
        return ""
    
    cleaned = excerpt
    
    # Remove keyword-only prefix (e.g., "best ai voice agents Here's why...")
    if primary_keyword:
        keyword_lower = primary_keyword.lower()
        if cleaned.lower().startswith(keyword_lower):
            cleaned = cleaned[len(primary_keyword):].lstrip()
            # Capitalize first letter of remaining text
            if cleaned:
                cleaned = cleaned[0].upper() + cleaned[1:]
    
    # Remove preamble phrases
    preamble_patterns = [
        r"^Here's (?:the |an |a )?.*?:\s*",
        r"^This (?:article|post|guide) (?:will |explains? |covers? ).*?:\s*",
        r"^In this (?:article|post|guide),?\s*",
    ]
    for pattern in preamble_patterns:
        cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE)
    
    # Fix truncated text
    cleaned = re.sub(r'\bf\.\s+', 'for ', cleaned)
    cleaned = re.sub(r'\s+\.\s+', '. ', cleaned)
    
    # Ensure proper ending
    cleaned = cleaned.rstrip()
    if cleaned and cleaned[-1] not in '.!?':
        # Find last complete sentence
        last_sentence_end = max(
            cleaned.rfind('. '),
            cleaned.rfind('! '),
            cleaned.rfind('? ')
        )
        if last_sentence_end > len(cleaned) * 0.5:
            cleaned = cleaned[:last_sentence_end + 1]
        else:
            cleaned = cleaned.rstrip(',:;') + '.'
    
    # Truncate to 160 chars properly (for meta description)
    if len(cleaned) > 160:
        cleaned = cleaned[:157].rsplit(' ', 1)[0] + '...'
    
    return cleaned.strip()
```

### Required Fix #3: Add Sanitization Flag to Response

Include confirmation in API response that sanitization was applied:

```json
{
  "content": "...",
  "title": "...",
  "excerpt": "...",
  "sanitization_applied": true,
  "artifacts_removed": ["preamble: 1 instance(s)", "meta_commentary: 2 instance(s)"]
}
```

---

## 2. Multi-Site Support with Explicit Site ID (HIGH PRIORITY)

### Problem

Organizations may have multiple Webflow sites. Currently, the API only receives `org_id` and cannot distinguish which site's content to use for internal linking.

### Required API Changes

#### Endpoint: `POST /api/v1/blog/generate-enhanced`

**Add new parameter:**

```json
{
  "topic": "Best AI Voice Agents",
  "keywords": ["ai voice agents", "voice ai"],
  "org_id": "org-uuid-123",
  "site_id": "webflow-site-id-456",  // NEW - OPTIONAL but recommended
  "internal_link_targets": [...]
}
```

**Backend logic:**

```python
def get_internal_link_targets(org_id: str, site_id: str = None) -> List[dict]:
    """
    Fetch internal link targets, optionally filtered by site.
    """
    query = db.query(WebflowScan).filter(
        WebflowScan.org_id == org_id,
        WebflowScan.status == 'completed'
    )
    
    # If site_id provided, filter to that specific site
    if site_id:
        query = query.filter(WebflowScan.site_id == site_id)
    
    # Get latest scan
    scan = query.order_by(WebflowScan.completed_at.desc()).first()
    
    if not scan:
        return []
    
    return scan.existing_content or []
```

#### Endpoint: `POST /api/v1/content/enhance-fields`

**Add same parameter:**

```json
{
  "content": "...",
  "title": "...",
  "org_id": "org-uuid-123",
  "site_id": "webflow-site-id-456"  // NEW
}
```

---

## 3. Enhanced Internal Link Response Format (MEDIUM PRIORITY)

### Problem

Frontend cannot show users which internal links were inserted or allow selective removal.

### Current Response

```json
{
  "content": "<html with links embedded>",
  "title": "...",
  "excerpt": "..."
}
```

### Required Enhanced Response

```json
{
  "content": "<html with links embedded>",
  "title": "...",
  "excerpt": "...",
  "internal_links": {
    "inserted": [
      {
        "anchor_text": "voice AI agents",
        "url": "https://example.com/blog/voice-ai-agents",
        "target_title": "Complete Guide to Voice AI Agents",
        "position": "body",
        "relevance_score": 0.85
      },
      {
        "anchor_text": "AI call centers",
        "url": "https://example.com/blog/ai-call-centers",
        "target_title": "AI Call Centers in 2025",
        "position": "conclusion",
        "relevance_score": 0.72
      }
    ],
    "available_count": 15,
    "inserted_count": 3,
    "max_allowed": 5
  },
  "site_context": {
    "site_id": "webflow-site-id-456",
    "site_domain": "https://example.com",
    "scan_date": "2025-12-25T10:30:00Z",
    "total_pages": 47
  }
}
```

---

## 4. Internal Link Target Format Enhancement (MEDIUM PRIORITY)

### Current Format (from frontend)

```json
{
  "internal_link_targets": [
    {
      "title": "Page Title",
      "url": "/blog/page-slug",
      "keywords": ["keyword1", "keyword2"]
    }
  ]
}
```

### Recommended Enhanced Format

The frontend will start sending this enhanced format. Backend should handle both for backwards compatibility:

```json
{
  "internal_link_targets": [
    {
      "title": "Page Title",
      "url": "https://example.com/blog/page-slug",
      "slug": "page-slug",
      "keywords": ["keyword1", "keyword2"],
      "type": "cms",
      "published_at": "2025-12-01T00:00:00Z"
    }
  ],
  "site_domain": "https://example.com",
  "site_id": "webflow-site-id-456"
}
```

**Important**: When generating internal links in content, use the FULL URL (with domain) from `url` field, not just the slug. This prevents broken links.

---

## 5. New Endpoint: Content Validation (MEDIUM PRIORITY)

### Purpose

Allow frontend to validate content quality BEFORE publishing, providing actionable feedback to users.

### Endpoint: `POST /api/v1/content/validate`

### Request

```json
{
  "content": "<html content>",
  "title": "Blog Title",
  "excerpt": "Meta description...",
  "keywords": ["primary keyword", "secondary keyword"],
  "checks": {
    "artifacts": true,
    "structure": true,
    "seo": true,
    "links": true,
    "readability": true
  }
}
```

### Response

```json
{
  "is_valid": true,
  "overall_score": 85,
  "checks": {
    "artifacts": {
      "passed": true,
      "issues": []
    },
    "structure": {
      "passed": true,
      "issues": [
        {
          "severity": "info",
          "message": "Only 2 H2 headings found, recommend 3-5 for SEO",
          "suggestion": "Add more main sections to improve content depth"
        }
      ],
      "metrics": {
        "h1_count": 1,
        "h2_count": 2,
        "h3_count": 4,
        "paragraph_count": 12,
        "list_count": 3
      }
    },
    "seo": {
      "passed": true,
      "issues": [
        {
          "severity": "warning",
          "message": "Primary keyword 'ai voice agents' not found in first paragraph",
          "suggestion": "Include primary keyword in introduction for better SEO"
        }
      ],
      "metrics": {
        "keyword_density": 1.2,
        "meta_description_length": 145,
        "title_length": 52
      }
    },
    "links": {
      "passed": false,
      "issues": [
        {
          "severity": "error",
          "message": "Found 1 internal link, recommend 3-5",
          "suggestion": "Use 'Add Links' feature to insert more internal links"
        }
      ],
      "metrics": {
        "internal_links": 1,
        "external_links": 2,
        "broken_links": 0
      }
    },
    "readability": {
      "passed": true,
      "issues": [],
      "metrics": {
        "flesch_score": 62,
        "avg_sentence_length": 18,
        "avg_paragraph_length": 4
      }
    }
  },
  "summary": {
    "errors": 1,
    "warnings": 1,
    "info": 1
  }
}
```

---

## 6. Excerpt Generation Improvements (MEDIUM PRIORITY)

### Problem

Excerpts/meta descriptions sometimes contain:
- Repeated keywords at the start
- AI preamble phrases
- Incomplete sentences
- Improper length (too long or too short)

### Required Fix

Generate excerpt as a SEPARATE LLM call with this specific prompt:

```
Generate a meta description for this blog post.

REQUIREMENTS:
- Length: 150-160 characters exactly
- Start with a compelling hook or benefit (NOT the keyword alone)
- Include the primary keyword naturally
- End with a complete sentence
- Make it actionable - encourage clicks
- NO preamble like "This article..." or "In this post..."
- NO keyword stuffing

PRIMARY KEYWORD: {keyword}
BLOG TITLE: {title}
CONTENT SUMMARY: {first_500_chars_of_content}

OUTPUT ONLY THE META DESCRIPTION TEXT - NOTHING ELSE:
```

### Validation

Apply `sanitize_excerpt()` function (from Section 1) to all excerpts before returning.

---

## 7. Image Placeholder Handling (LOW PRIORITY)

### Problem

Content contains invalid markdown image placeholders:
- `!AI Marketing Technology` (no brackets, no URL)
- `![alt text]()` (empty URL)
- `![](image.jpg)` (relative URL without domain)

### Options

**Option A (Recommended)**: Remove all image placeholders from content generation. Return image positions separately:

```json
{
  "content": "<html without images>",
  "image_positions": [
    {
      "position": "after_h1",
      "suggested_alt": "AI marketing technology illustration",
      "context": "Featured image for article header"
    },
    {
      "position": "before_section_2",
      "suggested_alt": "Voice AI agent workflow diagram",
      "context": "Illustrate the AI agent process"
    }
  ]
}
```

**Option B**: Only include image placeholders with VALID, ABSOLUTE URLs:

```markdown
![AI marketing technology](https://images.example.com/ai-marketing.jpg)
```

---

## Implementation Priority

| Change | Priority | Effort | Impact |
|--------|----------|--------|--------|
| LLM prompt updates (artifact prevention) | HIGH | Low | High |
| Server-side sanitization function | HIGH | Medium | High |
| Accept `site_id` parameter | HIGH | Low | High |
| Enhanced internal links response | MEDIUM | Medium | Medium |
| Content validation endpoint | MEDIUM | High | Medium |
| Excerpt generation improvements | MEDIUM | Low | Medium |
| Image placeholder handling | LOW | Low | Low |

---

## Testing Checklist

After implementing these changes, please verify:

- [ ] Generate 10 blogs - none should contain "Here's the enhanced version" or similar
- [ ] Generate content with `site_id` parameter - links should only come from that site
- [ ] Response includes `internal_links.inserted` array
- [ ] Response includes `sanitization_applied: true`
- [ ] Excerpts are 150-160 chars, start with hook (not keyword), end properly
- [ ] No malformed image placeholders in output
- [ ] `/api/v1/content/validate` endpoint returns proper structure

---

## Questions?

Contact the frontend team if you need:
- Sample request/response payloads
- List of all artifact patterns observed
- Test organization IDs with multiple sites
- Clarification on any requirements


