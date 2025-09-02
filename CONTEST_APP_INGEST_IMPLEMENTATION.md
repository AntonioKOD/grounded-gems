# Contest App Ingest Implementation

## Overview
Successfully implemented ingest utilities for the contest app to fetch contest entries from the main Sacavia app's API, focusing on being a frontend data consumer rather than a data store.

## Implementation Details

### **Core API Client (`/lib/core.ts`)**

#### **API Integration**
- **Base URL**: Configurable via `NEXT_PUBLIC_MAIN_APP_URL`
- **Timeout**: 30 seconds for ingest operations
- **Error Handling**: Comprehensive error handling with status codes

#### **Core Functions**
```typescript
// Fetch contest entries with pagination
export async function fetchEntries({
  cursor,
  limit = 50,
  city,
  q,
}: {
  cursor?: string;
  limit?: number;
  city?: string;
  q?: string;
}): Promise<CoreContestEntriesResponse>

// Fetch all entries for ingest operations
export async function fetchAllEntries({
  city,
  q,
  maxEntries = 1000,
}: {
  city?: string;
  q?: string;
  maxEntries?: number;
}): Promise<CoreContestEntry[]>
```

#### **Features**
- **Pagination Support**: Cursor-based pagination
- **Filtering**: City and search query support
- **Bulk Fetching**: Efficient bulk operations for ingest
- **Rate Limiting**: Respectful delays between requests
- **Safety Limits**: Maximum entry limits to prevent abuse

### **Ingest API Route (`/app/api/ingest/route.ts`)**

#### **Security**
- **Cron Key Protection**: Requires `x-cron-key` header
- **Environment Variable**: `CRON_KEY` for secure access
- **Unauthorized Access**: 401 response for invalid keys

#### **Functionality**
- **POST Method**: Main ingest operation
- **GET Method**: Status check and entry count
- **Upsert Logic**: Create new or update existing entries
- **Batch Processing**: Efficient bulk operations
- **Error Handling**: Graceful failure handling

#### **Response Format**
```typescript
interface IngestResponse {
  success: boolean;
  upserted: number;
  total: number;
  errors?: string[];
  message?: string;
}
```

### **Leaderboard Page (`/app/leaderboard/page.tsx`)**

#### **Server Component Features**
- **Search Parameters**: URL-based filtering
- **Suspense Boundary**: Loading state management
- **Initial Data**: Server-side parameter handling

#### **Search & Filters**
- **City Filter**: Filter by specific city
- **Search Query**: Text-based search
- **URL Sync**: Search parameters in URL
- **Form Handling**: Controlled form submission

### **Contest Entries List (`/app/leaderboard/contest-entries-list.tsx`)**

#### **Client Component Features**
- **Real-time Fetching**: Direct API calls to main app
- **State Management**: Local state for entries
- **Pagination**: Load more functionality
- **Authentication**: Login prompts for voting

#### **Data Flow**
1. **Initial Load**: Fetch entries on component mount
2. **Search Updates**: Reload entries on filter changes
3. **Pagination**: Append new entries on load more
4. **Error Handling**: Graceful error states

#### **Voting Integration**
- **Authentication Check**: Verify user login status
- **Login Prompts**: Redirect to core app login
- **Vote Buttons**: Conditional rendering based on auth

### **Loading States (`/app/leaderboard/contest-entries-skeleton.tsx`)**

#### **Skeleton Components**
- **Search Form**: Placeholder for search inputs
- **Entry Cards**: Placeholder for contest entries
- **Load More**: Placeholder for pagination
- **Animations**: Smooth loading transitions

## Architecture Overview

### **Data Flow**
```
Main Sacavia App API → Contest App Frontend → User Display
     ↓
/api/contest/entries → /lib/core.ts → Leaderboard Components
```

### **No Local Storage**
- **Data Source**: Main app API only
- **No Database**: Contest app is stateless
- **Real-time**: Always fresh data from source
- **Efficient**: No data duplication or sync issues

### **Authentication Flow**
```
User clicks vote → Check auth status → Not logged in → Redirect to core app
     ↓
Core app login → SSO callback → Session created → Can vote
```

## Usage Examples

### **Manual Ingest (Development)**
```bash
curl -X POST /api/ingest \
  -H "x-cron-key: your-cron-key" \
  -H "Content-Type: application/json"
```

### **Cron Job Setup**
```bash
# Add to crontab for automatic ingest
0 */6 * * * curl -X POST https://vote.sacavia.com/api/ingest \
  -H "x-cron-key: ${CRON_KEY}" \
  -H "Content-Type: application/json"
```

### **Leaderboard Navigation**
```typescript
// Navigate with filters
router.push('/leaderboard?city=New%20York&q=mountain');

// Navigate with pagination
router.push('/leaderboard?cursor=abc123&limit=12');
```

## Environment Configuration

### **Required Variables**
```bash
# Main App Configuration
NEXT_PUBLIC_MAIN_APP_URL=https://sacavia.com
NEXT_PUBLIC_CONTEST_APP_URL=https://vote.sacavia.com

# Ingest Security
CRON_KEY=your-secure-cron-key-here
```

### **Security Requirements**
- **CRON_KEY**: Minimum 32 characters, cryptographically secure
- **HTTPS**: Production environment requires secure connections
- **Rate Limiting**: Respectful API usage

## Benefits of Frontend-Only Approach

### **Simplicity**
- **No Database**: Eliminates data sync complexity
- **No Admin Panel**: Simplified maintenance
- **Real-time Data**: Always current information

### **Performance**
- **No Local Storage**: Faster page loads
- **Direct API**: Minimal latency
- **Efficient Caching**: Browser-level caching

### **Maintenance**
- **Single Source of Truth**: Main app owns all data
- **No Sync Issues**: Eliminates data inconsistency
- **Simplified Updates**: Only frontend code to maintain

## Future Enhancements

### **Immediate**
1. **Voting Implementation**: Connect to main app voting API
2. **Real-time Updates**: WebSocket integration for live results
3. **Advanced Filtering**: More sophisticated search options

### **Long-term**
1. **Offline Support**: Service worker for offline viewing
2. **Advanced Analytics**: User engagement tracking
3. **Social Features**: Sharing and community features

## Testing & Validation

### **API Connectivity**
1. **Health Check**: Verify core app accessibility
2. **Data Fetching**: Test entry retrieval
3. **Error Handling**: Validate error scenarios

### **User Experience**
1. **Loading States**: Verify skeleton components
2. **Search Functionality**: Test filtering and search
3. **Authentication**: Validate login flow

### **Performance**
1. **Response Times**: Monitor API call performance
2. **Pagination**: Test load more functionality
3. **Caching**: Verify browser caching behavior

## Files Created/Modified

### **New Files**
- `lib/core.ts` - Core API client for main app integration
- `app/api/ingest/route.ts` - Ingest endpoint for cron jobs
- `app/leaderboard/page.tsx` - Leaderboard page (server component)
- `app/leaderboard/contest-entries-list.tsx` - Contest entries list (client component)
- `app/leaderboard/contest-entries-skeleton.tsx` - Loading skeleton component

### **Modified Files**
- `env.example` - Added CRON_KEY configuration

## Compliance & Standards

- **Security**: Secure cron key authentication
- **Performance**: Efficient API integration
- **User Experience**: Smooth loading and error states
- **Accessibility**: Screen reader friendly components
- **SEO**: Server-side rendering for search engines

---

**Ready for efficient frontend-only contest app! 🚀**
