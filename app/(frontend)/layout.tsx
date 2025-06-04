import type React from "react"
import "./globals.css"
import Footer from "@/components/footer"
import PWAInstallBanner from "@/components/pwa-install-banner"
import { Toaster } from "sonner"
import StoreProvider from "@/app/StoreProvider"
import { getServerSideUser } from "@/lib/auth-server"
import Script from "next/script"
import NavigationWrapper from "@/components/navigation-wrapper"
import FloatingSearchWrapper from "@/components/ui/floating-search-wrapper"
import ClientFloatingActionButtonMenu from "@/components/ui/ClientFloatingActionButtonMenu"

export const metadata = {
  description: "Discover hidden gems and authentic experiences in your local area. Connect with your community through meaningful events and places.",
  title: "Grounded Gems - Discover Hidden Treasures",
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  // Fetch the user data on the server
  const initialUser = await getServerSideUser()

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.webmanifest" />
        
        {/* PWA Meta Tags */}
        <meta name="theme-color" content="#FF6B6B" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Grounded Gems" />
        <meta name="mobile-web-app-capable" content="yes" />
        
        {/* SEO Meta Tags */}
        <meta name="description" content={metadata.description} />
        <meta name="keywords" content="travel, locations, events, social, discovery, community, local, recommendations, hidden gems" />
        <meta name="author" content="Grounded Gems Team" />
        
        {/* Open Graph Meta Tags */}
        <meta property="og:title" content={metadata.title} />
        <meta property="og:description" content={metadata.description} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/icon-512.png" />
        <meta property="og:site_name" content="Grounded Gems" />
        
        {/* Twitter Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metadata.title} />
        <meta name="twitter:description" content={metadata.description} />
        <meta name="twitter:image" content="/icon-192.png" />
        
        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icon-192.png" />
        
        {/* Performance optimization - removed unused external script preloads */}
      </head>
      <body className="overflow-x-hidden">
        <StoreProvider initialUser={initialUser}>
          <NavigationWrapper initialUser={initialUser} />
          <main className="min-h-screen w-full bg-white">
            {children}
          </main>
          {/* Hide footer on mobile, show on desktop */}
          <div className="hidden md:block">
            <Footer />
          </div>
          <PWAInstallBanner />
          <Toaster />
          {/* Desktop FAB remains in its place */}
          <div className="hidden md:block">
            <FloatingSearchWrapper />
          </div>
          <ClientFloatingActionButtonMenu />
        </StoreProvider>
        
        {/* Service Worker Registration */}
        <Script id="sw-registration" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js')
                  .then(function(registration) {
                    console.log('SW registered: ', registration);
                  })
                  .catch(function(registrationError) {
                    console.log('SW registration failed: ', registrationError);
                  });
              });
            }
          `}
        </Script>
      </body>
    </html>
  )
}
