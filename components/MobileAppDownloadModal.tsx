'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, Download, Star, Smartphone, MapPin, Users, Heart } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'

const APP_STORE_URL = 'https://apps.apple.com/us/app/sacavia/id6748926294'
const APP_BUNDLE_ID = 'com.sacavia.app'

interface MobileAppDownloadModalProps {
  isOpen: boolean
  onClose: () => void
  onDownload: () => void
}

export default function MobileAppDownloadModal({ 
  isOpen, 
  onClose, 
  onDownload 
}: MobileAppDownloadModalProps) {
  const [isIOS, setIsIOS] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    // Detect iOS devices
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
    const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent) || 
                       (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    setIsIOS(isIOSDevice)
  }, [])

  const handleDownload = () => {
    onDownload()
    
    if (isIOS) {
      // Try to open the app if installed, otherwise open App Store
      const appUrl = `sacavia://open` // Custom URL scheme
      const appStoreUrl = APP_STORE_URL
      
      // Try to open the app first
      const startTime = Date.now()
      window.location.href = appUrl
      
      // If the app doesn't open within 2 seconds, redirect to App Store
      setTimeout(() => {
        if (Date.now() - startTime < 2000) {
          window.location.href = appStoreUrl
        }
      }, 2000)
    } else {
      // For Android or other platforms, open App Store
      window.open(APP_STORE_URL, '_blank')
    }
  }

  const handleClose = () => {
    // Store dismissal in localStorage
    localStorage.setItem('sacavia-app-modal-dismissed', 'true')
    onClose()
  }

  if (!isMobile) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md mx-4">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <Smartphone className="w-8 h-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-xl font-bold text-gray-900">
            Get the Sacavia App
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-gray-600 text-center">
            Experience Sacavia with our native mobile app for the best discovery experience.
          </p>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <MapPin className="w-5 h-5 text-blue-500" />
              <div>
                <p className="font-medium text-sm">Discover Places</p>
                <p className="text-xs text-gray-500">Find amazing local spots near you</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Users className="w-5 h-5 text-green-500" />
              <div>
                <p className="font-medium text-sm">Connect with People</p>
                <p className="text-xs text-gray-500">Meet locals and fellow explorers</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Heart className="w-5 h-5 text-red-500" />
              <div>
                <p className="font-medium text-sm">Share Your Favorites</p>
                <p className="text-xs text-gray-500">Recommend places you love</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span>4.8 rating on App Store</span>
          </div>
          
          <div className="flex gap-3">
            <Button 
              onClick={handleDownload}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              {isIOS ? 'Download for iOS' : 'Download App'}
            </Button>
            <Button 
              onClick={handleClose}
              variant="outline"
              className="px-3"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <p className="text-xs text-gray-400 text-center">
            Free to download • No ads • Privacy focused
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Hook to manage the modal state
export function useMobileAppModal() {
  const [isOpen, setIsOpen] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!isMobile) return

    // Check if user has already dismissed the modal
    const dismissed = localStorage.getItem('sacavia-app-modal-dismissed')
    if (dismissed) return

    // Check if user is already in the app (has the app installed)
    const isInApp = window.navigator.userAgent.includes('SacaviaApp') || 
                   window.location.href.includes('capacitor://')
    if (isInApp) return

    // Show modal after a short delay
    const timer = setTimeout(() => {
      setIsOpen(true)
    }, 2000) // Show after 2 seconds

    return () => clearTimeout(timer)
  }, [isMobile])

  const handleClose = () => {
    setIsOpen(false)
  }

  const handleDownload = () => {
    // Track download attempt
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'app_download_attempt', {
        event_category: 'engagement',
        event_label: 'mobile_modal'
      })
    }
  }

  return {
    isOpen,
    onClose: handleClose,
    onDownload: handleDownload
  }
}
