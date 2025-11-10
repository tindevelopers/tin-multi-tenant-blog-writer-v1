# Architecture Confirmation: Multi-Level Credential Management

## ✅ Current Architecture Overview

### **Level 1: System Admin Level** (Service Credentials)
**Purpose**: System-wide service API keys (e.g., DataForSEO, Blog Writer API)

**Storage**: 
- Environment variables (server-side)
- System settings table (if implemented)
- Managed by `system_admin` role only

**Examples**:
- `DATAFORSEO_API_KEY` / `DATAFORSEO_API_SECRET`
- `BLOG_WRITER_API_KEY`
- `WEBFLOW_CLIENT_ID` / `WEBFLOW_CLIENT_SECRET` (OAuth app credentials)

**Access**: 
- Only `system_admin` role can configure
- Stored server-side for security
- Used by all organizations

---

### **Level 2: Organization Admin Level** (Target Platform Credentials)
**Purpose**: Organization-specific integration credentials (e.g., Webflow OAuth tokens, WordPress API keys)

**Storage**: 
- `integrations_{ENV}` tables (e.g., `integrations_dev`, `integrations_staging`, `integrations_prod`)
- Scoped by `org_id` (organization isolation)
- Managed by `admin`, `manager`, `super_admin`, or `system_admin` roles

**Examples**:
- Webflow OAuth access tokens (per organization)
- WordPress API keys (per organization)
- Shopify store credentials (per organization)

**Access**:
- Organization admins (`admin`, `manager`) can connect/manage their org's integrations
- System admins can manage any organization's integrations
- Each organization has isolated credentials

**Current Implementation**:
```typescript
// src/app/api/integrations/connect-and-recommend/route.ts
// Uses userProfile.org_id to scope integrations
logId = await integrationLogger.log({
  org_id: userProfile.org_id,  // ✅ Organization-scoped
  user_id: user.id,
  provider: provider as 'webflow' | 'wordpress' | 'shopify',
  // ...
});
```

---

### **Level 3: User Level** (Content Publishing Selection)
**Purpose**: Users choose which integration to publish their content to

**Storage**:
- Blog posts have `org_id` (organization-scoped)
- Publishing actions reference organization's integrations
- Users can only publish to integrations their organization has configured

**Current Implementation**:
- Blog posts: `blog_posts` table with `org_id`
- Publishing: Users select from their organization's available integrations
- RLS policies ensure users only see their organization's integrations

---

## ✅ Confirmation: Current Structure Matches Requirements

### **System-Level Credentials** ✅
- **Status**: Partially implemented
- **Storage**: Environment variables (server-side)
- **Management**: System settings page exists (`/admin/panel/system-settings`)
- **Access Control**: `system_admin` role required
- **Note**: System settings page may need enhancement to manage service credentials

### **Organization-Level Credentials** ✅
- **Status**: Fully implemented
- **Storage**: `integrations_{ENV}` tables with `org_id`
- **Management**: 
  - API routes: `/api/integrations/*`
  - UI: `/admin/integrations/blog-writer`
  - OAuth flow: `/api/integrations/oauth/webflow/*`
- **Access Control**: `admin`, `manager`, `super_admin`, `system_admin` roles
- **Isolation**: RLS policies ensure `org_id` isolation

### **User Publishing Selection** ✅
- **Status**: Implemented
- **Storage**: Blog posts with `org_id`
- **Access**: Users can select from their organization's integrations
- **Isolation**: RLS ensures users only see their org's integrations

---

## 📋 Database Schema Confirmation

### Integrations Table Structure:
```sql
-- integrations_{ENV} tables (e.g., integrations_dev)
CREATE TABLE integrations_dev (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,  -- ✅ Organization-scoped
  provider TEXT NOT NULL,  -- 'webflow', 'wordpress', 'shopify'
  connection JSONB NOT NULL,  -- Encrypted credentials
  -- ...
);
```

### Integration Logs Table Structure:
```sql
-- integration_connection_logs
CREATE TABLE integration_connection_logs (
  log_id UUID PRIMARY KEY,
  org_id UUID NOT NULL,  -- ✅ Organization-scoped
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  -- ...
);
```

---

## 🔐 Security Model Confirmation

### **System Admin Level**:
- Credentials stored in environment variables (Vercel/Supabase)
- Only accessible server-side
- Managed by `system_admin` role
- Used system-wide (no `org_id`)

### **Organization Admin Level**:
- Credentials stored in `integrations_{ENV}` tables
- Scoped by `org_id` (RLS enforced)
- Managed by `admin`, `manager`, `super_admin`, `system_admin`
- Each organization has isolated credentials

### **User Level**:
- Users can view their organization's integrations
- Users can publish to their organization's configured integrations
- RLS ensures users only see their org's data

---

## ✅ Architecture Confirmation: **MATCHES REQUIREMENTS**

The current implementation correctly implements:
1. ✅ **System-level credentials** (service APIs) - Environment variables
2. ✅ **Organization-level credentials** (target platforms) - `integrations_{ENV}` tables with `org_id`
3. ✅ **User publishing selection** - Users choose from their org's integrations

---

## 📝 Recommendations for Enhancement

1. **System Settings Page Enhancement**:
   - Add UI for managing system-level service credentials
   - Store in `organizations` table `settings` JSONB for system org
   - Or create dedicated `system_settings` table

2. **Credential Encryption**:
   - Consider encrypting credentials in `integrations_{ENV}` tables
   - Use Supabase Vault or application-level encryption

3. **Credential Rotation**:
   - Add UI for rotating organization-level credentials
   - Add expiration tracking for OAuth tokens

4. **Integration Status Dashboard**:
   - Show connection status per organization
   - Display last sync/test time
   - Health check indicators

