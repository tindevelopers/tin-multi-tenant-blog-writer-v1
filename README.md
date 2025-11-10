# 🚀 TIN Multi-Tenant Blog Writer v1

A modern, multi-tenant blog writing platform built with Next.js 15, Supabase, and TypeScript. Features secure authentication, organization-based data isolation, and a beautiful admin dashboard.

## 🌐 Live Demo

**🔗 Production URL:** https://tin-multi-tenant-blog-writer-v1.vercel.app

Try the live application with full authentication and multi-tenant functionality!

## ✨ Features

- 🔐 **Secure Authentication** - Email/password signup and login with Supabase
- 🏢 **Multi-Tenant Architecture** - Organization-based data isolation with Row Level Security
- 📝 **Blog Writing Dashboard** - Beautiful admin interface for content management
- 🎨 **Modern UI** - Built with Tailwind CSS and responsive design
- 🔒 **Row Level Security** - Supabase RLS ensures data privacy between organizations
- 🚀 **Production Ready** - Complete CI/CD pipeline with GitHub Actions and Vercel deployment

## 🛠️ Tech Stack

- **Frontend:** Next.js 15.5.4, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, RLS)
- **Deployment:** Vercel with GitHub Actions CI/CD
- **Authentication:** Supabase Auth with email/password
- **Database:** PostgreSQL with Row Level Security policies

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- GitHub account (for deployment)

### 1. Clone and Install
```bash
git clone git@github.com:tindevelopers/tin-multi-tenant-blog-writer-v1.git
cd tin-multi-tenant-blog-writer-v1
npm install
```

### 2. Environment Setup
```bash
cp .env.local.example .env.local
```

Update `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Setup
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and run the schema from `supabase/schema.sql`
4. Run the RLS policies from `supabase/reset-all-policies.sql`

### 4. Run Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` and test the signup flow!

## 📚 Documentation

- **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Complete Supabase configuration guide
- **[VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)** - Production deployment instructions
- **[QUICK_START.md](./QUICK_START.md)** - Quick setup guide

## 🏗️ Project Structure

```
├── src/
│   ├── app/                    # Next.js 15 app router
│   │   ├── auth/              # Authentication pages
│   │   ├── admin/             # Protected admin dashboard
│   │   └── api/               # API routes
│   ├── components/            # React components
│   ├── lib/                   # Utilities and configurations
│   │   └── supabase/          # Supabase client setup
│   └── types/                 # TypeScript type definitions
├── supabase/                  # Database schema and migrations
├── .github/                   # GitHub Actions workflows
└── docs/                      # Documentation
```

## 🔐 Multi-Tenancy Architecture

### Database Schema
- **Organizations** - Top-level tenant containers
- **Users** - Organization members with roles (owner, admin, editor, writer)
- **Blog Posts** - Content isolated by organization
- **Content Templates** - Reusable templates per organization
- **API Usage Logs** - Usage tracking per organization
- **Media Assets** - File storage per organization

### Row Level Security (RLS)
All tables have RLS policies ensuring:
- Users can only access their organization's data
- Data isolation between different organizations
- Proper role-based access control
- Secure admin operations via service role

## 🚀 Deployment

### Automatic Deployment (Recommended)
1. **Connect to Vercel:**
   - Push to main branch triggers automatic deployment
   - Preview deployments for pull requests

2. **Set Environment Variables in Vercel:**
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   NEXT_PUBLIC_APP_URL
   ```

3. **Update Supabase Auth URLs:**
   - Add your Vercel domain to allowed redirect URLs
   - Configure site URL in Supabase dashboard

### Manual Deployment
See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed instructions.

## 🔄 CI/CD Pipeline

### GitHub Actions Workflows
- **CI Pipeline** (`ci.yml`):
  - Runs on push to main/develop and pull requests
  - Tests on Node.js 18.x and 20.x
  - Type checking, linting, and build verification

- **Deploy Preview** (`deploy-preview.yml`):
  - Creates preview deployments for pull requests
  - Automatically comments PR with preview URL
  - Tests signup flow on preview environment

### Required Secrets
Set these in your GitHub repository settings:
```
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

## 🧪 Testing

### Local Testing
1. Start development server: `npm run dev`
2. Visit `http://localhost:3000/auth/signup`
3. Create test accounts with different organizations
4. Verify data isolation in Supabase dashboard

### Production Testing
1. Deploy to Vercel
2. Test signup flow on production URL
3. Verify multi-tenancy works correctly
4. Check RLS policies are enforced

## 🔧 Development Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Pull Request Process
- All PRs trigger CI/CD pipeline
- Preview deployments are created automatically
- Use provided PR template for consistency
- Ensure all tests pass before merging

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation:** Check the docs/ folder for detailed guides
- **Issues:** Use GitHub issues for bug reports and feature requests
- **Supabase Setup:** Use the dedicated Supabase setup issue template

## 🏷️ Version

**Current Version:** v1.0.2

### Latest Updates (October 14, 2025)
- ✅ Added comprehensive keyword research system with Cloud Run API integration
- ✅ Implemented keyword storage and history tracking in Supabase
- ✅ Enhanced SEO tools with keyword analysis and suggestions
- ✅ Added fallback mechanisms for robust keyword extraction
- ✅ Fixed RLS policies for keyword research sessions
- ✅ Improved Supabase client authentication context
- ✅ Enhanced sidebar accordion behavior with smooth animations
- ✅ Added system admin role support
- ✅ Fixed Next.js Suspense boundary issue for useSearchParams() in admin drafts page
- ✅ Fixed draft retrieval functionality - added view page and Supabase integration

---

Built with ❤️ by the TIN Developers team
