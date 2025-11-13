-- Verification Script: Check if blog queue system tables exist
-- Run this in Supabase SQL Editor to verify Phase 1 Step 1 is complete

-- Check if tables exist
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('blog_generation_queue', 'blog_approvals', 'blog_platform_publishing') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('blog_generation_queue', 'blog_approvals', 'blog_platform_publishing')
ORDER BY table_name;

-- Check table structures
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('blog_generation_queue', 'blog_approvals', 'blog_platform_publishing')
ORDER BY table_name, ordinal_position;

-- Check RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('blog_generation_queue', 'blog_approvals', 'blog_platform_publishing');

-- Check RLS policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('blog_generation_queue', 'blog_approvals', 'blog_platform_publishing')
ORDER BY tablename, policyname;

-- Check indexes exist
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('blog_generation_queue', 'blog_approvals', 'blog_platform_publishing')
ORDER BY tablename, indexname;

-- Summary report
DO $$
DECLARE
  queue_exists BOOLEAN;
  approvals_exists BOOLEAN;
  publishing_exists BOOLEAN;
  queue_policies_count INTEGER;
  approvals_policies_count INTEGER;
  publishing_policies_count INTEGER;
BEGIN
  -- Check tables
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'blog_generation_queue'
  ) INTO queue_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'blog_approvals'
  ) INTO approvals_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'blog_platform_publishing'
  ) INTO publishing_exists;
  
  -- Count policies
  SELECT COUNT(*) INTO queue_policies_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'blog_generation_queue';
  
  SELECT COUNT(*) INTO approvals_policies_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'blog_approvals';
  
  SELECT COUNT(*) INTO publishing_policies_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'blog_platform_publishing';
  
  -- Report
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Blog Queue System - Verification Report';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables:';
  RAISE NOTICE '  blog_generation_queue: %', CASE WHEN queue_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '  blog_approvals: %', CASE WHEN approvals_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '  blog_platform_publishing: %', CASE WHEN publishing_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '';
  RAISE NOTICE 'RLS Policies:';
  RAISE NOTICE '  blog_generation_queue: % policies', queue_policies_count;
  RAISE NOTICE '  blog_approvals: % policies', approvals_policies_count;
  RAISE NOTICE '  blog_platform_publishing: % policies', publishing_policies_count;
  RAISE NOTICE '';
  
  IF queue_exists AND approvals_exists AND publishing_exists THEN
    IF queue_policies_count >= 4 AND approvals_policies_count >= 3 AND publishing_policies_count >= 3 THEN
      RAISE NOTICE '✅ Phase 1 Step 1: COMPLETE - All tables and policies exist';
    ELSE
      RAISE NOTICE '⚠️  Phase 1 Step 1: PARTIAL - Tables exist but some policies missing';
    END IF;
  ELSE
    RAISE NOTICE '❌ Phase 1 Step 1: INCOMPLETE - Missing tables. Run migration first.';
  END IF;
  RAISE NOTICE '========================================';
END $$;

