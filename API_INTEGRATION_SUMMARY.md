# API Integration Summary - Brand Voice, Internal Links, and Content Presets

## Overview

This document summarizes the integration of new API features and database structures for brand voice management, internal link graph tracking, and expanded content presets functionality.

## Database Changes

### Migration File
`supabase/migrations/20250120000000_add_brand_voice_and_link_graph.sql`

### New Tables

#### 1. `brand_settings` (Organization-level Brand Voice)
- **Purpose**: Store brand voice settings at the organization level for consistent content generation
- **Key Fields**:
  - `tone`: Overall tone (professional, casual, friendly, authoritative, etc.)
  - `style_guidelines`: Text guidelines for content style
  - `vocabulary`: JSONB array of preferred terms/phrases
  - `target_audience`: Target audience description
  - `industry_specific_terms`: JSONB array of industry terminology
  - `brand_voice_description`: Overall brand voice description
  - `examples`: JSONB array of example content snippets
  - `is_active`: Boolean flag for active settings

#### 2. `internal_link_graph` (Internal Link Tracking)
- **Purpose**: Track relationships between blog posts for SEO optimization and content linking
- **Key Fields**:
  - `source_post_id`: Post containing the link
  - `target_post_id`: Post being linked to
  - `anchor_text`: The clickable link text
  - `link_context`: Section/context where link appears
  - `link_type`: Type of link (related, reference, category, series, etc.)
  - `link_position`: Position in content (character offset or section)
  - `is_auto_generated`: Whether link was auto-suggested or manually added

#### 3. `content_presets` (Expanded Content Presets)
- **Purpose**: Store organization-level content templates with formats, SEO templates, and publishing schedules
- **Key Fields**:
  - `name`: Preset name
  - `word_count`: Target word count
  - `content_format`: Format type (how-to, listicle, guide, tutorial, review, etc.)
  - `seo_template`: JSONB SEO structure template
  - `publishing_schedule`: JSONB publishing schedule preferences
  - `integration_field_mappings`: JSONB field mappings for integrations
  - `quality_level`: Quality level (standard, premium, enterprise)
  - `preset_config`: JSONB additional configuration
  - `is_default`: Whether this is the default preset
  - `is_active`: Active status flag

### Security
- All tables have Row Level Security (RLS) enabled
- Policies ensure users can only access data from their organization
- Role-based permissions for create/update/delete operations

## API Routes

### Brand Settings
- **GET `/api/brand-settings`**: Get active brand settings for organization
- **POST `/api/brand-settings`**: Create or update brand settings (admin/editor/owner only)

### Internal Links
- **GET `/api/internal-links`**: Get internal links (filterable by source_post_id, target_post_id, link_type)
- **POST `/api/internal-links`**: Create new internal link
- **DELETE `/api/internal-links`**: Delete internal link
- **GET `/api/internal-links/suggest`**: Get suggested internal links for a post based on content analysis

### Content Presets
- **GET `/api/content-presets`**: Get content presets for organization (supports filtering by preset_id or default)
- **POST `/api/content-presets`**: Create or update content preset (admin/editor/owner only)
- **DELETE `/api/content-presets`**: Delete content preset (admin/owner only)

## Blog Generation Integration

### Enhanced Blog Generation Route
`src/app/api/blog-writer/generate/route.ts`

#### New Features:
1. **Brand Voice Integration**
   - Automatically fetches active brand settings for the organization
   - Includes brand voice in API request payload:
     - Tone
     - Style guidelines
     - Vocabulary preferences
     - Industry-specific terms
     - Example content

2. **Content Preset Support**
   - Supports `preset_id` parameter to use specific preset
   - Automatically uses default preset if no preset_id provided
   - Applies preset settings:
     - Word count
     - Content format
     - Quality level
     - SEO template
     - Integration field mappings

3. **Enhanced Endpoint Support**
   - Automatically uses `/api/v1/blog/generate-enhanced` when:
     - `use_enhanced` flag is true
     - `quality_level` is 'premium' or 'enterprise'
     - Content preset has premium quality level
   - Falls back to standard endpoint otherwise

4. **Improved Response**
   - Includes metadata about:
     - Whether brand voice was used
     - Whether preset was used
     - Which endpoint was used
     - Enhanced generation flag

## TypeScript Types

Updated `src/types/database.ts` with:
- `BrandSetting` type
- `InternalLink` type
- `ContentPreset` type
- Full type definitions for all new tables

## Usage Examples

### Setting Brand Voice
```typescript
POST /api/brand-settings
{
  "tone": "professional",
  "style_guidelines": "Use clear, concise language. Avoid jargon.",
  "vocabulary": ["solution", "innovative", "efficient"],
  "target_audience": "Business professionals",
  "industry_specific_terms": ["SaaS", "API", "cloud-native"]
}
```

### Creating Content Preset
```typescript
POST /api/content-presets
{
  "name": "SEO Blog Post",
  "word_count": 2000,
  "content_format": "guide",
  "quality_level": "premium",
  "seo_template": {
    "headings": ["H1", "H2", "H3"],
    "meta_description_length": 160
  },
  "is_default": true
}
```

### Generating Blog with Brand Voice and Preset
```typescript
POST /api/blog-writer/generate
{
  "topic": "Introduction to API Design",
  "keywords": ["REST API", "API design", "best practices"],
  "preset_id": "preset-uuid-here",
  "use_enhanced": true
}
```

### Getting Internal Link Suggestions
```typescript
GET /api/internal-links/suggest?post_id=post-uuid&content=blog content here&limit=10
```

## Next Steps

1. **Frontend Integration**: Create UI components for:
   - Brand voice settings management
   - Content preset creation/editing
   - Internal link suggestions display
   - Link graph visualization

2. **Workflow Integration**: Integrate into existing blog creation workflow:
   - Show brand voice settings in generation form
   - Allow preset selection
   - Display internal link suggestions after generation
   - Auto-suggest links during content editing

3. **Analytics**: Track:
   - Brand voice usage in generated content
   - Internal link performance
   - Preset effectiveness

4. **Advanced Features**:
   - NLP-based internal link suggestions
   - Automatic link graph building from content analysis
   - Brand voice consistency scoring
   - Preset templates library

## Migration Instructions

1. Run the migration:
   ```bash
   # Apply migration via Supabase CLI or dashboard
   supabase migration up
   ```

2. Verify tables are created:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('brand_settings', 'internal_link_graph', 'content_presets');
   ```

3. Test API endpoints with sample data

4. Update frontend to use new endpoints

## Notes

- All new tables follow the multi-tenant architecture with `org_id`
- RLS policies ensure data isolation between organizations
- API routes include proper authentication and authorization checks
- Blog generation route maintains backward compatibility with existing parameters


