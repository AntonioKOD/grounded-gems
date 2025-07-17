import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, Home, Search } from 'lucide-react'

export default function PostNotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Post Not Found</h1>
          <p className="text-gray-600 mb-6">
            The post you're looking for doesn't exist or may have been removed.
          </p>
          
          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link href="/feed">
                <Home className="h-4 w-4 mr-2" />
                Go to Feed
              </Link>
            </Button>
            
            <Button variant="outline" asChild className="w-full">
              <Link href="/explore">
                <Search className="h-4 w-4 mr-2" />
                Explore Content
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 