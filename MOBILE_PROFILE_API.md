# Mobile Profile API Documentation

This document describes the mobile profile API endpoints that provide comprehensive user profile functionality matching the web application.

## Base URL
```
https://your-domain.com/api/mobile/users
```

## Authentication
All endpoints require Bearer token authentication in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Get User Profile
**GET** `/profile`

Get comprehensive user profile information with optional data inclusion.

#### Query Parameters
- `userId` (optional): User ID to fetch. If not provided, returns current user's profile
- `includeStats` (optional): Include detailed statistics (default: true)
- `includePosts` (optional): Include recent posts (default: false)
- `postsLimit` (optional): Number of posts to include (default: 10)
- `includeFollowers` (optional): Include followers list (default: false)
- `includeFollowing` (optional): Include following list (default: false)

#### Example Request
```bash
GET /api/mobile/users/profile?userId=123&includeStats=true&includePosts=true&postsLimit=5
```

#### Response
```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "user": {
      "id": "123",
      "name": "John Doe",
      "email": "john@example.com",
      "username": "johndoe",
      "profileImage": {
        "url": "https://example.com/profile.jpg"
      },
      "coverImage": {
        "url": "https://example.com/cover.jpg"
      },
      "bio": "Travel enthusiast and food lover",
      "location": {
        "coordinates": {
          "latitude": 40.7128,
          "longitude": -74.0060
        },
        "address": "123 Main St",
        "city": "New York",
        "state": "NY",
        "country": "USA"
      },
      "role": "user",
      "isCreator": false,
      "creatorLevel": null,
      "isVerified": true,
      "preferences": {
        "categories": ["food", "travel", "culture"],
        "notifications": true,
        "radius": 25,
        "primaryUseCase": "personal",
        "budgetPreference": "moderate",
        "travelRadius": 50
      },
      "stats": {
        "postsCount": 15,
        "followersCount": 234,
        "followingCount": 89,
        "savedPostsCount": 45,
        "likedPostsCount": 123,
        "locationsCount": 3,
        "reviewCount": 8,
        "recommendationCount": 2,
        "averageRating": 4.5
      },
      "socialLinks": [
        {
          "platform": "instagram",
          "url": "https://instagram.com/johndoe"
        }
      ],
      "interests": ["food", "travel", "culture"],
      "isFollowing": false,
      "isFollowedBy": true,
      "joinedAt": "2023-01-15T10:30:00Z",
      "lastLogin": "2024-01-20T14:22:00Z",
      "website": "https://johndoe.com"
    },
    "recentPosts": [
      {
        "id": "post-123",
        "title": "Amazing Pizza in NYC",
        "content": "Just discovered the best pizza place...",
        "featuredImage": {
          "url": "https://example.com/pizza.jpg"
        },
        "likeCount": 45,
        "commentCount": 12,
        "createdAt": "2024-01-19T18:30:00Z",
        "type": "post"
      }
    ],
    "followers": [
      {
        "id": "456",
        "name": "Jane Smith",
        "username": "janesmith",
        "profileImage": {
          "url": "https://example.com/jane.jpg"
        },
        "bio": "Food blogger",
        "location": "Los Angeles, CA",
        "isVerified": false
      }
    ],
    "following": [
      {
        "id": "789",
        "name": "Bob Wilson",
        "username": "bobwilson",
        "profileImage": {
          "url": "https://example.com/bob.jpg"
        },
        "bio": "Travel photographer",
        "location": "San Francisco, CA",
        "isVerified": true
      }
    ]
  }
}
```

### 2. Update User Profile
**PUT** `/profile`

Update the current user's profile information.

#### Request Body
```json
{
  "name": "John Doe",
  "username": "johndoe",
  "bio": "Updated bio",
  "email": "john@example.com",
  "website": "https://johndoe.com",
  "location": {
    "coordinates": {
      "latitude": 40.7128,
      "longitude": -74.0060
    },
    "address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "country": "USA"
  },
  "interests": ["food", "travel", "culture"],
  "searchRadius": 25,
  "notificationSettings": {
    "enabled": true
  },
  "socialLinks": [
    {
      "platform": "instagram",
      "url": "https://instagram.com/johndoe"
    }
  ],
  "deviceInfo": {
    "platform": "ios",
    "appVersion": "1.0.0",
    "lastSeen": "2024-01-20T14:22:00Z"
  }
}
```

#### Response
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      // Updated user object
    }
  }
}
```

### 3. Get User Statistics
**GET** `/{userId}/stats`

Get detailed user statistics and achievements.

#### Example Request
```bash
GET /api/mobile/users/123/stats
```

#### Response
```json
{
  "success": true,
  "message": "User statistics retrieved successfully",
  "data": {
    "stats": {
      "postsCount": 15,
      "followersCount": 234,
      "followingCount": 89,
      "savedPostsCount": 45,
      "likedPostsCount": 123,
      "locationsCount": 3,
      "reviewCount": 8,
      "recommendationCount": 2,
      "averageRating": 4.5,
      "totalEngagement": 567,
      "totalPosts": 25
    },
    "achievements": {
      "isExpertReviewer": true,
      "isVerified": true,
      "isCreator": false,
      "creatorLevel": null,
      "joinDate": "2023-01-15T10:30:00Z",
      "daysActive": 370
    }
  }
}
```

### 4. Get User Posts
**GET** `/{userId}/posts`

Get user posts with filtering and pagination.

#### Query Parameters
- `type` (optional): Filter by content type - `all`, `posts`, `reviews`, `recommendations` (default: all)
- `limit` (optional): Number of posts per page (default: 20)
- `page` (optional): Page number (default: 1)
- `sort` (optional): Sort order - `newest`, `oldest`, `popular` (default: newest)

#### Example Request
```bash
GET /api/mobile/users/123/posts?type=reviews&limit=10&page=1&sort=popular
```

#### Response
```json
{
  "success": true,
  "message": "User posts retrieved successfully",
  "data": {
    "posts": [
      {
        "id": "post-123",
        "type": "review",
        "title": "Amazing Restaurant Review",
        "content": "This place exceeded all expectations...",
        "featuredImage": {
          "url": "https://example.com/restaurant.jpg"
        },
        "likeCount": 45,
        "commentCount": 12,
        "shareCount": 5,
        "saveCount": 8,
        "rating": 5,
        "location": {
          "id": "loc-456",
          "name": "Amazing Restaurant",
          "address": "123 Food St, NYC"
        },
        "createdAt": "2024-01-19T18:30:00Z",
        "updatedAt": "2024-01-19T18:30:00Z",
        "isLiked": true,
        "isSaved": false
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    },
    "stats": {
      "totalPosts": 15,
      "totalReviews": 8,
      "totalRecommendations": 2,
      "averageRating": 4.5
    }
  }
}
```

### 5. Get User Photos
**GET** `/{userId}/photos`

Get user photos from posts, reviews, and location submissions.

#### Query Parameters
- `type` (optional): Filter by photo source - `all`, `posts`, `reviews`, `locations` (default: all)
- `limit` (optional): Number of photos per page (default: 20)
- `page` (optional): Page number (default: 1)
- `sort` (optional): Sort order - `newest`, `oldest`, `popular` (default: newest)

#### Example Request
```bash
GET /api/mobile/users/123/photos?type=posts&limit=15&page=1&sort=newest
```

#### Response
```json
{
  "success": true,
  "message": "User photos retrieved successfully",
  "data": {
    "photos": [
      {
        "id": "post-123",
        "type": "post",
        "url": "https://example.com/photo.jpg",
        "thumbnail": "https://example.com/photo-thumb.jpg",
        "alt": "Delicious pizza",
        "caption": "Best pizza in NYC!",
        "width": 1920,
        "height": 1080,
        "filesize": 2048576,
        "postId": "post-123",
        "createdAt": "2024-01-19T18:30:00Z",
        "likeCount": 45,
        "commentCount": 12,
        "location": {
          "id": "loc-456",
          "name": "Pizza Place",
          "address": "123 Pizza St, NYC"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 15,
      "total": 45,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    },
    "stats": {
      "totalPhotos": 45,
      "totalPostPhotos": 25,
      "totalReviewPhotos": 15,
      "totalLocationPhotos": 5
    }
  }
}
```

### 6. Get User Followers
**GET** `/{userId}/followers`

Get list of users following the specified user.

#### Query Parameters
- `limit` (optional): Number of followers per page (default: 50)
- `page` (optional): Page number (default: 1)

#### Example Request
```bash
GET /api/mobile/users/123/followers?limit=20&page=1
```

#### Response
```json
{
  "success": true,
  "message": "Followers list retrieved successfully",
  "data": {
    "followers": [
      {
        "id": "456",
        "name": "Jane Smith",
        "username": "janesmith",
        "profileImage": {
          "url": "https://example.com/jane.jpg"
        },
        "bio": "Food blogger",
        "location": "Los Angeles, CA",
        "isVerified": false
      }
    ],
    "totalCount": 234
  }
}
```

### 7. Get User Following
**GET** `/{userId}/following`

Get list of users that the specified user is following.

#### Query Parameters
- `limit` (optional): Number of following per page (default: 50)
- `page` (optional): Page number (default: 1)

#### Example Request
```bash
GET /api/mobile/users/123/following?limit=20&page=1
```

#### Response
```json
{
  "success": true,
  "message": "Following list retrieved successfully",
  "data": {
    "following": [
      {
        "id": "789",
        "name": "Bob Wilson",
        "username": "bobwilson",
        "profileImage": {
          "url": "https://example.com/bob.jpg"
        },
        "bio": "Travel photographer",
        "location": "San Francisco, CA",
        "isVerified": true
      }
    ],
    "totalCount": 89
  }
}
```

### 8. Follow/Unfollow User
**POST** `/{userId}/follow`

Follow a user.

#### Response
```json
{
  "success": true,
  "message": "User followed successfully",
  "data": {
    "isFollowing": true,
    "followersCount": 235,
    "userId": "123"
  }
}
```

**DELETE** `/{userId}/follow`

Unfollow a user.

#### Response
```json
{
  "success": true,
  "message": "User unfollowed successfully",
  "data": {
    "isFollowing": false,
    "followersCount": 234,
    "userId": "123"
  }
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message",
  "code": "ERROR_CODE"
}
```

### Common Error Codes
- `VALIDATION_ERROR`: Invalid query parameters or request body
- `NO_TOKEN`: No authentication token provided
- `NO_USER`: No authenticated user found
- `INVALID_USER_ID`: Invalid user ID format
- `USER_NOT_FOUND`: User does not exist
- `SERVER_ERROR`: Internal server error

## Caching

- Profile data: 5 minutes for own profile, 10 minutes for other profiles
- Statistics: 5 minutes
- Posts and photos: 5 minutes
- Followers/following: 5 minutes

## Rate Limiting

- Profile endpoints: 100 requests per minute
- Follow/unfollow: 10 requests per minute
- Statistics: 200 requests per minute

## iOS Integration Example

```swift
// Get user profile
func getUserProfile(userId: String? = nil) async throws -> UserProfile {
    var url = "\(baseURL)/api/mobile/users/profile"
    if let userId = userId {
        url += "?userId=\(userId)&includeStats=true&includePosts=true"
    }
    
    let request = URLRequest(url: URL(string: url)!)
    let (data, _) = try await URLSession.shared.data(for: request)
    let response = try JSONDecoder().decode(ProfileResponse.self, from: data)
    
    return response.data.user
}

// Update profile
func updateProfile(profileData: ProfileUpdateData) async throws -> UserProfile {
    let url = URL(string: "\(baseURL)/api/mobile/users/profile")!
    var request = URLRequest(url: url)
    request.httpMethod = "PUT"
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONEncoder().encode(profileData)
    
    let (data, _) = try await URLSession.shared.data(for: request)
    let response = try JSONDecoder().decode(ProfileResponse.self, from: data)
    
    return response.data.user
}
```

This mobile profile API provides comprehensive functionality that matches the web application, including user profiles, statistics, posts, photos, and social features like following/followers. 