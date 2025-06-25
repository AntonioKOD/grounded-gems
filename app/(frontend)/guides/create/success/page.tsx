'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  Clock, 
  Eye, 
  FileText, 
  ArrowRight,
  Sparkles,
  Users,
  TrendingUp
} from 'lucide-react'
import Link from 'next/link'

function GuideCreateSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'draft' | 'review' | null>(null)

  useEffect(() => {
    const statusParam = searchParams.get('status')
    if (statusParam === 'draft' || statusParam === 'review') {
      setStatus(statusParam)
    } else {
      // Redirect to guides if no valid status
      router.push('/guides')
    }
  }, [searchParams, router])

  if (!status) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4ECDC4]"></div>
      </div>
    )
  }

  const isDraft = status === 'draft'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {isDraft ? 'Guide Saved Successfully!' : 'Guide Submitted for Review!'}
          </h1>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {isDraft 
              ? 'Your guide has been saved as a draft. You can continue editing it anytime and submit it for review when ready.'
              : 'Thank you for creating a guide! Our team will review it and notify you once it\'s approved and published.'
            }
          </p>
        </div>

        {/* Status Card */}
        <Card className="mb-8 border-0 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Badge 
                variant={isDraft ? "secondary" : "default"}
                className={`px-4 py-2 text-sm font-medium ${
                  isDraft 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {isDraft ? (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Draft Saved
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 mr-2" />
                    Under Review
                  </>
                )}
              </Badge>
            </div>
            
            <CardTitle className="text-2xl">
              {isDraft ? 'What happens next?' : 'Review Process'}
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            {isDraft ? (
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-blue-900">Continue Editing</h3>
                    <p className="text-blue-700 text-sm">
                      Your draft is safely saved. Add more details, upload images, or refine your content anytime.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg">
                  <Eye className="w-6 h-6 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-green-900">Submit for Review</h3>
                    <p className="text-green-700 text-sm">
                      When you're ready, submit your guide for review to get it published and start earning.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-yellow-50 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-yellow-900">Review Timeline</h3>
                    <p className="text-yellow-700 text-sm">
                      Our team typically reviews guides within 24-48 hours. We'll check for quality, accuracy, and completeness.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg">
                  <Sparkles className="w-6 h-6 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-green-900">Once Approved</h3>
                    <p className="text-green-700 text-sm">
                      Your guide will be published in the marketplace and you can start earning from purchases and tips.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tips Section */}
        <Card className="mb-8 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#4ECDC4]" />
              Tips for Success
            </CardTitle>
            <CardDescription>
              Make your guide stand out and maximize your earnings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-[#4ECDC4] rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium">Add high-quality images</h4>
                    <p className="text-sm text-gray-600">Visual guides perform 3x better</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-[#4ECDC4] rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium">Include insider tips</h4>
                    <p className="text-sm text-gray-600">Local knowledge adds unique value</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-[#4ECDC4] rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium">Write detailed descriptions</h4>
                    <p className="text-sm text-gray-600">Help travelers know what to expect</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-[#FF6B6B] rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium">Update regularly</h4>
                    <p className="text-sm text-gray-600">Keep information current and fresh</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-[#FF6B6B] rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium">Engage with users</h4>
                    <p className="text-sm text-gray-600">Respond to questions and feedback</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-[#FF6B6B] rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium">Share your guide</h4>
                    <p className="text-sm text-gray-600">Promote on social media for more views</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/guides">
            <Button 
              variant="outline" 
              size="lg"
              className="w-full sm:w-auto border-2 border-gray-300 hover:border-gray-400"
            >
              <Users className="w-5 h-5 mr-2" />
              Browse All Guides
            </Button>
          </Link>
          
          {isDraft ? (
            <Link href="/guides/create">
              <Button 
                size="lg"
                className="w-full sm:w-auto bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] hover:from-[#FF6B6B]/90 hover:to-[#4ECDC4]/90 text-white"
              >
                <FileText className="w-5 h-5 mr-2" />
                Continue Editing
              </Button>
            </Link>
          ) : (
            <Link href="/guides/create">
              <Button 
                size="lg"
                className="w-full sm:w-auto bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] hover:from-[#FF6B6B]/90 hover:to-[#4ECDC4]/90 text-white"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Create Another Guide
              </Button>
            </Link>
          )}
        </div>

        {/* Additional Info */}
        <div className="text-center mt-12 text-gray-600">
          <p className="text-sm">
            Questions about the process? Check out our{' '}
            <Link href="/help" className="text-[#4ECDC4] hover:underline">
              Creator Guide
            </Link>
            {' '}or{' '}
            <Link href="/contact" className="text-[#4ECDC4] hover:underline">
              contact support
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4ECDC4]"></div>
    </div>
  )
}

export default function GuideCreateSuccessPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <GuideCreateSuccessContent />
    </Suspense>
  )
} 