# APNs Push Notification Setup Guide

## 🎉 **Enhanced APNs Configuration**

This guide covers the complete setup for Apple Push Notification service (APNs) in the Sacavia backend, including all the recent improvements and enhancements.

## 📋 **What's New**

### ✅ **Enhanced Features**
- **Token Caching**: APNs tokens are now cached for 55 minutes to improve performance
- **Retry Logic**: Automatic retry with configurable attempts and delays
- **Better Error Handling**: Detailed error messages and status reporting
- **Configuration Validation**: Startup validation of all APNs settings
- **System Health Monitoring**: Comprehensive system status endpoints
- **Management Tools**: Interactive configuration management script

### 🔧 **New API Endpoints**
- `GET /api/mobile/system/status` - Comprehensive system health check
- `GET /api/mobile/notifications/test` - Get notification system status
- Enhanced `POST /api/mobile/notifications/test` - Better error reporting

### 🛠️ **Management Scripts**
- `scripts/manage-apns.js` - Interactive APNs configuration manager

## 🚀 **Quick Setup**

### **Step 1: Environment Configuration**

1. **Run the management script**:
   ```bash
   node scripts/manage-apns.js
   ```

2. **Or manually configure** in `.env.local`:
   ```env
   # APNs Configuration for iOS Push Notifications
   APN_KEY_ID=VYNFGZAT99
   APN_TEAM_ID=WAWJ7L538T
   APN_BUNDLE_ID=com.sacavia.app
   APN_KEY_PATH=/Users/antoniokodheli/sacavia/AuthKey_VYNFGZAT99.p8
   
   # Optional: Retry configuration
   APN_RETRY_ATTEMPTS=3
   APN_RETRY_DELAY=1000
   ```

### **Step 2: Verify Configuration**

1. **Test the configuration**:
   ```bash
   node scripts/manage-apns.js
   # Select option 2: Test APNs configuration
   ```

2. **Check system status**:
   ```bash
   curl http://localhost:3000/api/mobile/system/status
   ```

### **Step 3: Test Notifications**

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Test from iOS app**:
   - Go to Profile > Settings > Test Notifications
   - Click "Test Server Notification"

## 🔍 **Configuration Details**

### **Environment Variables**

| Variable | Description | Example |
|----------|-------------|---------|
| `APN_KEY_ID` | Your APNs Key ID from Apple Developer Portal | `VYNFGZAT99` |
| `APN_TEAM_ID` | Your Team ID from Apple Developer Portal | `WAWJ7L538T` |
| `APN_BUNDLE_ID` | Your iOS app bundle identifier | `com.sacavia.app` |
| `APN_KEY_PATH` | Absolute path to your .p8 key file | `/path/to/AuthKey_KEYID.p8` |
| `APN_RETRY_ATTEMPTS` | Number of retry attempts (optional) | `3` |
| `APN_RETRY_DELAY` | Delay between retries in ms (optional) | `1000` |

### **Key File Requirements**

- **Format**: `.p8` file from Apple Developer Portal
- **Permissions**: `600` (read/write for owner only)
- **Location**: Secure location on your server
- **Content**: Should start with `-----BEGIN PRIVATE KEY-----`

## 🛠️ **Management Tools**

### **Interactive Configuration Manager**

```bash
node scripts/manage-apns.js
```

**Available Actions**:
1. **Show current configuration** - Display all APNs settings
2. **Test APNs configuration** - Validate all settings and key file
3. **Update APNs settings** - Interactive configuration update
4. **Validate key file** - Check key file format and permissions
5. **Generate environment template** - Create template for new setups

### **System Status API**

```bash
# Get comprehensive system status
curl http://localhost:3000/api/mobile/system/status

# Get notification system status (requires auth)
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/mobile/notifications/test
```

## 📊 **Enhanced Error Handling**

### **APNs Error Codes**

The system now provides detailed error information:

- **400**: Bad request - check payload format
- **403**: Authentication failed - check APNs configuration
- **410**: Device token no longer valid - should be removed from database
- **500**: Internal server error - check server logs

### **Response Format**

```json
{
  "success": true,
  "message": "Test notification sent successfully",
  "data": {
    "userId": "user_id",
    "sentCount": 1,
    "totalCount": 1,
    "deviceTokensCount": 1,
    "environment": "development",
    "apnsStatus": {
      "configured": true,
      "initialized": true,
      "environment": "development",
      "bundleId": "com.sacavia.app",
      "keyExists": true
    },
    "timestamp": "2025-08-27T03:30:00.000Z"
  }
}
```

## 🔧 **Troubleshooting**

### **Common Issues**

#### **1. "APNs not initialized"**
**Solution**: Check environment variables and key file path
```bash
node scripts/manage-apns.js
# Select option 2 to test configuration
```

#### **2. "Key file not found"**
**Solution**: Verify the absolute path in `APN_KEY_PATH`
```bash
ls -la /path/to/your/AuthKey_KEYID.p8
```

#### **3. "Authentication failed"**
**Solution**: Verify Key ID and Team ID from Apple Developer Portal
```bash
# Check in Apple Developer Portal:
# Certificates, Identifiers & Profiles > Keys
```

#### **4. "Device token invalid"**
**Solution**: The device token has expired, remove it from database
```bash
# The system will automatically log this error
# Clean up invalid tokens in your database
```

### **Debug Mode**

Enable detailed logging by checking server console output:

```bash
npm run dev
# Watch for APNs-related log messages
```

## 🚀 **Production Deployment**

### **Environment Setup**

1. **Set production environment**:
   ```env
   NODE_ENV=production
   ```

2. **Update APNs environment**:
   ```env
   APN_KEY_PATH=/secure/path/to/production/AuthKey_KEYID.p8
   ```

3. **Verify configuration**:
   ```bash
   curl https://your-domain.com/api/mobile/system/status
   ```

### **Security Considerations**

- **Key File**: Store in secure location with restricted access
- **Permissions**: Set key file permissions to `600`
- **Environment**: Use production APNs endpoints automatically
- **Monitoring**: Monitor system status endpoint for health checks

## 📈 **Performance Optimizations**

### **Token Caching**
- APNs tokens are cached for 55 minutes
- Automatic refresh before expiry
- Reduces API calls to Apple

### **Retry Logic**
- Configurable retry attempts (default: 3)
- Exponential backoff between retries
- Handles temporary network issues

### **Batch Processing**
- Send to multiple devices efficiently
- Detailed success/failure reporting
- Error aggregation for debugging

## 🔄 **API Reference**

### **Send Notification to User**

```typescript
import { apnsSender } from '@/lib/apns-config'

const result = await apnsSender.sendNotificationToUser(userId, {
  title: 'Notification Title',
  body: 'Notification body text',
  badge: 1,
  sound: 'default',
  category: 'MESSAGE',
  threadId: 'conversation-123',
  data: {
    type: 'message',
    conversationId: '123'
  }
})

console.log(`Sent to ${result.sentCount}/${result.totalCount} devices`)
```

### **Check System Status**

```typescript
import { apnsSender } from '@/lib/apns-config'

const status = apnsSender.getStatus()
console.log('APNs configured:', status.configured)
console.log('Environment:', status.environment)
```

## 📞 **Support**

If you encounter issues:

1. **Check the troubleshooting section above**
2. **Run the management script**: `node scripts/manage-apns.js`
3. **Check system status**: `/api/mobile/system/status`
4. **Review server logs** for detailed error messages

## 🎯 **Success Indicators**

When everything is working correctly, you should see:

- ✅ **System Status**: 100% health in `/api/mobile/system/status`
- ✅ **APNs Initialization**: "APNs configuration initialized successfully"
- ✅ **Token Generation**: "APNs token generated and cached"
- ✅ **Notification Delivery**: "APNs notification sent successfully"
- ✅ **iOS App**: Push notifications appear on device

---

**Last Updated**: August 27, 2025  
**Version**: 2.0.0  
**Status**: Production Ready ✅
