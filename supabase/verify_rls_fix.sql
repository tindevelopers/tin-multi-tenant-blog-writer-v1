-- =====================================================
-- Verify RLS Policy Fix for cluster_content_ideas
-- Run this in Supabase SQL Editor to confirm migration was applied
-- =====================================================

-- Check cluster_content_ideas policies
SELECT 
    'cluster_content_ideas' as table_name,
    policyname,
    cmd as operation,
    CASE 
        WHEN qual::text LIKE '%org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())%' THEN '✅ CORRECT'
        WHEN qual::text LIKE '%org_id = auth.uid()%' THEN '❌ INCORRECT (old policy)'
        ELSE '⚠️ UNKNOWN FORMAT'
    END as select_policy_status,
    CASE 
        WHEN with_check::text LIKE '%org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())%' THEN '✅ CORRECT'
        WHEN with_check::text LIKE '%org_id = auth.uid()%' THEN '❌ INCORRECT (old policy)'
        WHEN with_check::text IS NULL THEN 'N/A'
        ELSE '⚠️ UNKNOWN FORMAT'
    END as insert_policy_status
FROM pg_policies
WHERE tablename = 'cluster_content_ideas'
ORDER BY policyname;

-- Check content_clusters policies
SELECT 
    'content_clusters' as table_name,
    policyname,
    cmd as operation,
    CASE 
        WHEN qual::text LIKE '%org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())%' THEN '✅ CORRECT'
        WHEN qual::text LIKE '%org_id = auth.uid()%' THEN '❌ INCORRECT (old policy)'
        ELSE '⚠️ CHECK MANUALLY'
    END as policy_status
FROM pg_policies
WHERE tablename = 'content_clusters'
ORDER BY policyname;

-- Summary check
SELECT 
    COUNT(*) FILTER (WHERE qual::text LIKE '%org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())%' 
                     OR with_check::text LIKE '%org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())%') as correct_policies,
    COUNT(*) FILTER (WHERE qual::text LIKE '%org_id = auth.uid()%' 
                     OR with_check::text LIKE '%org_id = auth.uid()%') as incorrect_policies,
    COUNT(*) as total_policies_checked
FROM pg_policies
WHERE tablename IN ('cluster_content_ideas', 'content_clusters', 'content_idea_keywords', 'content_ideas_performance');

