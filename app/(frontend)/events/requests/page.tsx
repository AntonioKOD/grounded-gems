import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Calendar, Users } from 'lucide-react'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

export default function EventRequestsPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Event Requests</h1>
          <p className="text-gray-600 mt-1">
            Manage event requests for your locations
          </p>
        </div>
      </div>

      {/* Temporary placeholder */}
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Calendar className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle>Event Requests Feature</CardTitle>
          <CardDescription>
            This feature is currently being updated for a better experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            Event request management will be available soon. In the meantime, you can:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <Link href="/events">
              <Button
                variant="outline"
                className="flex items-center gap-2 w-full"
              >
                <Calendar className="h-4 w-4" />
                Browse Events
              </Button>
            </Link>
            
            <Link href="/events/create">
              <Button
                variant="outline"
                className="flex items-center gap-2 w-full"
              >
                <Users className="h-4 w-4" />
                Create Event
              </Button>
            </Link>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Need to request an event?</h3>
            <p className="text-blue-800 text-sm">
              Please contact the location directly or use the &quot;Create Event&quot; feature 
              to organize your event.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 