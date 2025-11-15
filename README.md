# AI Blog Writer API 📝

A comprehensive Python API for AI-driven blog writing with advanced SEO optimization, built for modern web applications.

[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Version**: 1.3.2  
**Publish date**: 2025-11-15  
See the full [CHANGELOG](CHANGELOG.md) for details.

## 🚀 Features

### Core Capabilities
- **🤖 AI-Enhanced Content Generation**: Multi-provider AI support (OpenAI, Anthropic, Azure OpenAI) with intelligent fallback
- **🚀 Direct AI Provider Integration**: Direct integration with OpenAI, Anthropic, and other AI providers
- **📊 SEO-First Architecture**: Built-in SEO optimization and analysis
- **🔍 Enhanced Keyword Analysis**: Optional DataForSEO integration for real search volume, competition, and trends data
- **📝 Content Templates**: Pre-built templates for how-to guides, listicles, reviews, comparisons, and more
- **✅ Content Quality Analysis**: Readability scoring and improvement suggestions
- **🎯 Keyword Research**: Advanced keyword analysis and suggestions with fallback to built-in methods
- **📄 Multiple Output Formats**: Markdown, HTML, and JSON support
- **🏷️ Meta Tag Generation**: Automatic SEO meta tags and Open Graph tags
- **🏗️ Content Structure Optimization**: Heading hierarchy and internal linking
- **🔄 Provider Fallback**: Automatic failover between AI providers for reliability

### Technical Excellence
- **Modern Python**: Built with Python 3.9+ and modern async/await patterns
- **Type Safety**: Full type hints and Pydantic models
- **REST API**: FastAPI-powered API with automatic OpenAPI documentation
- **Database Integration**: Supabase integration for content management
- **Cloud-Ready**: Docker containerized with Google Cloud Run deployment support
- **Extensible**: Plugin architecture for custom functionality

## 🏗️ Architecture

```
┌─────────────────┐    HTTPS API     ┌─────────────────┐    PostgreSQL    ┌─────────────────┐
│   Next.js App   │ ◄──────────────► │  Python API     │ ◄──────────────► │   Supabase DB   │
│   (Vercel)      │                  │ (Google Cloud)  │                  │   + Auth + APIs │
│   Auto SSL ✅   │                  │   Auto SSL ✅   │                  │   Auto SSL ✅   │
└─────────────────┘                  └─────────────────┘                  └─────────────────┘
```

## 📦 Installation

### Option 1: Use as a Library
```bash
pip install blog-writer-sdk
```

### Option 2: Deploy as API Service
```bash
# Clone the repository
git clone https://github.com/yourusername/blog-writer-sdk-python.git
cd blog-writer-sdk-python

# Install dependencies
pip install -e .

# Set up environment variables
cp env.example .env
# Edit .env with your configuration

# Run the API server
python main.py
```

## 🚀 Quick Start

### Using the SDK Directly

```python
from blog_writer_sdk import BlogWriter, BlogRequest, ContentTone, ContentLength

# Initialize the blog writer
writer = BlogWriter()

# Create a blog generation request
request = BlogRequest(
    topic="The Future of AI in Content Creation",
    keywords=["AI content", "automation", "writing tools"],
    tone=ContentTone.PROFESSIONAL,
    length=ContentLength.MEDIUM,
    focus_keyword="AI content creation"
)

# Generate the blog post
result = await writer.generate(request)

if result.success:
    print(f"Generated blog post: {result.blog_post.title}")
    print(f"SEO Score: {result.seo_score}/100")
    print(f"Word Count: {result.word_count}")
else:
    print(f"Generation failed: {result.error_message}")
```

### Using the REST API

```python
import httpx

# Generate a blog post via API
async with httpx.AsyncClient() as client:
    response = await client.post(
        "https://api-ai-blog-writer-613248238610.us-central1.run.app/api/v1/generate",
        json={
            "topic": "The Future of AI in Content Creation",
            "keywords": ["AI content", "automation", "writing tools"],
            "tone": "professional",
            "length": "medium",
            "focus_keyword": "AI content creation"
        }
    )
    
    result = response.json()
    print(f"Generated blog: {result['blog_post']['title']}")
```

### Frontend Integration (Next.js)

```typescript
// lib/blogWriter.ts
export class BlogWriterClient {
  constructor(private baseUrl: string) {}

  async generateBlog(params: BlogGenerationParams) {
    const response = await fetch(`${this.baseUrl}/api/v1/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return response.json();
  }
}

// pages/api/blog/generate.ts
const blogWriter = new BlogWriterClient(process.env.PYTHON_API_URL);

export default async function handler(req, res) {
  try {
    const result = await blogWriter.generateBlog(req.body);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Generation failed' });
  }
}
```

## 🔧 Configuration

### Environment Variables

```bash
# Application Settings
DEBUG=false
HOST=0.0.0.0
PORT=8000

# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# DataForSEO Configuration (Optional - for enhanced keyword analysis and intent detection)
DATAFORSEO_API_KEY=your_dataforseo_api_key
DATAFORSEO_API_SECRET=your_dataforseo_api_secret

# Google Custom Search (Required for enhanced blog generation)
GOOGLE_CUSTOM_SEARCH_API_KEY=your_google_search_api_key
GOOGLE_CUSTOM_SEARCH_ENGINE_ID=your_search_engine_id

# Google Knowledge Graph (Optional - for entity recognition and structured data)
GOOGLE_KNOWLEDGE_GRAPH_API_KEY=your_knowledge_graph_api_key

# Google Search Console (Optional - for query performance analysis)
GSC_SITE_URL=https://your-site.com

# MCP Configuration (Optional - for external integrations)
MCP_API_KEY=your_mcp_api_key

# CORS Settings
ALLOWED_ORIGINS=http://localhost:3000,https://your-app.vercel.app

# Content Generation Settings
DEFAULT_TONE=professional
DEFAULT_LENGTH=medium
ENABLE_SEO_OPTIMIZATION=true
ENABLE_QUALITY_ANALYSIS=true
```

### SDK Configuration

```python
from blog_writer_sdk import BlogWriter, ContentTone, ContentLength

writer = BlogWriter(
    default_tone=ContentTone.PROFESSIONAL,
    default_length=ContentLength.MEDIUM,
    enable_seo_optimization=True,
    enable_quality_analysis=True,
)
```

### 🤖 AI-Enhanced Content Generation

The SDK supports multiple AI providers with intelligent fallback for robust content generation:

#### Supported AI Providers
- **OpenAI**: GPT-4o, GPT-4o-mini, GPT-4 Turbo, GPT-3.5 Turbo
- **Anthropic**: Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus
- **Azure OpenAI**: All OpenAI models via Azure endpoints

#### AI Features
- **Smart Content Generation**: Context-aware blog posts, titles, meta descriptions
- **Content Templates**: How-to guides, listicles, reviews, comparisons
- **Multi-Provider Fallback**: Automatic failover if primary provider fails
- **Cost Optimization**: Intelligent model selection based on content complexity
- **Quality Assurance**: Built-in content validation and enhancement

#### Setup AI Providers

1. **Get API Keys**: Obtain API keys from your preferred providers
2. **Configure Environment**: Add credentials to your `.env` file
3. **Automatic Initialization**: The SDK automatically detects and configures available providers

```python
from blog_writer_sdk import BlogWriter
from blog_writer_sdk.ai.ai_content_generator import AIContentGenerator

# Configure AI providers
ai_config = {
    'providers': {
        'openai': {
            'api_key': 'your_openai_api_key',
            'default_model': 'gpt-4o-mini',
            'enabled': True,
            'priority': 1
        },
        'anthropic': {
            'api_key': 'your_anthropic_api_key',
            'default_model': 'claude-3-5-haiku-20241022',
            'enabled': True,
            'priority': 2
        }
    }
}

# Initialize AI content generator
ai_generator = AIContentGenerator(config=ai_config)

# Create BlogWriter with AI enhancement
writer = BlogWriter(
    ai_content_generator=ai_generator,
    enable_ai_enhancement=True
)

# Generate AI-enhanced content
request = BlogRequest(
    topic="How to Build a Python REST API",
    keywords=["Python API", "FastAPI", "REST"],
    tone=ContentTone.INSTRUCTIONAL,
    length=ContentLength.LONG,
    custom_instructions="Include code examples and best practices"
)

result = await writer.generate(request)
print(f"Generated: {result.blog_post.title}")
```

### 🔍 Enhanced Keyword Analysis with DataForSEO

The SDK supports enhanced keyword analysis through DataForSEO integration, providing:

- **Real Search Volume Data**: Actual monthly search volumes
- **Competition Analysis**: Keyword difficulty and competition levels  
- **Cost-Per-Click (CPC)**: Average advertising costs
- **SERP Features**: Featured snippets, local packs, etc.
- **Trend Analysis**: Historical search volume trends
- **Search Intent Analysis**: Intent classification (informational/commercial/transactional/navigational)

#### Setup DataForSEO Integration

1. **Get DataForSEO API Credentials**: Sign up at [DataForSEO](https://dataforseo.com/)
2. **Configure Environment Variables**: Add your credentials to `.env` or Google Secret Manager
3. **Automatic Fallback**: If credentials aren't provided, the SDK uses built-in analysis

#### Usage with Enhanced Analysis

```bash
curl -X POST "$BASE/api/v1/keywords/enhanced" \
  -H "Content-Type: application/json" \
  -d '{"keywords":["ai in business","cloud run seo"],"location":"United States","language":"en"}'
```

### 🚀 Enhanced Blog Generation (Multi-Stage Pipeline)

**NEW in v1.2.0**: High-quality blog generation using a sophisticated 4-stage pipeline with advanced optimizations.

#### Features

- **4-Stage Generation Pipeline**:
  1. **Research & Outline** (Claude 3.5 Sonnet) - Comprehensive research and structure
  2. **Draft Generation** (GPT-4o) - Comprehensive content creation
  3. **Enhancement** (Claude 3.5 Sonnet) - Refinement and fact-checking
  4. **SEO Polish** (GPT-4o-mini) - Final optimization

- **Intent-Based Generation**: Automatically detects search intent and optimizes content structure
- **Few-Shot Learning**: Learns from top-ranking content examples
- **Content Length Optimization**: Dynamically adjusts word count based on SERP competition
- **Multi-Model Consensus** (optional): Combines GPT-4o and Claude for higher quality
- **Google Knowledge Graph**: Entity recognition and structured data generation
- **Semantic Keyword Integration**: Natural integration of related keywords
- **Quality Scoring**: 6-dimensional quality assessment (readability, SEO, structure, factual, uniqueness, engagement)
- **Content Freshness**: Current dates and "last updated" signals

#### Usage

```bash
curl -X POST "$BASE/api/v1/blog/generate-enhanced" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "AI Content Generation",
    "keywords": ["ai content", "blog writing", "content automation"],
    "tone": "professional",
    "length": "medium",
    "use_google_search": true,
    "use_citations": true,
    "use_consensus_generation": false,
    "use_knowledge_graph": true,
    "use_semantic_keywords": true,
    "use_quality_scoring": true
  }'
```

#### Response Includes

```json
{
  "title": "Generated Blog Title",
  "content": "Full blog content...",
  "meta_title": "SEO-optimized meta title",
  "meta_description": "SEO-optimized meta description",
  "readability_score": 72.5,
  "seo_score": 85.0,
  "quality_score": 88.5,
  "quality_dimensions": {
    "readability": 75.0,
    "seo": 90.0,
    "structure": 85.0,
    "factual": 95.0,
    "uniqueness": 90.0,
    "engagement": 85.0
  },
  "structured_data": {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    ...
  },
  "semantic_keywords": ["related keyword 1", "related keyword 2"],
  "stage_results": [
    {"stage": "research_outline", "provider": "anthropic", "tokens": 500, "cost": 0.002},
    {"stage": "draft", "provider": "openai", "tokens": 2000, "cost": 0.01},
    {"stage": "enhancement", "provider": "anthropic", "tokens": 1500, "cost": 0.006},
    {"stage": "seo_polish", "provider": "openai", "tokens": 800, "cost": 0.001}
  ],
  "citations": [
    {"text": "According to research...", "url": "https://source.com", "title": "Source Title"}
  ],
  "total_tokens": 4800,
  "total_cost": 0.019,
  "generation_time": 12.5,
  "seo_metadata": {
    "search_intent": {
      "primary_intent": "informational",
      "confidence": 0.92
    },
    "semantic_keywords": [...],
    "keyword_clusters": 3
  }
}
```

#### Configuration

**Required Environment Variables:**
- `GOOGLE_CUSTOM_SEARCH_API_KEY` - For research, fact-checking, and few-shot learning
- `GOOGLE_CUSTOM_SEARCH_ENGINE_ID` - Custom Search Engine ID
- `DATAFORSEO_API_KEY` - For intent analysis and semantic keywords (optional but recommended)
- `DATAFORSEO_API_SECRET` - DataForSEO secret
- `GOOGLE_KNOWLEDGE_GRAPH_API_KEY` - For entity recognition (optional)

**Optional Features:**
- `use_consensus_generation: true` - Enable multi-model consensus (higher cost, better quality)
- `use_knowledge_graph: true` - Enable Knowledge Graph integration (default: true)
- `use_semantic_keywords: true` - Enable semantic keyword integration (default: true)
- `use_quality_scoring: true` - Enable quality scoring (default: true)

See [Enhanced Blog Generation Guide](PHASE1_PHASE2_IMPLEMENTATION.md) for detailed documentation.

## 📊 API Endpoints

### Blog Generation
- `POST /api/v1/generate` - Generate a complete blog post (standard generation)
- `POST /api/v1/blog/generate-enhanced` - **NEW**: High-quality multi-stage blog generation with advanced features
  - Multi-stage pipeline (Research → Draft → Enhancement → SEO)
  - Intent-based content optimization
  - Few-shot learning from top-ranking content
  - Content length optimization based on competition
  - Multi-model consensus generation (optional)
  - Google Knowledge Graph integration
  - Semantic keyword integration
  - Comprehensive quality scoring
  - See [Enhanced Blog Generation](#-enhanced-blog-generation) section below
- `POST /api/v1/analyze` - Analyze existing content
- `POST /api/v1/optimize` - Optimize content for SEO

### Keyword Research
- `POST /api/v1/keywords/analyze` - Analyze keyword difficulty
- `POST /api/v1/keywords/extract` - Extract keywords from content (phrase-mode via `max_ngram`, `dedup_lim`)
- `POST /api/v1/keywords/suggest` - Get keyword suggestions
- `POST /api/v1/keywords/enhanced` - Enhanced keyword analysis using DataForSEO (intent, volume, difficulty, CPC; graceful fallback)

### Topic Recommendations
- `POST /api/v1/topics/recommend` - **NEW**: Recommend high-ranking blog topics based on seed keywords
  - Uses DataForSEO for keyword metrics (search volume, difficulty, competition)
  - Uses Google Custom Search for content gap analysis
  - Uses Claude 3.5 Sonnet for AI-powered topic generation
  - Returns topics with ranking scores (0-100) and opportunity scores (0-100)
  - Categorizes topics: high priority, trending, low competition
  - Includes content gaps, related keywords, and estimated traffic potential

### Integrations (Target-Agnostic)
- `POST /api/v1/integrations/connect-and-recommend`  
  Accepts a `provider` label (e.g., `webflow`, `wordpress`, `medium`, `shopify`, `custom`), an opaque `connection` object, and a set of `keywords`.  
  Returns backlink and interlink recommendations (aggregate and per-keyword) and best-effort persists:
  - `integrations_{ENV}`: basic integration metadata
  - `recommendations_{ENV}`: computed recommendations  
  This endpoint is provider-agnostic (no provider-specific branching).

### Utility
- `GET /health` - Health check
- `GET /api/v1/config` - Get API configuration
- `GET /docs` - Interactive API documentation

## 🎯 SEO Features

### Built-in SEO Analysis
- **Keyword Density Analysis**: Optimal keyword distribution
- **Title Optimization**: SEO-friendly titles (30-60 characters)
- **Meta Description Generation**: Compelling descriptions (120-160 characters)
- **Heading Structure**: Proper H1-H6 hierarchy
- **Internal Linking**: Automatic linking suggestions
- **Schema Markup**: JSON-LD structured data (automatic via Knowledge Graph)

### Advanced SEO Features (v1.2.0)
- **Intent-Based Optimization**: Content structure optimized for detected search intent
- **SERP Feature Targeting**: Optimized for featured snippets, People Also Ask, etc.
- **Competitive Content Depth**: Content length optimized based on top-ranking pages
- **Semantic Keyword Integration**: Natural integration of related keywords for topical authority
- **Content Freshness Signals**: Current dates and "last updated" timestamps

### Content Quality Metrics
- **6-Dimensional Quality Scoring**:
  - Readability (Flesch Reading Ease, target: 60-70)
  - SEO (keyword optimization, meta tags, headings)
  - Structure (paragraph length, list usage, heading hierarchy)
  - Factual (citation count, source verification)
  - Uniqueness (generic phrase detection, repetition analysis)
  - Engagement (questions, CTAs, examples)
- **Content Structure Analysis**: Paragraph and sentence analysis
- **Vocabulary Diversity**: Lexical richness analysis
- **Engagement Scoring**: Content engagement potential

## 🗄️ Database Schema

The SDK includes Supabase schemas for content management and generic recommendations.  
For integration metadata and recommendations (env-suffixed tables), see `supabase_schema.sql`.

```sql
-- Blog posts with full SEO metadata
CREATE TABLE blog_posts (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    slug TEXT UNIQUE,
    seo_score DECIMAL(5,2),
    word_count INTEGER,
    -- ... full schema available in src/integrations/supabase_client.py
);

-- Analytics for tracking performance
CREATE TABLE generation_analytics (
    id UUID PRIMARY KEY,
    topic TEXT NOT NULL,
    success BOOLEAN,
    generation_time DECIMAL(8,3),
    -- ... complete analytics tracking
);
```

## 🚀 Deployment

### Google Cloud Run Deployment (Recommended)

Deploy to Google Cloud Run for enterprise-grade scalability and reliability:

```bash
# Quick deployment
./scripts/setup-secrets.sh  # Setup secrets in Google Secret Manager
./scripts/deploy.sh          # Deploy to Cloud Run

# Your service will be available at:
# https://blog-writer-sdk-xxx-uc.a.run.app
```

**Benefits of Cloud Run:**
- **Serverless & Auto-scaling**: Pay only when generating content
- **Global availability**: Serve applications worldwide  
- **Enterprise-ready**: Built-in monitoring, logging, and security
- **Cost-effective**: Perfect for variable AI workloads

See [CLOUD_RUN_DEPLOYMENT.md](CLOUD_RUN_DEPLOYMENT.md) for detailed instructions.

### Automated Deployment with GitHub Actions

1. **Setup Google Cloud**: Configure your Google Cloud project and enable Cloud Run
2. **Environment Variables**: Set up your environment variables in Google Cloud Secret Manager
3. **Deploy**: Push to branches triggers automatic deployment via GitHub Actions
   - `develop` branch → Deploys to `europe-west1` (dev environment)
   - `main`/`master` branch → Deploys to `us-east1` (prod environment)

```bash
# Google Cloud Run automatically uses:
# - Dockerfile for containerization
# - cloudbuild.yaml for build configuration
# - Automatic SSL and custom domains
```

### Manual Docker Deployment

```bash
# Build the container
docker build -t blog-writer-sdk .

# Run with environment variables
docker run -p 8000:8000 \
  -e SUPABASE_URL=your-url \
  -e SUPABASE_SERVICE_ROLE_KEY=your-key \
  blog-writer-sdk
```

### Vercel + Google Cloud Run Architecture

```bash
# Frontend (Vercel)
vercel --prod

# Backend (Google Cloud Run)
# Push to main branch triggers automatic deployment

# Database (Supabase)
# Run the schema from src/integrations/supabase_client.py
```

## 🧪 Testing

```bash
# Install test dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Run with coverage
pytest --cov=src/blog_writer_sdk --cov-report=html

# Run linting
black src/
isort src/
flake8 src/
mypy src/
```

## 📈 Performance

### Benchmarks
- **Generation Speed**: ~2-5 seconds for medium-length posts
- **SEO Analysis**: ~0.5-1 second per analysis
- **Memory Usage**: ~50-100MB per worker
- **Concurrent Requests**: 100+ requests/minute per instance

### Optimization Tips
- Use async/await for all operations
- Enable caching for repeated keyword analysis
- Consider Redis for session storage
- Use CDN for static assets

## 🔌 Integrations

### Supported Platforms
- **Supabase**: Database and authentication
- **Vercel**: Frontend deployment
- **Google Cloud Run**: Backend deployment
- **Next.js**: Frontend framework integration

### Planned Integrations
- **WordPress**: Direct publishing
- **Ghost**: CMS integration
- **Contentful**: Headless CMS
- **Notion**: Content management

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/blog-writer-sdk-python.git
cd blog-writer-sdk-python

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install in development mode
pip install -e ".[dev]"

# Set up pre-commit hooks
pre-commit install

# Run tests
pytest
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📚 Documentation

- **[AI Provider Integration](src/blog_writer_sdk/ai/)**: Direct AI provider integrations
- **[UI Examples](examples/ui-examples/README.md)**: React and Next.js dashboard templates
- **[Deployment Guide](CLOUD_RUN_DEPLOYMENT.md)**: Deploy to Google Cloud Run
- **[GitHub Actions Setup](GITHUB_RAILWAY_SETUP.md)**: CI/CD with Google Cloud
- **[Frontend Integration](FRONTEND_INTEGRATION.md)**: Next.js integration guide
- **[Multi-SDK Docker Guide](MULTI_SDK_DOCKER_GUIDE.md)**: Dockerize multiple SDKs
- **[Changelog](CHANGELOG.md)**: Release notes and version history
- **[Integrations Endpoint](INTEGRATIONS_ENDPOINT.md)**: Backlink & interlink recommendations API
- **[Enhanced Blog Generation Guide](ENHANCED_BLOG_GENERATION_GUIDE.md)**: Complete guide for `/api/v1/blog/generate-enhanced`
- **[Phase 1 & 2 Implementation](PHASE1_PHASE2_IMPLEMENTATION.md)**: Multi-stage pipeline and Google integrations
- **[Phase 3 Implementation](PHASE3_IMPLEMENTATION.md)**: Advanced features (consensus, Knowledge Graph, quality scoring)
- **[Blog Quality Improvements](BLOG_QUALITY_IMPROVEMENTS.md)**: Original recommendations document

## 🆘 Support

- **Documentation**: [Full API Docs](https://api-ai-blog-writer-613248238610.us-central1.run.app/docs)
- **Issues**: [GitHub Issues](https://github.com/tindevelopers/api-blogwriting-python-gcr/issues)
- **Discussions**: [GitHub Discussions](https://github.com/tindevelopers/api-blogwriting-python-gcr/discussions)

## 🗺️ Roadmap

### Version 0.2.0
- [ ] WordPress plugin integration
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Custom AI model integration

### Version 0.3.0
- [ ] Real-time collaboration
- [ ] Content scheduling
- [ ] A/B testing framework
- [ ] Advanced SEO competitor analysis

### Version 1.0.0
- [ ] Enterprise features
- [ ] White-label solutions
- [ ] Advanced integrations
- [ ] Performance optimizations

## 🙏 Acknowledgments

- Built with [FastAPI](https://fastapi.tiangolo.com/) for the REST API
- Powered by [Supabase](https://supabase.com/) for database operations
- Deployed on [Google Cloud Run](https://cloud.google.com/run) for seamless hosting
- Inspired by modern SEO best practices and content marketing needs

---

**Built with ❤️ for content creators and developers**

Ready to revolutionize your content creation process? Get started with the Blog Writer SDK today!
