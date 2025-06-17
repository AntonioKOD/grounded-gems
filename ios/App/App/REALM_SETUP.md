# MongoDB Realm Setup for Sacavia iOS App

This document outlines how to set up MongoDB Realm for your Sacavia iOS app to share the same database as your web application.

## Prerequisites

1. **MongoDB Atlas Account**: You should already have this for your web app
2. **Xcode 14+**: Required for RealmSwift integration
3. **iOS 14+**: Minimum deployment target

## Setup Steps

### 1. Install MongoDB Realm Swift SDK

Add the RealmSwift package to your iOS project:

```swift
// In Xcode: File > Add Package Dependencies
// Add: https://github.com/realm/realm-swift.git
// Version: Latest stable release
```

Or add to your `Package.swift`:

```swift
dependencies: [
    .package(url: "https://github.com/realm/realm-swift.git", from: "10.45.0")
]
```

### 2. Create MongoDB Realm App

1. **Go to MongoDB Atlas Dashboard**
   - Navigate to: https://cloud.mongodb.com
   - Select your Sacavia project

2. **Create a new App Services App**
   - Click "App Services" in the left sidebar
   - Click "Create a New App"
   - Choose "Build your own App"
   - Name: `sacavia-mobile-app`
   - Select your existing cluster (same as web app)

3. **Configure Authentication**
   - Go to Authentication > Authentication Providers
   - Enable "Email/Password"
   - Set "User Confirmation Method" to "Send a confirmation email"
   - Set "Password Reset Method" to "Send a password reset email"

4. **Set up Database Access**
   - Go to App Services > Schema
   - Import your existing collections from the web app
   - Configure read/write permissions

### 3. Get Your Realm App ID

1. In your App Services dashboard, go to "App Settings"
2. Copy the "App ID" (format: `sacavia-app-xxxxx`)
3. Replace `REALM_APP_ID` in `SacaviaApp.swift`:

```swift
let REALM_APP_ID = "your-actual-app-id-here"
```

### 4. Configure Database Rules

Create rules to ensure data consistency with your web app:

```javascript
// In App Services > Rules & Roles
{
  "roles": [
    {
      "name": "owner",
      "apply_when": {},
      "document_filters": {
        "write": {"_id": "%%user.id"},
        "read": {"_id": "%%user.id"}
      },
      "read": true,
      "write": true,
      "insert": true,
      "delete": true
    }
  ]
}
```

### 5. Set up Flexible Sync (Optional)

For real-time data synchronization:

1. **Enable Sync**
   - Go to App Services > Device Sync
   - Click "Enable Sync"
   - Choose "Flexible Sync"
   - Select your database and collections

2. **Configure Sync Rules**
   ```javascript
   {
     "type": "object",
     "properties": {
       "_id": { "bsonType": "objectId" },
       "email": { "bsonType": "string" },
       "name": { "bsonType": "string" },
       "username": { "bsonType": "string" }
     },
     "required": ["_id", "email"]
   }
   ```

### 6. Update Environment Variables

Create a `Config.swift` file for environment-specific settings:

```swift
enum Config {
    static let realmAppId = "your-realm-app-id"
    static let webApiBaseUrl = "https://www.sacavia.com"
    static let devApiBaseUrl = "http://localhost:3000"
    
    static var apiBaseUrl: String {
        #if DEBUG
        return devApiBaseUrl
        #else
        return webApiBaseUrl
        #endif
    }
}
```

## Usage in Your App

### Authentication

```swift
// In your login view
@EnvironmentObject var authViewModel: AuthViewModel

// Login with Realm
try await authViewModel.authenticateWithRealm(
    email: email,
    password: password
)
```

### Data Access

```swift
// Access synced Realm data
@ObservedResults(RealmUser.self) var users
@ObservedResults(RealmLocation.self) var locations
```

### Compatibility with Web App

The iOS app maintains compatibility with your web app by:

1. **Shared Database**: Uses the same MongoDB Atlas database
2. **API Integration**: Falls back to REST API calls for complex operations
3. **Authentication**: Syncs auth state between Realm and your web backend
4. **Schema Consistency**: Realm models mirror your web app's collections

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify your Realm App ID is correct
   - Check that Email/Password auth is enabled
   - Ensure your Atlas cluster allows connections

2. **Sync Issues**
   - Verify sync is enabled and configured correctly
   - Check your sync rules and permissions
   - Ensure proper schema definitions

3. **Network Errors**
   - Add network permissions to `Info.plist`
   - Configure App Transport Security for development

### Network Configuration

Add to your `Info.plist`:

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
    <key>NSExceptionDomains</key>
    <dict>
        <key>localhost</key>
        <dict>
            <key>NSExceptionAllowsInsecureHTTPLoads</key>
            <true/>
        </dict>
    </dict>
</dict>
```

## Production Considerations

1. **Security**: Remove arbitrary loads in production
2. **Performance**: Implement proper caching strategies
3. **Offline Support**: Configure local Realm for offline functionality
4. **Error Handling**: Implement robust error handling for network issues

## Support

- MongoDB Realm Documentation: https://docs.mongodb.com/realm/
- RealmSwift GitHub: https://github.com/realm/realm-swift
- MongoDB Atlas Support: https://support.mongodb.com/ 