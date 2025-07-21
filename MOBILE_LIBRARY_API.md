# Mobile Library API Documentation

This document describes the mobile library API endpoints that provide comprehensive library functionality for mobile apps, allowing users to access their purchased guides and track usage.

## Base URL
```
https://your-domain.com/api/mobile/library
```

## Authentication
All endpoints require Bearer token authentication in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Get User Library
**GET** `/library`

Get the user's purchased guides with comprehensive filtering, sorting, and metadata.

#### Query Parameters
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of items per page, max 50 (default: 20)
- `sortBy` (optional): Sort field - `purchaseDate`, `lastAccessed`, `downloadCount`, `title`, `price`, `rating` (default: `purchaseDate`)
- `sortOrder` (optional): Sort direction - `asc`, `desc` (default: `desc`)
- `category` (optional): Filter by guide category
- `difficulty` (optional): Filter by difficulty level
- `search` (optional): Search in title, description, and tags
- `includeStats` (optional): Include library statistics (default: true)

#### Example Request
```bash
GET /api/mobile/library?page=1&limit=20&sortBy=purchaseDate&sortOrder=desc&category=hiking&includeStats=true
```

#### Response
```json
{
  "success": true,
  "message": "Library retrieved successfully",
  "data": {
    "library": [
      {
        "id": "guide_123",
        "purchaseId": "purchase_456",
        "title": "Complete Hiking Guide to Yosemite",
        "slug": "complete-hiking-guide-yosemite",
        "description": "A comprehensive guide to hiking in Yosemite National Park...",
        "excerpt": "A comprehensive guide to hiking in Yosemite National Park...",
        "creator": {
          "id": "user_789",
          "name": "John Doe",
          "username": "johndoe",
          "profileImage": {
            "url": "https://example.com/profile.jpg"
          },
          "isVerified": true
        },
        "primaryLocation": {
          "id": "location_101",
          "name": "Yosemite National Park",
          "address": "California, USA",
          "coordinates": {
            "latitude": 37.8651,
            "longitude": -119.5383
          }
        },
        "category": "hiking",
        "difficulty": "intermediate",
        "duration": {
          "value": 8,
          "unit": "hours"
        },
        "pricing": {
          "type": "paid",
          "price": 29.99,
          "currency": "USD"
        },
        "featuredImage": {
          "url": "https://example.com/guide-image.jpg",
          "alt": "Yosemite hiking guide",
          "width": 1200,
          "height": 800
        },
        "stats": {
          "views": 1500,
          "purchases": 250,
          "rating": 4.8,
          "reviewCount": 45,
          "downloadCount": 12
        },
        "tags": ["hiking", "national-park", "california", "outdoors"],
        "purchase": {
          "purchaseDate": "2024-01-15T10:30:00Z",
          "amount": 29.99,
          "paymentMethod": "credit_card",
          "downloadCount": 12,
          "lastAccessedAt": "2024-01-20T14:22:00Z",
          "hasReviewed": false,
          "purchaseRating": null,
          "accessCount": 12
        },
        "createdAt": "2024-01-10T09:00:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false,
      "nextCursor": "2024-01-15T10:30:00Z"
    },
    "meta": {
      "totalPurchases": 45,
      "totalValue": 1349.55,
      "averageRating": 4.6,
      "mostAccessedGuide": {
        "id": "guide_123",
        "title": "Complete Hiking Guide to Yosemite",
        "accessCount": 12
      },
      "recentPurchases": 8,
      "categories": [
        { "name": "hiking", "count": 15 },
        { "name": "camping", "count": 12 },
        { "name": "climbing", "count": 8 }
      ]
    }
  }
}
```

### 2. Track Guide Access
**POST** `/library/access`

Track when users access, download, review, or complete their purchased guides.

#### Request Body
```json
{
  "guideId": "guide_123",
  "action": "access",
  "metadata": {
    "deviceInfo": {
      "platform": "ios",
      "appVersion": "1.2.0",
      "deviceId": "device_abc123"
    },
    "sessionDuration": 1800,
    "progress": 75,
    "notes": "User completed section 3"
  }
}
```

#### Parameters
- `guideId` (required): ID of the guide being accessed
- `action` (optional): Action type - `access`, `download`, `review`, `complete` (default: `access`)
- `metadata` (optional): Additional tracking information
  - `deviceInfo`: Device and app information
  - `sessionDuration`: Session duration in seconds
  - `progress`: Completion percentage (0-100)
  - `notes`: Additional notes

#### Example Request
```bash
POST /api/mobile/library/access
Content-Type: application/json
Authorization: Bearer <token>

{
  "guideId": "guide_123",
  "action": "access",
  "metadata": {
    "deviceInfo": {
      "platform": "ios",
      "appVersion": "1.2.0"
    },
    "sessionDuration": 1800,
    "progress": 75
  }
}
```

#### Response
```json
{
  "success": true,
  "message": "Access tracked successfully",
  "data": {
    "accessId": "access_log_789",
    "guideId": "guide_123",
    "userId": "user_456",
    "action": "access",
    "accessCount": 13,
    "lastAccessedAt": "2024-01-20T15:30:00Z",
    "sessionDuration": 1800,
    "progress": 75
  }
}
```

### 3. Get Guide Details
**GET** `/library/[guideId]`

Get detailed information about a specific guide in the user's library.

#### Path Parameters
- `guideId` (required): ID of the guide

#### Query Parameters
- `includeContent` (optional): Include full guide content (default: false)
- `includeReviews` (optional): Include guide reviews (default: false)
- `includeRelated` (optional): Include related guides (default: false)
- `reviewsLimit` (optional): Number of reviews to include, max 50 (default: 10)
- `relatedLimit` (optional): Number of related guides, max 20 (default: 5)

#### Example Request
```bash
GET /api/mobile/library/guide_123?includeContent=true&includeReviews=true&includeRelated=true&reviewsLimit=5&relatedLimit=3
```

#### Response
```json
{
  "success": true,
  "message": "Guide details retrieved successfully",
  "data": {
    "guide": {
      "id": "guide_123",
      "title": "Complete Hiking Guide to Yosemite",
      "slug": "complete-hiking-guide-yosemite",
      "description": "A comprehensive guide to hiking in Yosemite National Park...",
      "content": "# Complete Hiking Guide to Yosemite\n\n## Introduction\n\nThis guide covers everything you need to know...",
      "excerpt": "A comprehensive guide to hiking in Yosemite National Park...",
      "creator": {
        "id": "user_789",
        "name": "John Doe",
        "username": "johndoe",
        "profileImage": {
          "url": "https://example.com/profile.jpg"
        },
        "isVerified": true,
        "bio": "Professional hiking guide with 15 years of experience",
        "followerCount": 1250
      },
      "primaryLocation": {
        "id": "location_101",
        "name": "Yosemite National Park",
        "address": "California, USA",
        "coordinates": {
          "latitude": 37.8651,
          "longitude": -119.5383
        }
      },
      "category": "hiking",
      "categories": ["hiking", "national-park", "outdoors"],
      "difficulty": "intermediate",
      "duration": {
        "value": 8,
        "unit": "hours"
      },
      "pricing": {
        "type": "paid",
        "price": 29.99,
        "currency": "USD"
      },
      "featuredImage": {
        "url": "https://example.com/guide-image.jpg",
        "alt": "Yosemite hiking guide",
        "width": 1200,
        "height": 800
      },
      "gallery": [
        {
          "url": "https://example.com/image1.jpg",
          "alt": "Trail view",
          "width": 800,
          "height": 600
        }
      ],
      "stats": {
        "views": 1500,
        "purchases": 250,
        "rating": 4.8,
        "reviewCount": 45,
        "downloadCount": 12,
        "completionRate": 85
      },
      "tags": ["hiking", "national-park", "california", "outdoors"],
      "sections": [
        {
          "id": "section_1",
          "title": "Getting Started",
          "content": "Before you begin your hike...",
          "order": 1
        }
      ],
      "requirements": [
        "Good physical fitness",
        "Proper hiking gear",
        "Water and snacks"
      ],
      "whatYoullLearn": [
        "Best hiking trails in Yosemite",
        "Safety tips and precautions",
        "Wildlife encounters"
      ],
      "purchase": {
        "purchaseId": "purchase_456",
        "purchaseDate": "2024-01-15T10:30:00Z",
        "amount": 29.99,
        "paymentMethod": "credit_card",
        "downloadCount": 12,
        "lastAccessedAt": "2024-01-20T14:22:00Z",
        "hasReviewed": false,
        "purchaseRating": null,
        "accessCount": 12,
        "progress": 75,
        "isCompleted": false,
        "completedAt": null
      },
      "reviews": [
        {
          "id": "review_1",
          "rating": 5,
          "content": "Excellent guide with detailed information!",
          "author": {
            "id": "user_101",
            "name": "Jane Smith",
            "profileImage": {
              "url": "https://example.com/jane.jpg"
            }
          },
          "createdAt": "2024-01-18T12:00:00Z",
          "helpfulCount": 8
        }
      ],
      "relatedGuides": [
        {
          "id": "guide_124",
          "title": "Sequoia National Park Guide",
          "slug": "sequoia-national-park-guide",
          "description": "Explore the giant sequoias...",
          "creator": {
            "id": "user_789",
            "name": "John Doe",
            "profileImage": {
              "url": "https://example.com/profile.jpg"
            }
          },
          "featuredImage": {
            "url": "https://example.com/sequoia.jpg"
          },
          "pricing": {
            "type": "paid",
            "price": 24.99
          },
          "stats": {
            "rating": 4.7,
            "reviewCount": 32
          },
          "isOwned": false
        }
      ],
      "createdAt": "2024-01-10T09:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

## Error Responses

### Authentication Error (401)
```json
{
  "success": false,
  "message": "Authentication required",
  "error": "Valid authentication token required to access library",
  "code": "AUTH_REQUIRED"
}
```

### Guide Not Owned (404)
```json
{
  "success": false,
  "message": "Guide not found in library",
  "error": "You do not own this guide or the purchase is not completed",
  "code": "GUIDE_NOT_OWNED"
}
```

### Validation Error (400)
```json
{
  "success": false,
  "message": "Invalid query parameters",
  "error": "Page must be a positive number",
  "code": "VALIDATION_ERROR"
}
```

### Server Error (500)
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Library service unavailable",
  "code": "SERVER_ERROR"
}
```

## Usage Examples

### Mobile App Integration

#### 1. Load User Library
```javascript
const loadLibrary = async (page = 1, sortBy = 'purchaseDate') => {
  const response = await fetch(`/api/mobile/library?page=${page}&limit=20&sortBy=${sortBy}`, {
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  if (data.success) {
    return data.data;
  } else {
    throw new Error(data.error);
  }
};
```

#### 2. Track Guide Access
```javascript
const trackAccess = async (guideId, action = 'access', metadata = {}) => {
  const response = await fetch('/api/mobile/library/access', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      guideId,
      action,
      metadata: {
        deviceInfo: {
          platform: 'ios',
          appVersion: '1.2.0'
        },
        ...metadata
      }
    })
  });
  
  const data = await response.json();
  return data.success;
};
```

#### 3. Get Guide Details
```javascript
const getGuideDetails = async (guideId, includeContent = false) => {
  const response = await fetch(`/api/mobile/library/${guideId}?includeContent=${includeContent}`, {
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  if (data.success) {
    return data.data.guide;
  } else {
    throw new Error(data.error);
  }
};
```

## Best Practices

1. **Caching**: Cache library data locally and refresh periodically
2. **Pagination**: Implement infinite scroll or pagination for large libraries
3. **Access Tracking**: Track access when users open guides, not just on initial load
4. **Error Handling**: Implement proper error handling for network issues
5. **Offline Support**: Cache guide content for offline reading
6. **Progress Tracking**: Track user progress through guides for better UX

## Rate Limiting

- Library endpoints: 100 requests per minute per user
- Access tracking: 1000 requests per minute per user
- Guide details: 200 requests per minute per user

## Caching Headers

- Library list: `Cache-Control: private, no-cache, no-store, must-revalidate`
- Guide details: `Cache-Control: private, no-cache, no-store, must-revalidate`
- Access tracking: `Cache-Control: no-store`

## Support

For API support or questions, please contact the development team or refer to the main API documentation. 