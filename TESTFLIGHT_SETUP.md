# 🚀 Grounded Gems TestFlight Setup Guide

## Quick Start

### Prerequisites
- **Apple Developer Program** membership ($99/year)
- **Xcode** installed (latest version recommended)
- **iOS device** or simulator for testing

### 1. Build for TestFlight
```bash
# Run the automated build script
./scripts/build-ios.sh

# Or manually:
npm ci
npx cap copy ios
npx cap sync ios
npx cap open ios
```

### 2. Xcode Configuration

#### **Signing & Capabilities**
1. Select **App target** in Xcode
2. Go to **Signing & Capabilities**
3. Set **Team** to your Apple Developer Team
4. **Bundle Identifier**: `com.groundedgems.app`
5. Enable **"Automatically manage signing"**

#### **Build Settings**
- **iOS Deployment Target**: 14.0+
- **Version**: 1.0.0 (update for each release)
- **Build**: 1 (increment for each TestFlight upload)

### 3. Create Archive
1. Select **"Any iOS Device"** (not simulator)
2. **Product** → **Archive**
3. Wait for build completion (5-10 minutes)

### 4. Upload to App Store Connect
1. **Organizer** opens automatically
2. Select your archive
3. **Distribute App** → **App Store Connect**
4. Follow upload wizard

## 📱 TestFlight Configuration

### App Store Connect Setup
1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. **My Apps** → **Grounded Gems** (or create new app)
3. **TestFlight** tab

### Internal Testing
- **Create Group**: "Grounded Gems Beta"
- **Add Build**: Select uploaded build
- **Add Testers**: Use Apple ID email addresses
- **No App Review** required

### Test Information Required
- **What to Test**: "Login, navigation, locations, feed functionality"
- **App Description**: Brief app overview
- **Feedback Email**: Your contact email
- **Export Compliance**: Usually "No" for standard apps

## 🔄 Update Workflow

### For New TestFlight Builds:
1. **Update build number** in Xcode
2. Run build script: `./scripts/build-ios.sh`
3. Archive and upload new build
4. **TestFlight** → **Add build to existing group**

### Version Management
- **Version** (1.0.0): For major releases
- **Build** (1, 2, 3...): For each TestFlight upload
- **Always increment** build number for each upload

## 🛠️ Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear build cache
rm -rf .next
npm ci
npx cap clean ios
npx cap copy ios
```

#### Signing Issues
- Verify **Apple Developer Program** membership
- Check **Bundle Identifier** is unique
- Ensure **Team** is selected correctly

#### Upload Failures
- Check **build number** is incremented
- Verify **iOS Deployment Target** compatibility
- Ensure **Export Compliance** is completed

### Development Server Testing
For testing with live reload during development:

1. Start Next.js server: `npm run dev`
2. Update `capacitor.config.ts`:
   ```typescript
   server: {
     url: 'http://localhost:3000',
     cleartext: true
   }
   ```
3. Run: `npx cap run ios`

## 📝 TestFlight Testing Checklist

### Core Features
- [ ] **Authentication**: Login/logout flow
- [ ] **Navigation**: All tabs work correctly
- [ ] **Feed**: Posts load and display properly
- [ ] **Locations**: Map and location features
- [ ] **Profiles**: User profile functionality
- [ ] **Mobile Features**: Camera, location, haptics

### Device Testing
- [ ] **iPhone** (various sizes)
- [ ] **iPad** (if supported)
- [ ] **iOS versions** (14.0+)
- [ ] **Network conditions** (WiFi, cellular, offline)

## 🔗 Useful Links

- [Apple TestFlight Documentation](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview)
- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [App Store Connect](https://appstoreconnect.apple.com)
- [Apple Developer Console](https://developer.apple.com/account)

## 🎯 Production Checklist

Before final App Store submission:
- [ ] Test on multiple devices
- [ ] Complete App Store metadata
- [ ] App Store screenshots and descriptions
- [ ] Privacy Policy (if required)
- [ ] App Review Guidelines compliance
- [ ] Final testing with production build 