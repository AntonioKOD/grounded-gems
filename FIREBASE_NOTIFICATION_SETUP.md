# Firebase Notification Setup Guide

## 🚨 **Problem Solved**

Your iOS app was getting FCM tokens but notifications weren't working because your server was using **APNs directly** instead of **Firebase Cloud Messaging (FCM)**.

## ✅ **What Was Fixed**

1. **Installed Firebase Admin SDK** - `npm install firebase-admin`
2. **Created Firebase configuration** - `lib/firebase-admin.ts`
3. **Updated notification endpoints** - Now use Firebase instead of APNs
4. **Added fallback system** - Falls back to APNs if Firebase fails
5. **Created setup script** - `scripts/setup-firebase-env.js`

## 🔧 **Current Flow (Fixed)**

```
iOS App → FCM Token → Server stores in 'device-tokens' collection
Server → Firebase Admin SDK → FCM → Device ✅
```

## 📋 **Setup Steps**

### **Step 1: Get Firebase Service Account Key**

1. **Go to [Firebase Console](https://console.firebase.google.com)**
2. **Select your project**
3. **Go to Project Settings** (gear icon)
4. **Go to Service Accounts tab**
5. **Click "Generate new private key"**
6. **Download the JSON file**

### **Step 2: Run Setup Script**

```bash
node scripts/setup-firebase-env.js
```

This will:
- Ask for the path to your Firebase service account JSON file
- Extract all required environment variables
- Add them to your `.env.local` file

### **Step 3: Restart Server**

```bash
npm run dev
```

You should see:
```
✅ Firebase Admin SDK initialized successfully
📱 Project ID: your-project-id
```

### **Step 4: Test Notifications**

1. **From iOS app**: Go to Profile → Settings → Test Notifications
2. **From server**: Check logs for successful Firebase initialization
3. **From Firebase Console**: Send test message using FCM token

## 🔍 **Verification**

### **Check Server Logs**
After restarting, you should see:
```
✅ Firebase Admin SDK initialized successfully
📱 Project ID: your-project-id
```

### **Test Notification Endpoint**
```bash
curl -X POST http://localhost:3000/api/mobile/notifications/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","body":"Firebase test"}'
```

Expected response:
```json
{
  "success": true,
  "message": "Test notification sent successfully via Firebase",
  "data": {
    "method": "firebase",
    "sentCount": 1
  }
}
```

### **Check Status Endpoint**
```bash
curl -X GET http://localhost:3000/api/mobile/notifications/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected response:
```json
{
  "success": true,
  "data": {
    "firebaseStatus": {
      "configured": true,
      "initialized": true,
      "projectId": "your-project-id"
    },
    "preferredMethod": "firebase"
  }
}
```

## 🎯 **Expected Results**

### **iOS App Console:**
```
📱 [AppDelegate] 🎯 Received FCM token: [ACTUAL_TOKEN]
📱 [PushNotificationManager] FCM token sent to server
```

### **Server Console:**
```
✅ Firebase Admin SDK initialized successfully
🔔 [Test API] Using Firebase to send notification
✅ Firebase notification sent successfully: [MESSAGE_ID]
```

### **Device:**
- Push notifications appear on device
- Badge counts update
- Notifications are actionable

## 🔄 **Fallback System**

The system now has a smart fallback:

1. **Try Firebase first** (preferred)
2. **If Firebase fails** → Try APNs
3. **If both fail** → Return error

This ensures notifications work even if Firebase is temporarily unavailable.

## 🚀 **Production Deployment**

For production:

1. **Set environment variables** on your hosting platform
2. **Use production Firebase project**
3. **Update iOS app** to use production FCM tokens

## 📞 **Troubleshooting**

### **Firebase Not Initialized**
- Check `.env.local` has all Firebase variables
- Verify service account JSON is valid
- Restart server after adding environment variables

### **Notifications Still Not Working**
- Check Firebase Console for any errors
- Verify FCM token is being sent to server
- Test with Firebase Console directly

### **APNs Fallback Working**
- Firebase configuration issue
- Check Firebase project settings
- Verify service account permissions

## 🎉 **Success Indicators**

✅ **Firebase Admin SDK initialized** in server logs
✅ **FCM token received** in iOS app logs  
✅ **Test notifications work** from server
✅ **Push notifications appear** on device
✅ **Status endpoint shows** `"preferredMethod": "firebase"`

---

**Status**: ✅ **IMPLEMENTED** - Firebase Admin SDK configured and ready
**Next Action**: Run setup script and test notifications
