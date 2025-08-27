# Push Notification Setup Guide

## 🚨 **Current Issue**

The iOS app is failing to register for remote notifications because it's missing the required push notification entitlements. The error message is:

```
Error Domain=NSCocoaErrorDomain Code=3000 "no valid "aps-environment" entitlement string found for application"
```

## 🔧 **How to Fix This**

### **Option 1: Add Push Notification Capability (Recommended)**

#### **Step 1: Add Capability in Xcode**
1. **Open Xcode**
2. **Select your project** (SacaviaApp)
3. **Select your target** (SacaviaApp)
4. **Go to "Signing & Capabilities" tab**
5. **Click the "+" button** (top left corner)
6. **Search for "Push Notifications"**
7. **Add it to your target**

#### **Step 2: Configure App ID in Apple Developer Portal**
1. **Go to [Apple Developer Portal](https://developer.apple.com/account/)**
2. **Navigate to "Certificates, Identifiers & Profiles"**
3. **Select "Identifiers"**
4. **Find your App ID** (com.sacavia.app)
5. **Click on it to edit**
6. **Scroll down to "Capabilities"**
7. **Check "Push Notifications"**
8. **Click "Save"**

#### **Step 3: Generate APN Certificates**
1. **In Apple Developer Portal, go to "Certificates"**
2. **Click "+" to create a new certificate**
3. **Select "Apple Push Notification service SSL (Sandbox & Production)"**
4. **Choose your App ID**
5. **Follow the steps to create a CSR and upload it**
6. **Download the certificate**

#### **Step 4: Configure Server**
1. **Convert the certificate to the format your server needs**
2. **Add the certificate files to your server**
3. **Set environment variables**:
   ```
   APN_KEY_PATH=/path/to/your/certificate.p8
   APN_KEY_ID=your_key_id
   APN_TEAM_ID=your_team_id
   ```

### **Option 2: Development Mode (Current Workaround)**

The app is now configured to work in "local-only" mode when push notification entitlements are missing. This means:

✅ **Local notifications work** - You can test the notification system
✅ **App doesn't crash** - Graceful handling of missing entitlements
❌ **Push notifications don't work** - No server-to-device notifications

## 📱 **Current Behavior**

With the current setup, you should see:

1. **App launches without crashing**
2. **Local notifications work** (test button in Notification Settings)
3. **Server test shows "No device tokens found"** (expected)
4. **Clear error messages** about missing entitlements

## 🧪 **Testing the Current Setup**

### **Test Local Notifications**
1. **Launch the app**
2. **Go to Notification Settings**
3. **Use "Send Test Notification"** - Should work immediately
4. **You should see a "Development Mode" notification**

### **Test Server Integration**
1. **Use "Send Server Test Notification"** 
2. **Expected result**: "No active device tokens found for this user"
3. **This is expected** because no device tokens are generated without entitlements

## 🔍 **Debug Information**

The app now provides clear debug information:

```
📱 [PushNotificationManager] No push notification entitlements found. Running in local-only mode.
📱 [PushNotificationManager] To enable push notifications:
📱 [PushNotificationManager] 1. Add 'Push Notifications' capability in Xcode
📱 [PushNotificationManager] 2. Configure App ID in Apple Developer Portal
📱 [PushNotificationManager] 3. Add APN certificates to server
```

## 🎯 **Next Steps**

### **For Development/Testing**
- ✅ **Current setup works** for testing local notifications
- ✅ **No immediate action needed** if you just want to test the app
- ✅ **Server integration can be tested** once entitlements are added

### **For Production**
- 🔧 **Add push notification capability** in Xcode
- 🔧 **Configure App ID** in Apple Developer Portal
- 🔧 **Set up APN certificates** on the server
- 🔧 **Test full push notification flow**

## 📊 **Expected Results After Fix**

Once push notification entitlements are properly configured:

1. **Device token generation** - You'll see device tokens in logs
2. **Device registration** - Tokens will be saved to database
3. **Server test success** - "Send Server Test Notification" will work
4. **Real push notifications** - Notifications from server will be delivered

## 🚀 **Quick Test**

To verify the current setup is working:

1. **Launch the app**
2. **Check console logs** for the development mode message
3. **Test local notifications** - Should work immediately
4. **Check Notification Settings** - Should show "Authorized" status

The app is now properly configured to handle both scenarios (with and without push notification entitlements) gracefully! 🎉


