import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting user verification structure fix...')
    
    const payload = await getPayload({ config })
    
    // Get all users
    const users = await payload.find({
      collection: 'users',
      limit: 1000, // Adjust if you have more users
      depth: 0
    })
    
    console.log(`📊 Found ${users.docs.length} users to check`)
    
    let updatedCount = 0
    
    for (const user of users.docs) {
      let needsUpdate = false
      let updateData: any = {}
      
      // Force update ALL users to ensure they have proper structure
      console.log(`🔍 Checking user: ${user.email || user.name || user.id}`)
      console.log(`   - Role: ${user.role}`)
      console.log(`   - isCreator: ${user.isCreator}`)
      console.log(`   - Has creatorProfile: ${!!user.creatorProfile}`)
      console.log(`   - Has verification: ${!!user.creatorProfile?.verification}`)
      
      // Check if user needs creatorProfile initialization or verification fix
      if (!user.creatorProfile || !user.creatorProfile.verification) {
        updateData.creatorProfile = {
          creatorLevel: 'explorer',
          specialty: [],
          experienceAreas: [],
          verification: {
            isVerified: false,
            verifiedAt: null,
            verificationMethod: null
          },
          stats: {
            totalGuides: 0,
            publishedGuides: 0,
            totalViews: 0,
            totalSales: 0,
            totalEarnings: 0,
            averageRating: null,
            followerCount: 0
          },
          earnings: {
            totalEarnings: 0,
            withdrawalSettings: {
              payoutMethod: null,
              payoutEmail: null,
              stripeAccountId: null
            }
          },
          joinedCreatorProgram: user.role === 'creator' || user.isCreator ? new Date() : null,
          creatorBio: '',
          website: ''
        }
        needsUpdate = true
        console.log(`   ✅ Will create/fix creatorProfile and verification for user`)
      } else {
        console.log(`   ✓ User already has proper structure`)
      }
      
      if (needsUpdate) {
        try {
          await payload.update({
            collection: 'users',
            id: user.id,
            data: updateData
          })
          
          console.log(`✅ Updated user: ${user.email || user.name || user.id}`)
          updatedCount++
        } catch (error) {
          console.error(`❌ Failed to update user ${user.email || user.id}:`, error)
        }
      }
    }
    
    console.log(`🎉 Migration complete! Updated ${updatedCount} users`)
    
    return NextResponse.json({
      success: true,
      message: `Migration complete! Updated ${updatedCount} users out of ${users.docs.length} total users`,
      updatedCount,
      totalUsers: users.docs.length
    })
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 