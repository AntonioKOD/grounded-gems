import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Share } from '@capacitor/share';
import { Toast } from '@capacitor/toast';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Browser } from '@capacitor/browser';
// Note: Filesystem, Directory, LocalNotifications are available but not used in current implementation
// import { Filesystem, Directory } from '@capacitor/filesystem';
// import { LocalNotifications } from '@capacitor/local-notifications';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Network } from '@capacitor/network';
import { Device } from '@capacitor/device';
// import { App } from '@capacitor/app';

export const isNative = () => Capacitor.isNativePlatform();
export const getPlatform = () => Capacitor.getPlatform();

// Camera utilities
export const takePicture = async () => {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera
    });
    return image.dataUrl;
  } catch (error) {
    console.error('Error taking picture:', error);
    throw error;
  }
};

export const pickImage = async () => {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos
    });
    return image.dataUrl;
  } catch (error) {
    console.error('Error picking image:', error);
    throw error;
  }
};

// Geolocation utilities
export const getCurrentPosition = async () => {
  try {
    const coordinates = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000
    });
    return {
      latitude: coordinates.coords.latitude,
      longitude: coordinates.coords.longitude
    };
  } catch (error) {
    console.error('Error getting location:', error);
    throw error;
  }
};

// Share utilities
export const shareContent = async (title: string, text: string, url?: string) => {
  try {
    await Share.share({
      title,
      text,
      url,
      dialogTitle: 'Share with friends'
    });
  } catch (error) {
    console.error('Error sharing:', error);
    throw error;
  }
};

// Toast utilities
export const showToast = async (message: string) => {
  try {
    await Toast.show({
      text: message,
      duration: 'short',
      position: 'bottom'
    });
  } catch (error) {
    console.error('Error showing toast:', error);
  }
};

// Haptics utilities
export const vibrate = async (style: ImpactStyle = ImpactStyle.Medium) => {
  try {
    await Haptics.impact({ style });
  } catch (error) {
    console.error('Error with haptics:', error);
  }
};

// Browser utilities
export const openUrl = async (url: string) => {
  try {
    await Browser.open({ url });
  } catch (error) {
    console.error('Error opening URL:', error);
  }
};

// Check if app can use native features
export const canUseCamera = () => {
  return isNative() && Capacitor.isPluginAvailable('Camera');
};

export const canUseGeolocation = () => {
  return isNative() && Capacitor.isPluginAvailable('Geolocation');
};

export const canUseHaptics = () => {
  return isNative() && Capacitor.isPluginAvailable('Haptics');
};

// Enhanced iOS error handling and diagnostics
export class IOSErrorHandler {
  private static instance: IOSErrorHandler;
  private errorLog: Array<{ timestamp: Date; error: string; context: string }> = [];

  static getInstance(): IOSErrorHandler {
    if (!IOSErrorHandler.instance) {
      IOSErrorHandler.instance = new IOSErrorHandler();
    }
    return IOSErrorHandler.instance;
  }

  logError(error: string, context: string = '') {
    const errorEntry = {
      timestamp: new Date(),
      error,
      context
    };
    this.errorLog.push(errorEntry);
    console.warn(`[iOS Error Handler] ${context}: ${error}`);
    
    // Keep only last 50 errors to prevent memory issues
    if (this.errorLog.length > 50) {
      this.errorLog.shift();
    }
  }

  getErrorLog() {
    return this.errorLog;
  }

  async diagnosePlatform() {
    if (!Capacitor.isNativePlatform()) return null;

    try {
      const [deviceInfo, networkStatus] = await Promise.all([
        Device.getInfo(),
        Network.getStatus()
      ]);

      const diagnostics = {
        platform: deviceInfo.platform,
        osVersion: deviceInfo.osVersion,
        model: deviceInfo.model,
        isVirtual: deviceInfo.isVirtual,
        networkConnected: networkStatus.connected,
        connectionType: networkStatus.connectionType,
        webViewVersion: deviceInfo.webViewVersion,
        capacitorVersion: Capacitor.getPlatform()
      };

      console.log('[iOS Diagnostics]', diagnostics);
      return diagnostics;
    } catch (error) {
      this.logError(`Failed to diagnose platform: ${error}`, 'Platform Diagnostics');
      return null;
    }
  }
}

// Enhanced WebView utilities for iOS
export const webViewUtils = {
  async forceReload() {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
      try {
        // Force a complete reload on iOS
        window.location.reload();
      } catch (error) {
        IOSErrorHandler.getInstance().logError(`Failed to reload WebView: ${error}`, 'WebView Reload');
      }
    }
  },

  async clearWebViewCache() {
    if (Capacitor.isNativePlatform()) {
      try {
        // Clear any cached data
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
          );
        }
      } catch (error) {
        IOSErrorHandler.getInstance().logError(`Failed to clear cache: ${error}`, 'Cache Clear');
      }
    }
  },

  handleNavigationError(error: unknown) {
    const errorHandler = IOSErrorHandler.getInstance();
    
    if ((error as Error & { code?: number })?.code === -999) {
      errorHandler.logError('Navigation cancelled (NSURLErrorCancelled)', 'Navigation');
      // Don't throw for cancelled navigation - this is often intentional
      return false;
    }
    
    errorHandler.logError(`Navigation error: ${(error as Error)?.message || error}`, 'Navigation');
    return true; // Indicates error should be handled by caller
  }
};

// Platform detection with enhanced iOS handling
export function isPlatform(platform: 'web' | 'ios' | 'android'): boolean {
  if (!Capacitor.isNativePlatform() && platform === 'web') return true;
  return Capacitor.getPlatform() === platform;
}

export function isIOS(): boolean {
  return isPlatform('ios');
}

export function isAndroid(): boolean {
  return isPlatform('android');
}

export function isWeb(): boolean {
  return isPlatform('web');
}

// Enhanced Haptics with iOS-specific handling
export async function triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'light'): Promise<void> {
  try {
    if (!Capacitor.isNativePlatform()) return;

    const impactStyle = style === 'light' ? ImpactStyle.Light : 
                      style === 'medium' ? ImpactStyle.Medium : ImpactStyle.Heavy;
    
    await Haptics.impact({ style: impactStyle });
  } catch (error: unknown) {
    // Haptics errors are non-critical, just log them
    IOSErrorHandler.getInstance().logError(`Haptics error: ${(error as Error)?.message || error}`, 'Haptics');
  }
}

// Enhanced Status Bar control with iOS handling
export async function setStatusBarStyle(style: 'light' | 'dark' = 'dark'): Promise<void> {
  try {
    if (!Capacitor.isNativePlatform()) return;

    await StatusBar.setStyle({
      style: style === 'light' ? Style.Light : Style.Dark
    });
  } catch (error: unknown) {
    IOSErrorHandler.getInstance().logError(`Status bar error: ${(error as Error)?.message || error}`, 'Status Bar');
  }
}

// Enhanced Splash Screen control
export async function hideSplashScreen(): Promise<void> {
  try {
    if (!Capacitor.isNativePlatform()) return;
    
    // Wait a bit for the app to fully load before hiding
    setTimeout(async () => {
      try {
        await SplashScreen.hide();
      } catch (error: unknown) {
        IOSErrorHandler.getInstance().logError(`Splash screen error: ${(error as Error)?.message || error}`, 'Splash Screen');
      }
    }, 1000);
  } catch (error: unknown) {
    IOSErrorHandler.getInstance().logError(`Splash screen setup error: ${(error as Error)?.message || error}`, 'Splash Screen Setup');
  }
}

// Enhanced Network monitoring
export async function getNetworkStatus() {
  try {
    if (!Capacitor.isNativePlatform()) {
      return { connected: navigator.onLine, connectionType: 'unknown' };
    }

    const status = await Network.getStatus();
    return {
      connected: status.connected,
      connectionType: status.connectionType
    };
  } catch (error: unknown) {
    IOSErrorHandler.getInstance().logError(`Network status error: ${(error as Error)?.message || error}`, 'Network');
    return { connected: false, connectionType: 'unknown' };
  }
}

// Initialize iOS-specific error monitoring
export function initializeIOSErrorMonitoring() {
  if (!isIOS()) return;

  const errorHandler = IOSErrorHandler.getInstance();

  // Monitor unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    errorHandler.logError(`Unhandled promise rejection: ${event.reason}`, 'Promise Rejection');
  });

  // Monitor general errors
  window.addEventListener('error', (event) => {
    errorHandler.logError(`Runtime error: ${event.message} at ${event.filename}:${event.lineno}`, 'Runtime Error');
  });

  // Monitor network changes
  if (Capacitor.isNativePlatform()) {
    Network.addListener('networkStatusChange', (status) => {
      if (!status.connected) {
        errorHandler.logError('Network disconnected', 'Network Status');
      }
    });
  }

  // Perform initial diagnostics
  errorHandler.diagnosePlatform();

  console.log('[iOS Error Monitoring] Initialized successfully');
}

// Monitor history usage for iOS Safari rate limit debugging
export function monitorIOSHistoryUsage() {
  if (!isIOS()) return;

  let callCount = 0;
  let startTime = Date.now();
  const MONITOR_INTERVAL = 10000; // 10 seconds

  const originalReplaceState = window.history.replaceState;
  const originalPushState = window.history.pushState;

  // Check if already throttled (our throttling adds a custom property)
  if ((window.history.replaceState as typeof window.history.replaceState & { __throttled?: boolean }).__throttled) {
    console.log('[iOS History Monitor] History already throttled, monitoring existing implementation');
    return;
  }

  // Monitoring wrapper (doesn't throttle, just logs)
  type HistoryMethod = (state: unknown, unused: string, url?: string | URL | null) => void;

  const wrapHistoryMethod = (method: HistoryMethod, name: string) => {
    return function(this: History, ...args: [state: unknown, unused: string, url?: string | URL | null]) {
      callCount++;
      const now = Date.now();
      
      if (now - startTime > MONITOR_INTERVAL) {
        console.log(`[iOS History Monitor] ${name} calls in last ${MONITOR_INTERVAL/1000}s: ${callCount}`);
        if (callCount > 80) {
          console.warn(`[iOS History Monitor] High ${name} frequency detected! (${callCount} calls)`);
          IOSErrorHandler.getInstance().logError(
            `High ${name} frequency: ${callCount} calls in ${MONITOR_INTERVAL/1000}s`,
            'History Usage Warning'
          );
        }
        callCount = 0;
        startTime = now;
      }

      return method.apply(this, args);
    };
  };

  console.log('[iOS History Monitor] Setting up history usage monitoring');
  
  const wrappedReplaceState = wrapHistoryMethod(originalReplaceState, 'replaceState');
  const wrappedPushState = wrapHistoryMethod(originalPushState, 'pushState');
  
  // Mark as monitoring
  (wrappedReplaceState as typeof wrappedReplaceState & { __monitoring?: boolean }).__monitoring = true;
  (wrappedPushState as typeof wrappedPushState & { __monitoring?: boolean }).__monitoring = true;
  
  window.history.replaceState = wrappedReplaceState;
  window.history.pushState = wrappedPushState;
}

// Export utilities object for convenience
export const capacitorUtils = {
  takePicture,
  pickImage,
  getCurrentPosition,
  triggerHaptic,
  shareContent,
  setStatusBarStyle,
  hideSplashScreen,
  getNetworkStatus,
  webViewUtils,
  errorHandler: IOSErrorHandler.getInstance(),
  initializeIOSErrorMonitoring,
  monitorIOSHistoryUsage
}; 