# Blog Generation Queue Dashboard - Comprehensive Implementation Plan

## 🎯 Overview

This document outlines the implementation of a comprehensive blog generation queue dashboard that combines:
- **Queue Management**: Track all blog generation requests
- **Status Tracking**: Monitor progress through entire lifecycle
- **Approval Workflow**: Writer → Manager → Publish
- **Multi-Platform Publishing**: Track status per platform (Webflow, WordPress, Shopify)
- **Real-time Updates**: Live status updates and notifications

## 📊 System Architecture

### Status Lifecycle

```
┌─────────────┐
│  QUEUED     │ → Blog submitted for generation
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ GENERATING  │ → AI is creating content (with progress updates)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  GENERATED  │ → Content ready for review
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  IN_REVIEW  │ → Waiting for manager approval
└──────┬──────┘
       │
       ├─→ APPROVED → Ready to publish
       │
       └─→ REJECTED → Needs revision → Back to GENERATED
       │
       ▼
┌─────────────┐
│  SCHEDULED  │ → Scheduled for future publish date
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ PUBLISHING  │ → Currently publishing to platforms
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  PUBLISHED  │ → Successfully published
└─────────────┘
```

### Platform Publishing Status (per blog)

Each blog can have independent status per platform:

```
Blog #123
├─ Webflow: ✅ PUBLISHED (2024-01-15 10:30)
├─ WordPress: ⏳ SCHEDULED (2024-01-16 09:00)
└─ Shopify: ❌ FAILED (Error: API timeout)
```

---

## 🗄️ Database Schema

### 1. Blog Generation Queue Table

```sql
-- Blog Generation Queue
CREATE TABLE IF NOT EXISTS blog_generation_queue (
  queue_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(org_id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES blog_posts(post_id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(user_id) NOT NULL,
  
  -- Generation Request Details
  topic TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  target_audience TEXT,
  tone TEXT,
  word_count INTEGER,
  quality_level TEXT,
  custom_instructions TEXT,
  template_type TEXT,
  
  -- Status Tracking
  status TEXT NOT NULL DEFAULT 'queued', 
  -- queued, generating, generated, in_review, approved, rejected, scheduled, publishing, published, failed
  
  -- Progress Tracking
  progress_percentage INTEGER DEFAULT 0,
  current_stage TEXT,
  progress_updates JSONB DEFAULT '[]',
  
  -- Generation Results
  generated_content TEXT,
  generated_title TEXT,
  generation_metadata JSONB DEFAULT '{}',
  generation_error TEXT,
  
  -- Timing
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  generation_started_at TIMESTAMPTZ,
  generation_completed_at TIMESTAMPTZ,
  estimated_completion_at TIMESTAMPTZ,
  
  -- Priority
  priority INTEGER DEFAULT 5, -- 1 (highest) to 10 (lowest)
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_blog_queue_org_id ON blog_generation_queue(org_id);
CREATE INDEX IF NOT EXISTS idx_blog_queue_status ON blog_generation_queue(status);
CREATE INDEX IF NOT EXISTS idx_blog_queue_created_by ON blog_generation_queue(created_by);
CREATE INDEX IF NOT EXISTS idx_blog_queue_priority ON blog_generation_queue(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_blog_queue_post_id ON blog_generation_queue(post_id);
```

### 2. Blog Approval Workflow Table

```sql
-- Blog Approval Workflow
CREATE TABLE IF NOT EXISTS blog_approvals (
  approval_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  queue_id UUID REFERENCES blog_generation_queue(queue_id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES blog_posts(post_id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(org_id) ON DELETE CASCADE NOT NULL,
  
  -- Approval Details
  status TEXT NOT NULL DEFAULT 'pending',
  -- pending, approved, rejected, changes_requested
  
  -- Request Details
  requested_by UUID REFERENCES users(user_id) NOT NULL, -- Writer who requested
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Review Details
  reviewed_by UUID REFERENCES users(user_id), -- Manager who reviewed
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  rejection_reason TEXT,
  
  -- Revision Tracking
  revision_number INTEGER DEFAULT 1,
  previous_approval_id UUID REFERENCES blog_approvals(approval_id),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_blog_approvals_queue_id ON blog_approvals(queue_id);
CREATE INDEX IF NOT EXISTS idx_blog_approvals_post_id ON blog_approvals(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_approvals_status ON blog_approvals(status);
CREATE INDEX IF NOT EXISTS idx_blog_approvals_requested_by ON blog_approvals(requested_by);
CREATE INDEX IF NOT EXISTS idx_blog_approvals_reviewed_by ON blog_approvals(reviewed_by);
```

### 3. Platform Publishing Status Table

```sql
-- Platform Publishing Status
CREATE TABLE IF NOT EXISTS blog_platform_publishing (
  publishing_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES blog_posts(post_id) ON DELETE CASCADE NOT NULL,
  queue_id UUID REFERENCES blog_generation_queue(queue_id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(org_id) ON DELETE CASCADE NOT NULL,
  
  -- Platform Details
  platform TEXT NOT NULL, -- webflow, wordpress, shopify
  platform_post_id TEXT, -- External platform's post ID
  platform_url TEXT, -- Published URL on platform
  
  -- Publishing Status
  status TEXT NOT NULL DEFAULT 'pending',
  -- pending, scheduled, publishing, published, failed, unpublished
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  
  -- Publishing Details
  published_by UUID REFERENCES users(user_id),
  publish_metadata JSONB DEFAULT '{}',
  
  -- Error Handling
  error_message TEXT,
  error_code TEXT,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  
  -- Sync Status
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT, -- in_sync, out_of_sync, never_synced
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one publishing record per post+platform
  UNIQUE(post_id, platform)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_blog_publishing_post_id ON blog_platform_publishing(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_publishing_queue_id ON blog_platform_publishing(queue_id);
CREATE INDEX IF NOT EXISTS idx_blog_publishing_platform ON blog_platform_publishing(platform);
CREATE INDEX IF NOT EXISTS idx_blog_publishing_status ON blog_platform_publishing(status);
CREATE INDEX IF NOT EXISTS idx_blog_publishing_scheduled_at ON blog_platform_publishing(scheduled_at);
```

### 4. Update Blog Posts Table

```sql
-- Add new status values to blog_posts
ALTER TABLE blog_posts 
  ALTER COLUMN status TYPE TEXT;

-- Update status constraint (if using CHECK constraint)
-- Status values: draft, queued, generating, generated, in_review, approved, rejected, scheduled, publishing, published, archived, failed
```

### 5. RLS Policies

```sql
-- Enable RLS
ALTER TABLE blog_generation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_platform_publishing ENABLE ROW LEVEL SECURITY;

-- Blog Generation Queue Policies
CREATE POLICY "Users can view org queue items"
  ON blog_generation_queue FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create queue items"
  ON blog_generation_queue FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update own queue items or managers can update all"
  ON blog_generation_queue FOR UPDATE
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

-- Blog Approvals Policies
CREATE POLICY "Users can view org approvals"
  ON blog_approvals FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Writers can request approval"
  ON blog_approvals FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    AND requested_by = auth.uid()
  );

CREATE POLICY "Managers can review approvals"
  ON blog_approvals FOR UPDATE
  USING (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'editor')
    )
  );

-- Platform Publishing Policies
CREATE POLICY "Users can view org publishing status"
  ON blog_platform_publishing FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Managers can publish"
  ON blog_platform_publishing FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'editor')
    )
  );

CREATE POLICY "Managers can update publishing status"
  ON blog_platform_publishing FOR UPDATE
  USING (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'editor')
    )
  );
```

---

## 🔌 Backend API Routes

### 1. Queue Management API

**File:** `src/app/api/blog-queue/route.ts`

```typescript
// GET /api/blog-queue - List all queue items
// POST /api/blog-queue - Submit blog for generation
// PATCH /api/blog-queue/[id] - Update queue item
// DELETE /api/blog-queue/[id] - Cancel queue item
```

**Endpoints:**
- `GET /api/blog-queue` - Get queue with filters (status, priority, date range)
- `POST /api/blog-queue` - Submit new blog for generation
- `GET /api/blog-queue/[id]` - Get specific queue item with details
- `PATCH /api/blog-queue/[id]` - Update queue item (status, priority, etc.)
- `DELETE /api/blog-queue/[id]` - Cancel/remove queue item
- `POST /api/blog-queue/[id]/retry` - Retry failed generation

### 2. Approval Workflow API

**File:** `src/app/api/blog-approvals/route.ts`

```typescript
// GET /api/blog-approvals - List pending approvals
// POST /api/blog-approvals - Request approval
// PATCH /api/blog-approvals/[id] - Approve/reject
```

**Endpoints:**
- `GET /api/blog-approvals` - Get approvals (filter by status, reviewer)
- `POST /api/blog-approvals` - Request approval for a blog
- `GET /api/blog-approvals/[id]` - Get approval details
- `PATCH /api/blog-approvals/[id]/approve` - Approve blog
- `PATCH /api/blog-approvals/[id]/reject` - Reject blog with reason
- `PATCH /api/blog-approvals/[id]/request-changes` - Request changes

### 3. Platform Publishing API

**File:** `src/app/api/blog-publishing/route.ts`

```typescript
// GET /api/blog-publishing/[post_id] - Get publishing status
// POST /api/blog-publishing/[post_id]/publish - Publish to platform(s)
// POST /api/blog-publishing/[post_id]/schedule - Schedule publishing
```

**Endpoints:**
- `GET /api/blog-publishing/[post_id]` - Get publishing status for all platforms
- `POST /api/blog-publishing/[post_id]/publish` - Publish to selected platforms
- `POST /api/blog-publishing/[post_id]/schedule` - Schedule publishing
- `POST /api/blog-publishing/[post_id]/unpublish` - Unpublish from platform
- `GET /api/blog-publishing/[post_id]/platforms/[platform]` - Get specific platform status
- `POST /api/blog-publishing/[post_id]/platforms/[platform]/retry` - Retry failed publish

### 4. Status Updates API (WebSocket/SSE)

**File:** `src/app/api/blog-queue/[id]/status/route.ts`

```typescript
// GET /api/blog-queue/[id]/status - Server-Sent Events for real-time updates
```

**Implementation:**
- Use Server-Sent Events (SSE) for real-time progress updates
- Stream progress updates from generation process
- Notify on status changes (queued → generating → generated)

---

## 🎨 Frontend Components

### 1. Queue Dashboard Page

**File:** `src/app/admin/blog-queue/page.tsx`

**Features:**
- List view of all queue items
- Filter by status, priority, date range
- Sort by priority, date, status
- Real-time status updates
- Bulk actions (cancel, retry, prioritize)
- Progress indicators for generating items

**UI Components:**
- `QueueTable` - Main table component
- `QueueFilters` - Filter sidebar
- `QueueItemRow` - Individual queue item row
- `ProgressIndicator` - Progress bar with stage info
- `StatusBadge` - Status badge with color coding
- `PrioritySelector` - Priority dropdown

### 2. Queue Item Detail Modal/Page

**File:** `src/app/admin/blog-queue/[id]/page.tsx`

**Features:**
- Full details of queue item
- Progress timeline
- Generation parameters
- Generated content preview
- Error details (if failed)
- Actions (retry, cancel, edit, approve)

### 3. Approval Dashboard

**File:** `src/app/admin/approvals/page.tsx`

**Features:**
- List of pending approvals
- Filter by status, requester, date
- Quick approve/reject actions
- Review interface with content preview
- Revision history
- Comments/notes

**UI Components:**
- `ApprovalList` - List of approvals
- `ApprovalCard` - Individual approval card
- `ReviewInterface` - Review and approve/reject UI
- `RevisionHistory` - Show revision timeline

### 4. Publishing Dashboard

**File:** `src/app/admin/publishing/page.tsx`

**Features:**
- List of blogs ready to publish
- Platform status indicators
- Bulk publish actions
- Schedule publishing
- Publishing history
- Platform-specific settings

**UI Components:**
- `PublishingTable` - Table with platform columns
- `PlatformStatusBadge` - Status per platform
- `PublishButton` - Publish to selected platforms
- `ScheduleModal` - Schedule publishing date/time
- `PlatformSelector` - Select platforms to publish

### 5. Combined Dashboard (Main View)

**File:** `src/app/admin/blog-dashboard/page.tsx`

**Features:**
- Overview cards (queued, generating, pending approval, published)
- Recent activity feed
- Quick actions
- Status distribution chart
- Platform publishing summary

**UI Components:**
- `DashboardOverview` - Stats cards
- `ActivityFeed` - Recent activity timeline
- `StatusChart` - Visual status distribution
- `QuickActions` - Common action buttons

---

## 🔄 Status State Machine

### Implementation

**File:** `src/lib/blog-queue-state-machine.ts`

```typescript
export type QueueStatus = 
  | 'queued'
  | 'generating'
  | 'generated'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'cancelled';

export type PlatformStatus =
  | 'pending'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'unpublished';

export type ApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'changes_requested';

// State transitions
const VALID_TRANSITIONS: Record<QueueStatus, QueueStatus[]> = {
  queued: ['generating', 'cancelled'],
  generating: ['generated', 'failed', 'cancelled'],
  generated: ['in_review', 'scheduled', 'cancelled'],
  in_review: ['approved', 'rejected', 'cancelled'],
  approved: ['scheduled', 'publishing', 'cancelled'],
  rejected: ['generated', 'cancelled'],
  scheduled: ['publishing', 'cancelled'],
  publishing: ['published', 'failed'],
  published: ['unpublished'],
  failed: ['queued', 'generating', 'cancelled'],
  cancelled: []
};

export function canTransition(
  currentStatus: QueueStatus,
  newStatus: QueueStatus
): boolean {
  return VALID_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}
```

---

## 🔔 Notification System

### Notification Types

1. **Generation Started** - Notify when generation begins
2. **Generation Complete** - Notify when content is ready
3. **Approval Requested** - Notify managers of pending approval
4. **Approval Decision** - Notify writer of approval/rejection
5. **Publishing Started** - Notify when publishing begins
6. **Publishing Complete** - Notify when published successfully
7. **Publishing Failed** - Notify of publishing errors

### Implementation

**File:** `src/lib/notifications.ts`

- In-app notifications (toast/alert)
- Email notifications (optional)
- Real-time updates via SSE/WebSocket
- Notification preferences per user

---

## 📱 UI/UX Design

### Dashboard Layout

```
┌─────────────────────────────────────────────────────────┐
│  Blog Queue Dashboard                                    │
├─────────────────────────────────────────────────────────┤
│  [Filters] [Search] [New Blog] [Bulk Actions]           │
├─────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Queued   │ │Generating│ │In Review │ │Published │  │
│  │    12    │ │    3     │ │    5     │ │   45     │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
├─────────────────────────────────────────────────────────┤
│  Blog Title        │ Status │ Progress │ Platforms │  │
│  ────────────────────────────────────────────────────  │
│  Best Pet Grooming│Generating│ ████░░  │ W: ⏳ WP:✅│  │
│  Services          │         │ 67%     │ S: ❌      │  │
│  ────────────────────────────────────────────────────  │
│  Notary Services   │In Review│ 100%    │ W: ⏸️ WP:⏸️│  │
│  in California     │         │         │ S: ⏸️      │  │
│  ────────────────────────────────────────────────────  │
└─────────────────────────────────────────────────────────┘
```

### Status Color Coding

- **Queued**: Gray (`#9CA3AF`)
- **Generating**: Blue (`#3B82F6`) with animated progress
- **Generated**: Green (`#10B981`)
- **In Review**: Yellow (`#F59E0B`)
- **Approved**: Green (`#10B981`)
- **Rejected**: Red (`#EF4444`)
- **Scheduled**: Purple (`#8B5CF6`)
- **Publishing**: Blue (`#3B82F6`)
- **Published**: Green (`#10B981`)
- **Failed**: Red (`#EF4444`)

### Platform Icons

- **Webflow**: `🌐` or custom icon
- **WordPress**: `📝` or custom icon
- **Shopify**: `🛒` or custom icon

---

## 🚀 Implementation Phases

### Phase 1: Database & Backend Foundation (Week 1)

- [ ] Create database tables (queue, approvals, publishing)
- [ ] Set up RLS policies
- [ ] Create API routes for queue management
- [ ] Implement status state machine
- [ ] Add progress tracking to generation API

### Phase 2: Basic Queue Dashboard (Week 2)

- [ ] Create queue dashboard page
- [ ] Implement queue table with filters
- [ ] Add real-time status updates (SSE)
- [ ] Create queue item detail view
- [ ] Add progress indicators

### Phase 3: Approval Workflow (Week 3)

- [ ] Create approval API routes
- [ ] Build approval dashboard
- [ ] Implement review interface
- [ ] Add revision tracking
- [ ] Set up approval notifications

### Phase 4: Publishing Integration (Week 4)

- [ ] Create publishing status tracking
- [ ] Build publishing dashboard
- [ ] Integrate with platform APIs (Webflow, WordPress, Shopify)
- [ ] Add scheduling functionality
- [ ] Implement retry logic for failed publishes

### Phase 5: Advanced Features (Week 5)

- [ ] Add bulk operations
- [ ] Implement priority system
- [ ] Create analytics/reporting
- [ ] Add export functionality
- [ ] Optimize performance (pagination, caching)

---

## 📋 API Integration Points

### 1. Blog Generation API

**Modify:** `src/app/api/blog-writer/generate/route.ts`

**Changes:**
- Create queue entry before generation
- Update queue status during generation
- Stream progress updates to queue
- Update queue on completion/failure

### 2. Platform Publishing APIs

**Create:**
- `src/app/api/publish/webflow/route.ts`
- `src/app/api/publish/wordpress/route.ts`
- `src/app/api/publish/shopify/route.ts`

**Each should:**
- Accept post_id and platform config
- Publish to platform
- Update `blog_platform_publishing` table
- Handle errors and retries

---

## 🔍 Key Features Summary

### Queue Management
✅ Submit blogs for generation  
✅ Track generation progress in real-time  
✅ View queue with filters and sorting  
✅ Cancel/retry failed generations  
✅ Priority management  

### Approval Workflow
✅ Request approval from managers  
✅ Review interface with content preview  
✅ Approve/reject with notes  
✅ Revision tracking  
✅ Notification system  

### Multi-Platform Publishing
✅ Track status per platform  
✅ Bulk publish to multiple platforms  
✅ Schedule publishing  
✅ Retry failed publishes  
✅ View publishing history  

### Dashboard Features
✅ Overview statistics  
✅ Real-time updates  
✅ Activity feed  
✅ Quick actions  
✅ Status visualization  

---

## 🎯 Success Metrics

- **Queue Visibility**: 100% of blogs tracked in queue
- **Approval Time**: Average approval time < 24 hours
- **Publishing Success**: > 95% successful publishes
- **User Satisfaction**: Dashboard reduces confusion about blog status
- **Efficiency**: Bulk operations save 50%+ time

---

## 📝 Next Steps

1. **Review this plan** with stakeholders
2. **Prioritize features** based on business needs
3. **Set up database** schema in Supabase
4. **Create API routes** for queue management
5. **Build frontend** dashboard components
6. **Test end-to-end** workflow
7. **Deploy** to staging environment
8. **Gather feedback** and iterate

---

## 🔗 Related Files

- `BACKEND_PROGRESS_UPDATES_IMPLEMENTATION_GUIDE.md` - Progress tracking implementation
- `FRONTEND_ENHANCED_STREAMING_GUIDE.md` - Frontend progress display
- `supabase/schema.sql` - Current database schema
- `src/app/api/blog-writer/generate/route.ts` - Blog generation API

---

**Last Updated:** 2025-01-16  
**Status:** Planning Phase  
**Priority:** High

