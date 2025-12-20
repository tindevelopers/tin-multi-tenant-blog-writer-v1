# Backend AI Gateway Implementation Guide

## Status: Frontend Cleanup Complete ✅

The frontend AI components have been removed. This guide focuses **only on backend implementation**.

---

## What You Need to Build (Backend Only)

### Current Backend State
- **Python backend on Cloud Run**: `https://blog-writer-api-dev-613248238610.europe-west9.run.app`
- **Currently does**: Content generation (95% of AI calls)
- **Needs to add**: Polishing, quality checks, meta tag generation

---

## Phase 1: Deploy LiteLLM Gateway

### Step 1: Create Configuration File

Create `litellm-config.yaml` in your backend repository:

```yaml
model_list:
  - model_name: gpt-4o
    litellm_params:
      model: openai/gpt-4o
      api_key: os.environ/OPENAI_API_KEY
      
  - model_name: gpt-4o-mini
    litellm_params:
      model: openai/gpt-4o-mini
      api_key: os.environ/OPENAI_API_KEY
      
  - model_name: claude-3-5-sonnet
    litellm_params:
      model: anthropic/claude-3-5-sonnet-20241022
      api_key: os.environ/ANTHROPIC_API_KEY

litellm_settings:
  # Enable caching
  cache: true
  cache_params:
    type: redis
    host: ${REDIS_HOST}
    port: 6379
    password: ${REDIS_PASSWORD}
    ttl: 3600  # 1 hour cache
  
  # Cost tracking
  success_callback: ["langfuse"]  # For analytics
  
  # General settings
  drop_params: true  # Drop unsupported params instead of erroring
  set_verbose: true  # Enable logging
```

### Step 2: Deploy to Cloud Run

```bash
# Deploy LiteLLM as standalone service
gcloud run deploy litellm-proxy \
  --image ghcr.io/berriai/litellm:latest \
  --region europe-west9 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars LITELLM_MASTER_KEY=your-secure-key-here \
  --set-env-vars OPENAI_API_KEY=${OPENAI_API_KEY} \
  --set-env-vars ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY} \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10 \
  --min-instances 0
```

**Save the service URL**: `https://litellm-proxy-xxx.europe-west9.run.app`

### Step 3: Set Up Redis (Optional but Recommended)

**Option A: Google Cloud Memorystore**
```bash
gcloud redis instances create litellm-cache \
  --size=1 \
  --region=europe-west9 \
  --redis-version=redis_7_0
```

**Option B: Redis Cloud** (easier, managed)
- Sign up at https://redis.com/try-free/
- Create instance in europe-west9
- Get connection details

### Step 4: Test LiteLLM Gateway

```bash
# Test that LiteLLM is working
curl https://litellm-proxy-xxx.run.app/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-master-key" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

Expected response: Should return a chat completion from OpenAI

---

## Phase 2: Update Python Backend

### Step 1: Add Dependencies

Update `requirements.txt`:

```txt
litellm>=1.50.0
redis>=5.0.0
python-dateutil>=2.8.0
```

### Step 2: Create AI Gateway Service

Create `backend/src/services/ai_gateway.py`:

```python
"""
AI Gateway Service
Wraps LiteLLM proxy for content generation, polishing, and quality checks
"""

from litellm import completion, acompletion
import os
import re
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class AIGateway:
    """
    Centralized AI gateway for all LLM operations
    Routes all requests through LiteLLM proxy for caching, rate limiting, and cost tracking
    """
    
    def __init__(self):
        self.base_url = os.getenv("LITELLM_PROXY_URL", "http://localhost:4000")
        self.api_key = os.getenv("LITELLM_API_KEY", "")
        
        if not self.base_url:
            logger.warning("LITELLM_PROXY_URL not set, using localhost")
        
        logger.info(f"AIGateway initialized with base_url: {self.base_url}")
    
    async def generate_content(
        self, 
        messages: List[Dict[str, str]], 
        org_id: str, 
        user_id: str, 
        model: str = "gpt-4o",
        temperature: float = 0.7,
        max_tokens: int = 4000
    ) -> str:
        """
        Generate content with full metadata tracking
        
        Args:
            messages: List of chat messages
            org_id: Organization ID for tracking
            user_id: User ID for tracking
            model: Model to use (gpt-4o, gpt-4o-mini, claude-3-5-sonnet)
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
        
        Returns:
            Generated content as string
        """
        try:
            response = await acompletion(
                model=model,
                messages=messages,
                api_base=self.base_url,
                api_key=self.api_key,
                temperature=temperature,
                max_tokens=max_tokens,
                metadata={
                    "org_id": org_id,
                    "user_id": user_id,
                    "operation": "content_generation",
                    "tags": ["blog", "generation"],
                    "timestamp": datetime.utcnow().isoformat()
                },
                cache={
                    "enabled": True,
                    "ttl": 3600  # 1 hour cache
                }
            )
            
            content = response.choices[0].message.content
            logger.info(f"Generated content: {len(content)} chars, model: {model}, org: {org_id}")
            
            return content
            
        except Exception as e:
            logger.error(f"Content generation failed: {e}", exc_info=True)
            raise
    
    async def polish_content(
        self, 
        content: str, 
        instructions: str,
        org_id: str
    ) -> Dict[str, Any]:
        """
        Polish and clean content (replaces frontend post-processor)
        
        This was previously done in TypeScript (src/lib/ai-gateway/post-processor.ts)
        Now consolidated in Python backend
        
        Args:
            content: Raw content to polish
            instructions: Polishing instructions
            org_id: Organization ID
        
        Returns:
            Dict with polished_content and metadata
        """
        # First, strip artifacts using regex (fast, no AI needed)
        cleaned_content = self._strip_artifacts(content)
        
        # Then use AI for intelligent polishing
        polish_prompt = f"""You are an expert content editor. Polish this blog content by:
1. Removing any AI artifacts or thinking tags
2. Improving flow and readability
3. Fixing grammar and punctuation
4. Ensuring consistent tone
5. Keeping the original meaning intact

Additional instructions: {instructions}

Content to polish:
{cleaned_content}

Return ONLY the polished content, no explanations."""

        messages = [
            {"role": "system", "content": "You are an expert content editor."},
            {"role": "user", "content": polish_prompt}
        ]
        
        try:
            response = await acompletion(
                model="gpt-4o-mini",  # Cheaper model for polishing
                messages=messages,
                api_base=self.base_url,
                api_key=self.api_key,
                temperature=0.3,  # Lower temp for consistency
                metadata={
                    "org_id": org_id,
                    "operation": "content_polishing",
                    "tags": ["polish", "post-process"]
                }
            )
            
            polished = response.choices[0].message.content
            
            return {
                "polished_content": polished,
                "original_length": len(content),
                "polished_length": len(polished),
                "artifacts_removed": len(content) - len(cleaned_content)
            }
            
        except Exception as e:
            logger.error(f"Content polishing failed: {e}", exc_info=True)
            # Fallback to cleaned content without AI polishing
            return {
                "polished_content": cleaned_content,
                "original_length": len(content),
                "polished_length": len(cleaned_content),
                "artifacts_removed": len(content) - len(cleaned_content),
                "error": str(e)
            }
    
    def _strip_artifacts(self, content: str) -> str:
        """
        Strip AI artifacts from content (Python port of stripArtifacts.ts)
        
        This was in src/server/utils/stripArtifacts.ts
        """
        if not content:
            return content
        
        # Remove thinking tags and content
        patterns = [
            r'<thinking>.*?</thinking>',
            r'<thought>.*?</thought>',
            r'<reasoning>.*?</reasoning>',
            r'\[THINKING\].*?\[/THINKING\]',
            r'\*\*Thinking:\*\*.*?(?=\n\n|\Z)',
        ]
        
        cleaned = content
        for pattern in patterns:
            cleaned = re.sub(pattern, '', cleaned, flags=re.DOTALL | re.IGNORECASE)
        
        # Remove multiple blank lines
        cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
        
        # Trim whitespace
        cleaned = cleaned.strip()
        
        return cleaned
    
    async def check_quality(self, content: str) -> Dict[str, Any]:
        """
        Check content quality (Python port of quality-checker.ts)
        
        This was in src/lib/ai-gateway/quality-checker.ts
        
        Args:
            content: Content to check
        
        Returns:
            Dict with quality_score, issues, and cleaned_content
        """
        issues = []
        
        # Check for remaining artifacts
        if re.search(r'<thinking>|<thought>|<reasoning>', content, re.IGNORECASE):
            issues.append({
                "type": "artifacts",
                "severity": "high",
                "message": "AI thinking artifacts found in content"
            })
        
        # Check content length
        word_count = len(content.split())
        if word_count < 300:
            issues.append({
                "type": "length",
                "severity": "medium",
                "message": f"Content is too short ({word_count} words)"
            })
        
        # Check for placeholder text
        placeholders = ['[INSERT', '[TODO', '[TK]', 'Lorem ipsum']
        for placeholder in placeholders:
            if placeholder.lower() in content.lower():
                issues.append({
                    "type": "placeholder",
                    "severity": "high",
                    "message": f"Placeholder text found: {placeholder}"
                })
        
        # Check heading structure
        h2_count = len(re.findall(r'^##\s+', content, re.MULTILINE))
        if h2_count < 2:
            issues.append({
                "type": "structure",
                "severity": "low",
                "message": "Content should have at least 2 H2 headings"
            })
        
        # Calculate quality score (0-100)
        score = 100
        for issue in issues:
            if issue["severity"] == "high":
                score -= 20
            elif issue["severity"] == "medium":
                score -= 10
            else:
                score -= 5
        
        score = max(0, min(100, score))
        
        return {
            "quality_score": score,
            "issues": issues,
            "word_count": word_count,
            "cleaned_content": self._strip_artifacts(content)
        }
    
    async def generate_meta_tags(
        self, 
        content: str, 
        title: str, 
        keywords: List[str]
    ) -> Dict[str, str]:
        """
        Generate SEO-optimized meta tags (Python port of post-processor.ts)
        
        This was in src/lib/ai-gateway/post-processor.ts
        
        Args:
            content: Full content
            title: Original title
            keywords: Target keywords
        
        Returns:
            Dict with title, description, og_title, og_description
        """
        prompt = f"""Generate SEO-optimized meta tags for this blog post.

Title: {title}
Keywords: {', '.join(keywords[:5])}
Content Preview: {content[:1000]}

Return a JSON object with:
- title: SEO title (50-60 characters, include primary keyword)
- description: Meta description (150-160 characters, compelling and includes keywords)
- og_title: Open Graph title (can be slightly longer)
- og_description: Open Graph description (can be more descriptive)

Return ONLY valid JSON, no markdown."""

        try:
            response = await acompletion(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an SEO expert. Return only JSON."},
                    {"role": "user", "content": prompt}
                ],
                api_base=self.base_url,
                api_key=self.api_key,
                temperature=0.3,
                metadata={
                    "operation": "meta_tag_generation",
                    "tags": ["seo", "meta-tags"]
                }
            )
            
            import json
            result = json.loads(response.choices[0].message.content)
            
            return {
                "title": result.get("title", title[:60]),
                "description": result.get("description", self._extract_excerpt(content, 160)),
                "og_title": result.get("og_title", title),
                "og_description": result.get("og_description", self._extract_excerpt(content, 200))
            }
            
        except Exception as e:
            logger.error(f"Meta tag generation failed: {e}", exc_info=True)
            # Fallback to basic extraction
            return {
                "title": title[:60] if len(title) > 60 else title,
                "description": self._extract_excerpt(content, 160),
                "og_title": title,
                "og_description": self._extract_excerpt(content, 200)
            }
    
    def _extract_excerpt(self, content: str, max_length: int) -> str:
        """Extract an excerpt from content"""
        # Remove markdown/HTML
        plain = re.sub(r'[#*`<>]', '', content)
        plain = re.sub(r'\s+', ' ', plain).strip()
        
        if len(plain) <= max_length:
            return plain
        
        # Cut at word boundary
        truncated = plain[:max_length]
        last_space = truncated.rfind(' ')
        
        if last_space > 0:
            truncated = truncated[:last_space]
        
        return truncated + '...'


# Singleton instance
_gateway_instance = None

def get_ai_gateway() -> AIGateway:
    """Get singleton AI gateway instance"""
    global _gateway_instance
    if _gateway_instance is None:
        _gateway_instance = AIGateway()
    return _gateway_instance
```

### Step 3: Update Blog Generation Pipeline

Modify your existing `backend/src/services/blog_generator.py`:

```python
"""
Blog Generation Service
Complete pipeline: generation + polishing + quality checks + meta tags
"""

from .ai_gateway import get_ai_gateway
import logging

logger = logging.getLogger(__name__)


async def generate_blog_complete(
    topic: str,
    keywords: List[str],
    org_id: str,
    user_id: str,
    word_count: int = 1500,
    tone: str = "professional",
    custom_instructions: str = ""
) -> Dict[str, Any]:
    """
    Complete blog generation with polishing
    
    This now handles everything that was split between backend and frontend:
    1. Content generation (was backend)
    2. Polishing (was frontend)
    3. Quality checks (was frontend)
    4. Meta tag generation (was frontend)
    
    Args:
        topic: Blog topic
        keywords: Target keywords
        org_id: Organization ID
        user_id: User ID
        word_count: Target word count
        tone: Content tone
        custom_instructions: Additional instructions
    
    Returns:
        Complete blog with content, quality score, meta tags
    """
    gateway = get_ai_gateway()
    start_time = datetime.utcnow()
    
    try:
        # Step 1: Generate raw content
        logger.info(f"Generating content for topic: {topic}")
        
        generation_prompt = build_generation_prompt(
            topic=topic,
            keywords=keywords,
            word_count=word_count,
            tone=tone,
            custom_instructions=custom_instructions
        )
        
        raw_content = await gateway.generate_content(
            messages=generation_prompt,
            org_id=org_id,
            user_id=user_id,
            model="gpt-4o"
        )
        
        # Step 2: Polish content (was in frontend)
        logger.info("Polishing content")
        polish_result = await gateway.polish_content(
            content=raw_content,
            instructions="Remove artifacts, improve flow, ensure professional tone",
            org_id=org_id
        )
        polished_content = polish_result["polished_content"]
        
        # Step 3: Quality check (was in frontend)
        logger.info("Checking quality")
        quality_result = await gateway.check_quality(polished_content)
        
        # Step 4: Generate meta tags (was in frontend)
        logger.info("Generating meta tags")
        meta_tags = await gateway.generate_meta_tags(
            content=polished_content,
            title=topic,
            keywords=keywords
        )
        
        # Calculate processing time
        processing_time = (datetime.utcnow() - start_time).total_seconds()
        
        logger.info(f"Blog generation complete: {quality_result['word_count']} words, "
                   f"quality score: {quality_result['quality_score']}, "
                   f"time: {processing_time}s")
        
        return {
            "content": polished_content,
            "title": topic,
            "quality_score": quality_result["quality_score"],
            "quality_issues": quality_result["issues"],
            "word_count": quality_result["word_count"],
            "meta_tags": meta_tags,
            "processing_time": processing_time,
            "artifacts_removed": polish_result.get("artifacts_removed", 0),
            "model_used": "gpt-4o",
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Blog generation failed: {e}", exc_info=True)
        raise


def build_generation_prompt(
    topic: str,
    keywords: List[str],
    word_count: int,
    tone: str,
    custom_instructions: str
) -> List[Dict[str, str]]:
    """Build the generation prompt messages"""
    
    system_prompt = f"""You are an expert blog writer. Write a comprehensive, {tone} blog post about: {topic}

Requirements:
- Target length: {word_count} words
- Include these keywords naturally: {', '.join(keywords)}
- Use proper markdown formatting with H2 and H3 headings
- Include an introduction, main body sections, and conclusion
- Write in {tone} tone
- Make it engaging and informative

{custom_instructions}

IMPORTANT: Return ONLY the blog content. No thinking tags, no meta-commentary."""

    user_prompt = f"""Write a {word_count}-word blog post about: {topic}

Primary keywords to include: {', '.join(keywords[:3])}"""

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
```

### Step 4: Update Environment Variables

Update your Python backend's environment:

```bash
# Add these to Cloud Run service
gcloud run services update blog-writer-api-dev \
  --region europe-west9 \
  --set-env-vars LITELLM_PROXY_URL=https://litellm-proxy-xxx.run.app \
  --set-env-vars LITELLM_API_KEY=your-master-key
```

Or add to Secret Manager and mount.

---

## Phase 3: Add Observability

### Create Usage Tracking Table

Create `supabase/migrations/YYYYMMDD_ai_usage_tracking.sql`:

```sql
-- AI Usage Tracking Table
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(org_id),
  user_id UUID REFERENCES users(user_id),
  operation TEXT NOT NULL,  -- 'generation', 'polishing', 'quality_check', 'meta_tags'
  model TEXT NOT NULL,      -- 'gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet'
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  cost_usd DECIMAL(10, 6),
  latency_ms INTEGER,
  cached BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_usage_org_date ON ai_usage_logs(org_id, created_at);
CREATE INDEX idx_ai_usage_operation ON ai_usage_logs(operation);

-- View for daily cost summary per org
CREATE VIEW ai_daily_costs AS
SELECT 
  org_id,
  DATE(created_at) as date,
  operation,
  COUNT(*) as request_count,
  SUM(total_tokens) as total_tokens,
  SUM(cost_usd) as total_cost_usd,
  COUNT(CASE WHEN cached THEN 1 END) as cached_requests,
  ROUND(AVG(latency_ms), 2) as avg_latency_ms
FROM ai_usage_logs
GROUP BY org_id, DATE(created_at), operation;
```

Apply the migration in Supabase Dashboard.

### Add Usage Logging to Backend

Create `backend/src/services/usage_logger.py`:

```python
"""
Usage Logger
Tracks AI usage to database for cost monitoring
"""

import asyncpg
import os
import logging
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)


class UsageLogger:
    """Log AI usage to database"""
    
    def __init__(self):
        self.db_url = os.getenv("SUPABASE_DB_URL")
        self.pool = None
    
    async def init_pool(self):
        """Initialize connection pool"""
        if not self.pool:
            self.pool = await asyncpg.create_pool(self.db_url)
    
    async def log_usage(
        self,
        org_id: str,
        user_id: str,
        operation: str,
        model: str,
        prompt_tokens: int,
        completion_tokens: int,
        cost_usd: float,
        latency_ms: int,
        cached: bool = False
    ):
        """Log AI usage to database"""
        try:
            await self.init_pool()
            
            async with self.pool.acquire() as conn:
                await conn.execute("""
                    INSERT INTO ai_usage_logs (
                        org_id, user_id, operation, model,
                        prompt_tokens, completion_tokens, total_tokens,
                        cost_usd, latency_ms, cached
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                """, 
                    org_id, user_id, operation, model,
                    prompt_tokens, completion_tokens, 
                    prompt_tokens + completion_tokens,
                    cost_usd, latency_ms, cached
                )
                
        except Exception as e:
            logger.error(f"Failed to log usage: {e}")
            # Don't raise - logging failures shouldn't break generation


# Singleton
_logger_instance = None

def get_usage_logger() -> UsageLogger:
    """Get singleton usage logger"""
    global _logger_instance
    if _logger_instance is None:
        _logger_instance = UsageLogger()
    return _logger_instance
```

Update `ai_gateway.py` to log usage:

```python
# In generate_content method, after response:
from .usage_logger import get_usage_logger

usage_logger = get_usage_logger()
await usage_logger.log_usage(
    org_id=org_id,
    user_id=user_id,
    operation="content_generation",
    model=model,
    prompt_tokens=response.usage.prompt_tokens,
    completion_tokens=response.usage.completion_tokens,
    cost_usd=calculate_cost(model, response.usage),
    latency_ms=int(latency * 1000),
    cached=getattr(response, 'cached', False)
)
```

---

## Testing Checklist

### Test LiteLLM Gateway
- [ ] Deploy successful
- [ ] Health check endpoint works
- [ ] Can generate completions through proxy
- [ ] Caching works (same prompt returns cached)
- [ ] Dashboard accessible (if enabled)

### Test Python Backend
- [ ] Can call LiteLLM from backend
- [ ] Content generation works
- [ ] Polishing works
- [ ] Quality checks return scores
- [ ] Meta tags generated correctly
- [ ] Usage logged to database

### Test End-to-End
- [ ] Create blog from frontend
- [ ] Content is generated
- [ ] Content is polished (no artifacts)
- [ ] Quality score calculated
- [ ] Meta tags included in response
- [ ] Usage tracked in database
- [ ] Costs visible in dashboard

---

## Environment Variables Needed

### LiteLLM Service
```bash
LITELLM_MASTER_KEY=your-secure-key-here
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
REDIS_HOST=your-redis-host
REDIS_PASSWORD=your-redis-password (if using Redis)
```

### Python Backend
```bash
LITELLM_PROXY_URL=https://litellm-proxy-xxx.run.app
LITELLM_API_KEY=your-secure-key-here
SUPABASE_DB_URL=postgresql://... (for usage logging)
```

---

## Cost Estimates

### Infrastructure
- **LiteLLM Cloud Run**: $10-20/month (minimal usage, scales to zero)
- **Redis** (optional): $30-50/month OR free tier on Redis Cloud
- **Total Infrastructure**: $10-70/month

### AI API Savings
- **Before**: No caching, all requests hit OpenAI
- **After**: 30-50% cache hit rate = 30-50% cost reduction
- **Break-even**: If spending $100+/month on AI, saves $30-50/month

**Net Result**: Pays for itself if you're spending more than $100/month on AI APIs

---

## Key Files to Create/Modify

### Create These Files:
1. `backend/litellm-config.yaml` - LiteLLM configuration
2. `backend/src/services/ai_gateway.py` - Gateway wrapper
3. `backend/src/services/usage_logger.py` - Usage tracking
4. `supabase/migrations/YYYYMMDD_ai_usage_tracking.sql` - Database schema

### Modify These Files:
1. `backend/src/services/blog_generator.py` - Add polishing steps
2. `backend/requirements.txt` - Add `litellm>=1.50.0`
3. Cloud Run environment variables - Add LiteLLM config

---

## Next Steps

1. **Deploy LiteLLM** to Cloud Run (30 minutes)
2. **Set up Redis** for caching (optional, 30 minutes)
3. **Create `ai_gateway.py`** in backend (1-2 hours)
4. **Update blog generator** to use gateway (1 hour)
5. **Add usage tracking** (1 hour)
6. **Test end-to-end** (1-2 hours)

**Total Time**: 4-8 hours

---

## Support Resources

- **LiteLLM Docs**: https://docs.litellm.ai/
- **LiteLLM Proxy**: https://docs.litellm.ai/docs/proxy/quick_start
- **Redis Cloud**: https://redis.com/try-free/
- **Google Memorystore**: https://cloud.google.com/memorystore/docs/redis

---

## Questions?

Before you start, make sure you have:
- [ ] OpenAI API key
- [ ] Anthropic API key (if using Claude)
- [ ] Access to Google Cloud Console
- [ ] Supabase database connection string
- [ ] Backend repository access

Ready to implement? Start with Phase 1 (Deploy LiteLLM).
