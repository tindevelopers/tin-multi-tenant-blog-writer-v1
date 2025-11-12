# Quota Management Explanation

## Overview

Quota management is a system for tracking and limiting API usage per organization. It helps prevent abuse, manage costs, and ensure fair resource allocation across all users.

---

## How Quota Management Works

### Core Concepts

**1. Quota Limits**
- **Monthly Limit**: Total API calls allowed per month per organization
- **Daily Limit**: Optional daily cap (can be null if not set)
- **Hourly Limit**: Optional hourly cap (can be null if not set)

**2. Usage Tracking**
- Every API call increments the usage counter
- Usage is tracked separately for each time period (monthly, daily, hourly)
- Breakdown by operation type (keyword_analysis, content_generation, etc.)

**3. Reset Cycles**
- **Monthly**: Resets on the 1st of each month
- **Daily**: Resets at midnight UTC
- **Hourly**: Resets at the top of each hour

**4. Warnings**
- Automatic warnings when approaching limits (e.g., 80%, 90%)
- Helps organizations plan their usage

---

## API Endpoints

### 1. Get Quota Information

```
GET /api/v1/quota/{organization_id}
```

**Purpose**: Retrieve current quota status for an organization

**Response Structure**:
```typescript
{
  organization_id: string;
  monthly_limit: number;           // e.g., 10000
  monthly_used: number;            // e.g., 7500
  monthly_remaining: number;       // e.g., 2500
  monthly_reset_date: string;      // ISO 8601 date
  
  daily_limit: number | null;      // Optional
  daily_used: number;
  daily_remaining: number;
  daily_reset_date: string | null;
  
  hourly_limit: number | null;     // Optional
  hourly_used: number;
  hourly_remaining: number;
  hourly_reset_date: string | null;
  
  breakdown: {                      // Usage by operation type
    keyword_analysis: 5000,
    content_generation: 2500
  };
  
  warnings: [                       // Threshold warnings
    {
      threshold: "80%",
      message: "80% of monthly quota used (7500/10000)"
    }
  ];
}
```

**Use Cases**:
- Display quota dashboard to users
- Check quota before performing operations
- Show warnings when approaching limits
- Display usage breakdown by operation type

---

### 2. Set Quota Limits

```
POST /api/v1/quota/{organization_id}/set-limits
```

**Purpose**: Update quota limits for an organization (admin only)

**Request Body**:
```typescript
{
  monthly_limit?: number;    // Optional: Update monthly limit
  daily_limit?: number;      // Optional: Update daily limit
  hourly_limit?: number;     // Optional: Update hourly limit
}
```

**Response**:
```typescript
{
  message: "Quota limits updated successfully"
}
```

**Use Cases**:
- Admin panel for managing organization quotas
- Upgrading/downgrading subscription tiers
- Setting custom limits for enterprise customers

---

## Implementation Strategy (Not Implemented)

### Why We're Not Implementing Yet

1. **Backend Dependency**: Requires backend API support for quota tracking
2. **Database Schema**: Needs quota tracking tables and logic
3. **Complexity**: Requires careful handling of reset cycles and edge cases
4. **Testing**: Needs thorough testing across time zones and reset boundaries

### When to Implement

**Phase 1: Basic Quota Display**
- Show current usage vs. limits
- Display warnings
- Read-only quota information

**Phase 2: Quota Checking**
- Check quota before operations
- Block operations when quota exceeded
- Show helpful error messages

**Phase 3: Admin Management**
- Allow admins to set custom limits
- View usage analytics
- Manage quota across organizations

---

## Best Practices (For Future Implementation)

### 1. Check Quota Before Operations

```typescript
async function performKeywordAnalysis(keyword: string, organizationId: string) {
  // Check quota first
  const quotaInfo = await apiClient.getQuotaInfo(organizationId);
  
  if (quotaInfo.monthly_remaining < 1) {
    throw new Error('Monthly quota exceeded. Please upgrade your plan or wait for reset.');
  }
  
  if (quotaInfo.daily_limit && quotaInfo.daily_remaining < 1) {
    throw new Error('Daily quota exceeded. Please try again tomorrow.');
  }
  
  // Proceed with operation
  // ... perform keyword analysis
}
```

### 2. Cache Quota Information

Cache quota info for 30 seconds to reduce API calls:

```typescript
const QUOTA_CACHE_TTL = 30000; // 30 seconds

let quotaCache: {
  data: QuotaInfoResponse | null;
  timestamp: number;
} = { data: null, timestamp: 0 };

function getCachedQuota(organizationId: string) {
  const now = Date.now();
  if (quotaCache.data && (now - quotaCache.timestamp) < QUOTA_CACHE_TTL) {
    return quotaCache.data;
  }
  return null;
}
```

### 3. User-Friendly Error Messages

```typescript
if (quotaInfo.monthly_remaining < 1) {
  const resetDate = new Date(quotaInfo.monthly_reset_date);
  const daysUntilReset = Math.ceil((resetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  throw new Error(
    `Monthly quota exceeded. Your quota will reset in ${daysUntilReset} days (${resetDate.toLocaleDateString()}). ` +
    `Please upgrade your plan or wait for the reset.`
  );
}
```

### 4. Quota Indicators in UI

Display quota status prominently:
- Progress bars showing usage percentage
- Color coding (green/yellow/red)
- Warnings when approaching limits
- Reset countdown timers

---

## Example UI Components (For Future Implementation)

### Quota Dashboard Component

```typescript
export function QuotaDashboard({ organizationId }: { organizationId: string }) {
  const { quotaInfo, loading } = useQuotaInfo(organizationId);
  
  if (loading) return <div>Loading quota...</div>;
  if (!quotaInfo) return <div>Unable to load quota</div>;
  
  const monthlyUsagePercent = (quotaInfo.monthly_used / quotaInfo.monthly_limit) * 100;
  
  return (
    <div className="quota-dashboard">
      <h3>Monthly Quota</h3>
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${monthlyUsagePercent}%` }}
        />
      </div>
      <div className="quota-stats">
        {quotaInfo.monthly_used.toLocaleString()} / {quotaInfo.monthly_limit.toLocaleString()}
        ({quotaInfo.monthly_remaining.toLocaleString()} remaining)
      </div>
      {quotaInfo.warnings.map((warning, idx) => (
        <div key={idx} className="warning">
          ⚠️ {warning.message}
        </div>
      ))}
    </div>
  );
}
```

---

## Summary

**Quota Management** provides:
- ✅ Usage tracking per organization
- ✅ Multiple time periods (monthly, daily, hourly)
- ✅ Usage breakdown by operation type
- ✅ Automatic warnings
- ✅ Admin controls for setting limits

**Current Status**: Explained but not implemented (requires backend API support)

**Future Implementation**: Will be added when backend quota tracking is available

