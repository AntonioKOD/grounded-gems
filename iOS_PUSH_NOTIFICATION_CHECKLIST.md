# iOS Push Notification Setup Checklist

## 🚀 **Complete Setup Guide**

### **Phase 1: Apple Developer Portal Setup**

#### **Step 1.1: Enable Push Notifications for App ID**
- [ ] **Go to [Apple Developer Portal](https://developer.apple.com/account/)**
- [ ] **Navigate to Certificates, Identifiers & Profiles** → **Identifiers**
- [ ] **Find your App ID** (`com.sacavia.app`)
- [ ] **Click to edit it**
- [ ] **Scroll down to "Capabilities"**
- [ ] **Enable "Push Notifications"**
- [ ] **Click "Save"**

#### **Step 1.2: Generate APNs Authentication Key**
- [ ] **In Apple Developer Portal** → **Keys**
- [ ] **Click "+" to create new key**
- [ ] **Name it**: "Sacavia APNs Key"
- [ ] **Check "Apple Push Notifications service (APNs)"**
- [ ] **Click "Continue" and "Register"**
- [ ] **Download the .p8 file** (save securely!)
- [ ] **Note the Key ID** (you'll need this)
- [ ] **Note your Team ID** (from your developer account)

### **Phase 2: Xcode Configuration**

#### **Step 2.1: Add Push Notifications Capability**
- [ ] **Open Xcode** → `SacaviaApp.xcodeproj`
- [ ] **Select the project** (top level) → **Select target** (SacaviaApp)
- [ ] **Go to "Signing & Capabilities" tab**
- [ ] **Click "+ Capability"** → **Search "Push Notifications"** → **Add it**
- [ ] **Click "+ Capability" again** → **Search "Background Modes"** → **Add it**
- [ ] **Check "Remote notifications"** in Background Modes
- [ ] **Save project** (Cmd+S)

#### **Step 2.2: Clean and Rebuild**
- [ ] **Product → Clean Build Folder** (Shift+Cmd+K)
- [ ] **Delete app from device/simulator**
- [ ] **Build and run again**

### **Phase 3: Server Configuration**

#### **Step 3.1: Set Up Environment Variables**
- [ ] **Run the setup script**: `node scripts/setup-apns-env.js`
- [ ] **Enter your Key ID** (from Step 1.2)
- [ ] **Enter your Team ID** (from your developer account)
- [ ] **Enter path to .p8 file**

#### **Step 3.2: Upload APNs Key File**
- [ ] **Upload the .p8 file** to your server securely
- [ ] **Set proper permissions**: `chmod 600 AuthKey_KEYID.p8`
- [ ] **Verify the file path** matches your environment variable

#### **Step 3.3: Restart Server**
- [ ] **Stop your development server**
- [ ] **Start it again**: `npm run dev`

### **Phase 4: Testing**

#### **Step 4.1: Test iOS App**
- [ ] **Run app on real device** (not simulator)
- [ ] **Grant notification permission** when prompted
- [ ] **Check console logs** for:
  ```
  📱 [PushNotificationManager] ✅ aps-environment found: development
  📱 [AppDelegate] ✅ Successfully registered for remote notifications
  📱 [PushNotificationManager] Device token: [ACTUAL_TOKEN]
  ```

#### **Step 4.2: Test Server Notifications**
- [ ] **Go to Profile > Settings > Test Notifications** in the iOS app
- [ ] **Click "Test Server Notification"**
- [ ] **Check server logs** for:
  ```
  ✅ APNs notification sent successfully to [DEVICE_TOKEN]
  ```

#### **Step 4.3: Verify Device Notifications**
- [ ] **Check that push notification appears** on device
- [ ] **Verify badge count updates**
- [ ] **Test notification actions** (if configured)

## 🔍 **Troubleshooting**

### **Common Issues and Solutions**

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

#### **Issue 5: "Server test notification failed"**
**Solution:**
- Check APNs environment variables are set
- Verify .p8 file is uploaded and accessible
- Check server logs for specific error messages

## 📋 **Verification Checklist**

### **Before Testing:**
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

### **After Testing:**
- [ ] Device token generated successfully
- [ ] Server can send test notifications
- [ ] Push notifications appear on device
- [ ] Badge counts update correctly
- [ ] Notification actions work (if configured)

## 🎯 **Expected Results**

### **iOS App Console:**
```
📱 [PushNotificationManager] ✅ aps-environment found: development
📱 [PushNotificationManager] ✅ Entitlements file found
📱 [AppDelegate] ✅ Successfully registered for remote notifications
📱 [PushNotificationManager] Device token: [ACTUAL_TOKEN]
📱 [PushNotificationManager] Device token successfully registered with server
```

### **Server Console:**
```
✅ APNs notification sent successfully to [DEVICE_TOKEN]
```

### **Device:**
- Push notifications appear on device
- Badge counts update
- Notifications are actionable

## 🚀 **Production Deployment**

For production deployment:
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

## 📞 **Support**

If you encounter issues:
1. **Check the troubleshooting section above**
2. **Verify all checklist items are completed**
3. **Check server logs for specific error messages**
4. **Ensure all environment variables are set correctly**

The key to success is completing ALL steps in order! 🔧
