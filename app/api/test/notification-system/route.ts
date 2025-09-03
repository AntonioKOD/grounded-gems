import { NextRequest, NextResponse } from 'next/server'
import { notificationHooks } from '@/lib/notification-hooks'

export async function POST(request: NextRequest) {
  try {
    const { 
      testType = 'all',
      targetUserId = '68ac67b87879e7096031cace',
      testUserId = '68ac67b87879e7096031cace', // Use valid ObjectId
      testUserName = 'Test User',
      targetEmail = 'antonio_kodheli@icloud.com' // New target email
    } = await request.json()

    console.log('🧪 [Notification System Test] Starting test:', testType)
    console.log(`🧪 [Notification System Test] Target user: ${targetUserId}`)

    const results: any[] = []

    if (testType === 'all' || testType === 'follow') {
      try {
        const result = await notificationHooks.onUserFollow(
          targetUserId,
          testUserId,
          testUserName
        )
        results.push({ type: 'follow', success: true, result })
        console.log('✅ [Notification System Test] Follow notification test passed')
      } catch (error) {
        results.push({ type: 'follow', success: false, error: error instanceof Error ? error.message : 'Unknown error' })
        console.log('❌ [Notification System Test] Follow notification test failed:', error)
      }
    }

    if (testType === 'all' || testType === 'like') {
      try {
        const result = await notificationHooks.onUserLike(
          targetUserId,
          testUserId,
          testUserName,
          '507f1f77bcf86cd799439011', // Use valid ObjectId
          'post'
        )
        results.push({ type: 'like', success: true, result })
        console.log('✅ [Notification System Test] Like notification test passed')
      } catch (error) {
        results.push({ type: 'like', success: false, error: error instanceof Error ? error.message : 'Unknown error' })
        console.log('❌ [Notification System Test] Like notification test failed:', error)
      }
    }

    if (testType === 'all' || testType === 'comment') {
      try {
        const result = await notificationHooks.onUserComment(
          targetUserId,
          testUserId,
          testUserName,
          '507f1f77bcf86cd799439011', // Use valid ObjectId
          'post',
          'This is a test comment to verify the notification system is working properly!'
        )
        results.push({ type: 'comment', success: true, result })
        console.log('✅ [Notification System Test] Comment notification test passed')
      } catch (error) {
        results.push({ type: 'comment', success: false, error: error instanceof Error ? error.message : 'Unknown error' })
        console.log('❌ [Notification System Test] Comment notification test failed:', error)
      }
    }

    if (testType === 'all' || testType === 'mention') {
      try {
        const result = await notificationHooks.onUserMention(
          targetUserId,
          testUserId,
          testUserName,
          '507f1f77bcf86cd799439011', // Use valid ObjectId
          'post'
        )
        results.push({ type: 'mention', success: true, result })
        console.log('✅ [Notification System Test] Mention notification test passed')
      } catch (error) {
        results.push({ type: 'mention', success: false, error: error instanceof Error ? error.message : 'Unknown error' })
        console.log('❌ [Notification System Test] Mention notification test failed:', error)
      }
    }

    if (testType === 'all' || testType === 'location_interaction') {
      try {
        const result = await notificationHooks.onLocationInteraction(
          targetUserId,
          testUserId,
          testUserName,
          '507f1f77bcf86cd799439011', // Use valid ObjectId
          'Test Location',
          'like'
        )
        results.push({ type: 'location_interaction', success: true, result })
        console.log('✅ [Notification System Test] Location interaction notification test passed')
      } catch (error) {
        results.push({ type: 'location_interaction', success: false, error: error instanceof Error ? error.message : 'Unknown error' })
        console.log('❌ [Notification System Test] Location interaction notification test failed:', error)
      }
    }

    if (testType === 'all' || testType === 'event_request') {
      try {
        const result = await notificationHooks.onEventRequestReceived(
          targetUserId,
          testUserId,
          testUserName,
          '507f1f77bcf86cd799439011', // Use valid ObjectId
          'Test Location',
          'Test Event'
        )
        results.push({ type: 'event_request', success: true, result })
        console.log('✅ [Notification System Test] Event request notification test passed')
      } catch (error) {
        results.push({ type: 'event_request', success: false, error: error instanceof Error ? error.message : 'Unknown error' })
        console.log('❌ [Notification System Test] Event request notification test failed:', error)
      }
    }

    if (testType === 'all' || testType === 'milestone') {
      try {
        const result = await notificationHooks.onMilestoneReached(
          targetUserId,
          'First Location',
          '1 location published',
          '507f1f77bcf86cd799439011', // Use valid ObjectId
          'Test Location'
        )
        results.push({ type: 'milestone', success: true, result })
        console.log('✅ [Notification System Test] Milestone notification test passed')
      } catch (error) {
        results.push({ type: 'milestone', success: false, error: error instanceof Error ? error.message : 'Unknown error' })
        console.log('❌ [Notification System Test] Milestone notification test failed:', error)
      }
    }

    if (testType === 'all' || testType === 'journey_invite') {
      try {
        const result = await notificationHooks.onJourneyInvite(
          targetUserId,
          testUserId,
          testUserName,
          '507f1f77bcf86cd799439011', // Use valid ObjectId
          'Test Journey'
        )
        results.push({ type: 'journey_invite', success: true, result })
        console.log('✅ [Notification System Test] Journey invite notification test passed')
      } catch (error) {
        results.push({ type: 'journey_invite', success: false, error: error instanceof Error ? error.message : 'Unknown error' })
        console.log('❌ [Notification System Test] Journey invite notification test failed:', error)
      }
    }

    if (testType === 'all' || testType === 'reminder') {
      try {
        const result = await notificationHooks.onReminderSet(
          targetUserId,
          'location_visit',
          'Time to visit Test Location again!',
          '507f1f77bcf86cd799439011', // Use valid ObjectId
          'locations'
        )
        results.push({ type: 'reminder', success: true, result })
        console.log('✅ [Notification System Test] Reminder notification test passed')
      } catch (error) {
        results.push({ type: 'reminder', success: false, error: error instanceof Error ? error.message : 'Unknown error' })
        console.log('❌ [Notification System Test] Reminder notification test failed:', error)
      }
    }

    if (testType === 'all' || testType === 'location_published') {
      try {
        const result = await notificationHooks.onLocationPublished(
          targetUserId,
          '507f1f77bcf86cd799439011', // Use valid ObjectId
          'Test Location',
          testUserId,
          testUserName
        )
        results.push({ type: 'location_published', success: true, result })
        console.log('✅ [Notification System Test] Location published notification test passed')
      } catch (error) {
        results.push({ type: 'location_published', success: false, error: error instanceof Error ? error.message : 'Unknown error' })
        console.log('❌ [Notification System Test] Location published notification test failed:', error)
      }
    }

    if (testType === 'all' || testType === 'location_verified') {
      try {
        const result = await notificationHooks.onLocationVerified(
          targetUserId,
          '507f1f77bcf86cd799439011', // Use valid ObjectId
          'Test Location',
          testUserId,
          testUserName
        )
        results.push({ type: 'location_verified', success: true, result })
        console.log('✅ [Notification System Test] Location verified notification test passed')
      } catch (error) {
        results.push({ type: 'location_verified', success: false, error: error instanceof Error ? error.message : 'Unknown error' })
        console.log('❌ [Notification System Test] Location verified notification test failed:', error)
      }
    }

    if (testType === 'all' || testType === 'location_featured') {
      try {
        const result = await notificationHooks.onLocationFeatured(
          targetUserId,
          '507f1f77bcf86cd799439011', // Use valid ObjectId
          'Test Location',
          'Outstanding user experience and unique features'
        )
        results.push({ type: 'location_featured', success: true, result })
        console.log('✅ [Notification System Test] Location featured notification test passed')
      } catch (error) {
        results.push({ type: 'location_featured', success: false, error: error instanceof Error ? error.message : 'Unknown error' })
        console.log('❌ [Notification System Test] Location featured notification test failed:', error)
      }
    }

    if (testType === 'all' || testType === 'new_review') {
      try {
        const result = await notificationHooks.onNewReview(
          targetUserId,
          testUserId,
          testUserName,
          '507f1f77bcf86cd799439011', // Use valid ObjectId
          'Test Location',
          5,
          'Amazing place! Highly recommend visiting.'
        )
        results.push({ type: 'new_review', success: true, result })
        console.log('✅ [Notification System Test] New review notification test passed')
      } catch (error) {
        results.push({ type: 'new_review', success: false, error: error instanceof Error ? error.message : 'Unknown error' })
        console.log('❌ [Notification System Test] New review notification test failed:', error)
      }
    }

    if (testType === 'all' || testType === 'business_hours_update') {
      try {
        const result = await notificationHooks.onBusinessHoursUpdate(
          targetUserId,
          '507f1f77bcf86cd799439011', // Use valid ObjectId
          'Test Location',
          testUserId,
          testUserName,
          'Extended hours: Now open until 10 PM on weekends'
        )
        results.push({ type: 'business_hours_update', success: true, result })
        console.log('✅ [Notification System Test] Business hours update notification test passed')
      } catch (error) {
        results.push({ type: 'business_hours_update', success: false, error: error instanceof Error ? error.message : 'Unknown error' })
        console.log('❌ [Notification System Test] Business hours update notification test failed:', error)
      }
    }

    if (testType === 'all' || testType === 'special_offer') {
      try {
        const result = await notificationHooks.onSpecialOffer(
          targetUserId,
          '507f1f77bcf86cd799439011', // Use valid ObjectId
          'Test Location',
          '50% Off Weekend Special',
          'Get 50% off all items this weekend only!',
          '2025-09-07'
        )
        results.push({ type: 'special_offer', success: true, result })
        console.log('✅ [Notification System Test] Special offer notification test passed')
      } catch (error) {
        results.push({ type: 'special_offer', success: false, error: error instanceof Error ? error.message : 'Unknown error' })
        console.log('❌ [Notification System Test] Special offer notification test failed:', error)
      }
    }

    if (testType === 'all' || testType === 'proximity_alert') {
      try {
        const result = await notificationHooks.onProximityAlert(
          targetUserId,
          '507f1f77bcf86cd799439011', // Use valid ObjectId
          'Test Location',
          '0.5 miles'
        )
        results.push({ type: 'proximity_alert', success: true, result })
        console.log('✅ [Notification System Test] Proximity alert notification test passed')
      } catch (error) {
        results.push({ type: 'proximity_alert', success: false, error: error instanceof Error ? error.message : 'Unknown error' })
        console.log('❌ [Notification System Test] Proximity alert notification test failed:', error)
      }
    }

    const successCount = results.filter(r => r.success).length
    const totalCount = results.length

    console.log(`🧪 [Notification System Test] Test completed: ${successCount}/${totalCount} notifications sent successfully`)

    return NextResponse.json({
      success: true,
      message: `Notification system test completed: ${successCount}/${totalCount} successful`,
      results,
      summary: {
        total: totalCount,
        successful: successCount,
        failed: totalCount - successCount
      }
    })

  } catch (error) {
    console.error('❌ [Notification System Test] Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to test notification system',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
