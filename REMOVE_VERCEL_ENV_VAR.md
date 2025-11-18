# Remove BLOG_WRITER_API_URL from Vercel

## Why Remove It?

The `BLOG_WRITER_API_URL` environment variable is overriding branch-based detection, causing 404 errors. Removing it will allow the code to automatically select the correct endpoint based on the Git branch.

## Method 1: Vercel Dashboard (Recommended)

1. Go to: https://vercel.com/tindeveloper/tin-multi-tenant-blog-writer-v1/settings/environment-variables
2. Find `BLOG_WRITER_API_URL` in the list
3. Click the trash icon (🗑️) for each environment:
   - Development
   - Preview  
   - Production
4. Confirm deletion
5. Save changes

## Method 2: Vercel CLI (Interactive)

Run this command 3 times, selecting a different environment each time:

```bash
vercel env rm BLOG_WRITER_API_URL
```

When prompted, select:
1. First run: **Development**
2. Second run: **Preview**
3. Third run: **Production**

## After Removal

Once removed, the code will use branch-based detection:

- **develop branch** → `https://blog-writer-api-dev-613248238610.europe-west9.run.app`
- **staging branch** → `https://blog-writer-api-staging-613248238610.europe-west9.run.app`
- **main/master branch** → `https://blog-writer-api-prod-613248238610.us-east1.run.app`

## Verify Removal

Check that the variable is removed:

```bash
vercel env ls | grep BLOG_WRITER_API_URL
```

Should return nothing (variable not found).

## Next Deployment

After removal, the next deployment will:
1. Use branch-based detection
2. Log the actual URL being used in `🔧 API URL Configuration`
3. Connect to the correct endpoint based on the branch

