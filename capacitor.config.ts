import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.groundedgems.app',
  appName: 'Grounded Gems',
  webDir: 'public',
  server: {
    // Use the actual production server URL, not localhost
    url: process.env.NODE_ENV === 'production' 
      ? 'https://groundedgems.com' 
      : 'http://localhost:3000',
    cleartext: true, // Allow HTTP in development
    androidScheme: 'https',
    iosScheme: 'capacitor', // Use capacitor scheme for reliability
    // Only use hostname and errorPath for local development
    ...(process.env.NODE_ENV !== 'production' && {
      hostname: 'localhost',
      errorPath: '/login'
    })
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 500,
      backgroundColor: '#FF6B6B',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      launchAutoHide: true,
      fadeOutDuration: 200
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
      accessoryBarVisible: false,
      disableScroll: false
    },
    Camera: {
      permissions: ['camera', 'photos']
    },
    Geolocation: {
      permissions: ['location'],
      timeout: 10000,
      enableHighAccuracy: true
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#FF6B6B',
      sound: 'beep.wav',
    },
    // Simplified WebView settings
    CapacitorWebView: {
      allowsInlineMediaPlayback: true,
      allowsBackForwardNavigationGestures: false, // Disable to prevent web redirects
      allowMultipleWindows: false,
      enableViewportScale: true,
      allowsLinkPreview: false,
      appendUserAgent: 'GroundedGems/1.0 Capacitor'
    }
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    backgroundColor: '#ffffff',
    // Use capacitor scheme for iOS to prevent web redirects
    scheme: 'capacitor',
    // Remove conflicting hostname - let server.url handle this
    webViewConfiguration: {
      allowsInlineMediaPlayback: true,
      allowsAirPlayForMediaPlayback: true,
      allowsPictureInPictureMediaPlayback: true,
      suppressesIncrementalRendering: false,
      allowsBackForwardNavigationGestures: false, // Prevent unwanted navigation
      allowsLinkPreview: false,
      mediaTypesRequiringUserActionForPlayback: []
    },
    appendUserAgent: 'GroundedGems iOS Capacitor',
    overrideUserAgent: false,
    handleApplicationURL: true,
    // Allow app-bound domains for the server
    limitsNavigationsToAppBoundDomains: false // Allow server connections
  },
  android: {
    backgroundColor: '#ffffff',
    allowMixedContent: true,
    webContentsDebuggingEnabled: true,
    appendUserAgent: 'GroundedGems Android Capacitor',
    overrideUserAgent: false,
    useLegacyBridge: false
  }
};

export default config;
