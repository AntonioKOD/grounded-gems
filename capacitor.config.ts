import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.groundedgems.app',
  appName: 'Grounded Gems',
  webDir: 'public',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    hostname: 'localhost',
    // Commented out development URL for production builds
    // url: 'http://localhost:3000',
    cleartext: false, // Set to false for production
    // Enhanced error handling for iOS
    errorPath: '/index.html'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000, // Increased for better loading
      backgroundColor: '#ffffff',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true, // Show spinner for better UX
      spinnerStyle: 'small',
      spinnerColor: '#FF6B6B',
      splashFullScreen: true,
      splashImmersive: true,
      // Auto-hide after timeout to prevent hanging
      launchAutoHide: true
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#ffffff',
      overlay: false
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
      // Enhanced keyboard handling for iOS
      disableScroll: false
    },
    Camera: {
      permissions: ['camera', 'photos']
    },
    Geolocation: {
      permissions: ['location'],
      // Enhanced geolocation settings
      timeout: 10000,
      enableHighAccuracy: true
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    // Enhanced WebView settings for iOS
    CapacitorWebView: {
      allowsInlineMediaPlayback: true,
      allowsBackForwardNavigationGestures: true,
      allowMultipleWindows: false,
      enableViewportScale: true,
      allowsLinkPreview: false,
      overrideUserAgent: 'GroundedGems/1.0.0 (iOS; Mobile App)',
      appendUserAgent: 'GroundedGems'
    }
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    backgroundColor: '#ffffff',
    // Enhanced iOS WebView configuration
    scheme: 'https',
    hostname: 'localhost',
    // Better WebView settings for iOS
    webViewConfiguration: {
      allowsInlineMediaPlaybook: true,
      allowsAirPlayForMediaPlayback: true,
      allowsPictureInPictureMediaPlayback: true,
      suppressesIncrementalRendering: false,
      allowsBackForwardNavigationGestures: true,
      allowsLinkPreview: false,
      mediaTypesRequiringUserActionForPlayback: []
    },
    // Network and security settings
    appendUserAgent: 'GroundedGems iOS',
    overrideUserAgent: false,
    // Handle navigation errors gracefully
    handleApplicationURL: true,
    // Privacy and tracking settings
    limitsNavigationsToAppBoundDomains: true
  },
  android: {
    backgroundColor: '#ffffff',
    allowMixedContent: true,
    webContentsDebuggingEnabled: true,
    // Enhanced Android settings
    appendUserAgent: 'GroundedGems Android',
    overrideUserAgent: false,
    useLegacyBridge: false
  }
};

export default config;
