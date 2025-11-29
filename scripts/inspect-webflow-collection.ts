/**
 * Inspect Webflow Collection Schema
 * Fetches and displays the schema for a specific Webflow collection
 * 
 * Usage: 
 *   WEBFLOW_API_KEY=your_key WEBFLOW_COLLECTION_ID=6928d5ea7146ca3510367bcc npm run ts-node scripts/inspect-webflow-collection.ts
 */

const WEBFLOW_API_KEY = process.env.WEBFLOW_API_KEY || '';
const COLLECTION_ID = process.env.WEBFLOW_COLLECTION_ID || '6928d5ea7146ca3510367bcc';

async function inspectWebflowCollection() {
  console.log('🔍 Inspecting Webflow Collection Schema\n');
  console.log(`Collection ID: ${COLLECTION_ID}\n`);

  if (!WEBFLOW_API_KEY) {
    console.error('❌ Error: WEBFLOW_API_KEY environment variable is required');
    process.exit(1);
  }

  try {
    // Fetch collection schema
    const response = await fetch(
      `https://api.webflow.com/v2/collections/${COLLECTION_ID}`,
      {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'authorization': `Bearer ${WEBFLOW_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error fetching collection: ${response.status} ${response.statusText}`);
      console.error(errorText);
      process.exit(1);
    }

    const collection = await response.json();
    
    console.log('📋 Collection Information:');
    console.log(`   Name: ${collection.displayName || collection.name || 'N/A'}`);
    console.log(`   Slug: ${collection.slug || 'N/A'}`);
    console.log(`   Site ID: ${collection.siteId || 'N/A'}`);
    console.log(`   Total Items: ${collection.itemCount || 0}\n`);

    console.log('📊 Collection Fields:\n');
    
    if (!collection.fields || collection.fields.length === 0) {
      console.log('   No fields found in collection');
    } else {
      collection.fields.forEach((field: any, index: number) => {
        console.log(`   ${index + 1}. ${field.displayName || field.name || 'Unnamed Field'}`);
        console.log(`      Slug: ${field.slug}`);
        console.log(`      Type: ${field.type}`);
        console.log(`      Required: ${field.isRequired ? 'Yes' : 'No'}`);
        console.log(`      Editable: ${field.isEditable !== false ? 'Yes' : 'No'}`);
        
        if (field.validations) {
          console.log(`      Validations: ${JSON.stringify(field.validations)}`);
        }
        
        if (field.options) {
          console.log(`      Options: ${JSON.stringify(field.options)}`);
        }
        
        console.log('');
      });
    }

    // Show sample item if available
    console.log('\n📝 Sample Items (if any):\n');
    try {
      const itemsResponse = await fetch(
        `https://api.webflow.com/v2/collections/${COLLECTION_ID}/items?limit=1`,
        {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'authorization': `Bearer ${WEBFLOW_API_KEY}`,
          },
        }
      );

      if (itemsResponse.ok) {
        const itemsData = await itemsResponse.json();
        if (itemsData.items && itemsData.items.length > 0) {
          const sampleItem = itemsData.items[0];
          console.log('   Sample Item Field Data:');
          console.log(JSON.stringify(sampleItem.fieldData, null, 2));
        } else {
          console.log('   No items found in collection');
        }
      }
    } catch (err) {
      console.log('   Could not fetch sample items');
    }

    // Generate field mapping suggestions
    console.log('\n💡 Suggested Field Mappings:\n');
    const fieldSlugs = collection.fields.map((f: any) => f.slug);
    
    const suggestions: Record<string, string[]> = {
      'title': ['name', 'title', 'post-title', 'blog-title'],
      'content': ['post-body', 'body', 'content', 'post-content', 'main-content', 'rich-text'],
      'excerpt': ['excerpt', 'post-summary', 'summary', 'description', 'short-description'],
      'slug': ['slug', 'url-slug', 'post-slug'],
      'featured_image': ['main-image', 'featured-image', 'post-image', 'image', 'thumbnail', 'cover-image'],
      'seo_title': ['seo-title', 'meta-title', 'og-title'],
      'seo_description': ['seo-description', 'meta-description', 'og-description'],
      'published_at': ['publish-date', 'published-date', 'date', 'published-at', 'post-date'],
    };

    for (const [blogField, possibleFields] of Object.entries(suggestions)) {
      const matches = possibleFields.filter(f => fieldSlugs.includes(f));
      if (matches.length > 0) {
        console.log(`   ${blogField} → ${matches[0]} ✅`);
      } else {
        console.log(`   ${blogField} → NOT FOUND ❌`);
        console.log(`      Tried: ${possibleFields.join(', ')}`);
        console.log(`      Available fields: ${fieldSlugs.join(', ')}`);
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

inspectWebflowCollection();

