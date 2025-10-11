# 🚀 Quick Start Guide

## ✅ What's Already Done

- ✅ Supabase credentials configured in `.env.local`
- ✅ Dev server configured for port 3004
- ✅ Authentication pages created
- ✅ Multi-tenant RLS security implemented
- ✅ Middleware for protected routes

## 📋 Next Steps (In Order)

### 1. Set Up Supabase Database (5 minutes)

**Run the SQL Schema:**

1. Open: https://supabase.com/dashboard/project/edtxtpqrfpxeogukfunq/sql/new
2. Open `supabase/schema.sql` in your editor
3. Copy ALL 261 lines
4. Paste into SQL Editor
5. Click **"RUN"**
6. Wait for success message ✅

**Verify Tables:**
- Go to: https://supabase.com/dashboard/project/edtxtpqrfpxeogukfunq/editor
- Check you see: organizations, users, blog_posts, content_templates, api_usage_logs, media_assets

**Configure Auth URLs:**
- Go to: https://supabase.com/dashboard/project/edtxtpqrfpxeogukfunq/auth/url-configuration
- Set **Site URL**: `http://localhost:3004`
- Add **Redirect URL**: `http://localhost:3004/**`
- Click **"Save"**

### 2. Test Locally (2 minutes)

**Your app should be running at**: http://localhost:3004

1. **Signup**: http://localhost:3004/auth/signup
   - Enter your details
   - Organization name becomes your tenant

2. **Login**: http://localhost:3004/auth/login
   - Use credentials you just created

3. **Dashboard**: http://localhost:3004/admin
   - Should show your name and org

### 3. Deploy to Vercel (10 minutes)

**Option A: Vercel CLI (Fastest)**
```bash
# Install CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Add environment variables (follow prompts)
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add BLOG_WRITER_API_URL
vercel env add BLOG_WRITER_API_KEY
vercel env add NEXT_PUBLIC_APP_URL

# Deploy to production
vercel --prod
```

**Option B: Vercel Dashboard (Easier)**
1. Push to GitHub
2. Go to https://vercel.com/new
3. Import your repository
4. Add all environment variables from `.env.local`
5. Deploy

**See full instructions in**: `VERCEL_DEPLOYMENT.md`

### 4. Update Supabase for Production

After Vercel gives you a URL (e.g., `https://your-project.vercel.app`):

1. Go to: https://supabase.com/dashboard/project/edtxtpqrfpxeogukfunq/auth/url-configuration
2. Add **Site URL**: `https://your-project.vercel.app`
3. Add **Redirect URL**: `https://your-project.vercel.app/**`
4. Click **"Save"**

---

## 🔗 Important Links

### Supabase
- **Dashboard**: https://supabase.com/dashboard/project/edtxtpqrfpxeogukfunq
- **Table Editor**: https://supabase.com/dashboard/project/edtxtpqrfpxeogukfunq/editor
- **SQL Editor**: https://supabase.com/dashboard/project/edtxtpqrfpxeogukfunq/sql
- **Auth Settings**: https://supabase.com/dashboard/project/edtxtpqrfpxeogukfunq/auth/url-configuration
- **Users**: https://supabase.com/dashboard/project/edtxtpqrfpxeogukfunq/auth/users

### Local Development
- **App**: http://localhost:3004
- **Signup**: http://localhost:3004/auth/signup
- **Login**: http://localhost:3004/auth/login
- **Dashboard**: http://localhost:3004/admin
- **Logout**: http://localhost:3004/auth/logout

### API
- **Blog Writer API**: https://blog-writer-api-dev-613248238610.europe-west1.run.app

---

## 🔐 Environment Variables

Already configured in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://edtxtpqrfpxeogukfunq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
BLOG_WRITER_API_URL=https://blog-writer-api-dev-613248238610.europe-west1.run.app
BLOG_WRITER_API_KEY=your-api-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3004
```

---

## 🎯 Testing Checklist

### Local Testing
- [ ] Database schema created in Supabase
- [ ] Auth URLs configured in Supabase
- [ ] Can signup at http://localhost:3004/auth/signup
- [ ] Can login at http://localhost:3004/auth/login
- [ ] Dashboard shows user name and organization
- [ ] Can logout successfully
- [ ] User appears in Supabase users table
- [ ] Organization appears in organizations table

### Multi-Tenancy Testing
- [ ] Create second account with different organization
- [ ] Login as user 1, verify can't see user 2's data
- [ ] Login as user 2, verify can't see user 1's data
- [ ] Check Supabase - both orgs and users exist

### Production Testing (After Vercel Deploy)
- [ ] App deployed to Vercel
- [ ] All environment variables set in Vercel
- [ ] Supabase redirect URLs updated
- [ ] Can signup on production
- [ ] Can login on production
- [ ] Dashboard works on production
- [ ] Logout works on production

---

## 🆘 Troubleshooting

### "Can't connect to Supabase"
- Check `.env.local` has correct values
- Restart dev server: `pkill -f "next dev" && npm run dev`
- Check Supabase project is active

### "Table doesn't exist"
- Run the schema.sql in Supabase SQL Editor
- Verify tables appear in Table Editor
- Check for SQL errors in the output

### "Authentication failed"
- Verify Email provider is enabled in Supabase
- Check Auth URLs are configured
- Clear browser cache and cookies

### "Already exists" error
- Delete test user in Supabase Auth panel
- Try with different email

---

## 📚 Documentation

- **Supabase Setup**: `SUPABASE_SETUP.md`
- **Vercel Deployment**: `VERCEL_DEPLOYMENT.md`
- **Implementation Plan**: `MULTI_TENANT_IMPLEMENTATION_PLAN.md`

---

## 🎉 What's Next?

After authentication is working:

1. **Phase 2**: Integrate Blog Writer API for content generation
2. **Phase 3**: Build SEO tools and keyword research
3. **Phase 4**: Add publishing integrations (Webflow, Shopify, WordPress)
4. **Phase 5**: Analytics and billing

See `MULTI_TENANT_IMPLEMENTATION_PLAN.md` for full roadmap.

---

**Need help? Check the documentation or test step-by-step!** 🚀

