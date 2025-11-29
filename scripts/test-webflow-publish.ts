/**
 * Test Script: Create Sample Blog and Publish to Webflow
 * 
 * This script:
 * 1. Checks for available Webflow integrations
 * 2. Creates a sample blog post
 * 3. Publishes it to Webflow
 */

import { createServiceClient } from '../src/lib/supabase/service';
import { EnvironmentIntegrationsDB } from '../src/lib/integrations/database/environment-integrations-db';
import { publishBlogToWebflow } from '../src/lib/integrations/webflow-publish';
import { logger } from '../src/utils/logger';

async function testWebflowPublish() {
  try {
    console.log('🚀 Starting Webflow Publishing Test...\n');

    // Initialize database adapter
    const dbAdapter = new EnvironmentIntegrationsDB();
    const supabase = createServiceClient();

    // Get the first organization (for testing)
    const { data: orgs } = await supabase.from('organizations').select('org_id, name').limit(1);
    
    if (!orgs || orgs.length === 0) {
      console.error('❌ No organizations found in database');
      process.exit(1);
    }

    const orgId = orgs[0].org_id;
    console.log(`📋 Using organization: ${orgs[0].name} (${orgId})\n`);

    // Get Webflow integrations for this org
    const integrations = await dbAdapter.getIntegrations(orgId);
    const webflowIntegrations = integrations.filter(i => i.type === 'webflow');

    if (webflowIntegrations.length === 0) {
      console.error('❌ No Webflow integrations found for this organization');
      console.log('💡 Please configure a Webflow integration first via the admin panel');
      process.exit(1);
    }

    const integration = webflowIntegrations[0];
    console.log(`✅ Found Webflow integration: ${integration.name || 'Unnamed'}`);
    console.log(`   Integration ID: ${integration.integration_id}\n`);

    const config = integration.config as Record<string, unknown>;
    const apiKey = config.api_key as string | undefined;
    const siteId = config.site_id as string | undefined;
    const collectionId = config.collection_id as string | undefined;

    if (!apiKey || !collectionId) {
      console.error('❌ Webflow integration is not fully configured');
      console.log('   Required: API Key and Collection ID');
      console.log(`   API Key: ${apiKey ? '✅' : '❌'}`);
      console.log(`   Site ID: ${siteId ? '✅' : '⚠️  (optional)'}`);
      console.log(`   Collection ID: ${collectionId ? '✅' : '❌'}`);
      process.exit(1);
    }

    console.log('📝 Creating sample blog post...\n');

    // Create a sample blog post
    const sampleBlogPost = {
      title: 'Test Blog Post from Blog Writer API',
      content: `
        <h2>Introduction</h2>
        <p>This is a test blog post created automatically by the Blog Writer API integration system.</p>
        
        <h2>Features</h2>
        <p>This post demonstrates:</p>
        <ul>
          <li>Automatic blog post creation</li>
          <li>Webflow CMS integration</li>
          <li>Field mapping capabilities</li>
          <li>Direct publishing to Webflow</li>
        </ul>
        
        <h2>Conclusion</h2>
        <p>If you're seeing this post in your Webflow CMS, the integration is working correctly!</p>
      `,
      excerpt: 'A test blog post created automatically to verify Webflow CMS integration functionality.',
      slug: `test-blog-post-${Date.now()}`,
      seo_title: 'Test Blog Post from Blog Writer API',
      seo_description: 'A test blog post created automatically to verify Webflow CMS integration functionality.',
      published_at: new Date().toISOString(),
      tags: ['test', 'integration', 'webflow'],
      categories: ['Technology'],
    };

    console.log('📤 Publishing to Webflow...\n');
    console.log(`   Collection ID: ${collectionId}`);
    console.log(`   Site ID: ${siteId || 'Auto-detected'}`);
    console.log(`   Title: ${sampleBlogPost.title}\n`);

    // Publish to Webflow
    const result = await publishBlogToWebflow({
      apiKey,
      collectionId,
      siteId: siteId || '', // Will be auto-detected if not provided
      blogPost: sampleBlogPost,
      orgId,
      isDraft: false,
      publishImmediately: true,
    });

    console.log('✅ Successfully published to Webflow!\n');
    console.log(`   Item ID: ${result.itemId}`);
    console.log(`   Published: ${result.published ? 'Yes' : 'No (Draft)'}`);
    if (result.url) {
      console.log(`   URL: ${result.url}`);
    }
    console.log('\n🎉 Test completed successfully!');

  } catch (error) {
    console.error('\n❌ Error during Webflow publishing test:');
    console.error(error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testWebflowPublish();

