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

        // Check if Capacitor is available before importing
        if (window.Capacitor) {
          console.log('[MobileInit] Capacitor detected, initializing mobile utilities...');
          
          // Import Capacitor modules
          const { Capacitor } = await import('@capacitor/core');
          const { StatusBar, Style } = await import('@capacitor/status-bar');
          const { SplashScreen } = await import('@capacitor/splash-screen');
          const CapacitorAppModule = await import('@capacitor/app');
          const CapacitorApp = CapacitorAppModule.App;
          
          const { initializeIOSErrorMonitoring } = await import('@/lib/capacitor-utils');
          const { initializeIOSAuthMonitoring } = await import('@/lib/ios-auth-helper');
          const { initializeHydrationMonitoring } = await import('@/lib/hydration-debug');
          const { MobileNotificationService } = await import('@/lib/mobile-notifications');

          // Initialize status bar first
          try {
            if (Capacitor.isNativePlatform()) {
              await StatusBar.setStyle({ style: Style.Light });
              await StatusBar.setBackgroundColor({ color: '#FF6B6B' });
              await StatusBar.show();
              console.log('✅ [MobileInit] Status bar configured.');
            }
          } catch (error) {
            console.warn('⚡️ [warn] - Failed to configure status bar:', {
              message: error?.message || 'Unknown error',
              type: typeof error
            });
          }

          // Initialize with additional safety checks
          try {
            if (typeof initializeIOSErrorMonitoring === 'function') {
              initializeIOSErrorMonitoring();
              console.log('✅ [MobileInit] iOS error monitoring initialized.');
            }
          } catch (error) {
            console.warn('⚡️ [warn] - Failed to initialize mobile utilities:', {
              message: error?.message || 'Unknown error',
              type: typeof error
            });
          }

          try {
            if (typeof initializeIOSAuthMonitoring === 'function') {
              initializeIOSAuthMonitoring();
              console.log('✅ [MobileInit] iOS auth monitoring initialized.');
            }
          } catch (error) {
            console.warn('⚡️ [warn] - Failed to initialize iOS auth helper:', {
              message: error?.message || 'Unknown error', 
              type: typeof error
            });
          }

          try {
            if (typeof initializeHydrationMonitoring === 'function') {
              initializeHydrationMonitoring();
              console.log('✅ [MobileInit] Hydration monitoring initialized.');
            }
          } catch (error) {
            console.warn('⚡️ [warn] - Failed to initialize hydration monitoring:', {
              message: error?.message || 'Unknown error',
              type: typeof error
            });
          }

          // Initialize mobile notifications
          try {
            const notificationService = MobileNotificationService.getInstance();
            await notificationService.initialize();
            console.log('✅ [MobileInit] Mobile notifications initialized.');
          } catch (error) {
            console.warn('⚡️ [warn] - Failed to initialize mobile notifications:', {
              message: error?.message || 'Unknown error',
              type: typeof error
            });
          }

          // Handle app state changes
          try {
            const handleAppStateChange = async (state: { isActive: boolean }) => {
              console.log('App state changed:', state.isActive ? 'foreground' : 'background');
              
              if (state.isActive && Capacitor.isNativePlatform()) {
                // App came to foreground
                try {
                  await StatusBar.setStyle({ style: Style.Light });
                  await StatusBar.setBackgroundColor({ color: '#FF6B6B' });
                  await StatusBar.show();
                } catch (error) {
                  console.error('Failed to update status bar on foreground:', error);
                }
              }
            };

            const appStateListener = CapacitorApp.addListener('appStateChange', handleAppStateChange);
            
            // Store cleanup function for later
            (window as any).__mobileInitCleanup = () => {
              appStateListener.remove();
            };

            console.log('✅ [MobileInit] App state listeners registered.');
          } catch (error) {
            console.warn('⚡️ [warn] - Failed to register app state listeners:', {
              message: error?.message || 'Unknown error',
              type: typeof error
            });
          }

          // Hide splash screen after initialization
          try {
            // Wait a bit for everything to be ready
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            if (Capacitor.isNativePlatform()) {
              await SplashScreen.hide({
                fadeOutDuration: 300
              });
              console.log('✅ [MobileInit] Splash screen hidden.');
            }
          } catch (error) {
            console.warn('⚡️ [warn] - Failed to hide splash screen:', {
              message: error?.message || 'Unknown error',
              type: typeof error
            });
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
            console.warn('⚡️ [warn] - Failed to initialize hydration monitoring:', {
              message: error?.message || 'Unknown error',
              type: typeof error  
            });
          }
        }

        setInitialized(true);
        
        // Signal that mobile initialization is complete
        (window as any).__mobileInitComplete = true;
        console.log('✅ [MobileInit] Mobile initialization complete.');
        
      } catch (importError) {
        console.error('⚡️ [error] - Failed to import mobile utilities:', {
          message: importError?.message || 'Unknown import error',
          type: typeof importError
        });
        
        // Still signal completion to prevent hanging
        (window as any).__mobileInitComplete = true;
      }
    };

    // Add extra delay to ensure full hydration completion
    const timeoutId = setTimeout(initializeMobileUtils, 500);
    
    return () => {
      clearTimeout(timeoutId);
      // Cleanup listeners if they exist
      if ((window as any).__mobileInitCleanup) {
        (window as any).__mobileInitCleanup();
        delete (window as any).__mobileInitCleanup;
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