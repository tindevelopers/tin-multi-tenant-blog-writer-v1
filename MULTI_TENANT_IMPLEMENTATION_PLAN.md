# Multi-Tenant Blog Writer System - Implementation Plan

## 🎯 Project Overview

Building a multi-tenant blog writing system using:
- **Frontend/Backend**: Next.js 15 with TypeScript
- **Database**: Supabase with Row Level Security (RLS)
- **AI Content Generation**: Blog Writer API (https://blog-writer-api-dev-613248238610.europe-west1.run.app/)
- **Multi-tenancy**: Organization-based with RLS policies

## 📊 API Capabilities

### Core Endpoints
- `/api/v1/blog/generate` - AI-powered blog content generation
- `/api/v1/analyze` - Content quality and SEO analysis
- `/api/v1/keywords` - Keyword research and suggestions
- `/api/v1/batch` - Bulk operations for content processing
- `/api/v1/metrics` - Usage tracking and performance metrics

### Publishing Integrations
- `/api/v1/publish/webflow` - Webflow CMS integration
- `/api/v1/publish/shopify` - Shopify blog integration
- `/api/v1/publish/wordpress` - WordPress publishing

### Media Management
- `/api/v1/media/upload/cloudinary` - Cloudinary media storage
- `/api/v1/media/upload/cloudflare` - Cloudflare media storage

## 🏗️ Architecture Overview

### Multi-Tenancy Strategy

**Core Principle**: Every data table includes `org_id` column with RLS policies ensuring data isolation.

#### Database Schema (Supabase)

```sql
-- Organizations Table
CREATE TABLE organizations (
  org_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  subscription_tier TEXT NOT NULL DEFAULT 'free',
  api_quota_monthly INTEGER NOT NULL DEFAULT 10000,
  api_quota_used INTEGER NOT NULL DEFAULT 0,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users Table
CREATE TABLE users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  org_id UUID REFERENCES organizations(org_id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'writer', -- owner, admin, editor, writer
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blog Posts Table
CREATE TABLE blog_posts (
  post_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(org_id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(user_id),
  title TEXT NOT NULL,
  content TEXT,
  excerpt TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, published, scheduled, archived
  seo_data JSONB DEFAULT '{}',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content Templates Table
CREATE TABLE content_templates (
  template_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(org_id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(user_id),
  name TEXT NOT NULL,
  description TEXT,
  template_content JSONB NOT NULL,
  category TEXT,
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Usage Logs Table
CREATE TABLE api_usage_logs (
  log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(org_id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(user_id),
  endpoint TEXT NOT NULL,
  tokens_consumed INTEGER NOT NULL DEFAULT 0,
  cost_cents INTEGER NOT NULL DEFAULT 0,
  request_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media Assets Table
CREATE TABLE media_assets (
  asset_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(org_id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users(user_id),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  provider TEXT NOT NULL, -- cloudinary, cloudflare
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### RLS Policies

```sql
-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;

-- Organizations: Users can only see their own organization
CREATE POLICY "Users can view own organization"
  ON organizations FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM users WHERE user_id = auth.uid()
  ));

-- Users: Can view users in same organization
CREATE POLICY "Users can view org members"
  ON users FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM users WHERE user_id = auth.uid()
  ));

-- Blog Posts: Full CRUD based on org membership and role
CREATE POLICY "Users can view org posts"
  ON blog_posts FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create posts"
  ON blog_posts FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update own posts or admins can update all"
  ON blog_posts FOR UPDATE
  USING (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'editor')
      )
    )
  );
```

### API Integration Layer

**Next.js API Routes Pattern** (`/app/api/blog-writer/*`)

```
/api/blog-writer/
  ├── generate/route.ts         # Proxy to /api/v1/blog/generate
  ├── analyze/route.ts          # Proxy to /api/v1/analyze
  ├── keywords/route.ts         # Proxy to /api/v1/keywords
  ├── batch/route.ts            # Proxy to /api/v1/batch
  ├── metrics/route.ts          # Proxy to /api/v1/metrics
  └── publish/
      ├── webflow/route.ts
      ├── shopify/route.ts
      └── wordpress/route.ts
```

**Security Pattern for All API Routes:**
1. Validate Supabase JWT token
2. Extract user_id and org_id
3. Check API quota for organization
4. Make request to Blog Writer API
5. Log usage to api_usage_logs
6. Update org quota usage
7. Return response

---

## 📋 Phase 1: Foundation (Week 1-2)

### Goals
- Set up multi-tenant database architecture
- Implement authentication and authorization
- Create organization management system

### Tasks

#### 1.1 Supabase Setup
- [ ] Create Supabase project
- [ ] Set up database schema (organizations, users, blog_posts, etc.)
- [ ] Implement RLS policies for all tables
- [ ] Configure Supabase Auth (email/password, OAuth providers)
- [ ] Set up database functions for common operations

#### 1.2 Environment Configuration
- [ ] Add Supabase credentials to `.env.local`
- [ ] Add Blog Writer API key to `.env.local`
- [ ] Configure Supabase client for Next.js
- [ ] Set up environment variables for all integrations

#### 1.3 Authentication System
- [ ] Create auth pages (login, signup, forgot password)
- [ ] Implement Supabase Auth integration
- [ ] Add session management with middleware
- [ ] Create protected route HOC/middleware
- [ ] Add JWT validation utilities

#### 1.4 Organization Management
- [ ] Create organization onboarding flow
- [ ] Build organization settings page
- [ ] Implement org switching (for users in multiple orgs)
- [ ] Add organization invitation system
- [ ] Create role management interface

#### 1.5 User Management
- [ ] Build team members page
- [ ] Implement role-based permissions (owner, admin, editor, writer)
- [ ] Create user invitation flow
- [ ] Add user profile management
- [ ] Build permissions matrix

### Deliverables
- ✅ Working authentication system
- ✅ Multi-tenant database with RLS
- ✅ Organization and user management UI
- ✅ Role-based access control

### Success Metrics
- Users can sign up and create organizations
- Multiple users can join same organization
- Data isolation verified (users cannot see other orgs' data)
- Roles properly restrict access

---

## 📋 Phase 2: Core Content Features (Week 3-4)

### Goals
- Integrate AI content generation
- Build draft management system
- Implement content templates

### Tasks

#### 2.1 API Integration Layer
- [ ] Create Next.js API route: `/api/blog-writer/generate`
- [ ] Implement authentication middleware for API routes
- [ ] Add org_id extraction from JWT
- [ ] Build API usage tracking system
- [ ] Implement quota validation before API calls

#### 2.2 Content Generation
- [ ] Create blog post generation UI
- [ ] Add form for generation parameters (topic, tone, length, etc.)
- [ ] Implement real-time generation progress
- [ ] Add preview before saving
- [ ] Build regenerate/edit functionality
- [ ] Add generation history per post

#### 2.3 Draft Management
- [ ] Build drafts listing page (`/admin/drafts`)
- [ ] Implement auto-save functionality
- [ ] Create rich text editor integration
- [ ] Add draft versioning
- [ ] Build trash/archive system
- [ ] Implement draft search and filtering

#### 2.4 Content Templates
- [ ] Create templates page (`/admin/templates`)
- [ ] Build template creation interface
- [ ] Implement template categories
- [ ] Add template preview
- [ ] Create template-based generation
- [ ] Build shared templates (org-wide)

#### 2.5 Content Editor Enhancement
- [ ] Integrate modern rich text editor (TipTap/Lexical)
- [ ] Add markdown support
- [ ] Implement image upload and embedding
- [ ] Add formatting toolbar
- [ ] Build code block support
- [ ] Add AI-assisted editing features

### Deliverables
- ✅ Working content generation with Blog Writer API
- ✅ Complete draft management system
- ✅ Reusable content templates
- ✅ Auto-save and version control

### Success Metrics
- Users can generate blog posts via API
- Drafts auto-save every 30 seconds
- Templates speed up content creation
- API usage tracked per organization

---

## 📋 Phase 3: Advanced Features (Week 5-6)

### Goals
- SEO optimization tools
- Keyword research integration
- Batch processing capabilities

### Tasks

#### 3.1 SEO Tools Integration
- [ ] Create API route: `/api/blog-writer/analyze`
- [ ] Build SEO analysis page (`/admin/seo`)
- [ ] Implement content scoring system
- [ ] Add readability analysis
- [ ] Create keyword density checker
- [ ] Build meta description generator
- [ ] Add internal linking suggestions

#### 3.2 Keyword Research
- [ ] Create API route: `/api/blog-writer/keywords`
- [ ] Build keyword research interface
- [ ] Implement keyword difficulty scoring
- [ ] Add search volume data
- [ ] Create keyword grouping feature
- [ ] Build keyword tracking per post

#### 3.3 Batch Processing
- [ ] Create API route: `/api/blog-writer/batch`
- [ ] Build bulk generation interface
- [ ] Implement queue management system
- [ ] Add progress tracking dashboard
- [ ] Create batch results review page
- [ ] Build retry mechanism for failed items

#### 3.4 Media Library
- [ ] Create media page (`/admin/media`)
- [ ] Integrate Cloudinary API route
- [ ] Integrate Cloudflare API route
- [ ] Build drag-and-drop upload
- [ ] Implement media browser/selector
- [ ] Add image optimization options
- [ ] Create media organization (folders/tags)

#### 3.5 Content Calendar
- [ ] Build calendar view page (`/admin/calendar`)
- [ ] Implement drag-and-drop scheduling
- [ ] Add recurring post support
- [ ] Create calendar filters (status, author, etc.)
- [ ] Build monthly/weekly/daily views
- [ ] Add calendar export (iCal)

### Deliverables
- ✅ SEO optimization tools
- ✅ Keyword research capabilities
- ✅ Batch content processing
- ✅ Complete media library
- ✅ Content calendar with scheduling

### Success Metrics
- SEO scores improve content quality
- Keyword research integrated into workflow
- Batch processing handles 50+ posts
- Media library manages all assets
- Calendar reduces scheduling errors

---

## 📋 Phase 4: Publishing & Workflows (Week 7-8)

### Goals
- Platform publishing integrations
- Workflow approval system
- Team collaboration features

### Tasks

#### 4.1 Publishing Integrations
- [ ] Create publishing page (`/admin/publishing`)
- [ ] Implement Webflow integration
  - [ ] OAuth connection flow
  - [ ] Site/collection selection
  - [ ] Field mapping interface
  - [ ] Publish API route
- [ ] Implement Shopify integration
  - [ ] OAuth connection flow
  - [ ] Blog selection
  - [ ] Publish API route
- [ ] Implement WordPress integration
  - [ ] API key connection
  - [ ] Category mapping
  - [ ] Publish API route
- [ ] Build publish history/logs
- [ ] Add scheduled publishing
- [ ] Create republish/update functionality

#### 4.2 Workflow System
- [ ] Create workflows page (`/admin/workflows`)
- [ ] Design workflow builder interface
- [ ] Implement approval chains
- [ ] Add workflow status tracking
- [ ] Build notification system
- [ ] Create workflow templates
- [ ] Add conditional workflow branches

#### 4.3 Team Collaboration
- [ ] Build real-time commenting system
- [ ] Add @mentions functionality
- [ ] Implement task assignments
- [ ] Create activity feed
- [ ] Build notification preferences
- [ ] Add email notifications
- [ ] Implement content locking (when editing)

#### 4.4 Review & Approval
- [ ] Create review request system
- [ ] Build approval interface
- [ ] Add revision comparison
- [ ] Implement feedback threads
- [ ] Create approval history
- [ ] Add bulk approval capabilities

### Deliverables
- ✅ Multi-platform publishing
- ✅ Custom workflow system
- ✅ Team collaboration tools
- ✅ Review and approval process

### Success Metrics
- Successfully publish to all 3 platforms
- Workflows reduce approval time by 50%
- Team collaboration in real-time
- Zero publishing errors

---

## 📋 Phase 5: Analytics & Optimization (Week 9-10)

### Goals
- Usage analytics and dashboards
- API metrics integration
- Performance optimization
- Billing and subscription management

### Tasks

#### 5.1 Analytics Dashboard
- [ ] Create analytics page (`/admin/analytics`)
- [ ] Integrate `/api/v1/metrics` endpoint
- [ ] Build organization-level metrics
- [ ] Add user activity tracking
- [ ] Create content performance charts
- [ ] Implement API usage visualization
- [ ] Add export capabilities (CSV, PDF)

#### 5.2 Usage Tracking
- [ ] Build quota management system
- [ ] Create usage alerts (80%, 90%, 100%)
- [ ] Implement quota reset (monthly/yearly)
- [ ] Add usage forecasting
- [ ] Create usage reports for admins
- [ ] Build overage handling

#### 5.3 Performance Optimization
- [ ] Implement caching strategy (Redis/Vercel KV)
- [ ] Add request deduplication
- [ ] Optimize database queries
- [ ] Implement pagination for all lists
- [ ] Add lazy loading for media
- [ ] Optimize bundle size
- [ ] Set up CDN for static assets

#### 5.4 Subscription Management
- [ ] Create subscription plans
- [ ] Integrate Stripe (or payment provider)
- [ ] Build subscription upgrade/downgrade flow
- [ ] Implement feature gating per tier
- [ ] Add billing history
- [ ] Create invoice generation
- [ ] Build payment method management

#### 5.5 Monitoring & Logging
- [ ] Set up error tracking (Sentry)
- [ ] Implement application logging
- [ ] Add API endpoint monitoring
- [ ] Create uptime monitoring
- [ ] Build admin notification system
- [ ] Add audit logs for sensitive actions

### Deliverables
- ✅ Comprehensive analytics dashboard
- ✅ Quota management and billing
- ✅ Performance optimizations
- ✅ Monitoring and alerting

### Success Metrics
- Dashboard loads in <2 seconds
- API usage tracked accurately
- Billing automated and accurate
- 99.9% uptime achieved

---

## 🔒 Security Checklist

### Authentication & Authorization
- [ ] JWT validation on all API routes
- [ ] Secure session management
- [ ] Rate limiting per user/org
- [ ] CSRF protection
- [ ] XSS prevention
- [ ] SQL injection prevention (via Supabase)

### Data Protection
- [ ] RLS policies tested thoroughly
- [ ] No sensitive data in client-side code
- [ ] API keys stored in environment variables only
- [ ] Encryption at rest (Supabase default)
- [ ] Encryption in transit (HTTPS)

### API Security
- [ ] Blog Writer API key never exposed to client
- [ ] All external API calls through backend proxy
- [ ] Input validation on all API routes
- [ ] Output sanitization
- [ ] Request size limits

### Compliance
- [ ] GDPR compliance (data export/deletion)
- [ ] Privacy policy
- [ ] Terms of service
- [ ] Cookie consent
- [ ] Data retention policies

---

## 🧪 Testing Strategy

### Unit Tests
- [ ] Database functions
- [ ] RLS policies
- [ ] API route handlers
- [ ] Utility functions
- [ ] React components

### Integration Tests
- [ ] Authentication flow
- [ ] Content generation workflow
- [ ] Publishing workflows
- [ ] Payment processing
- [ ] Multi-tenant isolation

### E2E Tests (Playwright/Cypress)
- [ ] User signup and onboarding
- [ ] Content creation and publishing
- [ ] Team collaboration features
- [ ] Subscription management
- [ ] Cross-browser testing

### Performance Tests
- [ ] Load testing (1000+ concurrent users)
- [ ] Database query performance
- [ ] API response times
- [ ] Page load times
- [ ] Batch processing limits

---

## 🚀 Deployment Strategy

### Infrastructure
- **Frontend/Backend**: Vercel (Next.js optimized)
- **Database**: Supabase (managed PostgreSQL)
- **Media Storage**: Cloudinary/Cloudflare
- **Caching**: Vercel KV (Redis)
- **Monitoring**: Vercel Analytics + Sentry

### Environments
1. **Development**: Local + Dev Supabase
2. **Staging**: Vercel Preview + Staging Supabase
3. **Production**: Vercel Production + Production Supabase

### CI/CD Pipeline
- [ ] GitHub Actions for tests
- [ ] Automated deployment to staging
- [ ] Manual approval for production
- [ ] Database migration strategy
- [ ] Rollback procedures

### Monitoring
- [ ] Application performance monitoring
- [ ] Error tracking and alerting
- [ ] API usage monitoring
- [ ] Database performance metrics
- [ ] User analytics

---

## 📊 Success Criteria

### Technical Metrics
- Page load time: <2 seconds
- API response time: <500ms (95th percentile)
- Uptime: 99.9%
- Test coverage: >80%
- Zero data leakage between tenants

### Business Metrics
- User onboarding completion: >80%
- Content generation success rate: >95%
- Publishing success rate: >98%
- User retention (30-day): >60%
- NPS Score: >40

### User Experience
- Time to first blog post: <10 minutes
- Team invitation acceptance: >70%
- Feature adoption rate: >50%
- Support ticket volume: <5% of users

---

## 🎯 Key Risks & Mitigations

### Technical Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| RLS policy errors leading to data leakage | Critical | Extensive testing, security audits |
| Blog Writer API rate limits | High | Implement caching, queue system |
| Supabase scaling limitations | Medium | Monitor usage, plan for migration |
| Third-party API changes | Medium | Version pinning, adapter pattern |

### Business Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| High API costs per user | High | Implement quota limits, pricing strategy |
| Low user adoption | High | Beta testing, iterative feedback |
| Competitor features | Medium | Rapid feature development, unique value prop |
| Regulatory compliance | High | Legal review, compliance framework |

---

## 📚 Documentation Requirements

- [ ] Technical architecture documentation
- [ ] API integration guide
- [ ] Database schema documentation
- [ ] Deployment runbook
- [ ] User onboarding guide
- [ ] Admin documentation
- [ ] Troubleshooting guide
- [ ] Security policies
- [ ] Privacy policy
- [ ] Terms of service

---

## 🎓 Team Skills Required

### Development
- Next.js 15 / React 19
- TypeScript
- Supabase / PostgreSQL
- REST API integration
- Authentication & Authorization

### DevOps
- Vercel deployment
- Database migrations
- CI/CD pipelines
- Monitoring & alerting

### Design
- UI/UX design
- Component design systems
- Responsive design
- Accessibility (WCAG 2.1)

---

## 📅 Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Phase 1: Foundation | 2 weeks | Auth, multi-tenancy, org management |
| Phase 2: Core Content | 2 weeks | Content generation, drafts, templates |
| Phase 3: Advanced Features | 2 weeks | SEO, keywords, batch, media, calendar |
| Phase 4: Publishing | 2 weeks | Platform integrations, workflows, collaboration |
| Phase 5: Analytics | 2 weeks | Dashboard, billing, optimization |
| **Total** | **10 weeks** | **Full production-ready system** |

---

## 🔄 Post-Launch Roadmap

### Short-term (Months 1-3)
- User feedback incorporation
- Bug fixes and optimizations
- Additional platform integrations
- Mobile app development

### Medium-term (Months 4-6)
- AI content improvement features
- Advanced analytics and reporting
- White-label capabilities
- API for third-party integrations

### Long-term (Months 7-12)
- Multi-language support
- Advanced workflow automation
- Machine learning content suggestions
- Enterprise features (SSO, advanced security)

---

## 📞 Next Steps

1. **Review this document** with the team
2. **Set up Supabase project** and obtain credentials
3. **Access Blog Writer API documentation** at `/docs` endpoint
4. **Create detailed Figma designs** for core features
5. **Set up development environment** for all team members
6. **Begin Phase 1 implementation** with sprint planning

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-11  
**Status**: Planning  
**Owner**: Development Team

