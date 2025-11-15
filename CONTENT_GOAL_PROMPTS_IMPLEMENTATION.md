# Content Goal Prompts Implementation

## Overview

This system allows system administrators to configure custom AI prompts for each of the 4 content goal types:
- **SEO & Rankings** - Optimize content for search engine rankings
- **Engagement** - Maximize shares, comments, and social interaction
- **Conversions** - Drive sales, sign-ups, and desired actions
- **Brand Awareness** - Build brand recognition and thought leadership

## How It Works

### 1. Database Schema

A new table `content_goal_prompts` stores prompts with:
- `content_goal`: One of the 4 goal types
- `system_prompt`: The main instruction prompt sent to the AI
- `user_prompt_template`: Optional template for user-facing instructions
- `instructions`: Additional structured instructions (JSONB)
- `is_system_default`: System-wide defaults (org_id is null)
- `org_id`: Organization-specific prompts override system defaults

### 2. Admin Interface

**Location**: `/admin/settings/content-prompts`

Admins can:
- View current prompts (org-specific or system defaults)
- Create custom prompts for their organization
- Edit existing custom prompts
- Delete custom prompts (falls back to system default)
- See which prompts are system defaults vs custom

### 3. Automatic Application

When a user generates content:
1. The workflow session's `content_goal` is extracted
2. The API fetches the appropriate prompt:
   - First tries org-specific prompt
   - Falls back to system default if no org-specific exists
3. The prompt is included in the API request to Blog Writer API as `system_prompt`
4. The AI uses this prompt to guide content generation

## Default System Prompts

Each content goal has a pre-configured system prompt:

### SEO & Rankings
Focuses on:
- Comprehensive keyword optimization
- Proper heading hierarchy
- Long-form, in-depth content (2000+ words)
- Internal linking opportunities
- Featured snippet optimization
- E-E-A-T signals
- Schema markup opportunities

### Engagement
Focuses on:
- Compelling headlines
- Storytelling and narrative elements
- Interactive elements (questions, polls, CTAs)
- Visual content suggestions
- Relatable examples and case studies
- Emotional connection
- Social sharing optimization

### Conversions
Focuses on:
- Clear value propositions
- Problem-solution framework
- Social proof and testimonials
- Multiple strategic CTAs
- Objection handling
- Trust signals
- Step-by-step guides
- Product/service recommendations

### Brand Awareness
Focuses on:
- Brand voice consistency
- Thought leadership
- Unique perspectives
- Brand values alignment
- Educational authority content
- Shareable, memorable content
- Industry trend analysis
- Community building

## API Integration

### Request Parameters

The blog generation API now accepts:
```typescript
{
  content_goal: 'seo' | 'engagement' | 'conversions' | 'brand_awareness'
}
```

### API Request to Blog Writer

The prompt is automatically added to the request:
```typescript
{
  topic: "...",
  keywords: [...],
  system_prompt: "...", // From content_goal_prompts table
  content_goal: "seo",
  user_prompt_template: "...", // Optional
  additional_instructions: {...} // Optional
}
```

## Usage Flow

1. **Admin Configures Prompts**:
   - Go to `/admin/settings/content-prompts`
   - Select a content goal
   - Click "Create Custom" or "Edit"
   - Enter system prompt and optional user template
   - Save

2. **User Creates Content**:
   - Selects content goal during workflow setup (`/admin/workflow/objective`)
   - Content goal is saved to workflow session
   - When generating content, the prompt is automatically applied

3. **AI Generates Content**:
   - Receives the system prompt
   - Uses it to guide content generation
   - Produces content aligned with the selected goal

## Database Migration

Run the migration to create the table and default prompts:
```bash
# Migration file: supabase/migrations/20250120000002_add_content_goal_prompts.sql
```

This creates:
- `content_goal_prompts` table
- RLS policies for admin access
- Default system prompts for all 4 content goals
- Helper function `get_content_goal_prompt()`

## Benefits

1. **Consistency**: All content for a goal follows the same guidelines
2. **Customization**: Each organization can customize prompts
3. **Flexibility**: Easy to update prompts without code changes
4. **Transparency**: Admins can see exactly what instructions the AI receives
5. **Quality**: Ensures content aligns with business objectives

## Future Enhancements

- Prompt versioning and history
- A/B testing different prompts
- Prompt templates library
- Prompt performance analytics
- Multi-language prompt support

