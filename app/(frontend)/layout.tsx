import type React from "react"
import "./globals.css"
import NavBar from "@/components/NavBar"
import Footer from "@/components/footer"
import MobileNavigation from "@/components/mobile-navigation"
import PWAInstallBanner from "@/components/pwa-install-banner"
import { Toaster } from "sonner"
import { UserProvider } from "@/context/user-context"
import { getServerSideUser } from "@/lib/auth"
import Script from "next/script"

export const metadata = {
  description: "Discover and explore amazing locations, connect with friends, and find local events in your area",
  title: "Sacavia - Discover Amazing Places",
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
        <link rel="manifest" href="/manifest.json" />
        
        {/* PWA Meta Tags */}
        <meta name="theme-color" content="#FF6B6B" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Sacavia" />
        <meta name="mobile-web-app-capable" content="yes" />
        
        {/* SEO Meta Tags */}
        <meta name="description" content={metadata.description} />
        <meta name="keywords" content="travel, locations, events, social, discovery, community, local, recommendations, hidden gems" />
        <meta name="author" content="Sacavia Team" />
        
        {/* Open Graph Meta Tags */}
        <meta property="og:title" content={metadata.title} />
        <meta property="og:description" content={metadata.description} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/icon1.png" />
        <meta property="og:site_name" content="Sacavia" />
        
        {/* Twitter Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metadata.title} />
        <meta name="twitter:description" content={metadata.description} />
        <meta name="twitter:image" content="/icon1.png" />
        
        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/icon1.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icon1.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon1.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icon1.png" />
      </head>
      <body>
        <UserProvider initialUser={initialUser}>
          <NavBar />
          {children}
          <Footer />
          <div className="md:hidden">
            <MobileNavigation />
          </div>
          <PWAInstallBanner />
          <Toaster />
        </UserProvider>
        
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
