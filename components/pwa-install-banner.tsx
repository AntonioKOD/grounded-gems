'use client'

import { useState, useEffect } from 'react'
import { X, Download, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { isPWA, canInstallPWA, setupInstallPrompt, showInstallPrompt } from '@/lib/pwa'

export default function PWAInstallBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const [installPromptReady, setInstallPromptReady] = useState(false)

  useEffect(() => {
    // Don't show banner if already running as PWA
    if (isPWA()) {
      return
    }

    // Setup install prompt listener
    setupInstallPrompt()

    // Check if install prompt is available
    const checkInstallPrompt = () => {
      if (canInstallPWA()) {
        setInstallPromptReady(true)
        
        // Show banner after a delay if user hasn't dismissed it
        const dismissed = localStorage.getItem('pwa-install-dismissed')
        if (!dismissed) {
          setTimeout(() => {
            setShowBanner(true)
          }, 3000) // Show after 3 seconds
        }
      }
    }

    checkInstallPrompt()

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = () => {
      setInstallPromptReady(true)
      
      const dismissed = localStorage.getItem('pwa-install-dismissed')
      if (!dismissed) {
        setTimeout(() => {
          setShowBanner(true)
        }, 3000)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    const installed = await showInstallPrompt()
    if (installed) {
      setShowBanner(false)
      localStorage.removeItem('pwa-install-dismissed')
    }
  }

  const handleDismiss = () => {
    setShowBanner(false)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  if (!showBanner || !installPromptReady) {
    return null
  }

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 z-50 max-w-sm mx-auto">
      <Card className="p-4 bg-white shadow-lg border border-gray-200 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-[#FF6B6B] rounded-lg flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              Install Grounded Gems
            </h3>
            <p className="text-xs text-gray-600 mb-3">
                              Get the full app experience! Install Grounded Gems for faster access and offline features.
            </p>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleInstall}
                className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white text-xs px-3 py-1 h-auto"
              >
                <Download className="w-3 h-3 mr-1" />
                Install
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDismiss}
                className="text-xs px-3 py-1 h-auto"
              >
                Not now
              </Button>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </Card>
    </div>
  )
} 