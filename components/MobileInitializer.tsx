'use client'

import { useEffect, useState } from 'react';
import { ClientOnlyWrapper } from './ClientOnlyWrapper';

export default function MobileInitializer() {
  // Prevent hydration mismatch by ensuring client-side only rendering
  const [isClient, setIsClient] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || initialized) return;

    // Use dynamic imports to avoid SSR issues and ensure proper module loading
    const initializeMobileUtils = async () => {
      try {
        // Add extra safety check for hydration
        if (typeof window === 'undefined') {
          console.warn('[MobileInit] Window not available, skipping initialization');
          return;
        }

        // Clear any previous initialization state
        if ((window as any).__mobileInitCleanup) {
          try {
            (window as any).__mobileInitCleanup();
            delete (window as any).__mobileInitCleanup;
          } catch (cleanupError) {
            console.warn('[MobileInit] Error during cleanup:', cleanupError);
          }
        }

        // Check if Capacitor is available before importing
        if (window.Capacitor) {
          console.log('[MobileInit] Capacitor detected, initializing mobile utilities...');
          
          // Import Capacitor modules with error handling
          let Capacitor, StatusBar, Style, SplashScreen, CapacitorApp;
          
          try {
            const capacitorModule = await import('@capacitor/core');
            Capacitor = capacitorModule.Capacitor;
            
            const statusBarModule = await import('@capacitor/status-bar');
            StatusBar = statusBarModule.StatusBar;
            Style = statusBarModule.Style;
            
            const splashModule = await import('@capacitor/splash-screen');
            SplashScreen = splashModule.SplashScreen;
            
            const appModule = await import('@capacitor/app');
            CapacitorApp = appModule.App;
          } catch (importError) {
            console.error('[MobileInit] Failed to import Capacitor modules:', importError);
            throw importError;
          }
          
          // Import utility modules with error handling
          let initializeIOSErrorMonitoring, initializeIOSAuthMonitoring, initializeHydrationMonitoring, MobileNotificationService;
          
          try {
            const utilsModule = await import('@/lib/capacitor-utils');
            initializeIOSErrorMonitoring = utilsModule.initializeIOSErrorMonitoring;
          } catch (error) {
            console.warn('[MobileInit] Failed to import capacitor-utils:', error);
          }
          
          try {
            const authModule = await import('@/lib/ios-auth-helper');
            initializeIOSAuthMonitoring = authModule.initializeIOSAuthMonitoring;
          } catch (error) {
            console.warn('[MobileInit] Failed to import ios-auth-helper:', error);
          }
          
          try {
            const hydrationModule = await import('@/lib/hydration-debug');
            initializeHydrationMonitoring = hydrationModule.initializeHydrationMonitoring;
          } catch (error) {
            console.warn('[MobileInit] Failed to import hydration-debug:', error);
          }
          
          try {
            const notificationModule = await import('@/lib/mobile-notifications');
            MobileNotificationService = notificationModule.MobileNotificationService;
          } catch (error) {
            console.warn('[MobileInit] Failed to import mobile-notifications:', error);
          }

          // Initialize status bar first with retry mechanism
          let statusBarInitialized = false;
          for (let attempts = 0; attempts < 3; attempts++) {
            try {
              if (Capacitor.isNativePlatform() && StatusBar && Style) {
                await StatusBar.setStyle({ style: Style.Light });
                await StatusBar.setBackgroundColor({ color: '#FF6B6B' });
                await StatusBar.show();
                statusBarInitialized = true;
                console.log('✅ [MobileInit] Status bar configured.');
                break;
              }
            } catch (error) {
              console.warn(`⚡️ [warn] - Status bar attempt ${attempts + 1} failed:`, error);
              if (attempts < 2) {
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            }
          }

          // Initialize utilities with error recovery
          if (initializeIOSErrorMonitoring) {
            try {
              initializeIOSErrorMonitoring();
              console.log('✅ [MobileInit] iOS error monitoring initialized.');
            } catch (error) {
              console.warn('⚡️ [warn] - Failed to initialize iOS error monitoring:', error);
            }
          }

          if (initializeIOSAuthMonitoring) {
            try {
              initializeIOSAuthMonitoring();
              console.log('✅ [MobileInit] iOS auth monitoring initialized.');
            } catch (error) {
              console.warn('⚡️ [warn] - Failed to initialize iOS auth monitoring:', error);
            }
          }

          if (initializeHydrationMonitoring) {
            try {
              initializeHydrationMonitoring();
              console.log('✅ [MobileInit] Hydration monitoring initialized.');
            } catch (error) {
              console.warn('⚡️ [warn] - Failed to initialize hydration monitoring:', error);
            }
          }

          // Initialize mobile notifications with retry
          if (MobileNotificationService) {
            try {
              const notificationService = MobileNotificationService.getInstance();
              await notificationService.initialize();
              console.log('✅ [MobileInit] Mobile notifications initialized.');
            } catch (error) {
              console.warn('⚡️ [warn] - Failed to initialize mobile notifications:', error);
            }
          }

          // Handle app state changes with better error handling
          let appStateListener;
          try {
            const handleAppStateChange = async (state: { isActive: boolean }) => {
              console.log('App state changed:', state.isActive ? 'foreground' : 'background');
              
              if (state.isActive && Capacitor.isNativePlatform() && StatusBar && Style) {
                // App came to foreground - restore status bar
                try {
                  await StatusBar.setStyle({ style: Style.Light });
                  await StatusBar.setBackgroundColor({ color: '#FF6B6B' });
                  await StatusBar.show();
                } catch (error) {
                  console.error('Failed to update status bar on foreground:', error);
                }
              }
            };

            if (CapacitorApp) {
              appStateListener = CapacitorApp.addListener('appStateChange', handleAppStateChange);
              console.log('✅ [MobileInit] App state listeners registered.');
            }
          } catch (error) {
            console.warn('⚡️ [warn] - Failed to register app state listeners:', error);
          }

          // Store cleanup function
          (window as any).__mobileInitCleanup = () => {
            try {
              if (appStateListener) {
                appStateListener.remove();
              }
              console.log('✅ [MobileInit] Cleanup completed.');
            } catch (error) {
              console.warn('[MobileInit] Error during cleanup:', error);
            }
          };

          // Hide splash screen after initialization with better error handling
          try {
            // Wait for everything to be ready
            await new Promise(resolve => setTimeout(resolve, 800));
            
            if (Capacitor.isNativePlatform() && SplashScreen) {
              await SplashScreen.hide({
                fadeOutDuration: 300
              });
              console.log('✅ [MobileInit] Splash screen hidden.');
            }
          } catch (error) {
            console.warn('⚡️ [warn] - Failed to hide splash screen:', error);
            // Try without animation as fallback
            try {
              if (Capacitor.isNativePlatform() && SplashScreen) {
                await SplashScreen.hide();
                console.log('✅ [MobileInit] Splash screen hidden (fallback).');
              }
            } catch (fallbackError) {
              console.error('⚡️ [error] - Splash screen hide fallback failed:', fallbackError);
            }
          }

        } else {
          console.log('[MobileInit] Running in web mode, initializing web-only utilities...');
          
          try {
            // Only initialize hydration monitoring for web
            const { initializeHydrationMonitoring } = await import('@/lib/hydration-debug');
            if (typeof initializeHydrationMonitoring === 'function') {
              initializeHydrationMonitoring();
              console.log('✅ [MobileInit] Web hydration monitoring initialized.');
            }
          } catch (error) {
            console.warn('⚡️ [warn] - Failed to initialize hydration monitoring:', error);
          }
        }

        setInitialized(true);
        
        // Signal that mobile initialization is complete
        (window as any).__mobileInitComplete = true;
        console.log('✅ [MobileInit] Mobile initialization complete.');
        
      } catch (importError) {
        console.error('⚡️ [error] - Failed to initialize mobile utilities:', {
          message: importError?.message || 'Unknown import error',
          type: typeof importError,
          stack: importError?.stack
        });
        
        // Still signal completion to prevent hanging
        (window as any).__mobileInitComplete = true;
        setInitialized(true);
        
        // Show user-friendly error
        if (typeof window !== 'undefined' && window.Capacitor) {
          console.error('[MobileInit] Critical mobile initialization failure. App may not work correctly.');
        }
      }
    };

    // Add extra delay to ensure full hydration completion
    const timeoutId = setTimeout(initializeMobileUtils, 300);
    
    return () => {
      clearTimeout(timeoutId);
      // Cleanup listeners if they exist
      if ((window as any).__mobileInitCleanup) {
        try {
          (window as any).__mobileInitCleanup();
          delete (window as any).__mobileInitCleanup;
        } catch (error) {
          console.warn('[MobileInit] Error during component cleanup:', error);
        }
      }
    };
  }, [isClient, initialized]);

  // Don't render anything during SSR to prevent hydration mismatches
  if (!isClient) {
    return null;
  }

  return (
    <ClientOnlyWrapper>
      {/* This component does not render anything visible */}
      <div style={{ display: 'none' }}>Mobile utilities initialized</div>
    </ClientOnlyWrapper>
  );
} 