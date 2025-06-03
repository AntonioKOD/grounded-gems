# Mobile Post Creation API Documentation

## Overview

The Mobile Post Creation API provides a comprehensive endpoint for creating posts with media attachments from mobile applications. This endpoint uses our fixed `createPost` function and supports images, videos, locations, tags, and various post types.

## Endpoint

```
POST /api/v1/mobile/posts
GET /api/v1/mobile/posts
```

## Authentication

All requests require Bearer token authentication:

```
Authorization: Bearer <JWT_TOKEN>
```

Get a token from the login endpoint:
```
POST /api/v1/mobile/auth/login
```

## Features

✅ **Media Upload**: Direct file upload with validation  
✅ **Video Support**: Video posts with automatic thumbnail generation  
✅ **Location Support**: Attach locations by ID or name  
✅ **Tags System**: Multiple tags per post  
✅ **Post Types**: Regular posts, reviews, and recommendations  
✅ **Rating System**: 1-5 star ratings for reviews  
✅ **Mobile Optimized**: Optimized responses for mobile consumption  
✅ **Error Handling**: Comprehensive error responses with codes  

## POST Request - Create Post

### Content-Type
```
Content-Type: multipart/form-data
```

### Request Body (FormData)

#### Required Fields
| Field | Type | Description | Max Length |
|-------|------|-------------|------------|
| `content` | string | Post content/caption | 500 chars |

#### Optional Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `title` | string | Post title | "Amazing sunset!" |
| `type` | enum | Post type: `post`, `review`, `recommendation` | `post` |
| `rating` | number | Rating 1-5 (for reviews only) | `4` |
| `locationId` | string | Existing location ID | `507f1f77bcf86cd799439011` |
| `locationName` | string | Location name (creates/finds location) | "Central Park" |
| `tags[]` | array | Array of tag strings | `["nature", "sunset"]` |

#### Media Fields
| Field | Type | Description | Formats |
|-------|------|-------------|---------|
| `media` | File[] | Image files | JPEG, PNG, WebP, GIF |
| `videos` | File[] | Video files | MP4, WebM, OGV, MOV, AVI |
| `image` | File[] | Alternative image field | Same as media |
| `video` | File[] | Alternative video field | Same as videos |

#### File Limits
- **Images**: 10MB max per file
- **Videos**: 50MB max per file  
- **Total Files**: 10 files max per post
- **Supported Formats**:
  - Images: JPEG, PNG, WebP, GIF, AVIF
  - Videos: MP4, WebM, OGG, MOV, AVI

### Request Example (cURL)

```bash
curl -X POST "http://localhost:3000/api/v1/mobile/posts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "content=Check out this amazing sunset!" \
  -F "title=Sunset at the Beach" \
  -F "type=post" \
  -F "locationName=Malibu Beach" \
  -F "tags[]=sunset" \
  -F "tags[]=beach" \
  -F "tags[]=nature" \
  -F "media=@./sunset.jpg" \
  -F "videos=@./sunset_video.mp4"
```

### Response Format

#### Success Response (201)
```json
{
  "success": true,
  "message": "Post created successfully",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "content": "Check out this amazing sunset!",
    "author": {
      "id": "507f1f77bcf86cd799439012",
      "name": "John Doe",
      "profileImage": {
        "url": "/media/profile.jpg"
      }
    },
    "media": [
      {
        "type": "image",
        "url": "/media/sunset.jpg",
        "alt": "Sunset photo"
      },
      {
        "type": "video", 
        "url": "/media/sunset_video.mp4",
        "thumbnail": "/media/sunset_thumb.jpg"
      }
    ],
    "location": {
      "id": "507f1f77bcf86cd799439013",
      "name": "Malibu Beach"
    },
    "type": "post",
    "tags": ["sunset", "beach", "nature"],
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

#### Error Response (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "error": "Content is required",
  "code": "VALIDATION_ERROR"
}
```

## GET Request - Retrieve Posts Feed

### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Posts per page (max 50) |
| `category` | string | - | Filter by tag/category |
| `sortBy` | string | `createdAt` | Sort field |

### Request Example
```bash
curl -X GET "http://localhost:3000/api/v1/mobile/posts?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Response Format
```json
{
  "success": true,
  "message": "Posts retrieved successfully", 
  "data": {
    "posts": [
      {
        "id": "507f1f77bcf86cd799439011",
        "content": "Amazing sunset today!",
        "author": {
          "id": "507f1f77bcf86cd799439012",
          "name": "John Doe",
          "profileImage": {
            "url": "/media/profile.jpg"
          }
        },
        "media": [...],
        "engagement": {
          "likeCount": 15,
          "commentCount": 3,
          "shareCount": 2,
          "saveCount": 5,
          "isLiked": false,
          "isSaved": false
        },
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `NO_TOKEN` | 401 | Missing authentication token |
| `INVALID_TOKEN` | 401 | Invalid or expired token |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `INVALID_FORM_DATA` | 400 | Form data parsing failed |
| `POST_CREATION_FAILED` | 400 | Post creation logic failed |
| `SERVER_ERROR` | 500 | Internal server error |

## Implementation Notes

### Fixed Issues
✅ **Type Validation Fix**: Removed automatic `type: 'video'` override that caused validation errors  
✅ **Media Upload**: Proper file handling with FormData  
✅ **Field Names**: Support for both `media`/`videos` and `image`/`video` field names  
✅ **Error Handling**: Comprehensive error reporting with specific codes  
✅ **Mobile Optimization**: Response format optimized for mobile consumption  

### Backend Integration
The endpoint uses the fixed `createPost` function from `/app/actions.ts` which:
- Handles file uploads to Payload CMS
- Validates file types and sizes
- Creates proper media document relationships
- Supports location creation/lookup by name
- Manages tags as array of objects
- Maintains backward compatibility

### Security Features
- JWT token authentication required
- File type validation
- File size limits enforced
- Input sanitization and validation
- CORS support for mobile apps

## Testing

Use the provided test script:
```bash
node test-mobile-post-creation.js
```

Or manually test with curl/Postman using the examples above.

## Mobile App Integration

### React Native Example
```javascript
const createPost = async (postData, mediaFiles) => {
  const formData = new FormData();
  
  // Add text data
  formData.append('content', postData.content);
  formData.append('type', postData.type);
  
  // Add media files
  mediaFiles.forEach(file => {
    formData.append('media', {
      uri: file.uri,
      type: file.type,
      name: file.name
    });
  });
  
  const response = await fetch('/api/v1/mobile/posts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
    body: formData
  });
  
  return response.json();
};
```

### Flutter/Dart Example
```dart
Future<Map<String, dynamic>> createPost(Map<String, dynamic> postData, List<File> files) async {
  var request = http.MultipartRequest('POST', Uri.parse('/api/v1/mobile/posts'));
  
  // Add headers
  request.headers['Authorization'] = 'Bearer $token';
  
  // Add text fields
  request.fields['content'] = postData['content'];
  request.fields['type'] = postData['type'];
  
  // Add files
  for (var file in files) {
    request.files.add(await http.MultipartFile.fromPath('media', file.path));
  }
  
  var response = await request.send();
  var responseData = await response.stream.bytesToString();
  return json.decode(responseData);
}
```

## Rate Limiting

Consider implementing rate limiting for production:
- **Posts**: 10 posts per hour per user
- **Media**: 50MB total upload per hour per user
- **Requests**: 100 requests per minute per IP

This API is now fully functional and ready for mobile app integration! 