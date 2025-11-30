/**
 * Check all Webflow scans in database including full content data
 */

import { createServiceClient } from '../src/lib/supabase/service';

async function checkAllScans() {
  const supabase = createServiceClient();
  
  // Get ALL scans, not just recent ones
  const { data: scans, error } = await supabase
    .from('webflow_structure_scans')
    .select('*')
    .order('scan_started_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log(`\n📊 Found ${scans?.length || 0} total scan(s) in database:\n`);
  console.log('═'.repeat(100));

  if (!scans || scans.length === 0) {
    console.log('📭 No scans found');
    return;
  }

  scans.forEach((scan, index) => {
    console.log(`\n🔍 Scan #${index + 1}:`);
    console.log(`   Scan ID: ${scan.scan_id}`);
    console.log(`   Site ID: ${scan.site_id}`);
    console.log(`   Status: ${scan.status}`);
    console.log(`   Type: ${scan.scan_type}`);
    console.log(`   Started: ${scan.scan_started_at ? new Date(scan.scan_started_at).toLocaleString() : 'N/A'}`);
    console.log(`   Completed: ${scan.scan_completed_at ? new Date(scan.scan_completed_at).toLocaleString() : 'N/A'}`);
    console.log(`   Collections: ${scan.collections_count || 0}`);
    console.log(`   Static Pages: ${scan.static_pages_count || 0}`);
    console.log(`   CMS Items: ${scan.cms_items_count || 0}`);
    console.log(`   Total Content: ${scan.total_content_items || 0}`);
    
    if (scan.error_message) {
      console.log(`   ❌ Error: ${scan.error_message}`);
    }

    // Check if scan has actual content data
    if (scan.existing_content && Array.isArray(scan.existing_content)) {
      const contentCount = scan.existing_content.length;
      console.log(`   📄 Content Items in DB: ${contentCount}`);
      
      if (contentCount > 0) {
        console.log(`   ✅ HAS DATA! Sample items:`);
        scan.existing_content.slice(0, 5).forEach((item: any, i: number) => {
          console.log(`      ${i + 1}. [${item.type?.toUpperCase() || 'UNKNOWN'}] ${item.title || 'Untitled'}`);
          console.log(`         URL: ${item.url || 'No URL'}`);
          if (item.keywords && item.keywords.length > 0) {
            console.log(`         Keywords: ${item.keywords.slice(0, 3).join(', ')}${item.keywords.length > 3 ? '...' : ''}`);
          }
        });
      }
    } else {
      console.log(`   📭 No content data stored`);
    }

    // Check collections data
    if (scan.collections && Array.isArray(scan.collections) && scan.collections.length > 0) {
      console.log(`   📚 Collections data: ${scan.collections.length} collection(s) found`);
      scan.collections.slice(0, 3).forEach((col: any, i: number) => {
        console.log(`      ${i + 1}. ${col.name || col.displayName || 'Unnamed'} (ID: ${col.id || 'N/A'})`);
      });
    }

    // Check static pages data
    if (scan.static_pages && Array.isArray(scan.static_pages) && scan.static_pages.length > 0) {
      console.log(`   🌐 Static Pages data: ${scan.static_pages.length} page(s) found`);
      scan.static_pages.slice(0, 3).forEach((page: any, i: number) => {
        console.log(`      ${i + 1}. ${page.displayName || page.slug || 'Unnamed'} (${page.slug || 'N/A'})`);
      });
    }

    console.log('─'.repeat(100));
  });

  // Summary by status
  const completed = scans.filter(s => s.status === 'completed');
  const failed = scans.filter(s => s.status === 'failed');
  const scanning = scans.filter(s => s.status === 'scanning' || s.status === 'pending');
  const withData = scans.filter(s => s.existing_content && Array.isArray(s.existing_content) && s.existing_content.length > 0);

  console.log(`\n📈 Summary:`);
  console.log(`   ✅ Completed: ${completed.length}`);
  console.log(`   ❌ Failed: ${failed.length}`);
  console.log(`   ⏳ In Progress: ${scanning.length}`);
  console.log(`   📄 Scans with Content Data: ${withData.length}`);

  if (withData.length > 0) {
    console.log(`\n✅ YES! There IS data from previous scans:`);
    withData.forEach((scan) => {
      const contentCount = Array.isArray(scan.existing_content) ? scan.existing_content.length : 0;
      console.log(`   - Scan ${scan.scan_id.substring(0, 8)}... (${scan.status}): ${contentCount} content items`);
    });
  } else {
    console.log(`\n📭 NO data found from previous scans - all scans are empty or failed`);
  }
}

checkAllScans().then(() => {
  console.log('\n✅ Check complete\n');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

