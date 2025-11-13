# Codebase Summary - Multi-Tenant Blog Writer Platform

**Version:** 1.0.2  
**Last Updated:** January 16, 2025  
**Status:** Production Ready

---

## 📋 Executive Summary

A comprehensive, multi-tenant blog writing and content management platform built with Next.js 15, Supabase, and TypeScript. The platform provides AI-powered content generation, keyword research, SEO optimization, workflow management, and multi-platform publishing capabilities with complete organization-based data isolation.

**Key Capabilities:**
- ✅ AI-powered blog content generation with multiple quality levels
- ✅ Advanced keyword research and clustering
- ✅ SEO optimization and content analysis
- ✅ Multi-platform publishing (Webflow, WordPress, Shopify)
- ✅ Complete workflow management system
- ✅ Team collaboration and role-based access control
- ✅ Media library with Cloudinary/Cloudflare integration
- ✅ Brand voice and content preset management
- ✅ Custom instructions for content structure control
- ✅ Enhanced API endpoints for 30-40% better content quality

---

## 🛠️ Technology Stack

### Frontend
- **Framework:** Next.js 15.5.4 (App Router)
- **Language:** TypeScript 5.0
- **UI Library:** React 19.0
- **Styling:** Tailwind CSS 4.0
- **Icons:** Heroicons 2.1.0, Lucide React 0.460.0
- **Charts:** Recharts 2.13.0, ApexCharts 4.3.0
- **Forms:** React Hook Form (via custom components)
- **Date Picker:** Flatpickr 4.6.13

### Backend
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **API Layer:** Next.js API Routes
- **External API:** Blog Writer API (Cloud Run)
- **Storage:** Supabase Storage, Cloudinary, Cloudflare

### DevOps & Deployment
- **Hosting:** Vercel
- **CI/CD:** GitHub Actions
- **Database Migrations:** Supabase Migrations
- **Environment:** Node.js 18+

### Key Libraries
- **State Management:** React Hooks (useState, useEffect, useContext)
- **Data Fetching:** Native Fetch API with custom hooks
- **Validation:** TypeScript types + runtime validation
- **File Upload:** React Dropzone 14.2.3
- **Charts:** Recharts, ApexCharts
- **UI Components:** Custom component library (72+ components)

---

## 🏗️ Architecture Overview

### Multi-Tenant Architecture

**Core Principle:** Organization-based data isolation using Supabase Row Level Security (RLS)

```
┌─────────────────────────────────────────────────┐
│           Organization (Tenant)                 │
├─────────────────────────────────────────────────┤
│  Users (owner, admin, editor, writer)          │
│  Blog Posts (isolated by org_id)               │
│  Content Templates (org-specific)              │
│  Keyword Collections (org-specific)            │
│  Workflow Sessions (org-specific)              │
│  Integrations (org-specific)                   │
│  API Usage Logs (org-specific)                │
└─────────────────────────────────────────────────┘
```

### Application Structure

```
Next.js 15 App Router Structure:
├── app/
│   ├── admin/              # Protected admin dashboard
│   │   ├── workflow/       # Content workflow pages
│   │   ├── drafts/         # Draft management
│   │   ├── seo/            # SEO tools
│   │   ├── integrations/   # Third-party integrations
│   │   └── settings/       # Organization settings
│   ├── api/                # Next.js API routes
│   │   ├── blog-writer/    # Blog generation proxy
│   │   ├── keywords/       # Keyword research API
│   │   ├── integrations/   # Integration management
│   │   └── drafts/         # Draft CRUD operations
│   └── auth/               # Authentication pages
├── components/             # React components
│   ├── blog-writer/        # Blog-specific components
│   ├── integrations/      # Integration components
│   ├── keyword-research/   # Keyword research UI
│   └── ui/                 # Reusable UI components
├── lib/                    # Business logic & utilities
│   ├── blog-writer-api.ts  # External API client
│   ├── keyword-research.ts # Keyword analysis service
│   ├── integrations/       # Integration providers
│   └── supabase/           # Supabase client setup
└── hooks/                  # Custom React hooks
```

---

## 🎯 Core Features & Capabilities

### 1. AI-Powered Blog Generation

**Location:** `src/app/api/blog-writer/generate/route.ts`

**Capabilities:**
- Multi-quality level generation (standard, high, premium, enterprise)
- Custom instructions support for structure control
- Template types: expert_authority, how_to_guide, comparison, case_study, news_update, tutorial, listicle, review
- Quality features:
  - Google Search research
  - Fact-checking (multi-model)
  - Citations
  - SERP optimization
  - Consensus generation (GPT-4o + Claude)
  - Knowledge graph integration
  - Semantic keywords
  - Quality scoring
- Enhanced keyword insights integration
- Image generation and embedding
- Content enhancement (HTML formatting, internal links)

**API Endpoints:**
- `POST /api/blog-writer/generate` - Generate blog content
- Supports both `/api/v1/blog/generate` and `/api/v1/blog/generate-enhanced`

**Key Files:**
- `src/lib/blog-writer-api.ts` - API client
- `src/lib/blog-generation-utils.ts` - Helper utilities
- `src/app/api/blog-writer/generate/route.ts` - Generation route

### 2. Keyword Research & Analysis

**Location:** `src/lib/keyword-research.ts`, `src/app/admin/workflow/keywords/page.tsx`

**Capabilities:**
- Keyword extraction from topics
- Keyword analysis with search volume, difficulty, competition
- Enhanced endpoints (v1.3.0):
  - Google Trends integration
  - Keyword ideas from DataForSEO
  - Relevant pages analysis
  - SERP AI Summary
  - AI-calculated search volume
- Keyword clustering and grouping
- Parent topic identification
- Category classification (topic, question, action, entity)
- Keyword storage and history tracking
- Collection management

**API Endpoints:**
- `POST /api/keywords/extract` - Extract keywords from text
- `POST /api/keywords/analyze` - Analyze keywords with metrics
- `POST /api/keywords/suggest` - Get keyword suggestions
- `POST /api/keywords/difficulty` - Analyze keyword difficulty

**Key Files:**
- `src/lib/keyword-research.ts` - Keyword research service
- `src/lib/keyword-storage.ts` - Storage service
- `src/app/admin/workflow/keywords/page.tsx` - UI component

### 3. Content Workflow Management

**Location:** `src/app/admin/workflow/`

**Workflow Steps:**
1. **Objective** (`/admin/workflow/objective`) - Define content goals
2. **Keywords** (`/admin/workflow/keywords`) - Research and save keywords
3. **Clusters** (`/admin/workflow/clusters`) - Topic clustering
4. **Ideas** (`/admin/workflow/ideas`) - Content idea generation
5. **Topics** (`/admin/workflow/topics`) - Topic selection
6. **Strategy** (`/admin/workflow/strategy`) - Content strategy
7. **Editor** (`/admin/workflow/editor`) - AI content generation
8. **Posts** (`/admin/workflow/posts`) - Published posts management

**Features:**
- Session-based workflow persistence
- Progress tracking
- Data persistence across steps
- Workflow session management
- Content goal-based generation (SEO, engagement, conversions, brand awareness)

**Key Files:**
- `src/app/admin/workflow/layout.tsx` - Workflow layout
- `src/app/admin/workflow/manage/page.tsx` - Session management

### 4. Draft Management

**Location:** `src/app/admin/drafts/`

**Capabilities:**
- Create new drafts with AI generation
- Edit existing drafts
- View draft preview with rich formatting
- Save drafts with auto-save
- Draft status management (draft, published, scheduled, archived)
- SEO data storage
- Metadata tracking

**Key Files:**
- `src/app/admin/drafts/new/page.tsx` - Create new draft
- `src/app/admin/drafts/edit/[id]/page.tsx` - Edit draft
- `src/app/admin/drafts/view/[id]/page.tsx` - View draft
- `src/hooks/useBlogPosts.ts` - Draft CRUD hooks

### 5. SEO Tools

**Location:** `src/app/admin/seo/`

**Capabilities:**
- Keyword research interface
- Keyword difficulty analysis
- Search volume data
- Keyword clustering visualization
- SEO insights and recommendations
- Content suggestions based on keywords
- Keyword history tracking

**Key Files:**
- `src/app/admin/seo/page.tsx` - Main SEO page
- `src/app/admin/seo/keywords/page.tsx` - Keyword history
- `src/components/keyword-research/` - Research components

### 6. Publishing Integrations

**Location:** `src/app/admin/integrations/`, `src/lib/integrations/`

**Supported Platforms:**
- **Webflow** - OAuth-based CMS publishing
- **WordPress** - API key-based publishing
- **Shopify** - Blog publishing
- **Cloudinary** - Media storage
- **Cloudflare** - Media storage

**Features:**
- OAuth flow management
- API key management with encryption
- Field mapping interfaces
- Publishing history tracking
- Sync status monitoring
- Integration health checks
- Requirements analysis

**Key Files:**
- `src/lib/integrations/webflow-api.ts` - Webflow API client
- `src/components/integrations/WebflowConfig.tsx` - Webflow UI
- `src/app/api/integrations/` - Integration API routes

### 7. Brand Voice & Content Presets

**Location:** `src/app/admin/settings/brand-voice/`, `src/app/admin/settings/content-presets/`

**Capabilities:**
- Brand voice configuration (tone, target audience, style)
- Content preset creation and management
- Preset templates with word count, quality level, tone
- Organization-wide preset sharing
- Content goal prompts (SEO, engagement, conversions, brand awareness)

**Key Files:**
- `src/components/blog-writer/BrandVoiceSettings.tsx`
- `src/components/blog-writer/ContentPresetsManager.tsx`
- `src/app/api/brand-settings/route.ts`
- `src/app/api/content-presets/route.ts`

### 8. Team Collaboration

**Location:** `src/app/admin/team/`

**Capabilities:**
- User management per organization
- Role-based access control (owner, admin, editor, writer)
- User invitations
- Team member management
- Permission management

**Key Files:**
- `src/app/admin/team/page.tsx`
- `src/components/admin/AddUserModal.tsx`
- `src/lib/rbac/` - RBAC utilities

---

## 🗄️ Database Schema

### Core Tables

#### Organizations
```sql
organizations (
  org_id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  subscription_tier TEXT DEFAULT 'free',
  api_quota_monthly INTEGER DEFAULT 10000,
  api_quota_used INTEGER DEFAULT 0,
  settings JSONB DEFAULT '{}'
)
```

#### Users
```sql
users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  org_id UUID REFERENCES organizations(org_id),
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'writer', -- owner, admin, editor, writer
  permissions JSONB DEFAULT '{}'
)
```

#### Blog Posts
```sql
blog_posts (
  post_id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(org_id),
  created_by UUID REFERENCES users(user_id),
  title TEXT NOT NULL,
  content TEXT,
  excerpt TEXT,
  status TEXT DEFAULT 'draft', -- draft, published, scheduled, archived
  seo_data JSONB DEFAULT '{}',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
)
```

#### Workflow Sessions
```sql
workflow_sessions (
  session_id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(org_id),
  created_by UUID REFERENCES users(user_id),
  current_step TEXT,
  completed_steps TEXT[],
  workflow_data JSONB DEFAULT '{}',
  content_goal TEXT -- seo, engagement, conversions, brand_awareness
)
```

#### Keyword Collections
```sql
keyword_collections (
  collection_id UUID PRIMARY KEY,
  session_id UUID REFERENCES workflow_sessions(session_id),
  org_id UUID REFERENCES organizations(org_id),
  created_by UUID REFERENCES users(user_id),
  name TEXT NOT NULL,
  keywords JSONB NOT NULL,
  search_query TEXT,
  niche TEXT
)
```

#### Integrations
```sql
integrations (
  integration_id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(org_id),
  type TEXT NOT NULL, -- webflow, wordpress, shopify, cloudinary
  name TEXT NOT NULL,
  status TEXT DEFAULT 'inactive',
  config JSONB NOT NULL, -- Encrypted credentials
  field_mappings JSONB DEFAULT '{}',
  health_status TEXT DEFAULT 'unknown'
)
```

#### Content Presets
```sql
content_presets (
  preset_id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(org_id),
  created_by UUID REFERENCES users(user_id),
  name TEXT NOT NULL,
  description TEXT,
  word_count INTEGER,
  quality_level TEXT,
  tone TEXT,
  template_type TEXT,
  custom_instructions TEXT
)
```

#### Brand Voice Settings
```sql
brand_voice_settings (
  setting_id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(org_id),
  tone TEXT,
  target_audience TEXT,
  style_guide JSONB DEFAULT '{}',
  voice_characteristics JSONB DEFAULT '{}'
)
```

### Row Level Security (RLS)

All tables have RLS policies ensuring:
- Users can only access their organization's data
- Data isolation between organizations
- Role-based access control
- Secure admin operations

**Example RLS Policy:**
```sql
CREATE POLICY "Users can view org posts"
  ON blog_posts FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM users WHERE user_id = auth.uid()
  ));
```

---

## 🔌 API Integrations

### External Blog Writer API

**Base URL:** `https://blog-writer-api-dev-613248238610.europe-west1.run.app`

**Endpoints Used:**
- `/api/v1/blog/generate` - Standard blog generation
- `/api/v1/blog/generate-enhanced` - Enhanced generation with quality features
- `/api/v1/keywords/analyze` - Keyword analysis (enhanced v1.3.0)
- `/api/v1/keywords/extract` - Keyword extraction
- `/api/v1/keywords/suggest` - Keyword suggestions
- `/api/v1/keywords/llm-responses` - Multi-model fact-checking
- `/api/v1/abstraction/presets` - Get content presets
- `/api/v1/abstraction/quality-levels` - Get quality levels
- `/api/v1/images/generate` - AI image generation

**Features:**
- Cloud Run health checking
- Auto-wakeup for cold starts
- Retry logic with exponential backoff
- Error handling and fallbacks

**Key Files:**
- `src/lib/blog-writer-api.ts` - API client
- `src/lib/cloud-run-health.ts` - Health checking
- `src/hooks/useCloudRunStatus.ts` - React hook for status

### Supabase Integration

**Services Used:**
- Authentication (email/password)
- PostgreSQL database
- Row Level Security
- Storage (for media assets)

**Key Files:**
- `src/lib/supabase/client.ts` - Client-side client
- `src/lib/supabase/server.ts` - Server-side client
- `src/lib/supabase/middleware.ts` - Auth middleware
- `src/lib/supabase/service.ts` - Service role client

### Third-Party Integrations

**Webflow:**
- OAuth 2.0 flow
- CMS API integration
- Collection management
- Item publishing

**Cloudinary:**
- Image upload
- Image optimization
- Media library

**Cloudflare:**
- Image upload
- CDN delivery

---

## 📁 Key File Structure

### API Routes (`src/app/api/`)

```
api/
├── blog-writer/
│   └── generate/route.ts          # Blog generation proxy
├── keywords/
│   ├── analyze/route.ts           # Keyword analysis
│   ├── extract/route.ts           # Keyword extraction
│   ├── suggest/route.ts           # Keyword suggestions
│   └── difficulty/route.ts       # Difficulty analysis
├── integrations/
│   ├── [id]/
│   │   ├── route.ts              # CRUD operations
│   │   ├── test/route.ts         # Test connection
│   │   ├── sync/route.ts         # Sync data
│   │   └── export/route.ts      # Export data
│   ├── oauth/webflow/            # Webflow OAuth
│   └── connect-api-key/route.ts  # API key connections
├── drafts/
│   ├── save/route.ts             # Save draft
│   ├── list/route.ts             # List drafts
│   └── [id]/route.ts             # Draft CRUD
├── brand-settings/route.ts        # Brand voice API
├── content-presets/route.ts      # Presets API
├── internal-links/
│   ├── route.ts                  # Internal links CRUD
│   └── suggest/route.ts          # Link suggestions
└── cloud-run/health/route.ts     # API health check
```

### Components (`src/components/`)

```
components/
├── blog-writer/
│   ├── BlogResearchPanel.tsx     # Keyword research UI
│   ├── ContentSuggestionsPanel.tsx # Content suggestions
│   ├── BrandVoiceSettings.tsx    # Brand voice config
│   ├── ContentPresetsManager.tsx # Preset management
│   └── InternalLinkSuggestions.tsx # Link suggestions
├── integrations/
│   ├── WebflowConfig.tsx         # Webflow setup
│   ├── CloudinaryConfig.tsx      # Cloudinary setup
│   └── ConnectIntegrationForm.tsx # Connection form
├── keyword-research/
│   ├── KeywordDifficultyAnalyzer.tsx
│   ├── MasterKeywordTable.tsx
│   └── PrimaryKeywordInput.tsx
├── workflow/
│   └── HorizontalWorkflowNav.tsx # Workflow navigation
└── ui/                           # 72+ reusable UI components
```

### Libraries (`src/lib/`)

```
lib/
├── blog-writer-api.ts            # External API client
├── blog-generation-utils.ts     # Generation helpers
├── keyword-research.ts          # Keyword analysis service
├── keyword-storage.ts           # Keyword storage service
├── cloud-run-health.ts          # API health checking
├── cloudinary-upload.ts         # Cloudinary integration
├── content-enhancer.ts          # Content enhancement
├── image-generation.ts          # AI image generation
├── integrations/
│   ├── webflow-api.ts           # Webflow API client
│   ├── integration-manager.ts   # Integration management
│   └── requirements-analyzer.ts # Requirements analysis
└── supabase/                    # Supabase clients
```

### Hooks (`src/hooks/`)

```
hooks/
├── useBlogPosts.ts              # Draft CRUD operations
├── useBlogWriterAPI.ts         # API client hook
├── useCloudRunStatus.ts        # API health status
├── useKeywordResearch.ts      # Keyword research
├── useEnhancedKeywordResearch.ts # Enhanced research
├── useKeywordDifficulty.ts    # Difficulty analysis
├── useContentIdeas.ts         # Content ideas
└── useContentSuggestions.ts   # Content suggestions
```

---

## 🔄 Key Workflows

### 1. Blog Generation Workflow

```
User Input (Topic, Keywords, Tone)
    ↓
Keyword Research & Analysis
    ↓
Content Strategy Generation
    ↓
AI Blog Generation (with quality features)
    ↓
Content Enhancement (images, links, formatting)
    ↓
Draft Save
    ↓
Review & Edit
    ↓
Publish to Platform (Webflow/WordPress/Shopify)
```

### 2. Keyword Research Workflow

```
Enter Primary Keyword
    ↓
Extract Related Keywords
    ↓
Analyze Keywords (volume, difficulty, competition)
    ↓
Enhanced Analysis (trends, SERP summary, ideas)
    ↓
Cluster Keywords by Topic
    ↓
Save Keyword Collection
    ↓
Use in Content Generation
```

### 3. Integration Workflow

```
Select Integration Type
    ↓
Configure Connection (OAuth or API Key)
    ↓
Test Connection
    ↓
Map Fields
    ↓
Save Integration
    ↓
Use for Publishing
```

---

## 🔐 Security Features

### Authentication & Authorization
- Supabase Auth with email/password
- JWT token validation
- Session management
- Protected routes with middleware

### Data Security
- Row Level Security (RLS) on all tables
- Organization-based data isolation
- Encrypted credentials storage
- API key encryption
- Service role for admin operations

### API Security
- API quota management per organization
- Usage tracking and logging
- Rate limiting (via Supabase)
- Input validation
- Error handling without exposing internals

---

## 🚀 Deployment & CI/CD

### GitHub Actions Workflows

**Staging CI/CD** (`.github/workflows/staging-ci.yml`):
- Runs on push to `staging` branch
- Linting and type checking
- Build verification
- Automatic Vercel deployment

**CI Pipeline** (`.github/workflows/ci.yml`):
- Runs on push to `main`/`develop` and PRs
- Tests on Node.js 18.x and 20.x
- Type checking and linting
- Build verification

**Deploy Preview** (`.github/workflows/deploy-preview.yml`):
- Creates preview deployments for PRs
- Comments PR with preview URL

### Environment Variables

**Required:**
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
BLOG_WRITER_API_URL
BLOG_WRITER_API_KEY
NEXT_PUBLIC_APP_URL
```

**Optional:**
```
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
CLOUDFLARE_API_TOKEN
```

---

## 📊 Key Metrics & Capabilities

### Content Generation
- **Quality Levels:** Standard, High, Premium, Enterprise
- **Template Types:** 8 types (expert_authority, how_to_guide, comparison, etc.)
- **Length Options:** Short, Medium, Long, Extended (500-3000+ words)
- **Quality Features:** 8 advanced features (Google Search, Fact-checking, Citations, etc.)
- **Model Support:** GPT-4o, Claude 3.5 Sonnet, GPT-4o-mini, Consensus (GPT-4o + Claude)

### Keyword Research
- **Analysis Depth:** Search volume, difficulty, competition, CPC
- **Enhanced Features:** Google Trends, Keyword Ideas, SERP AI Summary, Relevant Pages
- **Clustering:** Automatic topic clustering with parent topics
- **Storage:** Persistent keyword collections per workflow session

### Publishing
- **Platforms:** Webflow, WordPress, Shopify
- **Media:** Cloudinary, Cloudflare
- **Features:** OAuth flows, API key management, field mapping, sync status

### Multi-Tenancy
- **Isolation:** Complete data isolation per organization
- **Roles:** Owner, Admin, Editor, Writer
- **Quotas:** API usage tracking and limits per organization
- **Security:** RLS policies on all tables

---

## 🧪 Testing & Quality

### Code Quality
- TypeScript strict mode
- ESLint configuration
- Type checking in CI/CD
- Build verification

### Testing Strategy
- Integration tests for API routes
- Component testing (manual)
- E2E testing via preview deployments
- API health monitoring

---

## 📚 Documentation Files

**Implementation Plans:**
- `MULTI_TENANT_IMPLEMENTATION_PLAN.md` - Overall architecture
- `ENHANCED_ENDPOINTS_IMPLEMENTATION.md` - Enhanced API features
- `CUSTOM_INSTRUCTIONS_INTEGRATION.md` - Custom instructions guide
- `WEBFLOW_PUBLISHING_IMPLEMENTATION_PLAN.md` - Webflow integration
- `TIPTAP_INTEGRATION_PLAN.md` - Rich text editor plan

**API Documentation:**
- `API_INTEGRATION_SUMMARY.md` - API integration overview
- `SERVER_SIDE_API_RECOMMENDATIONS.md` - Best practices

**Feature Documentation:**
- `WORKFLOW_DATA_PERSISTENCE_SUMMARY.md` - Workflow system
- `CONTENT_GOAL_PROMPTS_IMPLEMENTATION.md` - Content goals

---

## 🎯 Current Status

### ✅ Completed Features
- Multi-tenant architecture with RLS
- AI blog generation with quality levels
- Keyword research and clustering
- Enhanced API endpoints (v1.3.0)
- Custom instructions and quality features
- Brand voice and content presets
- Draft management system
- Workflow management
- Webflow integration (OAuth)
- Cloudinary integration
- Internal link suggestions
- Image generation
- Content enhancement

### 🚧 In Progress
- TipTap rich text editor integration
- WordPress publishing
- Shopify publishing
- Advanced analytics

### 📋 Planned Features
- Real-time collaboration
- Content calendar
- Advanced SEO tools
- Batch processing
- Workflow approval system

---

## 🔧 Development Setup

### Prerequisites
- Node.js 18+
- npm 8+
- Supabase account
- GitHub account

### Quick Start
```bash
# Clone repository
git clone git@github.com:tindevelopers/tin-multi-tenant-blog-writer-v1.git
cd tin-multi-tenant-blog-writer-v1

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your credentials

# Run database migrations
# Execute supabase/schema.sql in Supabase SQL Editor

# Start development server
npm run dev
```

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler
```

---

## 📈 Performance Considerations

### Optimization Strategies
- Next.js 15 App Router for optimal performance
- Server-side rendering where appropriate
- Client-side caching for API responses
- Cloud Run health checking to prevent cold starts
- Image optimization via Cloudinary/Cloudflare
- Code splitting and lazy loading

### Scalability
- Multi-tenant architecture supports unlimited organizations
- RLS ensures efficient data isolation
- API quota management prevents abuse
- Database indexing on frequently queried fields

---

## 🤝 Contributing Guidelines

### Code Style
- TypeScript strict mode
- ESLint configuration
- Prettier formatting (via ESLint)
- Component-based architecture
- Custom hooks for reusable logic

### Git Workflow
- `main` - Production branch
- `staging` - Staging environment
- `develop` - Development branch
- Feature branches from `develop`

### Pull Request Process
1. Create feature branch from `develop`
2. Make changes with proper commits
3. Ensure tests pass
4. Create PR to `develop`
5. Code review
6. Merge to `develop`
7. Deploy to staging for testing
8. Merge to `main` for production

---

## 📞 Support & Resources

### Documentation
- `/docs` folder - Detailed guides
- Implementation plans in root directory
- README.md - Quick start guide

### Key Contacts
- Repository: `tindevelopers/tin-multi-tenant-blog-writer-v1`
- Issues: GitHub Issues
- Discussions: GitHub Discussions

---

## 🎓 Learning Resources

### For New Developers
1. Start with `README.md` for setup
2. Review `MULTI_TENANT_IMPLEMENTATION_PLAN.md` for architecture
3. Explore `src/app/admin/workflow/` for workflow understanding
4. Check `src/lib/blog-writer-api.ts` for API integration patterns
5. Review `supabase/schema.sql` for database structure

### Key Concepts to Understand
- Multi-tenancy with RLS
- Next.js 15 App Router
- Supabase Auth and Database
- API proxy pattern
- Workflow session management
- Keyword clustering algorithms

---

**Last Updated:** January 16, 2025  
**Maintained By:** TIN Developers Team  
**License:** MIT

