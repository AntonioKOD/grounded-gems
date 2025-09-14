'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { X } from 'lucide-react'
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
      <DialogContent className="sm:max-w-md mx-4 p-0 border-0 bg-transparent">
        <div className="relative">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute -top-2 -right-2 z-10 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
          
          {/* Card */}
          <div className="max-w-[350px] mx-auto bg-gradient-to-br from-[#ff6b6b] to-[#4ecdc4] p-5 rounded-[20px] border border-[#4ecdc4]/30 shadow-xl">
            <div className="text-center mb-6">
              <span className="text-white/90 text-sm font-semibold">Download Now!</span>
              <h2 className="text-white text-2xl font-bold mt-2 leading-tight">
                Download our mobile application.
              </h2>
              <p className="text-white/80 text-sm mt-2 leading-relaxed">
                Download Sacavia mobile app for iOS to discover amazing places and connect with your community.
              </p>
            </div>
            
            <div className="flex items-center justify-center">
              {/* App Store Button */}
              <a 
                href={APP_STORE_URL}
                onClick={handleDownload}
                className="flex items-center justify-between bg-white rounded-[10px] p-3 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 min-w-[200px]"
              >
                <div className="w-7 h-7 flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M26.5058 27.625C25.33 29.3817 24.0833 31.0958 22.185 31.1242C20.2866 31.1667 19.6775 30.005 17.5241 30.005C15.3566 30.005 14.6908 31.0958 12.8916 31.1667C11.0358 31.2375 9.6333 29.2967 8.4433 27.5825C6.0208 24.0833 4.16497 17.6375 6.6583 13.3025C7.8908 11.1492 10.1008 9.78916 12.495 9.74666C14.3083 9.71833 16.0366 10.9792 17.1558 10.9792C18.2608 10.9792 20.3575 9.46333 22.5533 9.68999C23.4741 9.73249 26.0525 10.0583 27.71 12.495C27.5825 12.58 24.6358 14.3083 24.6641 17.8925C24.7066 22.1708 28.4183 23.6017 28.4608 23.6158C28.4183 23.715 27.8658 25.6558 26.5058 27.625ZM18.4166 4.95833C19.4508 3.78249 21.165 2.88999 22.5816 2.83333C22.7658 4.49083 22.1 6.16249 21.1083 7.35249C20.1308 8.55666 18.5158 9.49166 16.9291 9.36416C16.7166 7.73499 17.51 6.03499 18.4166 4.95833Z" fill="#000" />
                  </svg>
                </div>
                <div className="flex flex-col ml-3">
                  <span className="text-[#4ecdc4] text-xs font-semibold">Download from</span>
                  <span className="text-black text-sm font-bold">App Store</span>
                </div>
              </a>
            </div>
          </div>
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
