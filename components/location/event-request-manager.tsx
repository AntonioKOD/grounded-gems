'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, Users, MessageCircle, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { updateEventRequestStatus, getUserEventRequests } from '@/app/actions'
import { toast } from 'sonner'

interface EventRequest {
  id: string
  eventTitle: string
  eventDescription: string
  eventType: string
  requestedDate: string
  requestedTime: string
  expectedAttendees: number
  expectedGuests?: number
  specialRequests?: string
  status: 'pending' | 'approved' | 'denied' | 'cancelled'
  requestedBy: {
    id: string
    name: string
    email: string
    profileImage?: { url: string }
  }
  location: {
    id: string
    name: string
    address?: string
    featuredImage?: { url: string }
  }
  contactInfo?: {
    phone?: string
    email?: string
    preferredContact?: string
  }
  denialReason?: string
  approvalNotes?: string
  createdAt: string
  reviewedAt?: string
}

interface EventRequestManagerProps {
  currentUserId: string
  isLocationOwner?: boolean
  locationId?: string
}

export default function EventRequestManager({ 
  currentUserId, 
  isLocationOwner = false,
  locationId 
}: EventRequestManagerProps) {
  const [requests, setRequests] = useState<EventRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<EventRequest | null>(null)
  const [showResponseDialog, setShowResponseDialog] = useState(false)
  const [responseType, setResponseType] = useState<'approve' | 'deny'>('approve')
  const [responseMessage, setResponseMessage] = useState('')
  const [isResponding, setIsResponding] = useState(false)

  useEffect(() => {
    loadEventRequests()
  }, [currentUserId, locationId])

  const loadEventRequests = async () => {
    setLoading(true)
    try {
      const fetchedRequests = await getUserEventRequests()
      
      // Filter by location if specified
      let filteredRequests = fetchedRequests
      if (locationId) {
        filteredRequests = fetchedRequests.filter(req => 
          typeof req.location === 'object' ? req.location.id === locationId : req.location === locationId
        )
      }
      
      setRequests(filteredRequests)
    } catch (error) {
      console.error('Error loading event requests:', error)
      toast.error('Failed to load event requests')
    } finally {
      setLoading(false)
    }
  }

  const handleRequestAction = (request: EventRequest, action: 'approve' | 'deny') => {
    setSelectedRequest(request)
    setResponseType(action)
    setResponseMessage('')
    setShowResponseDialog(true)
  }

  const submitResponse = async () => {
    if (!selectedRequest) return
    
    if (responseType === 'deny' && !responseMessage.trim()) {
      toast.error('Please provide a reason for denying this request')
      return
    }

    setIsResponding(true)
    
    try {
      const result = await updateEventRequestStatus(
        selectedRequest.id,
        responseType === 'approve' ? 'approved' : 'denied',
        responseType === 'deny' ? responseMessage : undefined,
        responseType === 'approve' ? responseMessage : undefined
      )
      
      if (result.success) {
        toast.success(result.message)
        await loadEventRequests() // Reload the requests
        setShowResponseDialog(false)
        
        // Send browser notification to the requester about the response
        if (typeof window !== 'undefined') {
          try {
            const { showNotificationWithPreferences } = await import('@/lib/notifications')
            
            if (responseType === 'approve') {
              await showNotificationWithPreferences('EVENT_REQUEST', 
                `Great news! Your event "${selectedRequest.eventTitle}" has been approved at ${selectedRequest.location.name}. ${responseMessage ? responseMessage : 'You can now proceed to create your event.'}`, 
                {
                  locationId: selectedRequest.location.id,
                  type: 'event_request',
                  eventTitle: selectedRequest.eventTitle,
                  requestId: selectedRequest.id,
                  status: 'approved',
                  url: `/events/create?locationId=${selectedRequest.location.id}&requestId=${selectedRequest.id}`
                }
              )
            } else {
              await showNotificationWithPreferences('EVENT_REQUEST', 
                `Your event request "${selectedRequest.eventTitle}" at ${selectedRequest.location.name} has been denied. ${responseMessage || 'Please contact the venue for more information.'}`, 
                {
                  locationId: selectedRequest.location.id,
                  type: 'event_request',
                  eventTitle: selectedRequest.eventTitle,
                  requestId: selectedRequest.id,
                  status: 'denied'
                }
              )
            }
          } catch (notificationError) {
            console.error('Error showing event request response notification:', notificationError)
          }
        }
        
        setSelectedRequest(null)
        setResponseMessage('')
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error('Error responding to event request:', error)
      toast.error('Failed to respond to request')
    } finally {
      setIsResponding(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending Review', variant: 'default' as const, icon: AlertCircle, color: 'text-yellow-600' },
      approved: { label: 'Approved', variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      denied: { label: 'Denied', variant: 'destructive' as const, icon: XCircle, color: 'text-red-600' },
      cancelled: { label: 'Cancelled', variant: 'secondary' as const, icon: XCircle, color: 'text-gray-600' },
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getEventTypeLabel = (type: string) => {
    const typeLabels: Record<string, string> = {
      private_party: 'Private Party',
      corporate_event: 'Corporate Event',
      birthday_party: 'Birthday Party',
      wedding_reception: 'Wedding Reception',
      business_meeting: 'Business Meeting',
      product_launch: 'Product Launch',
      community_event: 'Community Event',
      fundraiser: 'Fundraiser',
      workshop: 'Workshop',
      other: 'Other'
    }
    return typeLabels[type] || type
  }

  const myRequests = requests.filter(req => req.requestedBy.id === currentUserId)
  const incomingRequests = requests.filter(req => req.requestedBy.id !== currentUserId)

  const EventRequestCard = ({ request, showActions = false }: { request: EventRequest; showActions?: boolean }) => (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{request.eventTitle}</CardTitle>
            <CardDescription>
              {getEventTypeLabel(request.eventType)} • {formatDate(request.requestedDate)}
            </CardDescription>
          </div>
          {getStatusBadge(request.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span>{formatDate(request.requestedDate)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-gray-500" />
              <span>{request.requestedTime}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-gray-500" />
              <span>{request.expectedAttendees} attendees</span>
            </div>
            {request.expectedGuests && request.expectedGuests > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-gray-500" />
                <span>{request.expectedGuests} expected guest{request.expectedGuests !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Requested by:</span> {request.requestedBy.name}
            </div>
            <div className="text-sm">
              <span className="font-medium">Location:</span> {request.location.name}
            </div>
            {request.contactInfo?.preferredContact && (
              <div className="text-sm">
                <span className="font-medium">Contact via:</span> {request.contactInfo.preferredContact}
              </div>
            )}
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-600">{request.eventDescription}</p>
        </div>

        {request.specialRequests && (
          <div>
            <h4 className="text-sm font-medium mb-1">Special Requests:</h4>
            <p className="text-sm text-gray-600">{request.specialRequests}</p>
          </div>
        )}

        {request.denialReason && (
          <div className="bg-red-50 p-3 rounded-lg">
            <h4 className="text-sm font-medium text-red-800 mb-1">Denial Reason:</h4>
            <p className="text-sm text-red-700">{request.denialReason}</p>
          </div>
        )}

        {request.approvalNotes && (
          <div className="bg-green-50 p-3 rounded-lg">
            <h4 className="text-sm font-medium text-green-800 mb-1">Approval Notes:</h4>
            <p className="text-sm text-green-700">{request.approvalNotes}</p>
          </div>
        )}

        {showActions && request.status === 'pending' && (
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => handleRequestAction(request, 'approve')}
              size="sm"
              style={{ 
                backgroundColor: 'var(--color-success)', 
                color: 'white',
                borderColor: 'var(--color-success)'
              }}
              className="hover:opacity-90"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve
            </Button>
            <Button
              onClick={() => handleRequestAction(request, 'deny')}
              size="sm"
              style={{ 
                backgroundColor: 'var(--color-warning)', 
                color: 'white',
                borderColor: 'var(--color-warning)'
              }}
              className="hover:opacity-90"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Deny
            </Button>
          </div>
        )}

        {/* Show Create Event button for approved requests if user is the requester */}
        {!showActions && request.status === 'approved' && request.requestedBy.id === currentUserId && (
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => {
                window.location.href = `/events/create?locationId=${request.location.id}&requestId=${request.id}&eventTitle=${encodeURIComponent(request.eventTitle)}&eventType=${request.eventType}&date=${request.requestedDate}&time=${request.requestedTime}&attendees=${request.expectedAttendees}`
              }}
              size="sm"
              style={{ 
                backgroundColor: 'var(--color-primary)', 
                color: 'white',
                borderColor: 'var(--color-primary)'
              }}
              className="hover:opacity-90"
            >
              <Calendar className="h-4 w-4 mr-1" />
              Create Event
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <>
      <Tabs defaultValue={isLocationOwner ? "incoming" : "my-requests"} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-requests">My Requests</TabsTrigger>
          <TabsTrigger value="incoming">
            {isLocationOwner ? 'Incoming Requests' : 'Received Requests'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-requests" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">My Event Requests</h3>
            <Badge variant="secondary">{myRequests.length} requests</Badge>
          </div>
          
          {myRequests.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">You haven&apos;t submitted any event requests yet.</p>
                <p className="text-sm text-gray-400 mt-1">
                  Find restaurants and venues that accept events and submit your first request!
                </p>
              </CardContent>
            </Card>
          ) : (
            myRequests.map((request) => (
              <EventRequestCard key={request.id} request={request} />
            ))
          )}
        </TabsContent>

        <TabsContent value="incoming" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">
              {isLocationOwner ? 'Incoming Event Requests' : 'Event Requests for Your Locations'}
            </h3>
            <Badge variant="secondary">{incomingRequests.length} requests</Badge>
          </div>
          
          {incomingRequests.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No event requests received yet.</p>
                <p className="text-sm text-gray-400 mt-1">
                  When someone requests to host an event at your location, it will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            incomingRequests.map((request) => (
              <EventRequestCard 
                key={request.id} 
                request={request} 
                showActions={isLocationOwner}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Response Dialog */}
      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {responseType === 'approve' ? 'Approve' : 'Deny'} Event Request
            </DialogTitle>
            <DialogDescription>
              {responseType === 'approve' 
                ? 'You can add notes or conditions for the approved event.'
                : 'Please provide a reason for denying this request.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedRequest && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-medium">{selectedRequest.eventTitle}</h4>
                <p className="text-sm text-gray-600">
                  {formatDate(selectedRequest.requestedDate)} • {selectedRequest.requestedTime}
                </p>
              </div>
            )}
            
            <div>
              <Label htmlFor="responseMessage">
                {responseType === 'approve' ? 'Approval Notes (Optional)' : 'Denial Reason *'}
              </Label>
              <Textarea
                id="responseMessage"
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                placeholder={
                  responseType === 'approve' 
                    ? 'Any special conditions, instructions, or notes for the event organizer...'
                    : 'Please explain why this request cannot be accommodated...'
                }
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResponseDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={submitResponse}
              disabled={isResponding}
              style={responseType === 'approve' ? { 
                backgroundColor: 'var(--color-success)', 
                color: 'white',
                borderColor: 'var(--color-success)'
              } : { 
                backgroundColor: 'var(--color-warning)', 
                color: 'white',
                borderColor: 'var(--color-warning)'
              }}
              className="hover:opacity-90"
            >
              {isResponding ? 'Processing...' : (responseType === 'approve' ? 'Approve Request' : 'Deny Request')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 