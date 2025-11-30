import { createServiceClient } from '../src/lib/supabase/service';
import { logger } from '../src/utils/logger';

async function checkWebflowScans() {
  try {
    const supabase = createServiceClient();
    
    // Get all recent scans ordered by completion time
    const { data: scans, error } = await supabase
      .from('webflow_structure_scans')
      .select('*')
      .order('scan_completed_at', { ascending: false })
      .order('scan_started_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error querying scans:', error);
      return;
    }

    if (!scans || scans.length === 0) {
      console.log('📭 No scans found in database');
      return;
    }

    console.log(`\n📊 Found ${scans.length} scan(s):\n`);
    console.log('═'.repeat(80));

    scans.forEach((scan, index) => {
      console.log(`\n🔍 Scan #${index + 1}:`);
      console.log(`   Scan ID: ${scan.scan_id}`);
      console.log(`   Site ID: ${scan.site_id}`);
      console.log(`   Status: ${scan.status}`);
      console.log(`   Scan Type: ${scan.scan_type}`);
      console.log(`   Started: ${scan.scan_started_at ? new Date(scan.scan_started_at).toLocaleString() : 'N/A'}`);
      console.log(`   Completed: ${scan.scan_completed_at ? new Date(scan.scan_completed_at).toLocaleString() : 'N/A'}`);
      console.log(`   Collections: ${scan.collections_count || 0}`);
      console.log(`   Static Pages: ${scan.static_pages_count || 0}`);
      console.log(`   CMS Items: ${scan.cms_items_count || 0}`);
      console.log(`   Total Content Items: ${scan.total_content_items || 0}`);
      
      if (scan.error_message) {
        console.log(`   ❌ Error: ${scan.error_message}`);
      }
      
      if (scan.status === 'completed' && scan.existing_content) {
        const contentArray = Array.isArray(scan.existing_content) ? scan.existing_content : [];
        console.log(`   📄 Content Items: ${contentArray.length}`);
        if (contentArray.length > 0) {
          console.log(`   Sample items:`);
          contentArray.slice(0, 5).forEach((item: any, i: number) => {
            console.log(`     ${i + 1}. [${item.type?.toUpperCase() || 'UNKNOWN'}] ${item.title || 'Untitled'} - ${item.url || 'No URL'}`);
          });
        }
      }
      
      console.log('─'.repeat(80));
    });

    // Summary
    const completed = scans.filter(s => s.status === 'completed').length;
    const failed = scans.filter(s => s.status === 'failed').length;
    const scanning = scans.filter(s => s.status === 'scanning' || s.status === 'pending').length;
    
    console.log(`\n📈 Summary:`);
    console.log(`   ✅ Completed: ${completed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   ⏳ In Progress: ${scanning}`);
    
    if (scans.length > 0) {
      const latest = scans[0];
      console.log(`\n🎯 Latest Scan:`);
      console.log(`   Status: ${latest.status}`);
      if (latest.status === 'completed') {
        console.log(`   ✅ Success! Found ${latest.total_content_items} total content items`);
      } else if (latest.status === 'failed') {
        console.log(`   ❌ Failed: ${latest.error_message || 'Unknown error'}`);
      } else {
        console.log(`   ⏳ Still ${latest.status}...`);
      }
    }
    
  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message);
    logger.error('Check scans error', { error });
  }
}

checkWebflowScans().then(() => {
  console.log('\n✅ Check complete');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
