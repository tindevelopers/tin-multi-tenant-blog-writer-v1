# Vercel Deployment Guide

## Prerequisites
- Vercel account (sign up at https://vercel.com)
- GitHub repository (optional but recommended)

## Option 1: Deploy via Vercel CLI (Fastest)

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy
```bash
vercel
```

Follow the prompts:
- **Set up and deploy**: Yes
- **Which scope**: Select your account
- **Link to existing project**: No
- **Project name**: blog-writer (or your choice)
- **Directory**: ./ (current directory)
- **Override settings**: No

### 4. Set Environment Variables

After initial deploy, add environment variables:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
# Paste: https://edtxtpqrfpxeogukfunq.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# Paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkdHh0cHFyZnB4ZW9ndWtmdW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMTU5NTcsImV4cCI6MjA3MzY5MTk1N30.viyecHpzThDCp0JivzOsFpYbQCwoRMeVgEjcIgFuHBg

vercel env add SUPABASE_SERVICE_ROLE_KEY
# Paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkdHh0cHFyZnB4ZW9ndWtmdW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMTU5NTcsImV4cCI6MjA3MzY5MTk1N30.viyecHpzThDCp0JivzOsFpYbQCwoRMeVgEjcIgFuHBg

vercel env add BLOG_WRITER_API_URL
# Paste: https://blog-writer-api-dev-613248238610.europe-west1.run.app

vercel env add BLOG_WRITER_API_KEY
# Paste: your-blog-writer-api-key

vercel env add NEXT_PUBLIC_APP_URL
# Paste: https://your-project.vercel.app (use your actual Vercel URL)
```

Select environment for each: **Production, Preview, and Development**

### 5. Redeploy with Environment Variables
```bash
vercel --prod
```

---

## Option 2: Deploy via Vercel Dashboard (Easier)

### 1. Push to GitHub (Recommended)

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit - Blog Writer with Supabase"

# Create repo on GitHub, then:
git remote add origin https://github.com/yourusername/blog-writer.git
git push -u origin main
```

### 2. Connect to Vercel

1. Go to https://vercel.com/new
2. **Import Git Repository**
3. Select your repository
4. Configure project:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: ./
   - **Build Command**: `npm run build`
   - **Output Directory**: .next

### 3. Add Environment Variables

In the Vercel dashboard, add these:

```
NEXT_PUBLIC_SUPABASE_URL = https://edtxtpqrfpxeogukfunq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkdHh0cHFyZnB4ZW9ndWtmdW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMTU5NTcsImV4cCI6MjA3MzY5MTk1N30.viyecHpzThDCp0JivzOsFpYbQCwoRMeVgEjcIgFuHBg
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkdHh0cHFyZnB4ZW9ndWtmdW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMTU5NTcsImV4cCI6MjA3MzY5MTk1N30.viyecHpzThDCp0JivzOsFpYbQCwoRMeVgEjcIgFuHBg
BLOG_WRITER_API_URL = https://blog-writer-api-dev-613248238610.europe-west1.run.app
BLOG_WRITER_API_KEY = your-blog-writer-api-key
NEXT_PUBLIC_APP_URL = https://your-project.vercel.app
```

### 4. Deploy
Click **"Deploy"** and wait 2-3 minutes

---

## Post-Deployment: Update Supabase

Once deployed, you'll get a URL like: `https://your-project.vercel.app`

### Update Supabase Auth URLs:

1. Go to: https://supabase.com/dashboard/project/edtxtpqrfpxeogukfunq/auth/url-configuration

2. Add your Vercel URLs:
   - **Site URL**: `https://your-project.vercel.app`
   - **Redirect URLs**: 
     - `https://your-project.vercel.app/**`
     - `https://*.vercel.app/**` (for preview deployments)

3. Click **"Save"**

### Update NEXT_PUBLIC_APP_URL in Vercel:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Find `NEXT_PUBLIC_APP_URL`
3. Update to your actual Vercel URL
4. Redeploy

---

## Testing Production Deployment

1. Visit: `https://your-project.vercel.app/auth/signup`
2. Create a new account (or login with existing)
3. Verify you can access the dashboard
4. Test logout and login again

---

## Troubleshooting

### Build Errors
- Check Vercel build logs
- Verify all environment variables are set
- Make sure Next.js version matches local (15.5.4)

### Authentication Not Working
- Verify Supabase redirect URLs include Vercel domain
- Check that environment variables are set correctly
- Clear browser cache and cookies

### 404 Errors
- Verify `vercel.json` exists in root
- Check middleware.ts is properly configured
- Ensure all auth routes exist

---

## Domains (Optional)

### Add Custom Domain:
1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain
3. Update Supabase redirect URLs to include custom domain
4. Update `NEXT_PUBLIC_APP_URL` environment variable

---

## Monitoring

- **Vercel Analytics**: Automatically enabled
- **Error Tracking**: Consider adding Sentry
- **Performance**: Use Vercel's built-in monitoring

---

## CI/CD

With GitHub integration:
- Push to `main` → Auto-deploy to production
- Push to other branches → Auto-deploy to preview
- Pull requests → Auto-deploy to preview with unique URL

---

## Security Checklist

- ✅ Environment variables set in Vercel (not in code)
- ✅ Service role key not exposed to client
- ✅ Supabase RLS policies enabled
- ✅ Redirect URLs configured
- ✅ HTTPS enabled (automatic with Vercel)

---

## Next Steps After Deployment

1. Set up custom domain (optional)
2. Configure email templates in Supabase
3. Set up monitoring and alerts
4. Create backup of Supabase database
5. Document API endpoints
6. Set up staging environment

