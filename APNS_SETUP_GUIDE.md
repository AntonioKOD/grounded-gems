# APNs Push Notification Setup Guide

## 🚨 **Current Issue**
Based on Apple's documentation and your current setup, the iOS push notifications are failing because:

1. **iOS App**: Push Notifications capability not properly configured in Xcode
2. **Server**: Missing APNs (Apple Push Notification service) configuration
3. **APNs Certificates**: Not configured on the server

## 🔧 **Complete Solution**

### **Step 1: iOS App Configuration (Xcode)**

#### **1.1 Add Push Notifications Capability**
1. **Open Xcode** → `SacaviaApp.xcodeproj`
2. **Select project** → **Select target** → **"Signing & Capabilities"**
3. **Click "+ Capability"** → **Search "Push Notifications"** → **Add it**
4. **Click "+ Capability" again** → **Search "Background Modes"** → **Add it**
5. **Check "Remote notifications"** in Background Modes
6. **Save project** (Cmd+S)

#### **1.2 Verify Entitlements**
Your `SacaviaApp.entitlements` should contain:
```xml
<key>aps-environment</key>
<string>development</string>
```

#### **1.3 Clean and Rebuild**
1. **Product → Clean Build Folder** (Shift+Cmd+K)
2. **Delete app from device**
3. **Build and run again**

### **Step 2: Apple Developer Portal Configuration**

#### **2.1 Enable Push Notifications for App ID**
1. **Go to [Apple Developer Portal](https://developer.apple.com/account/)**
2. **Certificates, Identifiers & Profiles** → **Identifiers**
3. **Find your App ID** (`com.sacavia.app`)
4. **Click to edit**
5. **Scroll to "Capabilities"**
6. **Enable "Push Notifications"**
7. **Save changes**

#### **2.2 Generate APNs Authentication Key**
1. **In Apple Developer Portal** → **Keys**
2. **Click "+" to create new key**
3. **Name it** (e.g., "Sacavia APNs Key")
4. **Check "Apple Push Notifications service (APNs)"**
5. **Click "Continue" and "Register"**
6. **Download the .p8 file** (save securely!)
7. **Note the Key ID** (you'll need this)

### **Step 3: Server Configuration**

#### **3.1 Install Required Packages**
```bash
npm install jsonwebtoken
```

#### **3.2 Set Environment Variables**
Add these to your `.env.local`:
```env
# APNs Configuration
APN_KEY_ID=YOUR_KEY_ID_HERE
APN_TEAM_ID=YOUR_TEAM_ID_HERE
APN_KEY_PATH=/path/to/your/AuthKey_KEYID.p8
APN_BUNDLE_ID=com.sacavia.app
```

#### **3.3 Upload APNs Key to Server**
1. **Upload the .p8 file** to your server securely
2. **Set proper permissions**: `chmod 600 AuthKey_KEYID.p8`
3. **Update `APN_KEY_PATH`** to point to the file location

### **Step 4: Update Server Code**

#### **4.1 Install JWT Library**
```bash
npm install jsonwebtoken
```

#### **4.2 Update APNs Configuration**
Replace the placeholder in `lib/apns-config.ts` with proper JWT implementation:

```typescript
import jwt from 'jsonwebtoken'
import fs from 'fs'

class APNsTokenGenerator {
  private config: APNsConfig

  constructor(config: APNsConfig) {
    this.config = config
  }

  async generateToken(): Promise<string> {
    const privateKey = fs.readFileSync(this.config.keyPath, 'utf8')
    
    const token = jwt.sign({}, privateKey, {
      algorithm: 'ES256',
      header: {
        alg: 'ES256',
        kid: this.config.keyId
      },
      issuer: this.config.teamId,
      expiresIn: '1h'
    })

    return token
  }
}
```

#### **4.3 Update Notification Sending**
Update your notification endpoints to use APNs:

```typescript
import { apnsSender } from '@/lib/apns-config'

// In your notification endpoints
const success = await apnsSender.sendNotificationToUser(userId, {
  title: 'Test Notification',
  body: 'This is a test push notification',
  badge: 1,
  sound: 'default',
  data: {
    type: 'test',
    timestamp: Date.now()
  }
})
```

### **Step 5: Testing**

#### **5.1 Test iOS App**
1. **Run app on real device** (not simulator)
2. **Grant notification permission**
3. **Check console logs** for:
   ```
   📱 [PushNotificationManager] ✅ aps-environment found: development
   📱 [PushNotificationManager] ✅ Entitlements file found
   📱 [AppDelegate] ✅ Successfully registered for remote notifications
   📱 [PushNotificationManager] Device token: [ACTUAL_TOKEN]
   ```

#### **5.2 Test Server Notifications**
1. **Use the NotificationTestView** in the iOS app
2. **Send test notification** from server
3. **Check server logs** for APNs responses

## 🔍 **Troubleshooting**

### **Common Issues:**

#### **Issue 1: "aps-environment NOT found"**
**Solution:**
- Ensure Push Notifications capability is added in Xcode
- Clean and rebuild the project
- Check entitlements file path in Build Settings

#### **Issue 2: "Device token not available"**
**Solution:**
- Run on real device (not simulator)
- Grant notification permission
- Check app signing

#### **Issue 3: "APNs authentication failed"**
**Solution:**
- Verify Key ID and Team ID are correct
- Check .p8 file path and permissions
- Ensure App ID has Push Notifications enabled

#### **Issue 4: "Invalid device token"**
**Solution:**
- Ensure device token is properly registered
- Check bundle ID matches
- Verify environment (development vs production)

## 📋 **Checklist**

- [ ] Push Notifications capability added in Xcode
- [ ] Background Modes capability added with "Remote notifications"
- [ ] Entitlements file contains `aps-environment`
- [ ] App ID has Push Notifications enabled in Apple Developer Portal
- [ ] APNs authentication key generated and downloaded
- [ ] Server environment variables configured
- [ ] APNs key file uploaded to server
- [ ] JWT library installed
- [ ] APNs configuration code implemented
- [ ] App running on real device
- [ ] Notification permission granted
- [ ] Device token generated
- [ ] Test notifications working

## 🎯 **Expected Results**

After completing all steps:

1. **iOS App:**
   ```
   📱 [PushNotificationManager] ✅ aps-environment found: development
   📱 [AppDelegate] ✅ Successfully registered for remote notifications
   📱 [PushNotificationManager] Device token: [ACTUAL_TOKEN]
   ```

2. **Server:**
   ```
   ✅ APNs notification sent successfully to [DEVICE_TOKEN]
   ```

3. **Device:**
   - Push notifications appear on device
   - Badge counts update
   - Notifications are actionable

## 🚀 **Production Deployment**

For production:
1. **Change entitlements to production:**
   ```xml
   <key>aps-environment</key>
   <string>production</string>
   ```

2. **Update server environment:**
   ```env
   NODE_ENV=production
   ```

3. **Use production APNs endpoint** (automatically handled by the code)

The key missing pieces are the APNs configuration on the server and proper Xcode capability setup! 🔧
