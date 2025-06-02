'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  MapPin, 
  Calendar, 
  Plus, 
  Eye, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Star,
  Heart,
  MessageSquare,
  Tag,
  Edit3
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import Image from 'next/image'
import Link from 'next/link'
import EventRequestManager from '@/components/location/event-request-manager'
import CreateSpecialModal from '@/components/location/create-special-modal'

interface User {
  id: string
  name?: string
  email?: string
}

interface Location {
  id: string
  name: string
  description?: string
  shortDescription?: string
  featuredImage?: { url: string } | string
  address?: string | Record<string, string>
  status: 'draft' | 'review' | 'published' | 'archived'
  isVerified: boolean
  isFeatured: boolean
  averageRating?: number
  reviewCount?: number
  createdAt: string
  updatedAt: string
  categories?: Array<string | { name: string }>
  visitVerificationCount?: number
}

interface DashboardStats {
  totalLocations: number
  publishedLocations: number
  totalViews: number
  totalInteractions: number
  pendingRequests: number
  totalEvents: number
}

export default function LocationDashboard() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalLocations: 0,
    publishedLocations: 0,
    totalViews: 0,
    totalInteractions: 0,
    pendingRequests: 0,
    totalEvents: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [showLocationEvents, setShowLocationEvents] = useState(false)
  const [isSpecialModalOpen, setIsSpecialModalOpen] = useState(false)
  const [selectedLocationForSpecial, setSelectedLocationForSpecial] = useState<Location | null>(null)

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        // First load current user
        const response = await fetch('/api/users/me')
        if (response.ok) {
          const data = await response.json()
          setCurrentUser(data.user)
          
          // Check if current user is viewing their own dashboard
          if (data.user.id !== userId) {
            toast.error('You can only view your own location dashboard')
            router.push(`/profile/${data.user.id}`)
            return
          }

          // Now load other data with the current user ID
          await Promise.all([
            loadUserLocations(data.user.id),
            loadDashboardStats(data.user.id)
          ])
        } else if (response.status === 401) {
          // User not authenticated
          toast.error('Please log in to view dashboard')
          router.push('/login')
          return
        } else {
          // Other error
          console.warn('Unexpected response from /api/users/me:', response.status)
          toast.error('Unable to verify user access')
          router.push('/login')
          return
        }
      } catch (error) {
        console.error('Error initializing dashboard:', error)
        toast.error('Failed to load dashboard')
      }
    }

    initializeDashboard()
  }, [userId, router])

  const loadUserLocations = async (userIdToLoad: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/users/${userIdToLoad}/locations`)
      const data = await response.json()
      
      if (data.success && data.locations) {
        setLocations(data.locations)
      } else {
        console.error('Failed to load locations:', data.error)
      }
    } catch (error) {
      console.error('Error loading locations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadDashboardStats = async (userIdToLoad: string) => {
    try {
      const response = await fetch(`/api/users/${userIdToLoad}/dashboard-stats`)
      const data = await response.json()
      
      if (data.success && data.stats) {
        setDashboardStats(data.stats)
      } else {
        console.error('Failed to load dashboard stats:', data.error)
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Draft', variant: 'secondary' as const, icon: Edit3 },
      review: { label: 'Under Review', variant: 'default' as const, icon: Clock },
      published: { label: 'Published', variant: 'default' as const, icon: CheckCircle },
      archived: { label: 'Archived', variant: 'secondary' as const, icon: XCircle },
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getLocationImageUrl = (location: Location): string => {
    if (typeof location.featuredImage === "string") {
      return location.featuredImage
    }
    if (location.featuredImage?.url) {
      return location.featuredImage.url
    }
    return "/placeholder.svg"
  }

  const formatAddress = (address?: string | Record<string, string>): string => {
    if (typeof address === 'string') {
      return address
    }
    if (address && typeof address === 'object') {
      return Object.values(address).filter(Boolean).join(', ')
    }
    return 'No address specified'
  }

  const handleViewLocationEvents = (location: Location) => {
    setSelectedLocation(location)
    setShowLocationEvents(true)
  }

  const handleCreateSpecial = (location: Location) => {
    setSelectedLocationForSpecial(location)
    setIsSpecialModalOpen(true)
  }

  const onSpecialCreated = () => {
    toast.success('Special created successfully!')
    setIsSpecialModalOpen(false)
    setSelectedLocationForSpecial(null)
    // Optionally refresh the locations data
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="h-10 w-10 rounded-full border-4 border-t-[#FF6B6B] border-r-[#FF6B6B]/30 border-b-[#FF6B6B]/10 border-l-[#FF6B6B]/60 animate-spin"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Location Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage your locations and event requests</p>
        </div>
        <Button asChild className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90">
          <Link href="/add-location">
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Link>
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Locations</p>
                <p className="text-2xl font-bold">{dashboardStats.totalLocations}</p>
              </div>
              <MapPin className="h-8 w-8 text-[#FF6B6B]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Published</p>
                <p className="text-2xl font-bold">{dashboardStats.publishedLocations}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Views</p>
                <p className="text-2xl font-bold">{dashboardStats.totalViews}</p>
              </div>
              <Eye className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Interactions</p>
                <p className="text-2xl font-bold">{dashboardStats.totalInteractions}</p>
              </div>
              <Heart className="h-8 w-8 text-pink-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Requests</p>
                <p className="text-2xl font-bold">{dashboardStats.pendingRequests}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Events</p>
                <p className="text-2xl font-bold">{dashboardStats.totalEvents}</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="locations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="locations">My Locations</TabsTrigger>
          <TabsTrigger value="event-requests">Event Requests</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Locations Tab */}
        <TabsContent value="locations" className="space-y-6">
          {locations.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-700 mb-2">No locations yet</h3>
                <p className="text-gray-500 mb-6">
                  Create your first location to start building your presence on Grounded Gems
                </p>
                <Button asChild className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90">
                  <Link href="/add-location">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Location
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {locations.map((location) => (
                <Card key={location.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative h-48">
                    <Image
                      src={getLocationImageUrl(location)}
                      alt={location.name}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-3 right-3">
                      {getStatusBadge(location.status)}
                    </div>
                    {location.isVerified && (
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg truncate">{location.name}</h3>
                      {location.averageRating && (
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                          <span>{location.averageRating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {location.shortDescription || location.description || 'No description'}
                    </p>
                    
                    <p className="text-xs text-gray-500 mb-3">
                      {formatAddress(location.address)}
                    </p>

                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                      <span>{location.reviewCount || 0} reviews</span>
                      <span>{location.visitVerificationCount || 0} visits</span>
                    </div>
                    
                    <Separator className="mb-4" />
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        style={{ 
                          borderColor: 'var(--color-info)',
                          color: 'var(--color-info)'
                        }}
                        className="flex-1 hover:bg-blue-50"
                        onClick={() => window.open(`/locations/${location.id}/edit`, '_blank')}
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        style={{ 
                          borderColor: 'var(--color-success)',
                          color: 'var(--color-success)'
                        }}
                        className="flex-1 hover:bg-green-50"
                        onClick={() => handleCreateSpecial(location)}
                      >
                        <Tag className="h-4 w-4 mr-1" />
                        Add Special
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        style={{ 
                          borderColor: 'var(--color-primary)',
                          color: 'var(--color-primary)'
                        }}
                        className="hover:bg-red-50"
                        onClick={() => handleViewLocationEvents(location)}
                      >
                        <Calendar className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <div className="flex items-center gap-4">
                        {location.averageRating && (
                          <div className="flex items-center">
                            <Star className="h-4 w-4 text-yellow-400 mr-1" />
                            <span>{location.averageRating.toFixed(1)}</span>
                          </div>
                        )}
                        {location.reviewCount && (
                          <div className="flex items-center">
                            <MessageSquare className="h-4 w-4 mr-1" />
                            <span>{location.reviewCount} reviews</span>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        Created {new Date(location.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Event Requests Tab */}
        <TabsContent value="event-requests" className="space-y-6">
          {currentUser?.id && (
            <EventRequestManager 
              currentUserId={currentUser.id} 
              isLocationOwner={true}
            />
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Analytics feature coming soon! You&apos;ll be able to see detailed insights about your locations&apos; performance.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>

      {/* Location Events Dialog */}
      <Dialog open={showLocationEvents} onOpenChange={setShowLocationEvents}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Event Requests for {selectedLocation?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedLocation && currentUser?.id && (
            <EventRequestManager 
              currentUserId={currentUser.id} 
              isLocationOwner={true}
              locationId={selectedLocation.id}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Create Special Modal */}
      {selectedLocationForSpecial && (
        <CreateSpecialModal
          isOpen={isSpecialModalOpen}
          onClose={() => {
            setIsSpecialModalOpen(false)
            setSelectedLocationForSpecial(null)
          }}
          locationId={selectedLocationForSpecial.id}
          locationName={selectedLocationForSpecial.name}
          onSpecialCreated={onSpecialCreated}
        />
      )}
    </div>
  )
} 