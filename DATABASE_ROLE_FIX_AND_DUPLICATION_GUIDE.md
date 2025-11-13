# Database Role Fix & Duplication Guide

## 🔧 Problem: Invalid Enum Value 'owner'

### Issue
The `user_role` enum in your database only includes:
- `system_admin`
- `super_admin`
- `admin` (this is the organization owner role)
- `manager`
- `editor`
- `writer`

But the migration was using `'owner'` which doesn't exist in the enum.

### Solution

**Option 1: Use 'admin' instead of 'owner' (RECOMMENDED)**

The `'admin'` role in the enum represents the organization owner. I've already updated the migration file to use `'admin'` instead of `'owner'`.

**Option 2: Add 'owner' to the enum (if you need it)**

If you specifically need an 'owner' role separate from 'admin', you'll need to:

```sql
-- Add 'owner' to the enum
ALTER TYPE user_role ADD VALUE 'owner' BEFORE 'admin';
```

Then update all existing 'admin' users to 'owner' if needed.

### Fixed Migration

The migration file `001_blog_queue_system.sql` has been updated to use:
- `'admin'` instead of `'owner'` in all RLS policies
- `'manager'` is also included for managers who can review approvals

**Updated role checks:**
```sql
AND role IN ('admin', 'manager', 'editor')
```

This matches the actual enum values in your database.

---

## 📋 How to Duplicate/Copy Supabase Database

### Method 1: Using Supabase Dashboard (Easiest)

1. **Go to Supabase Dashboard**
   - Navigate to your project
   - Go to **Settings** → **Database**

2. **Create Database Backup**
   - Click **Backups** tab
   - Click **Create Backup** (or use existing backup)

3. **Create New Project**
   - Create a new Supabase project for your duplicate
   - Go to **Settings** → **Database**

4. **Restore Backup**
   - In the new project, go to **Backups**
   - Click **Restore from Backup**
   - Select your backup file

### Method 2: Using Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Dump the database schema and data
supabase db dump -f backup.sql

# Create a new project and link to it
supabase link --project-ref new-project-ref

# Restore the dump
supabase db reset
# Then manually import backup.sql via SQL editor
```

### Method 3: Using pg_dump (PostgreSQL Native)

```bash
# Get connection string from Supabase Dashboard
# Settings → Database → Connection String → URI

# Dump the database
pg_dump "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  --schema=public \
  --schema=auth \
  --file=backup.sql

# Restore to new database
psql "postgresql://postgres:[PASSWORD]@[NEW-HOST]:5432/postgres" < backup.sql
```

### Method 4: Using Supabase SQL Editor (Manual)

1. **Export Schema**
   - Go to SQL Editor in source project
   - Run: `pg_dump --schema-only` (or use Supabase's export feature)
   - Copy all SQL

2. **Export Data**
   - Export data as CSV or SQL INSERT statements
   - Or use Supabase's table export feature

3. **Import to New Project**
   - Go to SQL Editor in new project
   - Paste and run schema SQL
   - Import data files

### Method 5: Using Supabase Migration Files

If you have all migrations in files:

```bash
# In your project directory
cd supabase/migrations

# Apply all migrations to new database
# Copy migration files to new project
# Run them in order via SQL Editor or CLI
```

---

## 🔍 How to Check Current Role Enum Values

Run this query in Supabase SQL Editor:

```sql
-- Check enum values
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (
  SELECT oid 
  FROM pg_type 
  WHERE typname = 'user_role'
)
ORDER BY enumsortorder;
```

Expected output:
```
enumlabel
----------
system_admin
super_admin
admin
manager
editor
writer
```

---

## ✅ Verification Steps

After fixing the migration:

1. **Check if enum exists:**
```sql
SELECT typname FROM pg_type WHERE typname = 'user_role';
```

2. **Verify role values:**
```sql
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role');
```

3. **Test the migration:**
```sql
-- This should work now
SELECT * FROM users WHERE role IN ('admin', 'manager', 'editor');
```

4. **Check RLS policies:**
```sql
-- View all policies that use role checks
SELECT schemaname, tablename, policyname, qual 
FROM pg_policies 
WHERE qual::text LIKE '%role%';
```

---

## 🎯 Best Practice: Role Mapping

**Recommended role mapping:**
- `admin` = Organization Owner (use this instead of 'owner')
- `manager` = Manager/Editor with approval rights
- `editor` = Content Editor
- `writer` = Content Writer

**In your code:**
- Replace all references to `'owner'` with `'admin'`
- Update TypeScript types if needed
- Update any frontend role checks

---

## 📝 Quick Fix Checklist

- [x] Updated migration file to use `'admin'` instead of `'owner'`
- [ ] Run the fixed migration in your database
- [ ] Update any code that references `'owner'` role
- [ ] Update TypeScript types in `src/types/database.ts`
- [ ] Test RLS policies work correctly
- [ ] Verify role checks in application code

---

## 🔗 Related Files

- `supabase/migrations/001_blog_queue_system.sql` - Fixed migration
- `supabase/roles-and-permissions.sql` - Role enum definition
- `src/types/database.ts` - TypeScript types (may need update)
- `supabase/schema.sql` - Base schema

---

**Last Updated:** 2025-01-16

