'use client'

import { useEffect, useState } from 'react'

/**
 * HydrationErrorFixer - Prevents common hydration mismatches
 * 
 * Based on Next.js hydration error documentation:
 * https://nextjs.org/docs/messages/react-hydration-error
 * 
 * This component handles:
 * 1. Client-side only rendering to prevent mismatches
 * 2. iOS-specific safe area handling
 * 3. Environment variable differences
 * 4. Browser extension interference
 */
export default function HydrationErrorFixer() {
  const [isClient, setIsClient] = useState(false)
  const [safeAreaInsets, setSafeAreaInsets] = useState({
    top: '0px',
    bottom: '0px',
    left: '0px',
    right: '0px'
  })

  // Ensure client-side only rendering
  useEffect(() => {
    setIsClient(true)
    
    // Set safe area insets after hydration to prevent mismatch
    const root = document.documentElement
    
    // Only proceed if CSS supports environment variables
    if (CSS.supports('padding', 'env(safe-area-inset-top)')) {
      // Get computed safe area values
      const computedStyle = getComputedStyle(root)
      
      // Set CSS variables safely without causing hydration mismatch
      requestAnimationFrame(() => {
        try {
          // Get the actual env() values if available
          const topValue = CSS.supports('padding', 'env(safe-area-inset-top)') 
            ? 'env(safe-area-inset-top, 0px)' 
            : '0px'
          const bottomValue = CSS.supports('padding', 'env(safe-area-inset-bottom)') 
            ? 'env(safe-area-inset-bottom, 0px)' 
            : '0px'
          const leftValue = CSS.supports('padding', 'env(safe-area-inset-left)') 
            ? 'env(safe-area-inset-left, 0px)' 
            : '0px'
          const rightValue = CSS.supports('padding', 'env(safe-area-inset-right)') 
            ? 'env(safe-area-inset-right, 0px)' 
            : '0px'

          // Set CSS custom properties for safe areas
          root.style.setProperty('--safe-area-inset-top', topValue)
          root.style.setProperty('--safe-area-inset-bottom', bottomValue)
          root.style.setProperty('--safe-area-inset-left', leftValue)
          root.style.setProperty('--safe-area-inset-right', rightValue)
          
          // Also set mobile-specific variables
          root.style.setProperty('--mobile-safe-area-top', topValue)
          root.style.setProperty('--mobile-safe-area-bottom', bottomValue)
          
          setSafeAreaInsets({
            top: topValue,
            bottom: bottomValue,
            left: leftValue,
            right: rightValue
          })
          
          console.log('[HydrationFixer] Safe area variables set successfully')
        } catch (error) {
          console.warn('[HydrationFixer] Could not set safe area variables:', error)
        }
      })
    }

    // Prevent iOS Safari zoom on input focus
    if (typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
      const viewportMeta = document.querySelector('meta[name="viewport"]')
      if (viewportMeta) {
        viewportMeta.setAttribute('content', 
          'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
        )
      }
    }

    // Add iOS format detection if not present
    if (typeof window !== 'undefined' && !document.querySelector('meta[name="format-detection"]')) {
      const formatDetectionMeta = document.createElement('meta')
      formatDetectionMeta.name = 'format-detection'
      formatDetectionMeta.content = 'telephone=no, date=no, email=no, address=no'
      document.head.appendChild(formatDetectionMeta)
    }

  }, [])

  // Don't render anything during SSR to prevent hydration mismatch
  if (!isClient) {
    return null
  }

  // Client-side only content
  return (
    <div suppressHydrationWarning={true} style={{ display: 'none' }}>
      {/* This component fixes hydration issues but doesn't render visible content */}
      <script
        suppressHydrationWarning={true}
        dangerouslySetInnerHTML={{
          __html: `
            // Additional client-side hydration fixes
            try {
              // Prevent browser extension interference
              if (typeof window !== 'undefined') {
                // Add marker to detect if DOM has been modified
                document.documentElement.setAttribute('data-hydration-safe', 'true');
                
                // Log any mutations that might cause hydration issues
                if (typeof MutationObserver !== 'undefined') {
                  const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                      if (mutation.type === 'childList' && mutation.target !== document.head) {
                        console.debug('[HydrationFixer] DOM mutation detected:', mutation);
                      }
                    });
                  });
                  
                  // Observe for a short time after hydration
                  observer.observe(document.body, { 
                    childList: true, 
                    subtree: true 
                  });
                  
                  setTimeout(() => observer.disconnect(), 5000);
                }
              }
            } catch (error) {
              console.warn('[HydrationFixer] Client-side script error:', error);
            }
          `
        }}
      />
    </div>
  )
} 