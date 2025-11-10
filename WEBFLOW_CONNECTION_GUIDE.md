# How to Connect Webflow Credentials for Blog Publishing

This guide walks you through connecting your Webflow account to enable blog publishing via the Blog Writer API.

## 📍 Step 1: Navigate to Blog Writer API Integrations

1. Go to **Admin Panel** → **Integrations** (`/admin/panel/integrations`)
2. Look for the **"Blog Writer API Integrations"** card (highlighted in blue/brand color)
3. Click **"Connect Now"** button

   OR

   Navigate directly to: `/admin/integrations/blog-writer`

## 🔧 Step 2: Select Webflow Provider

1. On the Blog Writer API Integrations page, you'll see three provider options:
   - **Webflow** (default)
   - WordPress
   - Shopify

2. Click on the **Webflow** card to select it (it should be highlighted)

## 🔑 Step 3: Get Your Webflow Credentials

Before connecting, you'll need to obtain your Webflow API credentials:

### Option A: Webflow API Token (Recommended)

1. Log in to your Webflow account
2. Go to **Account Settings** → **Apps & Integrations**
3. Scroll to **"API Access"** section
4. Click **"Generate API Token"** or use an existing token
5. Copy the API token (it looks like: `abc123def456...`)

### Option B: Site-Specific Credentials

You'll also need:
- **Site ID**: Found in your Webflow site settings URL or site settings page
- **Collection ID** (optional): If you want to publish to a specific CMS collection

**How to find Site ID:**
1. Open your Webflow site in the Designer
2. Go to **Site Settings** → **General**
3. The Site ID is in the URL: `https://webflow.com/design/[SITE-ID]/settings`
   - Or check the **Site ID** field in the settings page

**How to find Collection ID (if needed):**
1. In Webflow Designer, go to **CMS Collections**
2. Click on your blog collection (e.g., "Blog Posts")
3. The Collection ID is in the URL or collection settings

## 📝 Step 4: Fill in Connection Form

On the Blog Writer API Integrations page:

1. **Select "Connect & Get Recommendations"** mode (default)
   - This will connect your integration AND get keyword recommendations
   - Or select "Preview Recommendations" to just see recommendations without connecting

2. **Enter Webflow API Key**
   - Paste your Webflow API token in the "Webflow API Key" field
   - This is a password field (masked for security)

3. **Enter Site ID**
   - Paste your Webflow Site ID in the "Site ID" field
   - Required field

4. **Enter Collection ID** (Optional)
   - If you want to publish to a specific CMS collection, enter the Collection ID
   - Leave blank if you want to use the default collection

5. **Add Keywords** (Optional)
   - Click in the keyword input field
   - Type keywords related to your blog content (e.g., "web design", "content marketing")
   - Press Enter or click "Add" to add each keyword
   - You can add up to 50 keywords
   - These keywords will be used to generate backlink and interlink recommendations

## ✅ Step 5: Connect and Verify

1. Click the **"Connect Webflow & Get Recommendations"** button
2. Wait for the connection process (usually takes a few seconds)
3. You should see a success message with:
   - ✅ **Connection Successful!** confirmation
   - **Recommended Backlinks** count
   - **Recommended Interlinks** count
   - **Per-Keyword Recommendations** breakdown (if keywords were provided)

## 📊 Step 6: Review Recommendations

After connecting, you'll see:

### Summary Statistics
- **Recommended Backlinks**: Total number of backlinks suggested
- **Recommended Interlinks**: Total number of interlinks suggested

### Per-Keyword Breakdown
For each keyword you added, you'll see:
- **Keyword**: The keyword you entered
- **Backlinks**: Suggested number of backlinks for this keyword
- **Interlinks**: Suggested number of interlinks for this keyword
- **Difficulty**: Keyword difficulty score (if available)

### Notes
Any additional recommendations or notes from the Blog Writer API will be displayed here.

## 🔄 Step 7: Using the Integration

Once connected:

1. **Integration is saved** to your database
2. **Recommendations are saved** for future reference
3. You can now:
   - Use the Blog Writer API to publish blog posts to Webflow
   - Get keyword-based recommendations for content strategy
   - View saved recommendations in your integration dashboard

## 🛠️ Troubleshooting

### Error: "Missing required fields"
- Make sure you've filled in:
  - Webflow API Key (required)
  - Site ID (required)
  - Collection ID (optional)

### Error: "Invalid provider"
- Make sure you've selected "Webflow" as the provider
- Refresh the page and try again

### Error: "Unauthorized" or "Insufficient permissions"
- You need **Admin** or **Owner** role to connect integrations
- Contact your organization administrator

### Error: "Failed to connect integration"
- Verify your Webflow API token is correct and active
- Check that your Site ID is correct
- Ensure your Webflow account has API access enabled

### Connection succeeds but no recommendations
- Recommendations are optional and depend on keywords
- Try adding more keywords (1-50 allowed)
- Some keywords may not have recommendation data available

## 📚 Additional Resources

- **Webflow API Documentation**: https://developers.webflow.com/
- **Blog Writer API Documentation**: https://blog-writer-api-dev-613248238610.europe-west1.run.app/docs
- **Integration Management**: `/admin/panel/integrations`

## 🔐 Security Notes

- Your Webflow API credentials are stored securely in the database
- API tokens are encrypted and never displayed after entry
- Only users with Admin/Owner roles can view or modify integrations
- You can disconnect or update credentials at any time

## 💡 Tips

1. **Start with keywords**: Adding relevant keywords helps get better recommendations
2. **Test connection**: Use "Preview Recommendations" mode first to see what you'll get
3. **Multiple sites**: You can connect multiple Webflow sites by creating separate integrations
4. **Update credentials**: If your API token expires, edit the integration to update it

---

**Need Help?** Contact your system administrator or check the integration logs in the admin panel.

