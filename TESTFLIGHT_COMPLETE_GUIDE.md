# 📱 Grounded Gems TestFlight Complete Guide

## ✅ **Prerequisites Complete** 
- ✅ **Bundle ID**: `com.groundedgems.app` (verified)
- ✅ **Production Build**: Successfully created
- ✅ **Production Server**: Configured to use `https://groundedgems.com`
- ✅ **iOS Project**: Synced and ready in Xcode
- ✅ **Apple Developer Account**: Required ($99/year)

---

## 🎯 **Phase 1: Xcode Configuration & Archive**

### **Step 1: Configure Project Settings in Xcode**

Since Xcode is now open with your project:

1. **Select Project** → Click "App" in the navigator (blue icon at top)
2. **Select Target** → Click "App" under TARGETS
3. **Go to "General" tab**

#### **Update Version Info:**
- **Version**: `1.0.0` 
- **Build**: `1` (increment this for each TestFlight upload)
- **Bundle Identifier**: Should show `com.groundedgems.app` ✅

### **Step 2: Configure Signing & Capabilities**

1. **Click "Signing & Capabilities" tab**
2. **Team**: Select your Apple Developer Team
3. **✅ Enable "Automatically manage signing"**
4. **Signing Certificate**: Should automatically select "Apple Development"

⚠️ **Important**: If you see signing errors, make sure you're logged into Xcode with your Apple Developer account:
- **Xcode** → **Preferences** → **Accounts** → **Add Apple ID**

### **Step 3: Set Target for Archive**

1. **Top toolbar**: Select **"Any iOS Device (arm64)"** (not Simulator)
2. This is crucial for creating a TestFlight-compatible archive

### **Step 4: Create Archive**

1. **Product** → **Archive** (or ⌘⇧B)
2. **Build process takes 3-5 minutes** ⏳
3. **Organizer opens automatically** when complete

---

## 🎯 **Phase 2: App Store Connect Upload**

### **Step 5: Upload to App Store Connect**

When the **Organizer** opens:

1. **Select your archive** (most recent one)
2. **Click "Distribute App"**
3. **Select "App Store Connect"** → **Next**
4. **Upload** → **Next**
5. **Automatically manage signing** → **Next**
6. **Upload** (takes 5-10 minutes)

### **Step 6: Processing in App Store Connect**

1. **Go to** [**App Store Connect**](https://appstoreconnect.apple.com)
2. **My Apps** → **Create New App** (if first time):
   - **Platform**: iOS
   - **Name**: Grounded Gems  
   - **Primary Language**: English
   - **Bundle ID**: `com.groundedgems.app`
   - **SKU**: `grounded-gems-001`
3. **Wait 10-15 minutes** for processing ⏳

---

## 🎯 **Phase 3: TestFlight Setup**

### **Step 7: Configure TestFlight Information**

1. **TestFlight tab** in App Store Connect
2. **Test Information** section:

#### **Beta App Description:**
```
🌟 Welcome to Grounded Gems Beta!

Discover amazing local spots and connect with your community like never before! 

🔍 WHAT TO TEST:
• Login/logout functionality  
• "Local Buzz" feed with posts and interactions
• Location discovery and map features
• Post creation with photos
• User profiles and following system
• Mobile navigation and responsiveness

📱 MOBILE FEATURES:
• Camera integration for posts
• Geolocation for nearby locations  
• Push notifications
• Haptic feedback
• Smooth mobile navigation

🔔 FEEDBACK PRIORITIES:
1. App performance and loading times
2. User interface and navigation flow
3. Camera and photo upload functionality
4. Location accuracy and map interaction
5. Any crashes or unexpected behavior

Thank you for helping make Grounded Gems the best local discovery platform! 
Your feedback is invaluable. 🙏
```

#### **Feedback Email:**
- Add your email address for bug reports

#### **Beta App Review Information:**
```
BETA APP REVIEW NOTES:

This is a location-based social discovery platform for testing core functionality:

LOGIN CREDENTIALS FOR REVIEW:
- The app supports standard email/password registration
- Demo content includes sample locations and posts
- No in-app purchases in beta version

KEY FEATURES TO REVIEW:
1. User authentication system
2. Location-based content discovery
3. Social features (posts, likes, follows)
4. Camera integration for content creation
5. Map functionality with location pins
6. Background refresh capabilities for content updates

The app uses standard iOS permissions:
- Camera (for posting photos)
- Location (for nearby locations)
- Photos (for selecting images)
- Background App Refresh (for content updates)

BACKGROUND MODES:
- fetch (for background content updates)

Note: The 'processing' background mode was removed as it requires additional BGTaskSchedulerPermittedIdentifiers configuration and is typically only needed for apps performing longer-running background tasks using iOS 13+'s BGTaskScheduler.

All user-generated content is moderated. No sensitive or inappropriate content is allowed.
```

### **Step 8: Create Test Groups**

1. **Groups** → **Create Group**
2. **Group Name**: "Internal Team"
3. **Add your build** to the group

### **Step 9: Add Internal Testers**

1. **Internal Testing** section
2. **Add testers by email** (up to 100 App Store Connect users)
3. **Select the group** you created
4. **Enable "Automatic Distribution"** for new builds

### **Step 10: External Testing (Optional)**

For wider beta testing:

1. **External Testing** → **Add Group**
2. **Build requires App Review** (first build only)
3. **Add testers via:**
   - **Email invitations** (direct invites)
   - **Public link** (for broader testing)

---

## 🎯 **Phase 4: Launch Beta Testing**

### **Step 11: Send Invitations**

1. **Testers receive email invites**
2. **They install TestFlight app** from App Store
3. **Accept invitation & install beta**

### **Step 12: Monitor Feedback**

Track testing progress in **App Store Connect**:
- **View crashes and feedback**
- **Monitor adoption metrics**
- **Respond to tester questions**

---

## 📱 **Testing Your Beta**

### **For Testers:**

1. **Download TestFlight** from App Store
2. **Accept email invitation** or **scan QR code**
3. **Install Grounded Gems Beta**
4. **Test key features:**
   - Login/logout
   - Browse "Local Buzz" feed
   - Create posts with photos
   - Explore map and locations
   - Follow other users

### **Providing Feedback:**

- **Screenshot feedback**: Shake device while in app
- **Crash reports**: Automatically sent
- **General feedback**: Via TestFlight app

---

## 🚀 **Quick Commands for Future Updates**

Save this for future TestFlight builds:

```bash
# 1. Build production version
npm run build

# 2. Sync to iOS
npx cap copy ios && npx cap sync ios

# 3. Open Xcode
npx cap open ios

# 4. In Xcode: Product → Archive → Distribute
```

---

## 🎉 **You're Ready!**

Your app is now configured for TestFlight! Following the [official Apple TestFlight documentation](https://developer.apple.com/testflight/), you can:

✅ **Archive your app in Xcode**  
✅ **Upload to App Store Connect**  
✅ **Invite up to 10,000 external testers**  
✅ **Get valuable feedback before launch**  

**Need help?** Reference the [App Store Connect Help](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview) for detailed guidance on each step. 

### iOS Network Configuration

The app has been optimized for iOS with the following fixes:

**Localhost Resolution Issues Fixed:**
- All API calls now automatically use production URLs when running in iOS
- Capacitor detection ensures mobile apps never attempt localhost connections
- Comprehensive URL utility functions handle environment detection
- Image optimization configured for iOS WebView compatibility

**Technical Implementation:**
- `lib/config.ts` - Centralized configuration for iOS compatibility
- `lib/utils.ts` - Enhanced URL resolution for mobile apps
- `lib/capacitor-utils.ts` - Mobile-specific API request handling
- Background mode configuration optimized for App Store validation

All user-generated content is moderated. No sensitive or inappropriate content is allowed. 