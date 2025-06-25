# Weekly Features - Temporarily Commented Out

## Overview
The weekly features system has been temporarily commented out to focus on core functionality and prevent 404 errors related to incomplete challenge endpoints.

## Components Commented Out

### 1. Enhanced Feed Container (`components/feed/enhanced-feed-container.tsx`)

**Weekly Filter Tab:**
- Line ~102: Commented out the weekly filter in `contentTypeFilters` array
- This removes the "Weekly" tab from the feed filter buttons

**Weekly Feature Card Rendering:**
- Line ~446: Commented out the `weekly_feature` case in `renderFeedItem` function
- This prevents weekly feature cards from appearing in the "Show All" tab

**Weekly Feature Loading Logic:**
- Line ~484: Commented out the `useEffect` that loads weekly features when weekly tab is selected
- Line ~492: Commented out the `loadWeeklyFeature` function

### 2. Related Files Still Active (Not Commented Out)

The following files remain active but won't be called due to the above changes:
- `components/feed/cards/weekly-feature-card.tsx` - The card component itself
- `components/weekly/weekly-feature-detail.tsx` - Detail view component
- `components/weekly/weekly-feature-skeleton.tsx` - Loading skeleton
- `app/api/weekly-features/` - API endpoints
- `collections/WeeklyFeatures.ts` - Database collection
- `lib/weekly-feed-sync.ts` - Cross-tab sync utility
- `types/feed.ts` - Type definitions

## How to Re-enable

### Step 1: Uncomment the Filter Tab
In `components/feed/enhanced-feed-container.tsx` around line 102:
```typescript
// Change this:
// TODO: Re-enable when weekly features system is ready
// { type: 'weekly_feature' as FeedContentType, label: 'Weekly', icon: Calendar, color: 'bg-orange-100 text-orange-700', description: 'Curated weekly content' }

// Back to this:
{ type: 'weekly_feature' as FeedContentType, label: 'Weekly', icon: Calendar, color: 'bg-orange-100 text-orange-700', description: 'Curated weekly content' }
```

### Step 2: Uncomment the Card Rendering
In `components/feed/enhanced-feed-container.tsx` around line 446:
```typescript
// Remove the comment wrapper and restore the original case:
case 'weekly_feature':
  // Safety check for weeklyFeature
  if (!weeklyFeature) {
    console.warn('Weekly feature is null, cannot render weekly feature item')
    return null
  }
  
  return (
    <WeeklyFeatureCard
      item={{
        id: weeklyFeature.id || 'weekly-feature',
        type: 'weekly_feature',
        // ... rest of the props
      }}
      userLocation={location}
      className="border-0 shadow-none"
    />
  )
```

### Step 3: Uncomment the Loading Logic
In `components/feed/enhanced-feed-container.tsx`:

1. Around line 484, uncomment the useEffect:
```typescript
useEffect(() => {
  if (activeFilters.includes('weekly_feature') && !weeklyFeature) {
    loadWeeklyFeature()
  }
}, [activeFilters, weeklyFeature])
```

2. Around line 492, uncomment the loadWeeklyFeature function:
```typescript
const loadWeeklyFeature = async () => {
  // ... function implementation
}
```

### Step 4: Test and Fix Challenge Endpoints
Before re-enabling, ensure:
1. Challenge join endpoints are properly implemented
2. Weekly features API returns valid data
3. No 404 errors occur when interacting with weekly content

## Why This Was Done

1. **404 Errors**: The weekly feature card was trying to call challenge join endpoints that don't exist
2. **Incomplete Implementation**: The weekly features system has placeholder data and incomplete functionality
3. **User Experience**: Preventing broken interactions until the system is fully ready

## Current Status

- ✅ Weekly tab removed from feed filters
- ✅ Weekly feature cards no longer appear in show all tab
- ✅ No more 404 errors from challenge join attempts
- ✅ Build completes successfully
- ❌ Weekly features system temporarily disabled

The system can be easily re-enabled by following the steps above once the challenge endpoints and weekly features are fully implemented. 