# Supabase Setup Guide

This guide will walk you through setting up Supabase for the multi-tenant blog writer system.

## Prerequisites

- Node.js 18+ installed
- A Supabase account (sign up at https://supabase.com)

## Step 1: Create a Supabase Project

1. Go to https://supabase.com
2. Sign in or create an account
3. Click "New project"
4. Fill in the following:
   - **Name**: multi-tenant-blog-writer (or your preferred name)
   - **Database Password**: Create a strong password and save it securely
   - **Region**: Choose the region closest to your users
   - **Pricing Plan**: Start with Free tier

## Step 2: Get Your API Keys

1. Go to your project settings
2. Click on "API" in the left sidebar
3. Copy the following credentials:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **anon/public key**: This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key**: This is your `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep this secret!)

## Step 3: Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   
   # Add your Blog Writer API credentials
   BLOG_WRITER_API_URL=https://blog-writer-api-dev-613248238610.europe-west1.run.app
   BLOG_WRITER_API_KEY=your-api-key
   
   NEXT_PUBLIC_APP_URL=http://localhost:3002
   ```

## Step 4: Set Up the Database Schema

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New query"
4. Copy the contents of `supabase/schema.sql` and paste it into the query editor
5. Click "Run" to execute the SQL

This will create:
- Organizations table
- Users table
- Blog posts table
- Content templates table
- API usage logs table
- Media assets table
- All necessary RLS (Row Level Security) policies
- Database indexes for performance
- Auto-update triggers

## Step 5: Configure Authentication

1. Go to "Authentication" in the left sidebar
2. Click "Providers"
3. Configure Email/Password authentication:
   - Enable "Email" provider
   - Enable "Confirm email" (optional, but recommended)
   - Customize email templates if needed

4. (Optional) Configure OAuth providers:
   - Google
   - GitHub
   - etc.

5. Go to "URL Configuration" and set:
   - **Site URL**: `http://localhost:3002` (for development)
   - **Redirect URLs**: Add `http://localhost:3002/auth/callback`

## Step 6: Test the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3002/auth/signup`
3. Create a new account:
   - Enter your full name
   - Enter your organization name
   - Enter your email
   - Enter a password (minimum 8 characters)

4. After signup, you should be redirected to `/admin`
5. You should see your name and organization in the dashboard header

## Step 7: Verify Database Data

1. Go back to Supabase dashboard
2. Click "Table Editor" in the left sidebar
3. Check the following tables:
   - **organizations**: Should have 1 row with your organization
   - **users**: Should have 1 row with your user info linked to the organization

## Troubleshooting

### Authentication Not Working

1. Check your environment variables are correctly set
2. Verify the Supabase URL and keys are correct
3. Check the browser console for errors
4. Verify Email authentication is enabled in Supabase

### RLS Policies Blocking Access

1. Go to "Database" → "Policies" in Supabase
2. Verify all policies are created
3. Check the policy conditions match your use case
4. Temporarily disable RLS on a table to test (not recommended for production)

### Database Schema Errors

1. If you see constraint errors, verify:
   - UUID extension is enabled
   - Foreign key references are correct
   - Table names match exactly

### Can't Create Organization

1. Check that the organizations table exists
2. Verify the user has permission to insert
3. Check for unique constraint violations (slug must be unique)

## Security Checklist

- [ ] Environment variables are in `.env.local` (not committed to git)
- [ ] Service role key is kept secret (never expose to client)
- [ ] RLS policies are enabled on all tables
- [ ] Email confirmation is enabled for production
- [ ] Strong password requirements are set
- [ ] CORS settings are configured for your domain

## Next Steps

1. **Customize RLS Policies**: Adjust policies based on your specific requirements
2. **Add More Auth Providers**: Configure OAuth (Google, GitHub, etc.)
3. **Set Up Email Templates**: Customize the emails Supabase sends
4. **Configure Storage**: Set up Supabase Storage for media files
5. **Add Database Functions**: Create custom functions for complex queries
6. **Set Up Realtime**: Enable realtime features for collaboration

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js with Supabase](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)

## Production Deployment

When deploying to production:

1. Update environment variables in your hosting platform (Vercel, etc.)
2. Update Supabase "Site URL" and "Redirect URLs" to your production domain
3. Enable email confirmation
4. Review and test all RLS policies
5. Set up database backups
6. Monitor usage and performance
7. Configure rate limiting

## Database Migrations

For future schema changes:

1. Create migration files in `supabase/migrations/`
2. Use Supabase CLI for version control:
   ```bash
   supabase migration new <migration_name>
   ```
3. Apply migrations:
   ```bash
   supabase db push
   ```

## Support

If you encounter issues:
- Check the Supabase dashboard for logs
- Review the Next.js server logs
- Check browser console for client-side errors
- Join the Supabase Discord community

