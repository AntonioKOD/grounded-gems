# Location Redirect Error Fix

## Issue Description

The error you encountered:
```
Error fetching location: Error: NEXT_REDIRECT
    at a (.next/server/chunks/7353.js:152:149236)
    at l (.next/server/chunks/7353.js:152:149529)
    at $ (.next/server/app/(frontend)/locations/[id]/page.js:1:6514) {
  digest: 'NEXT_REDIRECT;replace;/locations/massachusetts-historical-society;307;'
}
```

## Root Cause

This was **NOT actually an error** - it's Next.js's internal mechanism for handling server-side redirects. The "error" occurs when:

1. A user accesses a location by its database ID (legacy URL format)
2. The location has a slug (SEO-friendly URL)
3. The system redirects from `/locations/[id]` to `/locations/[slug]` for better SEO

The `NEXT_REDIRECT` message is Next.js's way of signaling that a redirect should happen during server-side rendering.

## What Was Happening

In your location page (`app/(frontend)/locations/[id]/page.tsx`), there was redirect logic:

```typescript
if (id && location.slug && location.slug !== slug) {
  redirect(`/locations/${location.slug}`)
}
```

This redirect was working correctly but showing up as an "error" in logs during build time and server-side rendering.

## Solution Implemented

### 1. **Enhanced Redirect Logic**
- Improved the redirect condition to only trigger for legacy ID-based URLs
- Added better logging to distinguish redirects from actual errors
- Created `lib/redirect-utils.ts` with utilities for handling redirects gracefully

### 2. **Better Error Handling**
- Created `LocationErrorBoundary` component that recognizes redirect "errors"
- Added utilities to detect and handle `NEXT_REDIRECT` errors properly
- Implemented graceful fallbacks for actual errors

### 3. **Improved Logging**
- Added development-mode logging for redirects
- Distinguished between redirects and real errors
- Provided better debugging information

## Key Files Modified

### `lib/redirect-utils.ts` (New)
```typescript
export function handleLocationRedirect(from: string, to: string, reason: string = 'canonical') {
  // Enhanced logging and redirect handling
}

export function isNextRedirectError(error: any): boolean {
  return error?.digest?.startsWith('NEXT_REDIRECT')
}
```

### `app/(frontend)/locations/[id]/page.tsx`
```typescript
// Improved redirect logic
if (parsedParams.isLegacyId && location.slug && location.slug !== resolvedParams.id) {
  handleLocationRedirect(
    `/locations/${resolvedParams.id}`,
    `/locations/${location.slug}`,
    'canonical'
  )
}
```

### `components/error-boundary.tsx` (New)
- Error boundary that recognizes redirect "errors"
- Graceful handling of actual errors
- Development-mode debugging information

## Result

✅ **Fixed Issues:**
- `NEXT_REDIRECT` "errors" no longer appear as actual errors
- Better logging and debugging information
- Improved error handling for location pages
- SEO redirects continue to work properly

✅ **Maintained Functionality:**
- Legacy ID-based URLs still redirect to slug-based URLs
- SEO benefits preserved
- User experience unchanged
- Build process cleaner

## Technical Details

The `NEXT_REDIRECT` error is Next.js's internal mechanism and appears when:
- Server-side rendering encounters a `redirect()` call
- Static generation hits a redirect during build
- Middleware or page components trigger redirects

This is **normal behavior** for SEO redirects and not a real error. Our improvements simply make this clearer and provide better tooling around it.

## Monitoring

In development mode, you'll now see helpful logs like:
```
🔄 Location redirect (canonical): /locations/[id] → /locations/[slug]
```

This makes it clear that redirects are working as intended and helps with debugging actual issues. 