import { CapacitorConfig } from '@capacitor/cli';

const isDev = process.env.NODE_ENV === 'development';

const config: CapacitorConfig = {
  appId: 'com.sacavia.app',
  appName: 'Sacavia',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    url: isDev ? 'http://localhost:3000' : 'https://www.sacavia.com',
    cleartext: isDev,
    allowNavigation: [
      'https://www.sacavia.com',
      'http://localhost:3000',
      'https://api.mapbox.com',
      'https://resend.com',
    ],
    appendUserAgent: 'Sacavia/1.0 Capacitor'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: false,
      backgroundColor: "#8B4513",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: "small",
      spinnerColor: '#ff6b6b',
      splashFullScreen: false,
      splashImmersive: false,
      layoutName: "launch_screen",
      useDialog: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: "#8B4513",
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
    Camera: {
      permissions: ['camera', 'photos']
    },
    Geolocation: {
      permissions: {
        ios_location_usage_description: "This app uses location to show you nearby places and events.",
        android_location_permissions: ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION"]
      },
      timeout: 10000,
      enableHighAccuracy: true
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#FF6B6B',
      sound: 'beep.wav',
    },
    CapacitorWebView: {
      allowsInlineMediaPlayback: true,
      allowsBackForwardNavigationGestures: false,
      allowMultipleWindows: false,
      enableViewportScale: true,
      allowsLinkPreview: false,
      appendUserAgent: 'GroundedGems/1.0 Capacitor'
    },
    Haptics: {},
    CapacitorHttp: {
      enabled: true,
    },
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    backgroundColor: '#ffffff',
    scheme: 'sacavia',
    webViewConfiguration: {
      allowsInlineMediaPlayback: true,
      allowsAirPlayForMediaPlayback: true,
      allowsPictureInPictureMediaPlayback: true,
      suppressesIncrementalRendering: false,
      allowsBackForwardNavigationGestures: false,
      allowsLinkPreview: false,
      mediaTypesRequiringUserActionForPlayback: []
    },
    server: {
      url: isDev ? 'http://localhost:3000' : 'https://www.sacavia.com',
      cleartext: isDev,
      allowNavigation: [
        'https://www.sacavia.com',
        'http://localhost:3000',
        'https://api.mapbox.com',
        'https://resend.com',
      ],
    },
    appendUserAgent: 'Sacavia iOS Capacitor',
    overrideUserAgent: false,
    handleApplicationURL: true,
    limitsNavigationsToAppBoundDomains: false
  },
  android: {
    backgroundColor: '#ffffff',
    allowMixedContent: isDev,
    webContentsDebuggingEnabled: true,
    scheme: 'https',
    appendUserAgent: 'Sacavia Android Capacitor',
    overrideUserAgent: false,
    useLegacyBridge: false
  }
};

export default config;
