-- Check Current RLS Policies for cluster_content_ideas
-- This will show the actual policy definitions

SELECT 
    policyname,
    cmd as operation,
    qual::text as using_clause,
    with_check::text as with_check_clause
FROM pg_policies
WHERE tablename = 'cluster_content_ideas'
ORDER BY policyname, cmd;

