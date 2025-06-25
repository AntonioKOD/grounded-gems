import { Suspense } from 'react'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import WeeklyFeatureDetail from '@/components/weekly/weekly-feature-detail'
import WeeklyFeatureSkeleton from '@/components/weekly/weekly-feature-skeleton'

interface WeeklyFeaturePageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: WeeklyFeaturePageProps): Promise<Metadata> {
  try {
    const { id } = await params
    
    // Check if this is a default ID (starts with 'default_')
    if (id.startsWith('default_')) {
      // For default IDs, fetch the current weekly feature from API
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/weekly-features/current`)
        const data = await response.json()
        
        if (data.success && data.data.feature) {
          const feature = data.data.feature
          return {
            title: `${feature.title} | Weekly Feature | Sacavia`,
            description: feature.description || 'Explore this week\'s curated content and discoveries.',
            keywords: ['weekly feature', 'curated content', 'discoveries', 'sacavia'],
            openGraph: {
              title: `${feature.title} | Weekly Feature`,
              description: feature.description || 'Explore this week\'s curated content and discoveries.',
              type: 'article',
              publishedTime: feature.createdAt,
              modifiedTime: feature.updatedAt,
            },
            twitter: {
              card: 'summary_large_image',
              title: `${feature.title} | Weekly Feature`,
              description: feature.description || 'Explore this week\'s curated content and discoveries.',
            }
          }
        }
      } catch (apiError) {
        console.error('Error fetching current weekly feature for metadata:', apiError)
      }
      
      // Fallback metadata for default features
      return {
        title: 'Weekly Feature | Sacavia',
        description: 'Explore this week\'s curated content and discoveries.'
      }
    }
    
    const payload = await getPayload({ config })
    
    // Check if weekly-features collection exists
    const collections = await payload.collections
    if (!collections['weekly-features']) {
      console.warn('Weekly-features collection not found')
      return {
        title: 'Weekly Feature | Sacavia',
        description: 'Explore this week\'s curated content and discoveries.'
      }
    }
    
    const feature = await payload.findByID({
      collection: 'weekly-features',
      id: id,
      depth: 2
    })

    if (!feature) {
      return {
        title: 'Weekly Feature Not Found | Sacavia',
        description: 'This weekly feature could not be found.'
      }
    }

    return {
      title: `${feature.title} | Weekly Feature | Sacavia`,
      description: feature.description || 'Explore this week\'s curated content and discoveries.',
      keywords: ['weekly feature', 'curated content', 'discoveries', 'sacavia'],
      openGraph: {
        title: `${feature.title} | Weekly Feature`,
        description: feature.description || 'Explore this week\'s curated content and discoveries.',
        type: 'article',
        publishedTime: feature.createdAt,
        modifiedTime: feature.updatedAt,
      },
      twitter: {
        card: 'summary_large_image',
        title: `${feature.title} | Weekly Feature`,
        description: feature.description || 'Explore this week\'s curated content and discoveries.',
      }
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Weekly Feature | Sacavia',
      description: 'Explore this week\'s curated content and discoveries.'
    }
  }
}

export default async function WeeklyFeaturePage({ params }: WeeklyFeaturePageProps) {
  try {
    const { id } = await params
    
    // Check if this is a default ID (starts with 'default_')
    if (id.startsWith('default_')) {
      // For default IDs, fetch the current weekly feature from API
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/weekly-features/current`)
        const data = await response.json()
        
        if (data.success && data.data.feature) {
          const feature = data.data.feature
          return (
            <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
              <Suspense fallback={<WeeklyFeatureSkeleton />}>
                <WeeklyFeatureDetail feature={feature} />
              </Suspense>
            </main>
          )
        } else {
          // No weekly feature available
          return (
            <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
              <div className="max-w-4xl mx-auto px-4 py-12">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#FF6B6B]/10 to-[#4ECDC4]/10 rounded-full flex items-center justify-center">
                    <span className="text-3xl">📅</span>
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">Weekly Features Coming Soon</h1>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    We're working on bringing you amazing weekly curated content. Check back soon for the latest discoveries and features!
                  </p>
                  <div className="flex gap-4 justify-center">
                    <a 
                      href="/feed" 
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
                    >
                      Back to Feed
                    </a>
                    <a 
                      href="/explore" 
                      className="inline-flex items-center px-6 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-300"
                    >
                      Explore Locations
                    </a>
                  </div>
                </div>
              </div>
            </main>
          )
        }
      } catch (apiError) {
        console.error('Error fetching current weekly feature:', apiError)
      }
      
      // If API call fails, show fallback content
      return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
          <div className="max-w-4xl mx-auto px-4 py-12">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#FF6B6B]/10 to-[#4ECDC4]/10 rounded-full flex items-center justify-center">
                <span className="text-3xl">📅</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Weekly Features Coming Soon</h1>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                We're working on bringing you amazing weekly curated content. Check back soon for the latest discoveries and features!
              </p>
              <div className="flex gap-4 justify-center">
                <a 
                  href="/feed" 
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
                >
                  Back to Feed
                </a>
                <a 
                  href="/explore" 
                  className="inline-flex items-center px-6 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-300"
                >
                  Explore Locations
                </a>
              </div>
            </div>
          </div>
        </main>
      )
    }
    
    const payload = await getPayload({ config })
    
    // Check if weekly-features collection exists
    const collections = await payload.collections
    if (!collections['weekly-features']) {
      console.warn('Weekly-features collection not found, showing fallback')
      return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
          <div className="max-w-4xl mx-auto px-4 py-12">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#FF6B6B]/10 to-[#4ECDC4]/10 rounded-full flex items-center justify-center">
                <span className="text-3xl">📅</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Weekly Features Coming Soon</h1>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                We're working on bringing you amazing weekly curated content. Check back soon for the latest discoveries and features!
              </p>
              <div className="flex gap-4 justify-center">
                <a 
                  href="/feed" 
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
                >
                  Back to Feed
                </a>
                <a 
                  href="/explore" 
                  className="inline-flex items-center px-6 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-300"
                >
                  Explore Locations
                </a>
              </div>
            </div>
          </div>
        </main>
      )
    }
    
    const feature = await payload.findByID({
      collection: 'weekly-features',
      id: id,
      depth: 3
    })

    if (!feature) {
      console.warn(`Weekly feature with ID ${id} not found`)
      notFound()
    }

    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <Suspense fallback={<WeeklyFeatureSkeleton />}>
          <WeeklyFeatureDetail feature={feature} />
        </Suspense>
      </main>
    )
  } catch (error) {
    console.error('Error in weekly feature page:', error)
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#FF6B6B]/10 to-[#4ECDC4]/10 rounded-full flex items-center justify-center">
              <span className="text-3xl">📅</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Weekly Features Coming Soon</h1>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              We're working on bringing you amazing weekly curated content. Check back soon for the latest discoveries and features!
            </p>
            <div className="flex gap-4 justify-center">
              <a 
                href="/feed" 
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
              >
                Back to Feed
              </a>
              <a 
                href="/explore" 
                className="inline-flex items-center px-6 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-300"
              >
                Explore Locations
              </a>
            </div>
          </div>
        </div>
      </main>
    )
  }
} 