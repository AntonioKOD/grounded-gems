import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.groundedgems.app',
  appName: 'Grounded Gems',
  webDir: 'public',
  server: {
    url: 'https://groundedgems.com',
    cleartext: false
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
      launchFadeOutDuration: 200
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#ffffff',
      overlaysWebView: false
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
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
