# Normalized Profile Feed API

## Overview

The Normalized Profile Feed API provides a standardized way to fetch user posts with unified media handling and cursor-based pagination. This API is designed for both iOS and web consumers, providing a consistent data structure regardless of the underlying media storage format.

## Endpoint

```
GET /api/profile/[username]/feed
```

## Query Parameters

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `take` | number | 24 | 50 | Number of posts to return |
| `cursor` | string | null | - | Post ID for cursor-based pagination |

## Response Format

```typescript
{
  items: Array<{
    id: string
    caption: string
    createdAt: string
    cover: {
      type: "IMAGE" | "VIDEO"
      url: string
    } | null
    media: Array<{
      id: string
      type: "IMAGE" | "VIDEO"
      url: string
      thumbnailUrl?: string
      width?: number
      height?: number
      durationSec?: number
    }>
  }>
  nextCursor: string | null
}
```

## Features

### ✅ Media Normalization

The API handles multiple possible media fields from the Posts collection:

- `image` - Single image field
- `photos[]` - Array of photos
- `video` - Single video field
- `videos[]` - Array of videos (if exists)
- `media[]` - Generic media array (if exists)
- `featuredImage` - Featured image (if exists)

All media is normalized into a unified `media[]` array with consistent structure.

### ✅ Cover Image Priority

Cover images are selected with the following priority:

1. **First IMAGE** - Highest priority
2. **First VIDEO with thumbnailUrl** - Video thumbnail
3. **First VIDEO url** - Video URL as fallback
4. **null** - No media available

### ✅ Cursor-Based Pagination

- Uses post ID as cursor for efficient pagination
- Fetches posts created before the cursor post's `createdAt` timestamp
- Returns `nextCursor` when more posts are available
- `nextCursor` is `null` when reaching the last page

### ✅ Absolute URLs

All media URLs are converted to absolute URLs using:
- `NEXT_PUBLIC_BASE_URL` (primary)
- `SERVER_URL` (fallback)
- `http://localhost:3000` (development fallback)

## Usage Examples

### Basic Request

```bash
curl "http://localhost:3000/api/profile/antonio_kodheli/feed?take=10"
```

### With Pagination

```bash
# First page
curl "http://localhost:3000/api/profile/antonio_kodheli/feed?take=10"

# Next page using cursor
curl "http://localhost:3000/api/profile/antonio_kodheli/feed?take=10&cursor=687d4427c533faf797fb271f"
```

### iOS Swift Example

```swift
struct ProfileFeedResponse: Codable {
    let items: [ProfileFeedItem]
    let nextCursor: String?
}

struct ProfileFeedItem: Codable {
    let id: String
    let caption: String
    let createdAt: String
    let cover: CoverImage?
    let media: [MediaItem]
}

struct CoverImage: Codable {
    let type: String // "IMAGE" or "VIDEO"
    let url: String
}

struct MediaItem: Codable {
    let id: String
    let type: String // "IMAGE" or "VIDEO"
    let url: String
    let thumbnailUrl: String?
    let width: Int?
    let height: Int?
    let durationSec: Double?
}

// Usage
func loadProfileFeed(username: String, cursor: String? = nil) async throws -> ProfileFeedResponse {
    var urlComponents = URLComponents(string: "\(baseURL)/api/profile/\(username)/feed")!
    urlComponents.queryItems = [
        URLQueryItem(name: "take", value: "24"),
        URLQueryItem(name: "cursor", value: cursor)
    ]
    
    let (data, _) = try await URLSession.shared.data(from: urlComponents.url!)
    return try JSONDecoder().decode(ProfileFeedResponse.self, from: data)
}
```

### Web JavaScript Example

```javascript
async function loadProfileFeed(username, cursor = null) {
    const params = new URLSearchParams({
        take: '24',
        ...(cursor && { cursor })
    });
    
    const response = await fetch(`/api/profile/${username}/feed?${params}`);
    const data = await response.json();
    
    return data;
}

// Usage
const feed = await loadProfileFeed('antonio_kodheli');
console.log(feed.items); // Array of posts
console.log(feed.nextCursor); // Next page cursor or null
```

## Response Examples

### Successful Response

```json
{
  "items": [
    {
      "id": "687d4427c533faf797fb271f",
      "caption": "Best mac n' cheese in town",
      "createdAt": "2025-07-20T19:31:51.326Z",
      "cover": {
        "type": "VIDEO",
        "url": "http://localhost:3000/api/media/file/masons.steakhouse_1750884150_3663003369217883913_65761546932-11.mp4"
      },
      "media": [
        {
          "id": "687d4423c533faf797fb270a",
          "type": "VIDEO",
          "url": "http://localhost:3000/api/media/file/masons.steakhouse_1750884150_3663003369217883913_65761546932-11.mp4"
        }
      ]
    },
    {
      "id": "684518e59742d9d7b74414a4",
      "caption": "Masons Steakhouse",
      "createdAt": "2025-06-08T05:00:21.791Z",
      "cover": {
        "type": "IMAGE",
        "url": "http://localhost:3000/api/media/file/471397050_17881949370194933_2073590004579394643_n-1.jpeg"
      },
      "media": [
        {
          "id": "684518e59742d9d7b7441495",
          "type": "IMAGE",
          "url": "http://localhost:3000/api/media/file/471397050_17881949370194933_2073590004579394643_n-1.jpeg",
          "width": 1440,
          "height": 1152
        }
      ]
    }
  ],
  "nextCursor": null
}
```

### Error Responses

#### User Not Found (404)

```json
{
  "error": "User not found"
}
```

#### Server Error (500)

```json
{
  "error": "Internal server error"
}
```

## Implementation Details

### Database Queries

The API uses PayloadCMS queries with the following structure:

```typescript
// Find user by username
const userResult = await payload.find({
  collection: 'users',
  where: { username: { equals: username } },
  limit: 1
})

// Find posts with cursor pagination
const postsResult = await payload.find({
  collection: 'posts',
  where: {
    author: { equals: user.id },
    ...(cursor && { createdAt: { less_than: cursorPost.createdAt } })
  },
  sort: '-createdAt',
  limit: take + 1, // Get one extra to determine next page
  depth: 2 // Populate media relations
})
```

### Media Normalization Logic

```typescript
function normalizePostMedia(post: any): MediaItem[] {
  const media: MediaItem[] = []
  
  // Handle all possible media fields
  if (post.image) addMediaItem(post.image, 'IMAGE')
  if (post.photos) post.photos.forEach(photo => addMediaItem(photo, 'IMAGE'))
  if (post.video) addMediaItem(post.video, 'VIDEO')
  if (post.videos) post.videos.forEach(video => addMediaItem(video, 'VIDEO'))
  if (post.media) post.media.forEach(item => addMediaItem(item, detectType(item)))
  if (post.featuredImage) addMediaItem(post.featuredImage, 'IMAGE')
  
  return media
}
```

### Cover Selection Logic

```typescript
function getPostCover(media: MediaItem[]): CoverImage | null {
  // 1. First IMAGE
  const firstImage = media.find(item => item.type === 'IMAGE')
  if (firstImage) return { type: 'IMAGE', url: firstImage.url }
  
  // 2. First VIDEO with thumbnail
  const firstVideoWithThumbnail = media.find(item => 
    item.type === 'VIDEO' && item.thumbnailUrl
  )
  if (firstVideoWithThumbnail) {
    return { type: 'VIDEO', url: firstVideoWithThumbnail.thumbnailUrl }
  }
  
  // 3. First VIDEO URL
  const firstVideo = media.find(item => item.type === 'VIDEO')
  if (firstVideo) return { type: 'VIDEO', url: firstVideo.url }
  
  return null
}
```

## Performance Considerations

### Caching

- API responses are cached for 5 minutes (`Cache-Control: public, max-age=300`)
- Suitable for CDN caching and client-side caching

### Database Optimization

- Uses indexed fields (`username`, `author`, `createdAt`)
- Limits depth to prevent over-fetching
- Uses cursor-based pagination for consistent performance

### Memory Usage

- Processes posts in batches (max 50 per request)
- Cleans up temporary data structures
- Uses efficient media normalization

## Error Handling

### Graceful Degradation

- If media normalization fails for a post, returns a minimal version
- Invalid cursors are ignored (continues without cursor)
- Missing media fields are handled gracefully

### Logging

- Comprehensive logging for debugging
- Error tracking for failed media processing
- Performance monitoring for database queries

## Testing

### Test Script

Run the included test script to verify API functionality:

```bash
node test-normalized-profile-feed.js
```

### Manual Testing

```bash
# Basic request
curl "http://localhost:3000/api/profile/antonio_kodheli/feed?take=5"

# With pagination
curl "http://localhost:3000/api/profile/antonio_kodheli/feed?take=5&cursor=POST_ID"

# Invalid user
curl "http://localhost:3000/api/profile/invalid_user/feed"

# Large take value (should be capped)
curl "http://localhost:3000/api/profile/antonio_kodheli/feed?take=100"
```

## Integration Guide

### iOS Integration

1. Add the response models to your Swift code
2. Implement pagination using `nextCursor`
3. Handle media types appropriately in your UI
4. Use `thumbnailUrl` for video previews

### Web Integration

1. Create TypeScript interfaces for the response
2. Implement infinite scroll using `nextCursor`
3. Handle different media types in your components
4. Use absolute URLs for media display

### Backend Integration

1. The API is ready for production use
2. Configure `NEXT_PUBLIC_BASE_URL` for absolute URLs
3. Monitor performance with the included logging
4. Consider CDN caching for better performance

## Security Considerations

- No authentication required (public profile data)
- Input validation for query parameters
- SQL injection protection via PayloadCMS
- Rate limiting should be implemented at the infrastructure level

## Future Enhancements

Potential improvements for future versions:

- **Media Optimization**: Return optimized image URLs
- **Batch Loading**: Support for loading multiple users' feeds
- **Real-time Updates**: WebSocket integration for live updates
- **Advanced Filtering**: Filter by post type, date range, etc.
- **Analytics**: Track feed engagement metrics

## Support

For issues or questions:

1. Check the test script output
2. Review server logs for error messages
3. Verify the user exists and has posts
4. Test with different query parameters

The API is designed to be robust and self-healing, with comprehensive error handling and fallback mechanisms.
