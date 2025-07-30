# Interaction State Syncing System

This document explains how the interaction state syncing system works to ensure that like and save button states are correctly displayed when users return to the app.

## Overview

When a user goes out of the app and returns, the system needs to sync the current state of their interactions (likes and saves) with the server to ensure the UI reflects the correct state. This is especially important if the user interacted with posts from another device or if there were any server-side changes.

## Architecture

### 1. Backend API Route

**File:** `sacavia/app/api/mobile/posts/interaction-state/route.ts`

This API route accepts a list of post IDs and returns the current interaction state for each post for the authenticated user.

**Endpoint:** `POST /api/mobile/posts/interaction-state`

**Request Body:**
```json
{
  "postIds": ["post1", "post2", "post3", ...]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Interaction states retrieved successfully",
  "data": {
    "interactions": [
      {
        "postId": "post1",
        "isLiked": true,
        "isSaved": false,
        "likeCount": 42,
        "saveCount": 5
      },
      {
        "postId": "post2",
        "isLiked": false,
        "isSaved": true,
        "likeCount": 18,
        "saveCount": 3
      }
    ],
    "totalPosts": 2,
    "totalLiked": 1,
    "totalSaved": 1
  }
}
```

**Features:**
- Accepts up to 50 post IDs per request (performance optimization)
- Returns interaction state for all requested posts
- Includes current like and save counts
- Handles missing posts gracefully
- Proper error handling and authentication

### 2. iOS API Service

**File:** `SacaviaApp/SacaviaApp/APIService.swift`

Added the `checkInteractionState` method to handle API calls:

```swift
func checkInteractionState(postIds: [String]) async throws -> InteractionStateResponse
```

**Response Models:**
```swift
struct InteractionStateResponse: Codable {
    let success: Bool
    let message: String
    let data: InteractionStateData?
    let error: String?
    let code: String?
}

struct InteractionStateData: Codable {
    let interactions: [PostInteractionState]
    let totalPosts: Int
    let totalLiked: Int
    let totalSaved: Int
}

struct PostInteractionState: Codable {
    let postId: String
    let isLiked: Bool
    let isSaved: Bool
    let likeCount: Int
    let saveCount: Int
}
```

### 3. Feed Manager Integration

**File:** `SacaviaApp/SacaviaApp/FeedManager.swift`

Added the `syncInteractionStates()` method that:

1. Extracts all post IDs from the current feed
2. Calls the API to get current interaction states
3. Updates the feed items with the correct states
4. Only updates items that have changed (optimization)

```swift
func syncInteractionStates() async
```

### 4. Automatic Syncing

**File:** `SacaviaApp/SacaviaApp/SacaviaAppApp.swift`

The app automatically syncs interaction states when:

1. **App becomes active** - When the user returns to the app from background
2. **View appears** - When the LocalBuzzView is displayed

```swift
.onReceive(NotificationCenter.default.publisher(for: UIApplication.didBecomeActiveNotification)) { _ in
    Task {
        await feedManager.syncInteractionStates()
    }
}
```

### 5. Manual Sync Button

**File:** `SacaviaApp/SacaviaApp/ContentView.swift`

Added a sync button to the top navigation bar that allows users to manually refresh interaction states:

- Icon: `arrow.clockwise`
- Color: Secondary brand color
- Position: Between notifications and search buttons
- Action: Calls `feedManager.syncInteractionStates()`

## Usage Flow

### When User Returns to App

1. **App Launch/Background to Foreground:**
   - System detects app becoming active
   - Automatically calls `syncInteractionStates()`
   - UI updates with correct like/save states

2. **User Opens Feed:**
   - LocalBuzzView appears
   - Automatically syncs interaction states
   - Ensures fresh data is displayed

3. **Manual Refresh:**
   - User taps sync button in top bar
   - Immediately syncs all interaction states
   - Useful if user suspects data is stale

### Performance Optimizations

1. **Batch Processing:** Up to 50 posts per API call
2. **Selective Updates:** Only updates posts with changed states
3. **Efficient Queries:** Single database query for all posts
4. **Caching:** Uses existing feed data, only syncs when needed

## Error Handling

### API Errors
- **401 Unauthorized:** User needs to re-authenticate
- **400 Bad Request:** Invalid post IDs provided
- **500 Server Error:** Server-side issues

### iOS Error Handling
- Graceful degradation if sync fails
- Logs errors for debugging
- Continues normal app operation
- Retry mechanism in manual sync

## Testing

### Test Script
**File:** `test-interaction-state-api.js`

A Node.js script that:
1. Logs in to get authentication token
2. Fetches posts from feed
3. Tests interaction state API with real post IDs
4. Validates response structure
5. Shows detailed results

### Manual Testing
1. Like/save posts in the app
2. Go to background and return
3. Verify button states are correct
4. Test manual sync button
5. Test with multiple devices

## Security Considerations

1. **Authentication Required:** All requests require valid Bearer token
2. **User Isolation:** Users can only see their own interaction states
3. **Input Validation:** Post IDs are validated before processing
4. **Rate Limiting:** Consider implementing rate limits for production

## Future Enhancements

1. **Real-time Updates:** WebSocket integration for live updates
2. **Offline Support:** Cache interaction states locally
3. **Batch Operations:** Support for bulk like/save operations
4. **Analytics:** Track sync frequency and success rates
5. **Smart Syncing:** Only sync changed posts since last sync

## Troubleshooting

### Common Issues

1. **Buttons not updating:**
   - Check authentication token
   - Verify API endpoint is accessible
   - Check network connectivity

2. **Sync not working:**
   - Ensure FeedManager is properly injected
   - Check console logs for errors
   - Verify post IDs are valid

3. **Performance issues:**
   - Reduce batch size if needed
   - Implement caching
   - Add loading indicators

### Debug Logs

The system includes comprehensive logging:
- `📱 Syncing interaction states for X posts`
- `📱 Synced interaction state for post X: isLiked=Y, isSaved=Z`
- `📱 Successfully synced interaction states for X posts`
- `📱 Failed to sync interaction states: [error]`

## Conclusion

This interaction state syncing system ensures that users always see the correct state of their likes and saves, providing a consistent and reliable user experience across app sessions and devices. 