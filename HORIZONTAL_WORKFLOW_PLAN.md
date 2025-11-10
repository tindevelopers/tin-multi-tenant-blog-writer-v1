# Horizontal Blog Creation Workflow - Implementation Plan

## 🎯 Overview

Redesign the blog creation process to follow a logical, horizontal workflow that guides content writers from objective setting to published content, similar to the AI BlogWriter Pro structure shown in the reference images.

## 📋 Workflow Steps

### Step 1: Objective Setting
**Goal**: Capture the user's intent and target audience
- Input: "I want to create blogs that rank for Pet Groomers that are looking for new clients"
- Fields:
  - Objective/Goal (text area)
  - Target Audience (text input)
  - Industry/Niche (text input)
  - Content Goal (dropdown: SEO, Engagement, Conversions, etc.)

### Step 2: Keyword Research
**Goal**: Discover high-value keywords related to the objective
- Search query based on objective
- Display keywords with metrics:
  - Search Volume
  - Keyword Difficulty (KD)
  - Competition
  - Intent (Informational, Commercial, Transactional, Local)
  - CPC
- Save keywords to collections
- Filter and sort capabilities

### Step 3: Keyword Clustering
**Goal**: Group keywords by parent topics (Ahrefs-style)
- Display keywords grouped by parent topics
- Show cluster metrics:
  - Cluster size
  - Average difficulty
  - Total search volume
  - Cluster score
- Allow manual cluster adjustments
- Save clusters for content planning

### Step 4: Content Ideas
**Goal**: Generate creative content ideas based on clusters
- Show ideas per cluster
- Content angles and approaches
- Estimated traffic potential
- Save favorite ideas

### Step 5: Topic Suggestions
**Goal**: Get specific topic ideas with unique angles
- Topic titles with SEO scores
- Unique angles per topic
- Target keyword mapping
- Save topics for content creation

### Step 6: Content Strategy
**Goal**: Create comprehensive content strategy with SEO recommendations
- Main keyword selection
- Secondary keywords
- Content type (Blog Post, Guide, List, etc.)
- Target audience refinement
- SEO recommendations
- Content calendar suggestions

### Step 7: Content Editor
**Goal**: Generate and edit high-quality blog content
- Pre-populated with strategy data
- AI content generation
- Editing capabilities
- SEO optimization
- Save as draft or publish

### Step 8: My Posts
**Goal**: Manage created blog posts
- List of all posts
- Status tracking (Draft, Published, Scheduled)
- Edit and republish
- Analytics integration

## 🏗️ Technical Implementation

### 1. Horizontal Navigation Component
- Step indicator showing current position
- Progress tracking
- Navigation between steps
- Data persistence between steps

### 2. Workflow State Management
- Context API or Zustand for workflow state
- Persist data to Supabase
- Load previous workflow sessions

### 3. Database Schema Updates
```sql
-- Workflow sessions
CREATE TABLE workflow_sessions (
  session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(org_id),
  created_by UUID NOT NULL REFERENCES users(user_id),
  objective TEXT,
  target_audience TEXT,
  industry TEXT,
  current_step TEXT,
  completed_steps TEXT[],
  workflow_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Keyword collections
CREATE TABLE keyword_collections (
  collection_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES workflow_sessions(session_id),
  org_id UUID NOT NULL REFERENCES organizations(org_id),
  name TEXT NOT NULL,
  keywords JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Keyword clusters
CREATE TABLE keyword_clusters (
  cluster_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES workflow_sessions(session_id),
  collection_id UUID REFERENCES keyword_collections(collection_id),
  org_id UUID NOT NULL REFERENCES organizations(org_id),
  parent_topic TEXT NOT NULL,
  keywords JSONB NOT NULL,
  cluster_metrics JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. API Routes
- `/api/workflow/sessions` - CRUD for workflow sessions
- `/api/workflow/keywords` - Keyword research and storage
- `/api/workflow/clusters` - Cluster management
- `/api/workflow/ideas` - Content idea generation
- `/api/workflow/strategy` - Strategy generation

### 5. Component Structure
```
src/app/admin/workflow/
  ├── layout.tsx (Horizontal navigation)
  ├── objective/
  │   └── page.tsx
  ├── keywords/
  │   └── page.tsx
  ├── clusters/
  │   └── page.tsx
  ├── ideas/
  │   └── page.tsx
  ├── topics/
  │   └── page.tsx
  ├── strategy/
  │   └── page.tsx
  ├── editor/
  │   └── page.tsx
  └── posts/
      └── page.tsx
```

## 🎨 UI/UX Design

### Horizontal Navigation Bar
- Fixed top navigation with step indicators
- Current step highlighted
- Completed steps checkmarked
- Clickable to navigate (if data exists)
- Progress bar showing completion

### Step Pages
- Consistent layout across all steps
- "Continue" button to next step
- "Back" button to previous step
- "Save Progress" button
- Data preview from previous steps

## 📊 Data Flow

1. **Objective** → Stored in workflow_session
2. **Keywords** → Stored in keyword_collections, linked to session
3. **Clusters** → Stored in keyword_clusters, linked to collection
4. **Ideas** → Generated from clusters, stored in workflow_data
5. **Topics** → Generated from ideas, stored in workflow_data
6. **Strategy** → Generated from topics, stored in workflow_data
7. **Content** → Generated from strategy, stored as blog_post
8. **Posts** → Display all blog_posts linked to workflow_session

## 🔄 Migration Strategy

1. Keep existing `/admin/drafts/new` page for backward compatibility
2. Add new `/admin/workflow` route with horizontal navigation
3. Gradually migrate users to new workflow
4. Eventually deprecate old flow

## ✅ Success Criteria

- Users can complete entire workflow from objective to published post
- Data persists between steps
- Parent topic clustering works similar to Ahrefs
- Content generated ranks well for target keywords
- Workflow is intuitive and guides users naturally

