# Enhanced Mobile Signup API

## Overview

The mobile signup API has been enhanced to match the comprehensive data collection from the web signup flow. This ensures consistent user experience and data collection across both platforms.

## API Endpoint

```
POST /api/mobile/auth/register
```

## Request Structure

### Basic Fields (Required)
```typescript
{
  name: string,           // 2-50 characters
  username: string,       // 3-30 characters, unique
  email: string,          // Valid email format
  password: string,       // Min 8 chars, uppercase, lowercase, number
  confirmPassword: string, // Must match password
  termsAccepted: boolean, // Must be true
  privacyAccepted: boolean // Must be true
}
```

### Location Data (Optional)
```typescript
{
  coords?: {
    latitude: number,     // -90 to 90
    longitude: number     // -180 to 180
  },
  location?: {
    coordinates: {
      latitude: number,
      longitude: number
    },
    address?: string
  }
}
```

### Enhanced Preferences (Optional)
```typescript
{
  preferences?: {
    categories: string[],     // Array of category slugs
    notifications: boolean,   // Default: true
    radius: number           // 1-100, Default: 25
  }
}
```

### Additional Data (Matching Web Signup)
```typescript
{
  additionalData?: {
    username?: string,        // Redundant with top-level username
    interests: string[],      // Array of interest slugs
    receiveUpdates: boolean,  // Default: true
    onboardingData?: {
      primaryUseCase?: 'explore' | 'plan' | 'share' | 'connect',
      travelRadius?: string,  // '0.5' | '2' | '5' | '15' | 'unlimited'
      budgetPreference?: 'free' | 'budget' | 'moderate' | 'premium' | 'luxury',
      onboardingCompleted?: boolean, // Default: true
      signupStep?: number     // Default: 3
    }
  }
}
```

### Device Information (Optional)
```typescript
{
  deviceInfo?: {
    deviceId?: string,
    platform?: 'ios' | 'android',
    appVersion?: string
  }
}
```

## Complete Example Request

```json
{
  "name": "John Doe",
  "username": "johndoe123",
  "email": "john@example.com",
  "password": "SecurePass123",
  "confirmPassword": "SecurePass123",
  "coords": {
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "preferences": {
    "categories": ["coffee", "restaurants", "nature"],
    "notifications": true,
    "radius": 25
  },
  "additionalData": {
    "interests": ["coffee", "restaurants", "nature"],
    "receiveUpdates": true,
    "onboardingData": {
      "primaryUseCase": "explore",
      "travelRadius": "5",
      "budgetPreference": "moderate",
      "onboardingCompleted": true,
      "signupStep": 3
    }
  },
  "deviceInfo": {
    "platform": "ios",
    "appVersion": "1.0.0"
  },
  "termsAccepted": true,
  "privacyAccepted": true
}
```

## Response Structure

### Success Response (Auto-login)
```typescript
{
  success: true,
  message: "Account created and logged in successfully",
  data: {
    user: {
      id: string,
      name: string,
      email: string,
      username: string,
      profileImage?: { url: string } | null,
      location?: {
        coordinates?: { latitude: number, longitude: number },
        address?: string
      },
      role: string,
      preferences?: {
        categories: string[],
        notifications: boolean,
        radius: number
      },
      additionalData?: {
        interests: string[],
        receiveUpdates: boolean,
        onboardingData?: {
          primaryUseCase?: string,
          travelRadius?: string,
          budgetPreference?: string,
          onboardingCompleted: boolean,
          signupStep: number
        }
      }
    },
    token: string,
    expiresIn: number
  }
}
```

### Success Response (Email Verification Required)
```typescript
{
  success: true,
  message: "Account created successfully! Please check your email to verify your account, then you can log in.",
  data: {
    user: { /* same user object as above */ },
    emailVerificationRequired: true
  }
}
```

### Error Response
```typescript
{
  success: false,
  message: string,
  error: string,
  code: string
}
```

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Input validation failed | 400 |
| `TERMS_NOT_ACCEPTED` | Terms/privacy not accepted | 400 |
| `USER_EXISTS` | Email already registered | 409 |
| `USERNAME_TAKEN` | Username already in use | 409 |
| `DUPLICATE_EMAIL` | Database duplicate email | 409 |
| `REGISTRATION_FAILED` | User creation failed | 500 |
| `SERVER_ERROR` | Internal server error | 500 |

## Data Storage Structure

The enhanced API stores user data in the following structure within Payload CMS:

### User Document
```typescript
{
  // Basic info
  name: string,
  username: string,
  email: string,
  password: string, // Hashed
  role: 'user',
  
  // Location
  location?: {
    coordinates: { latitude: number, longitude: number },
    address?: string
  },
  
  // Interests (legacy field)
  interests: string[],
  
  // Enhanced preferences
  preferences: {
    categories: string[],
    radius: number,
    notifications: boolean
  },
  
  // Additional data (matching web signup)
  additionalData?: {
    interests: string[],
    receiveUpdates: boolean,
    onboardingData?: {
      primaryUseCase?: string,
      travelRadius?: string,
      budgetPreference?: string,
      onboardingCompleted: boolean,
      signupStep: number
    }
  },
  
  // Device tracking
  deviceInfo?: {
    deviceId?: string,
    platform?: string,
    appVersion?: string,
    registeredAt: Date,
    lastSeen: Date
  },
  
  // Legal acceptance
  termsAcceptedAt: Date,
  privacyAcceptedAt: Date,
  
  // Registration metadata
  registrationSource: 'mobile',
  
  // Notification settings
  notificationSettings: {
    enabled: boolean,
    pushNotifications: boolean,
    emailNotifications: boolean
  }
}
```

## Key Enhancements

### 1. **Comprehensive Data Collection**
- Matches all fields from web signup flow
- Supports interests, onboarding data, and preferences
- Maintains backward compatibility

### 2. **Enhanced Validation**
- Username availability checking
- Password strength requirements
- Email format validation
- Terms acceptance validation

### 3. **Flexible Location Handling**
- Supports both `coords` and `location` structures
- Prioritizes `coords` for consistency
- Optional address field

### 4. **Auto-login Support**
- Attempts to log user in after registration
- Handles email verification requirements gracefully
- Returns appropriate response based on verification status

### 5. **Enhanced Error Handling**
- Specific error codes for different scenarios
- Detailed error messages
- Proper HTTP status codes

## Integration with iOS App

### SwiftUI Implementation
```swift
struct SignupRequest {
    let name: String
    let username: String
    let email: String
    let password: String
    let confirmPassword: String
    let coords: Coordinates?
    let preferences: Preferences?
    let additionalData: AdditionalData?
    let deviceInfo: DeviceInfo?
    let termsAccepted: Bool
    let privacyAccepted: Bool
}

struct Coordinates {
    let latitude: Double
    let longitude: Double
}

struct Preferences {
    let categories: [String]
    let notifications: Bool
    let radius: Int
}

struct AdditionalData {
    let interests: [String]
    let receiveUpdates: Bool
    let onboardingData: OnboardingData?
}

struct OnboardingData {
    let primaryUseCase: String?
    let travelRadius: String?
    let budgetPreference: String?
    let onboardingCompleted: Bool
    let signupStep: Int
}

struct DeviceInfo {
    let platform: String
    let appVersion: String
}
```

### API Call Example
```swift
func signup(request: SignupRequest) async throws -> SignupResponse {
    let url = URL(string: "\(baseURL)/api/mobile/auth/register")!
    var urlRequest = URLRequest(url: url)
    urlRequest.httpMethod = "POST"
    urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
    
    let encoder = JSONEncoder()
    urlRequest.httpBody = try encoder.encode(request)
    
    let (data, response) = try await URLSession.shared.data(for: urlRequest)
    
    guard let httpResponse = response as? HTTPURLResponse else {
        throw NetworkError.invalidResponse
    }
    
    let decoder = JSONDecoder()
    let signupResponse = try decoder.decode(SignupResponse.self, from: data)
    
    if !signupResponse.success {
        throw NetworkError.apiError(signupResponse.error ?? "Unknown error")
    }
    
    return signupResponse
}
```

## Migration Guide

### For Existing Mobile Apps

1. **Update Request Structure**
   - Add `additionalData` field for enhanced onboarding
   - Include `onboardingData` with user preferences
   - Add `coords` field for location data

2. **Handle Enhanced Responses**
   - Check for `emailVerificationRequired` flag
   - Handle optional `token` field
   - Process `additionalData` in user object

3. **Update Error Handling**
   - Handle new error codes (`USERNAME_TAKEN`, etc.)
   - Display appropriate error messages

### Backward Compatibility

The API maintains backward compatibility:
- Existing fields continue to work
- New fields are optional
- Legacy `preferences.categories` maps to `interests`
- Old response format still supported

## Testing

### Test Cases

1. **Basic Registration**
   - Required fields only
   - Verify user creation
   - Check auto-login

2. **Enhanced Registration**
   - All optional fields
   - Verify data storage
   - Check response structure

3. **Error Scenarios**
   - Duplicate email
   - Duplicate username
   - Invalid data
   - Terms not accepted

4. **Location Handling**
   - GPS coordinates
   - Address only
   - Both coordinates and address

### Sample Test Data

```json
{
  "name": "Test User",
  "username": "testuser123",
  "email": "test@example.com",
  "password": "TestPass123",
  "confirmPassword": "TestPass123",
  "coords": {
    "latitude": 37.7749,
    "longitude": -122.4194
  },
  "additionalData": {
    "interests": ["coffee", "restaurants"],
    "receiveUpdates": true,
    "onboardingData": {
      "primaryUseCase": "explore",
      "travelRadius": "5",
      "budgetPreference": "moderate"
    }
  },
  "deviceInfo": {
    "platform": "ios",
    "appVersion": "1.0.0"
  },
  "termsAccepted": true,
  "privacyAccepted": true
}
```

## Best Practices

1. **Data Validation**
   - Validate all inputs on client side
   - Handle server validation errors gracefully
   - Provide clear error messages

2. **User Experience**
   - Show loading states during registration
   - Handle network errors appropriately
   - Guide users through email verification

3. **Security**
   - Never store passwords in plain text
   - Use HTTPS for all API calls
   - Validate tokens on subsequent requests

4. **Performance**
   - Debounce username availability checks
   - Cache categories and preferences
   - Optimize location requests

## Conclusion

The enhanced mobile signup API now provides feature parity with the web signup flow while maintaining the flexibility and performance requirements of mobile applications. This ensures a consistent user experience across platforms and enables comprehensive data collection for personalization features. 