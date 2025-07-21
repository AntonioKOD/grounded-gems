import { GoogleAnalytics } from '@next/third-parties/google'
import Script from "next/script"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="format-detection" content="telephone=no, date=no, email=no, address=no" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#FF6B6B" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Sacavia" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="description" content="Discover authentic experiences and meaningful places with your community. Guided by wisdom, connected by stories." />
        <meta name="keywords" content="travel, locations, events, social, discovery, community, local, recommendations, native wisdom, authentic experiences" />
        <meta name="author" content="Sacavia Team" />
        <meta property="og:title" content="Sacavia - Guided Discovery & Authentic Journeys" />
        <meta property="og:description" content="Discover authentic experiences and meaningful places with your community. Guided by wisdom, connected by stories." />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/icon-512.png" />
        <meta property="og:site_name" content="Sacavia" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Sacavia - Guided Discovery & Authentic Journeys" />
        <meta name="twitter:description" content="Discover authentic experiences and meaningful places with your community. Guided by wisdom, connected by stories." />
        <meta name="twitter:image" content="/icon-192.png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icon-192.png" />
      </head>
      <body className="overflow-x-hidden" suppressHydrationWarning>
        {children}
        
        {/* Google Analytics */}
        <GoogleAnalytics gaId="G-QB3W2CL6T7" />
        
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
        
        {/* API Call Monitor - Development Only */}
        {process.env.NODE_ENV === 'development' && (
          <Script id="api-monitor" strategy="afterInteractive">
            {`
              // Monitor API calls to identify redundant requests
              console.log('🔍 API Call Monitor Started')
              
              // Track API calls
              const apiCalls = new Map()
              const duplicateCalls = []
              
              // Intercept fetch calls
              const originalFetch = window.fetch
              window.fetch = function(...args) {
                const url = args[0]
                const timestamp = Date.now()
                
                // Only track feed-related API calls
                if (typeof url === 'string' && (url.includes('/api/feed') || url.includes('/api/mobile/posts'))) {
                  const callKey = \`\${url}-\${JSON.stringify(args[1] || {})}\`
                  
                  if (apiCalls.has(callKey)) {
                    const previousCall = apiCalls.get(callKey)
                    const timeDiff = timestamp - previousCall.timestamp
                    
                    duplicateCalls.push({
                      url,
                      timeDiff,
                      previousCall: previousCall.timestamp,
                      currentCall: timestamp
                    })
                    
                    console.warn('🔄 DUPLICATE API CALL DETECTED:', {
                      url,
                      timeDiff: \`\${timeDiff}ms\`,
                      previousCall: new Date(previousCall.timestamp).toLocaleTimeString(),
                      currentCall: new Date(timestamp).toLocaleTimeString()
                    })
                  } else {
                    apiCalls.set(callKey, { timestamp, url })
                    console.log('📡 API Call:', url)
                  }
                }
                
                return originalFetch.apply(this, args)
              }
              
              // Log summary every 30 seconds
              setInterval(() => {
                console.log('📊 API Call Summary:', {
                  totalCalls: apiCalls.size,
                  duplicateCalls: duplicateCalls.length,
                  duplicates: duplicateCalls.slice(-5) // Last 5 duplicates
                })
              }, 30000)
              
              // Export for debugging
              window.apiCallMonitor = {
                apiCalls,
                duplicateCalls,
                clear: () => {
                  apiCalls.clear()
                  duplicateCalls.length = 0
                }
              }
              
              console.log('✅ API Call Monitor Ready - Check console for duplicate calls')
            `}
          </Script>
        )}
      </body>
    </html>
  );
} 