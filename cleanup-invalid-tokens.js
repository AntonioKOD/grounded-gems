#!/usr/bin/env node

/**
 * Cleanup script for invalid FCM tokens
 * This will help clean up the database and prevent FCM errors
 */

import { getPayload } from 'payload'
import config from './payload.config.js'

async function cleanupInvalidTokens() {
  console.log('🧹 [Token Cleanup] Starting invalid token cleanup...')
  
  try {
    const payload = await getPayload({ config })
    
    // Get all active device tokens
    const deviceTokens = await payload.find({
      collection: 'deviceTokens',
      where: {
        isActive: { equals: true }
      },
      limit: 1000
    })
    
    console.log(`🧹 [Token Cleanup] Found ${deviceTokens.docs.length} active device tokens to check`)
    
    let validTokens = 0
    let invalidTokens = 0
    let cleanedUpTokens = 0
    let suspiciousTokens = 0
    
    for (const tokenDoc of deviceTokens.docs) {
      try {
        const platform = tokenDoc.platform || 'ios'
        let token = null
        
        if (platform === 'ios') {
          token = tokenDoc.fcmToken || tokenDoc.deviceToken || tokenDoc.apnsToken
        } else {
          token = tokenDoc.deviceToken || tokenDoc.fcmToken || tokenDoc.apnsToken
        }
        
        if (!token) {
          console.log(`⚠️ [Token Cleanup] No token found for device ${tokenDoc.id}, marking as inactive`)
          await deactivateToken(tokenDoc.id, 'No token found')
          cleanedUpTokens++
          continue
        }
        
        // Basic token format validation
        if (platform === 'ios') {
          // iOS FCM tokens should start with specific patterns
          if (tokenDoc.fcmToken && (tokenDoc.fcmToken.startsWith('fcm_') || tokenDoc.fcmToken.length > 140)) {
            validTokens++
            continue
          }
          
          // iOS APNs tokens should be 64 characters
          if (tokenDoc.apnsToken && tokenDoc.apnsToken.length === 64) {
            validTokens++
            continue
          }
          
          // If we have a deviceToken that's not FCM format, it might be invalid
          if (tokenDoc.deviceToken && !tokenDoc.deviceToken.startsWith('fcm_') && tokenDoc.deviceToken.length < 140) {
            suspiciousTokens++
            console.log(`⚠️ [Token Cleanup] Suspicious iOS device token format for ${tokenDoc.id}: ${tokenDoc.deviceToken.substring(0, 20)}...`)
            
            // Try to validate by sending a test notification
            try {
              const { sendFCMMessage } = await import('./lib/firebase-admin.js')
              const testResult = await sendFCMMessage(
                tokenDoc.deviceToken,
                {
                  title: 'Test',
                  body: 'Token validation test'
                },
                { test: 'validation' }
              )
              
              if (testResult.success) {
                validTokens++
                console.log(`✅ [Token Cleanup] Token ${tokenDoc.id} validated successfully`)
              } else {
                throw new Error(testResult.error)
              }
            } catch (validationError) {
              const errorMessage = validationError instanceof Error ? validationError.message : String(validationError)
              
              if (errorMessage.includes('invalid-argument') ||
                  errorMessage.includes('not a valid FCM registration token') ||
                  errorMessage.includes('registration token is not valid')) {
                
                console.log(`🚨 [Token Cleanup] Invalid token confirmed for device ${tokenDoc.id}, deactivating`)
                await deactivateToken(tokenDoc.id, 'Invalid FCM token - validation failed')
                cleanedUpTokens++
                invalidTokens++
              } else {
                // Other error, might be temporary, keep the token
                validTokens++
                console.log(`⚠️ [Token Cleanup] Token ${tokenDoc.id} validation failed with non-token error: ${errorMessage}`)
              }
            }
          } else {
            validTokens++
          }
        } else {
          // For other platforms, check FCM token format
          if (token.startsWith('fcm_') || token.length > 140) {
            validTokens++
          } else {
            suspiciousTokens++
            console.log(`⚠️ [Token Cleanup] Suspicious token format for ${platform} device ${tokenDoc.id}: ${token.substring(0, 20)}...`)
            
            // Try to validate
            try {
              const { sendFCMMessage } = await import('./lib/firebase-admin.js')
              const testResult = await sendFCMMessage(
                token,
                {
                  title: 'Test',
                  body: 'Token validation test'
                },
                { test: 'validation' }
              )
              
              if (testResult.success) {
                validTokens++
                console.log(`✅ [Token Cleanup] Token ${tokenDoc.id} validated successfully`)
              } else {
                throw new Error(testResult.error)
              }
            } catch (validationError) {
              const errorMessage = validationError instanceof Error ? validationError.message : String(validationError)
              
              if (errorMessage.includes('invalid-argument') ||
                  errorMessage.includes('not a valid FCM registration token') ||
                  errorMessage.includes('registration token is not valid')) {
                
                console.log(`🚨 [Token Cleanup] Invalid token confirmed for device ${tokenDoc.id}, deactivating`)
                await deactivateToken(tokenDoc.id, 'Invalid FCM token - validation failed')
                cleanedUpTokens++
                invalidTokens++
              } else {
                validTokens++
                console.log(`⚠️ [Token Cleanup] Token ${tokenDoc.id} validation failed with non-token error: ${errorMessage}`)
              }
            }
          }
        }
        
      } catch (error) {
        console.error(`❌ [Token Cleanup] Error processing token ${tokenDoc.id}:`, error)
      }
    }
    
    console.log(`\n🧹 [Token Cleanup] Cleanup complete!`)
    console.log(`📊 Summary:`)
    console.log(`  - Total tokens checked: ${deviceTokens.docs.length}`)
    console.log(`  - Valid tokens: ${validTokens}`)
    console.log(`  - Invalid tokens: ${invalidTokens}`)
    console.log(`  - Suspicious tokens: ${suspiciousTokens}`)
    console.log(`  - Tokens cleaned up: ${cleanedUpTokens}`)
    
    if (cleanedUpTokens > 0) {
      console.log(`\n✅ Successfully cleaned up ${cleanedUpTokens} invalid tokens!`)
      console.log(`🔍 Check the deviceTokens collection for deactivated tokens`)
    } else {
      console.log(`\n✨ No invalid tokens found - your database is clean!`)
    }
    
    return {
      success: true,
      validTokens,
      invalidTokens,
      suspiciousTokens,
      cleanedUpTokens,
      totalTokens: deviceTokens.docs.length
    }
    
  } catch (error) {
    console.error('❌ [Token Cleanup] Cleanup failed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function deactivateToken(tokenId: string, reason: string) {
  try {
    const payload = await getPayload({ config })
    
    await payload.update({
      collection: 'deviceTokens',
      id: tokenId,
      data: {
        isActive: false,
        lastError: reason,
        deactivatedAt: new Date().toISOString()
      }
    })
    
    console.log(`✅ [Token Cleanup] Deactivated device token ${tokenId}: ${reason}`)
    return true
  } catch (error) {
    console.error(`❌ [Token Cleanup] Failed to deactivate token ${tokenId}:`, error)
    return false
  }
}

// Run the cleanup
cleanupInvalidTokens()
  .then((result) => {
    if (result.success) {
      console.log('🏁 [Token Cleanup] Cleanup script finished successfully')
      process.exit(0)
    } else {
      console.log('⚠️ [Token Cleanup] Cleanup script finished with issues')
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error('💥 [Token Cleanup] Cleanup script crashed:', error)
    process.exit(1)
  })
