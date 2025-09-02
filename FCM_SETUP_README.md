# Firebase Cloud Messaging (FCM) Setup for iOS Push Notifications

This guide explains how to set up Firebase Cloud Messaging for iOS push notifications in your Next.js + Payload CMS application.

## Overview

The FCM implementation provides:
- Device token registration and management
- Push notification sending to individual users or groups
- Topic-based subscriptions
- iOS-specific APNs payload configuration
- Notification logging and analytics
- Health monitoring and status checks

## Files Created

```
lib/firebase-admin.ts              # Firebase Admin SDK configuration and FCM functions
app/api/fcm/register-device/       # Device token registration API
app/api/fcm/send-notification/     # Notification sending API
app/api/fcm/topics/                # Topic subscription management API
app/api/fcm/status/                # FCM service status and health check API
lib/notification-service.ts         # High-level notification service utilities
env.example                        # Environment variables template
```

## Prerequisites

1. **Firebase Project**: Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. **Service Account Key**: Download your Firebase service account key JSON file
3. **iOS App**: Configure your iOS app with Firebase (add `GoogleService-Info.plist`)
4. **APNs Certificate**: Upload your APNs certificate to Firebase Console

## Setup Steps

### 1. Environment Variables

Copy the environment variables from `env.example` to your `.env.local` file:

```bash
cp env.example .env.local
```

Fill in your Firebase project details:

```env
FIREBASE_PROJECT_ID=your-actual-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour actual private key\n-----END PRIVATE KEY-----\n"
# ... other Firebase variables
```

### 2. Firebase Service Account Setup

1. Go to Firebase Console > Project Settings > Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Extract the values to your environment variables

### 3. iOS App Configuration

1. Add `GoogleService-Info.plist` to your iOS project
2. Enable Push Notifications capability in Xcode
3. Configure your app delegate to handle FCM tokens

## API Endpoints

### Device Token Registration

**POST** `/api/fcm/register-device`
```json
{
  "deviceToken": "fcm_device_token_here",
  "userId": "user_id_here",
  "deviceInfo": {
    "model": "iPhone 15",
    "os": "iOS 17.0",
    "appVersion": "1.0.0"
  }
}
```

**DELETE** `/api/fcm/register-device`
```json
{
  "deviceToken": "fcm_device_token_here",
  "userId": "user_id_here"
}
```

### Send Notifications

**POST** `/api/fcm/send-notification` (to multiple users)
```json
{
  "userIds": ["user1", "user2"],
  "notification": {
    "title": "Hello!",
    "body": "This is a test notification",
    "imageUrl": "https://example.com/image.jpg"
  },
  "data": {
    "type": "test",
    "action": "open_app"
  }
}
```

**PUT** `/api/fcm/send-notification` (to single user)
```json
{
  "userId": "user_id_here",
  "notification": {
    "title": "Hello!",
    "body": "This is a test notification"
  }
}
```

### Topic Management

**POST** `/api/fcm/topics` (subscribe)
```json
{
  "deviceToken": "fcm_device_token_here",
  "topic": "news"
}
```

**DELETE** `/api/fcm/topics` (unsubscribe)
```json
{
  "deviceToken": "fcm_device_token_here",
  "topic": "news"
}
```

### Status Check

**GET** `/api/fcm/status`

Returns FCM service status, device token statistics, and notification metrics.

## Usage Examples

### Using the Notification Service

```typescript
import { NotificationService } from '@/lib/notification-service'

// Send welcome notification
await NotificationService.sendWelcomeNotification(userId, userName)

// Send new follower notification
await NotificationService.sendNewFollowerNotification(userId, followerName, followerId)

// Send event reminder
await NotificationService.sendEventReminderNotification(
  userId, 
  eventName, 
  eventId, 
  eventTime
)

// Send to multiple users
await NotificationService.sendToUsers({
  userIds: ['user1', 'user2'],
  title: 'Important Update',
  body: 'Please check the latest features'
})
```

### Direct FCM Usage

```typescript
import { sendFCMMessage, sendFCMMessageToTopic } from '@/lib/firebase-admin'

// Send to specific device
const result = await sendFCMMessage(
  deviceToken,
  { title: 'Hello', body: 'Test message' },
  { type: 'test' }
)

// Send to topic
await sendFCMMessageToTopic(
  'news',
  { title: 'Breaking News', body: 'Latest updates' }
)
```

## iOS-Specific Features

### APNs Payload Customization

```typescript
const notification = {
  title: 'Custom Notification',
  body: 'With custom APNs settings',
  apns: {
    payload: {
      category: 'custom_category',
      'thread-id': 'custom_thread',
      'mutable-content': '1' // For rich notifications
    },
    headers: {
      'apns-priority': '10', // High priority
      'apns-expiration': Math.floor(Date.now() / 1000) + 3600 // 1 hour
    }
  }
}
```

### Rich Notifications

To enable rich notifications with images:

1. Set `mutable-content: 1` in APNs payload
2. Include `imageUrl` in notification
3. Implement notification service extension in iOS app

## Testing

### 1. Check FCM Status

```bash
curl http://localhost:3000/api/fcm/status
```

### 2. Test Device Registration

```bash
curl -X POST http://localhost:3000/api/fcm/register-device \
  -H "Content-Type: application/json" \
  -d '{
    "deviceToken": "test_token",
    "userId": "test_user",
    "deviceInfo": {"platform": "ios"}
  }'
```

### 3. Test Notification Sending

```bash
curl -X POST http://localhost:3000/api/fcm/send-notification \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["test_user"],
    "notification": {
      "title": "Test",
      "body": "Test notification"
    }
  }'
```

## Troubleshooting

### Common Issues

1. **Firebase not initialized**: Check environment variables and service account key
2. **Invalid device token**: Ensure token format is correct and not expired
3. **APNs errors**: Verify APNs certificate in Firebase Console
4. **Permission denied**: Check Firebase project permissions and service account roles

### Debug Steps

1. Check `/api/fcm/status` endpoint for service health
2. Verify environment variables are loaded correctly
3. Check Firebase Console for error logs
4. Test with a simple notification first

### Logs

The service logs detailed information about:
- FCM message sending attempts
- Success/failure counts
- Device token validation
- APNs payload construction

## Security Considerations

1. **Service Account Key**: Keep your Firebase service account key secure
2. **Token Validation**: Validate device tokens before sending notifications
3. **Rate Limiting**: Implement rate limiting for notification endpoints
4. **User Authentication**: Ensure only authorized users can send notifications

## Performance Optimization

1. **Batch Sending**: Use `sendFCMMessageToMultipleTokens` for multiple recipients
2. **Topic Subscriptions**: Use topics for broadcast notifications
3. **Token Cleanup**: Regularly clean up inactive device tokens
4. **Caching**: Cache frequently used user device tokens

## Monitoring

Monitor your FCM implementation using:

1. **Firebase Console**: Message delivery statistics
2. **API Status Endpoint**: Service health and metrics
3. **Application Logs**: Detailed error and success logs
4. **Device Token Analytics**: Active vs inactive token counts

## Support

For issues related to:
- **Firebase Setup**: Check [Firebase Documentation](https://firebase.google.com/docs)
- **APNs Configuration**: Refer to [Apple Developer Documentation](https://developer.apple.com/documentation/usernotifications)
- **FCM Implementation**: Review this README and code comments
