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
          
          const { initializeIOSErrorMonitoring, hideSplashScreen } = await import('@/lib/capacitor-utils');
          const { initializeIOSAuthMonitoring } = await import('@/lib/ios-auth-helper');
          const { initializeHydrationMonitoring } = await import('@/lib/hydration-debug');

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

          try {
            if (typeof hideSplashScreen === 'function') {
              hideSplashScreen();
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
      } catch (importError) {
        console.error('⚡️ [error] - Failed to import mobile utilities:', {
          message: importError?.message || 'Unknown import error',
          type: typeof importError
        });
      }
    };

    // Add extra delay to ensure full hydration completion
    const timeoutId = setTimeout(initializeMobileUtils, 500);
    
    return () => clearTimeout(timeoutId);
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