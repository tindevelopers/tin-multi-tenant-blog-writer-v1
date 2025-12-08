# Webflow Blog Template System for TipTap

## Overview

Yes, **TipTap can create templated blogs that match Webflow's structure!** This system ensures that content created in TipTap is automatically formatted and structured to be compatible with Webflow CMS blog templates.

## How It Works

### 1. **TipTap Output Format**
- TipTap outputs standard HTML content
- Webflow CMS RichText fields accept HTML content
- The system transforms TipTap HTML to match Webflow's preferred structure

### 2. **Automatic Content Transformation**
When publishing to Webflow, content is automatically:
- **Cleaned**: Removes scripts, event handlers, and unsafe elements
- **Structured**: Ensures semantic HTML (proper headings, lists, images)
- **Validated**: Checks for Webflow compatibility issues
- **Formatted**: Wraps content in Webflow-compatible containers

### 3. **Template System**
Pre-built templates match common Webflow blog structures:

- **Default Template**: Standard blog post structure
- **Minimal Template**: Simple structure with minimal formatting
- **Magazine Template**: Rich content structure for magazine-style blogs
- **Technical Template**: Optimized for technical content with code blocks

## Features

### ✅ Webflow-Compatible HTML
- Semantic HTML structure (h1-h6, p, ul, ol, blockquote, etc.)
- Proper image wrapping with alt text
- Clean list structures
- No scripts or unsafe elements

### ✅ Automatic Validation
- Checks for compatibility issues
- Warns about potential problems
- Ensures proper heading hierarchy
- Validates image alt text

### ✅ Custom Templates
You can create custom templates that match your specific Webflow blog design:

```typescript
import { createWebflowTemplateWrapper, WEBFLOW_TEMPLATES } from '@/lib/tiptap/webflow-template';

// Use a predefined template
const content = transformForWebflow(html, { template: 'magazine' });

// Or create a custom template
const customTemplate = {
  name: 'My Custom Blog',
  structure: { /* ... */ },
  htmlWrapper: createWebflowTemplateWrapper({
    containerClass: 'my-blog-content',
    contentClass: 'my-content',
  }),
};
```

## Usage

### In TipTap Editor
Content is automatically formatted when:
1. **Saving drafts**: Content is stored as Webflow-compatible HTML
2. **Publishing to Webflow**: Content is transformed before publishing
3. **Exporting**: Content can be exported in Webflow format

### Manual Transformation
```typescript
import { transformForWebflow } from '@/lib/tiptap/webflow-content-transformer';

const result = transformForWebflow(tipTapHTML, {
  template: 'default',
  validate: true,
  clean: true,
});

console.log(result.html); // Webflow-compatible HTML
console.log(result.validation); // Validation results
```

## Webflow Field Mapping

The system automatically maps TipTap content to Webflow CMS fields:

- **Title** → Webflow `name` field
- **Content** → Webflow `post-body` (RichText field)
- **Excerpt** → Webflow `post-summary`
- **Featured Image** → Webflow `post-image` (ImageRef field)
- **Slug** → Webflow `slug` field
- **SEO Data** → Webflow SEO fields

## Benefits

1. **Seamless Publishing**: Content created in TipTap publishes directly to Webflow without manual formatting
2. **Consistent Structure**: All blog posts follow the same Webflow-compatible structure
3. **Template Support**: Multiple templates for different blog styles
4. **Validation**: Automatic checks ensure content compatibility
5. **Flexibility**: Custom templates can match your exact Webflow design

## Example Output

**TipTap HTML:**
```html
<h1>My Blog Post</h1>
<p>This is the content.</p>
<img src="image.jpg" alt="Example">
```

**Webflow-Compatible HTML:**
```html
<div class="blog-post-content">
  <div class="blog-content">
    <h1>My Blog Post</h1>
    <p>This is the content.</p>
    <div class="blog-image-wrapper">
      <img src="image.jpg" alt="Example">
    </div>
  </div>
</div>
```

## Next Steps

1. **Test Templates**: Try different templates to see which matches your Webflow design
2. **Custom Templates**: Create custom templates for your specific blog structure
3. **Field Mapping**: Configure field mappings to match your Webflow CMS collection
4. **Publish**: Content will automatically be formatted when publishing to Webflow

## Files Created

- `src/lib/tiptap/webflow-template.ts` - Template definitions and HTML formatting
- `src/lib/tiptap/webflow-content-transformer.ts` - Content transformation utilities
- `src/lib/integrations/webflow-publish.ts` - Updated to use Webflow templates

