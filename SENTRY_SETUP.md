# Sentry Error Tracking Setup Guide

## Overview

Sentry configuration files have been created and are ready for activation. The logger utility is already integrated with Sentry hooks.

## Files Created

- ✅ `sentry.client.config.ts` - Client-side error tracking
- ✅ `sentry.server.config.ts` - Server-side error tracking  
- ✅ `sentry.edge.config.ts` - Edge runtime error tracking
- ✅ Logger utility updated with Sentry integration points

## Quick Setup

### 1. Install Sentry (if not already installed)

```bash
npm install @sentry/nextjs
```

### 2. Run Sentry Wizard

```bash
npx @sentry/wizard@latest -i nextjs
```

This will:
- Configure Sentry for Next.js
- Create `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- Set up build-time configuration
- Add necessary webpack plugins

### 3. Add Environment Variables

Add to your `.env.local`:

```env
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
SENTRY_AUTH_TOKEN=your-auth-token
```

### 4. Update Logger Utility

The logger utility (`src/utils/logger.ts`) already has Sentry integration points. Once Sentry is configured, uncomment the Sentry code in the error handler:

```typescript
// In src/utils/logger.ts, uncomment:
if (this.isProduction && typeof window !== 'undefined') {
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    (window as any).Sentry.captureException(new Error(message), { extra: data });
  }
}
```

### 5. Test Error Tracking

Create a test error to verify Sentry is working:

```typescript
import { logger } from '@/utils/logger';

// This will be sent to Sentry in production
logger.error('Test error', { test: true });
```

## Configuration Options

### Client Configuration (`sentry.client.config.ts`)

- **tracesSampleRate**: Set to 1.0 for development, lower for production (e.g., 0.1)
- **replaysOnErrorSampleRate**: 1.0 (capture all error replays)
- **replaysSessionSampleRate**: 0.1 (10% of sessions)

### Server Configuration (`sentry.server.config.ts`)

- **tracesSampleRate**: Adjust based on traffic
- **debug**: Set to `true` during setup to see Sentry logs

### Edge Configuration (`sentry.edge.config.ts`)

- Similar to server config
- Used for Edge runtime (middleware, etc.)

## Integration with Logger

The logger utility automatically sends errors to Sentry in production:

```typescript
// Automatically sent to Sentry in production
logger.error('Error message', { context: 'additional data' });

// Full error with stack trace
logger.logError(error, { userId: '123', action: 'generate-blog' });
```

## Best Practices

1. **Don't log sensitive data** - Sentry will capture all context
2. **Use appropriate log levels** - Only errors are sent to Sentry in production
3. **Add user context** - Include user ID, organization ID when available
4. **Set up alerts** - Configure Sentry to alert on critical errors
5. **Review regularly** - Check Sentry dashboard for error trends

## Monitoring

Once configured, monitor:
- Error rates and trends
- Performance issues
- User impact
- Error grouping and deduplication

## Troubleshooting

### Errors not appearing in Sentry

1. Check DSN is correct in environment variables
2. Verify Sentry is initialized (check browser console)
3. Ensure you're in production mode (`NODE_ENV=production`)
4. Check Sentry dashboard for rate limiting

### Too many errors

1. Adjust `tracesSampleRate` to lower value
2. Filter errors in Sentry dashboard
3. Use Sentry's error grouping features

---

**Status:** Configuration files ready, awaiting Sentry account setup and DSN configuration.

