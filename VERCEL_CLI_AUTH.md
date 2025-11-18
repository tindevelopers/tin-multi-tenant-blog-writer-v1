# Vercel CLI Authentication Guide

## Quick Authentication

### Method 1: Browser Login (Recommended)

```bash
vercel login
```

This will:
1. Open your default browser
2. Prompt you to log in to Vercel
3. Authorize the CLI
4. Save credentials automatically

### Method 2: GitHub Login

```bash
vercel login --github
```

This authenticates using your GitHub account (if your Vercel account is linked to GitHub).

### Method 3: Email/Password

```bash
vercel login --email your-email@example.com
```

This will prompt for your password.

---

## Verify Authentication

After logging in, verify it worked:

```bash
vercel whoami
```

This should display your Vercel username/email.

---

## Deploy After Authentication

Once authenticated, you can deploy:

```bash
# Deploy to production
vercel --prod --yes

# Or deploy to preview
vercel
```

---

## Troubleshooting

### "No existing credentials found"
- Run `vercel login` first
- Make sure you're logged into the correct Vercel account

### "Invalid token"
- Try logging out and back in: `vercel logout` then `vercel login`
- Check if your Vercel account is active

### Browser doesn't open
- Copy the URL from the terminal and open it manually
- Or use `vercel login --github` for GitHub authentication

---

## Your Project Info

- **Project**: `tin-multi-tenant-blog-writer-v1`
- **Project ID**: `prj_01DmJydV6xWIs088QMzsSRkIWnvR`
- **Organization**: `tindeveloper` (team_3Y0hANzD4PovKmUwUyc2WVpb)

The project is already linked, so after authentication you can deploy immediately!

