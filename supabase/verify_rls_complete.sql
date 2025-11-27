-- =====================================================
-- Complete RLS Policy Verification
-- Verifies all policies are correctly checking org_id via users table
-- =====================================================

DO $$
DECLARE
    policy_record RECORD;
    is_correct BOOLEAN;
    total_checked INTEGER := 0;
    total_correct INTEGER := 0;
    correct_pattern TEXT := '%org_id IN (SELECT%org_id FROM users WHERE%user_id = auth.uid()%';
    exists_pattern TEXT := '%EXISTS (SELECT 1 FROM cluster_content_ideas cci JOIN users u ON u.org_id = cci.org_id WHERE cci.id =%AND u.user_id = auth.uid()%';
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RLS Policy Verification Report';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    -- Check cluster_content_ideas policies
    RAISE NOTICE '--- cluster_content_ideas Policies ---';
    FOR policy_record IN
        SELECT policyname, cmd, qual::text as qual_text, with_check::text as with_check_text
        FROM pg_policies
        WHERE tablename = 'cluster_content_ideas'
        ORDER BY policyname, cmd
    LOOP
        total_checked := total_checked + 1;
        
        -- Check if policy uses correct pattern (either in qual or with_check)
        IF policy_record.cmd = 'INSERT' THEN
            is_correct := policy_record.with_check_text LIKE correct_pattern;
        ELSE
            is_correct := policy_record.qual_text LIKE correct_pattern;
        END IF;

        IF is_correct THEN
            RAISE NOTICE '✅ % (%): CORRECT', policy_record.policyname, policy_record.cmd;
            total_correct := total_correct + 1;
        ELSE
            RAISE NOTICE '❌ % (%): INCORRECT', policy_record.policyname, policy_record.cmd;
            IF policy_record.cmd = 'INSERT' THEN
                RAISE NOTICE '   WITH_CHECK: %', policy_record.with_check_text;
            ELSE
                RAISE NOTICE '   USING: %', policy_record.qual_text;
            END IF;
        END IF;
    END LOOP;

    RAISE NOTICE '';

    -- Check content_clusters policies
    RAISE NOTICE '--- content_clusters Policies ---';
    FOR policy_record IN
        SELECT policyname, cmd, qual::text as qual_text, with_check::text as with_check_text
        FROM pg_policies
        WHERE tablename = 'content_clusters'
        ORDER BY policyname, cmd
    LOOP
        total_checked := total_checked + 1;
        
        -- content_clusters can also check user_id = auth.uid() OR org_id pattern
        IF policy_record.cmd = 'INSERT' THEN
            is_correct := policy_record.with_check_text LIKE correct_pattern 
                       OR policy_record.with_check_text LIKE '%user_id = auth.uid()%';
        ELSE
            is_correct := policy_record.qual_text LIKE correct_pattern 
                       OR policy_record.qual_text LIKE '%user_id = auth.uid()%'
                       OR policy_record.qual_text LIKE '%org_id IN (SELECT%';
        END IF;

        IF is_correct THEN
            RAISE NOTICE '✅ % (%): CORRECT', policy_record.policyname, policy_record.cmd;
            total_correct := total_correct + 1;
        ELSE
            RAISE NOTICE '❌ % (%): INCORRECT', policy_record.policyname, policy_record.cmd;
        END IF;
    END LOOP;

    RAISE NOTICE '';

    -- Check content_idea_keywords policies (uses EXISTS pattern)
    RAISE NOTICE '--- content_idea_keywords Policies ---';
    FOR policy_record IN
        SELECT policyname, cmd, qual::text as qual_text, with_check::text as with_check_text
        FROM pg_policies
        WHERE tablename = 'content_idea_keywords'
        ORDER BY policyname, cmd
    LOOP
        total_checked := total_checked + 1;
        
        -- These should use EXISTS pattern
        IF policy_record.cmd = 'INSERT' THEN
            is_correct := policy_record.with_check_text LIKE exists_pattern;
        ELSE
            is_correct := policy_record.qual_text LIKE exists_pattern;
        END IF;

        IF is_correct THEN
            RAISE NOTICE '✅ % (%): CORRECT', policy_record.policyname, policy_record.cmd;
            total_correct := total_correct + 1;
        ELSE
            RAISE NOTICE '❌ % (%): INCORRECT', policy_record.policyname, policy_record.cmd;
        END IF;
    END LOOP;

    RAISE NOTICE '';

    -- Check content_ideas_performance policies (uses EXISTS pattern)
    RAISE NOTICE '--- content_ideas_performance Policies ---';
    FOR policy_record IN
        SELECT policyname, cmd, qual::text as qual_text, with_check::text as with_check_text
        FROM pg_policies
        WHERE tablename = 'content_ideas_performance'
        ORDER BY policyname, cmd
    LOOP
        total_checked := total_checked + 1;
        
        -- These should use EXISTS pattern
        IF policy_record.cmd = 'INSERT' THEN
            is_correct := policy_record.with_check_text LIKE exists_pattern;
        ELSE
            is_correct := policy_record.qual_text LIKE exists_pattern;
        END IF;

        IF is_correct THEN
            RAISE NOTICE '✅ % (%): CORRECT', policy_record.policyname, policy_record.cmd;
            total_correct := total_correct + 1;
        ELSE
            RAISE NOTICE '❌ % (%): INCORRECT', policy_record.policyname, policy_record.cmd;
        END IF;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Verification Summary';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total policies checked: %', total_checked;
    RAISE NOTICE 'Correct policies: %', total_correct;
    RAISE NOTICE 'Incorrect policies: %', total_checked - total_correct;
    
    IF total_checked = total_correct AND total_checked > 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '🎉 SUCCESS: All RLS policies are correctly configured!';
        RAISE NOTICE '';
        RAISE NOTICE 'You can now test in the UI by:';
        RAISE NOTICE '1. Going to Keyword Results page';
        RAISE NOTICE '2. Selecting keywords';
        RAISE NOTICE '3. Clicking "Save & Generate Content Ideas"';
        RAISE NOTICE '4. The error should be resolved!';
    ELSIF total_checked = 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  WARNING: No policies found. Ensure tables exist and RLS is enabled.';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '🚨 ERROR: Some policies need fixing. Review the logs above.';
    END IF;

END $$;

-- Also show a quick summary table
SELECT 
    tablename,
    COUNT(*) as policy_count,
    STRING_AGG(DISTINCT cmd::text, ', ' ORDER BY cmd::text) as operations
FROM pg_policies
WHERE tablename IN ('cluster_content_ideas', 'content_clusters', 'content_idea_keywords', 'content_ideas_performance')
GROUP BY tablename
ORDER BY tablename;

