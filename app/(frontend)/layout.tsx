import type React from "react"
import "./globals.css"
import Footer from "@/components/footer"
import { Toaster } from "sonner"
import StoreProvider from "@/app/StoreProvider"
import { getServerSideUser } from "@/lib/auth-server"
import Script from "next/script"
import NavigationWrapper from "@/components/navigation-wrapper"
import ClientFloatingActionButtonMenu from "@/components/ui/ClientFloatingActionButtonMenu"
import MainContentWrapper from "@/components/ui/MainContentWrapper"
import { GoogleAnalytics } from "@next/third-parties/google"

import MobileAppWrapper from '@/components/MobileAppWrapper'
import ErrorBoundary from '@/components/ErrorBoundary'
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sacavia - Guided Discovery & Authentic Journeys",
  description: "Discover authentic experiences and meaningful places with your community. Guided by wisdom, connected by stories.",
  keywords: "local discovery, authentic experiences, community events, guided exploration, travel, places, native wisdom",
  authors: [{ name: "Sacavia Team" }],
  creator: "Sacavia",
  publisher: "Sacavia",
  metadataBase: new URL('https://sacavia.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "Sacavia - Guided Discovery & Authentic Journeys",
    description: "Discover authentic experiences and meaningful places with your community. Guided by wisdom, connected by stories.",
    url: 'https://sacavia.com',
    siteName: 'Sacavia',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Sacavia - Your Guide to Authentic Discovery',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Sacavia - Guided Discovery & Authentic Journeys",
    description: "Discover authentic experiences and meaningful places with your community. Guided by wisdom, connected by stories.",
    images: ['/og-image.png'],
    creator: '@sacaviaapp',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  // Fetch the user data on the server
  const initialUser = await getServerSideUser()

  return (
    <div suppressHydrationWarning>
      <ErrorBoundary>
        <MobileAppWrapper>
          <StoreProvider initialUser={initialUser}>
            <NavigationWrapper initialUser={initialUser} />
            <GoogleAnalytics gaId="G-QB3W2CL6T7" />
            <MainContentWrapper>
              {children}
            </MainContentWrapper>
            {/* Hide footer on mobile, show on desktop */}
            <div className="hidden md:block">
              <Footer />
            </div>
            <Toaster />
            {/* Desktop FAB remains in its place */}
            <ClientFloatingActionButtonMenu />
          </StoreProvider>
        </MobileAppWrapper>
      </ErrorBoundary>

      {/* iOS and Mobile Initialization */}
      <Script id="mobile-init" strategy="beforeInteractive">
        {`
          // Initialize iOS history throttling FIRST to prevent Safari errors
          (function() {
            if (typeof window === 'undefined') return;
            
            // Detect iOS Safari
            const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            
            if (isIOSSafari) {
              console.log('[iOS Init] Initializing history throttling for iOS Safari');
              
              // Simple throttling implementation
              let callCount = 0;
              let resetTimeout = null;
              const MAX_CALLS = 80;
              const RESET_INTERVAL = 30000;
              
              const originalReplaceState = window.history.replaceState;
              const originalPushState = window.history.pushState;
              
              window.history.replaceState = function(data, title, url) {
                if (callCount >= MAX_CALLS) {
                  console.warn('[iOS Throttle] history.replaceState() call skipped');
                  return;
                }
                
                callCount++;
                if (!resetTimeout) {
                  resetTimeout = setTimeout(() => {
                    callCount = 0;
                    resetTimeout = null;
                  }, RESET_INTERVAL);
                }
                
                try {
                  originalReplaceState.call(this, data, title, url);
                } catch (error) {
                  console.error('[iOS Throttle] Error:', error);
                }
              };
              
              window.history.pushState = function(data, title, url) {
                if (callCount >= MAX_CALLS) {
                  console.warn('[iOS Throttle] history.pushState() call skipped');
                  return;
                }
                
                callCount++;
                if (!resetTimeout) {
                  resetTimeout = setTimeout(() => {
                    callCount = 0;
                    resetTimeout = null;
                  }, RESET_INTERVAL);
                }
                
                try {
                  originalPushState.call(this, data, title, url);
                } catch (error) {
                  console.error('[iOS Throttle] Error:', error);
                }
              };
            }
          })();
          
          // iOS WebView error handling
          if (window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform() === 'ios') {
            // Enhanced error logging for iOS
            window.addEventListener('error', function(event) {
              console.warn('[iOS Error]', event.message, event.filename, event.lineno);
            });
            
            window.addEventListener('unhandledrejection', function(event) {
              console.warn('[iOS Promise Rejection]', event.reason);
            });
            
            // Handle WebView navigation errors
            window.addEventListener('beforeunload', function(event) {
              // Prevent unnecessary warnings on iOS
              if (event.returnValue !== undefined) {
                event.returnValue = '';
              }
            });
          }
         
         // Enhanced mobile viewport handling
         function setupMobileViewport() {
           const viewport = document.querySelector('meta[name="viewport"]');
           if (viewport && window.Capacitor) {
             // Enhanced viewport for mobile apps
             viewport.setAttribute('content', 
               'width=device-width, initial-scale=1, maximum-scale=5, minimum-scale=1, user-scalable=yes, viewport-fit=cover'
             );
           }
         }
         
         // Safe area CSS variables are now handled by SafeAreaManager component
         
         if (document.readyState === 'loading') {
           document.addEventListener('DOMContentLoaded', function() {
             setupMobileViewport();
           });
         } else {
           setupMobileViewport();
         }
        `}
      </Script>
    </div>
  )
}
