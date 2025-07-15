import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getUserbyId } from "@/app/actions"
import CreatorEarningsDashboard from "@/components/guides/creator-earnings-dashboard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  ArrowLeft, 
  BookOpen, 
  DollarSign, 
  TrendingUp, 
  Users,
  Award,
  Sparkles,
  Plus
} from "lucide-react"
import Link from "next/link"
import type { UserProfile } from "@/types/user"

// Loading component for the dashboard
function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-10 bg-gray-200 rounded mt-4"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default async function CreatorDashboardPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params

  // Extend UserProfile inline to include creatorProfile and username
  type UserProfileWithCreator = UserProfile & {
    creatorProfile?: {
      creatorLevel?: string
      verification?: { isVerified?: boolean }
    }
    username?: string
  }

  // Validate ID format
  if (!id || id.trim() === '' || id.length < 12) {
    console.error(`Invalid user ID format: ${id}`)
    notFound()
  }

  try {
    // Get user data
    const userData = await getUserbyId(id) as UserProfileWithCreator | null
    
    if (!userData) {
      console.log(`User not found for ID: ${id}`)
      notFound()
    }

    // Check if user is a creator
    if (!userData.isCreator) {
      console.log(`User ${id} is not a creator`)
      notFound()
    }

    const getCreatorLevelDetails = (level?: string) => {
      switch (level) {
        case 'explorer':
          return {
            title: 'Local Explorer',
            description: 'Just getting started with creating guides',
            icon: '🌟',
            color: 'bg-blue-100 text-blue-800 border-blue-200',
            gradient: 'from-blue-400 to-blue-600'
          }
        case 'hunter':
          return {
            title: 'Hidden Gem Hunter',
            description: 'Discovering unique local spots',
            icon: '💎',
            color: 'bg-purple-100 text-purple-800 border-purple-200',
            gradient: 'from-purple-400 to-purple-600'
          }
        case 'authority':
          return {
            title: 'Local Authority',
            description: 'Recognized expert in your area',
            icon: '👑',
            color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            gradient: 'from-yellow-400 to-yellow-600'
          }
        case 'expert':
          return {
            title: 'Destination Expert',
            description: 'Top-tier creator with proven expertise',
            icon: '⭐',
            color: 'bg-orange-100 text-orange-800 border-orange-200',
            gradient: 'from-orange-400 to-orange-600'
          }
        default:
          return {
            title: 'Local Explorer',
            description: 'Welcome to the creator program',
            icon: '🌟',
            color: 'bg-gray-100 text-gray-800 border-gray-200',
            gradient: 'from-gray-400 to-gray-600'
          }
      }
    }

    const creatorLevel = getCreatorLevelDetails(userData.creatorProfile?.creatorLevel)

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* Background decorations */}
        <div className="absolute inset-0 opacity-10 overflow-hidden">
          <div className="absolute top-10 left-10 w-48 h-48 bg-gradient-to-br from-[#FF6B6B]/30 to-[#4ECDC4]/30 rounded-full blur-xl"></div>
          <div className="absolute bottom-20 right-10 w-60 h-60 bg-gradient-to-br from-[#FFD93D]/30 to-[#FF6B6B]/30 rounded-full blur-xl"></div>
        </div>

        <div className="relative z-10 container mx-auto px-4 py-6 max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <Link href={`/profile/${id}`}>
                <Button variant="ghost" size="sm" className="hover:bg-white/50">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Profile
                </Button>
              </Link>
            </div>

            {/* Creator Profile Header */}
            <Card className="mb-6 overflow-hidden shadow-xl border-0 bg-white/95 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  {/* Avatar */}
                  <Avatar className="w-20 h-20 border-4 border-white shadow-lg">
                    {userData.profileImage ? (
                      <AvatarImage 
                        src={userData.profileImage.url} 
                        alt={userData.name || "Creator"} 
                      />
                    ) : (
                      <AvatarFallback className="bg-gradient-to-br from-[#FF6B6B] to-[#4ECDC4] text-white text-xl font-bold">
                        {userData.name?.charAt(0) || userData.username?.charAt(0) || 'C'}
                      </AvatarFallback>
                    )}
                  </Avatar>

                  {/* Creator Info */}
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                          Creator Dashboard
                        </h1>
                        <p className="text-gray-600 mb-3">
                          Welcome back, {userData.name || userData.username}! 
                        </p>
                        
                        <div className="flex items-center gap-3">
                          <Badge className={`${creatorLevel.color} border px-3 py-1 font-medium`}>
                            <span className="mr-1">{creatorLevel.icon}</span>
                            {creatorLevel.title}
                          </Badge>
                          
                          {userData.creatorProfile?.verification?.isVerified && (
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              <Award className="h-3 w-3 mr-1" />
                              Verified Creator
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex gap-2">
                        <Link href="/guides/create">
                          <Button className="bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] hover:from-[#FF6B6B]/90 hover:to-[#4ECDC4]/90">
                            <Plus className="h-4 w-4 mr-2" />
                            Create Guide
                          </Button>
                        </Link>
                        <Link href="/guides">
                          <Button variant="outline">
                            <BookOpen className="h-4 w-4 mr-2" />
                            My Guides
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Creator Earnings Dashboard */}
          <Suspense fallback={<DashboardLoading />}>
            <CreatorEarningsDashboard userId={id} />
          </Suspense>

          {/* Creator Tips */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                Creator Tips
              </CardTitle>
              <CardDescription>
                Maximize your earnings with these proven strategies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Quality Content</h4>
                  <p className="text-sm text-blue-700">
                    Create detailed, well-researched guides with high-quality photos and insider tips.
                  </p>
                </div>
                <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">Optimize Pricing</h4>
                  <p className="text-sm text-green-700">
                    Research similar guides and price competitively. Consider pay-what-you-want for broader appeal.
                  </p>
                </div>
                <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                  <h4 className="font-semibold text-purple-900 mb-2">Promote Your Work</h4>
                  <p className="text-sm text-purple-700">
                    Share your guides on social media and engage with the Sacavia community.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )

  } catch (error) {
    console.error(`Error loading creator dashboard for ID ${id}:`, error)
    notFound()
  }
} 