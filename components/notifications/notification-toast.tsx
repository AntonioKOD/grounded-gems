'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, Heart, MapPin, Calendar, Users, Star, Award } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

interface NotificationToast {
  id: string
  type: string
  title: string
  message: string
  actionBy?: {
    id: string
    name: string
    profileImage?: { url: string }
  }
  relatedTo?: {
    id: string
    collection: string
  }
  metadata?: Record<string, unknown>
  createdAt: string
}

interface NotificationToastProps {
  notification: NotificationToast
  onDismiss: () => void
  onNavigate?: () => void
}

const getNotificationIcon = (type: string) => {
  const iconMap: Record<string, React.ComponentType<any>> = {
    location_liked: Heart,
    location_shared: MapPin,
    location_visited: MapPin,
    location_reviewed: Star,
    event_request_received: Calendar,
    event_invitation: Calendar,
    follow: Users,
    location_milestone: Award,
    default: Bell,
  }
  
  return iconMap[type] || iconMap.default
}

const getNotificationColor = (type: string) => {
  const colorMap: Record<string, string> = {
    location_liked: 'text-red-500 bg-red-50',
    location_shared: 'text-blue-500 bg-blue-50',
    location_visited: 'text-green-500 bg-green-50',
    location_reviewed: 'text-yellow-500 bg-yellow-50',
    event_request_received: 'text-purple-500 bg-purple-50',
    event_invitation: 'text-purple-500 bg-purple-50',
    follow: 'text-blue-500 bg-blue-50',
    location_milestone: 'text-orange-500 bg-orange-50',
    default: 'text-gray-500 bg-gray-50',
  }
  
  return colorMap[type] || colorMap.default
}

const getNotificationLink = (notification: NotificationToast): string | null => {
  if (!notification.relatedTo) return null
  
  const { collection, id } = notification.relatedTo
  
  switch (collection) {
    case 'locations':
      return `/locations/${id}`
    case 'events':
      return `/events/${id}`
    case 'journeys':
      return `/events/journey/${id}`
    case 'posts':
      return `/post/${id}`
    case 'users':
      return `/profile/${id}`
    default:
      return '/notifications'
  }
}

export default function NotificationToastItem({ 
  notification, 
  onDismiss, 
  onNavigate 
}: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(true)
  const Icon = getNotificationIcon(notification.type)
  const colorClasses = getNotificationColor(notification.type)
  const link = getNotificationLink(notification)

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss()
    }, 6000)

    return () => clearTimeout(timer)
  }, [])

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(onDismiss, 300) // Wait for animation to complete
  }

  const handleClick = () => {
    if (link) {
      onNavigate?.()
      handleDismiss()
    }
  }

  const ToastContent = (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.95 }}
      animate={{ 
        opacity: isVisible ? 1 : 0, 
        y: isVisible ? 0 : -50, 
        scale: isVisible ? 1 : 0.95 
      }}
      exit={{ opacity: 0, y: -50, scale: 0.95 }}
      transition={{ 
        type: "spring", 
        stiffness: 500, 
        damping: 30,
        duration: 0.3
      }}
      className="w-full max-w-sm"
    >
      <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-0">
          <div className={`p-4 ${link ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors`} onClick={handleClick}>
            <div className="flex items-start gap-3">
              {/* Notification Icon */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${colorClasses}`}>
                <Icon className="h-5 w-5" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* User Avatar and Name (if actionBy exists) */}
                {notification.actionBy && (
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar className="h-6 w-6">
                      <AvatarImage 
                        src={notification.actionBy.profileImage?.url} 
                        alt={notification.actionBy.name}
                      />
                      <AvatarFallback className="text-xs">
                        {notification.actionBy.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {notification.actionBy.name}
                    </span>
                  </div>
                )}

                {/* Title */}
                <h4 className="font-medium text-gray-900 text-sm leading-tight mb-1">
                  {notification.title}
                </h4>

                {/* Message */}
                <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                  {notification.message}
                </p>

                {/* Time */}
                <p className="text-xs text-gray-400 mt-1">
                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                </p>
              </div>

              {/* Dismiss Button */}
              <Button
                variant="ghost"
                size="sm"
                className="flex-shrink-0 h-6 w-6 p-0 hover:bg-gray-100"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDismiss()
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )

  return link ? (
    <Link href={link} className="block">
      {ToastContent}
    </Link>
  ) : (
    ToastContent
  )
}

// Container component for managing multiple notification toasts
interface NotificationToastContainerProps {
  notifications: NotificationToast[]
  onDismiss: (id: string) => void
  onNavigate?: () => void
}

export function NotificationToastContainer({ 
  notifications, 
  onDismiss, 
  onNavigate 
}: NotificationToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none md:top-4 md:right-4 md:left-auto notification-toast-container md:notification-toast-container-desktop">
      <AnimatePresence>
        {notifications.map((notification) => (
          <div key={notification.id} className="pointer-events-auto">
            <NotificationToastItem 
              notification={notification}
              onDismiss={() => onDismiss(notification.id)}
              onNavigate={onNavigate}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
} 