import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [Firebase Console Check] Starting diagnostic check...')
    
    // Check environment variables
    const envCheck = {
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || 'NOT_SET',
      FIREBASE_SERVICE_ACCOUNT_JSON: process.env.FIREBASE_SERVICE_ACCOUNT_JSON ? 'SET (length: ' + process.env.FIREBASE_SERVICE_ACCOUNT_JSON.length + ')' : 'NOT_SET',
      APN_KEY_ID: process.env.APN_KEY_ID || 'NOT_SET',
      APN_TEAM_ID: process.env.APN_TEAM_ID || 'NOT_SET',
      APN_KEY_PATH: process.env.APN_KEY_PATH || 'NOT_SET',
      APN_BUNDLE_ID: process.env.APN_BUNDLE_ID || 'NOT_SET',
      NODE_ENV: process.env.NODE_ENV || 'NOT_SET'
    }
    
    console.log('🔍 [Firebase Console Check] Environment variables:', envCheck)
    
    // Parse service account if available
    let serviceAccountInfo = null
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      try {
        const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
        serviceAccountInfo = {
          project_id: parsed.project_id,
          client_email: parsed.client_email,
          private_key_length: parsed.private_key?.length || 0,
          has_private_key: !!parsed.private_key
        }
      } catch (parseError) {
        serviceAccountInfo = { parse_error: parseError instanceof Error ? parseError.message : 'Unknown parse error' }
      }
    }
    
    // Firebase Console configuration checklist
    const firebaseConsoleChecklist = {
      step1: "Go to Firebase Console → Project Settings → Cloud Messaging tab",
      step2: "Under 'Apple apps (APNs)' section, verify:",
      step3: "  - Key ID matches: VYNFGZAT99",
      step4: "  - Team ID matches: WAWJ7L538T", 
      step5: "  - Bundle ID matches: com.sacavia.app",
      step6: "  - Status shows as 'Active' or similar",
      step7: "  - Key file (.p8) is uploaded and recognized",
      step8: "Wait 15-30 minutes for changes to propagate",
      step9: "Check if there are any error messages in Firebase Console"
    }
    
    // Common issues and solutions
    const commonIssues = {
      issue1: "Bundle ID mismatch: Firebase Console bundle ID must exactly match 'com.sacavia.app'",
      issue2: "Key not uploaded: The .p8 file must be uploaded to Firebase Console",
      issue3: "Wrong environment: Make sure you're in the correct Firebase project (sacavia-5dc42)",
      issue4: "Key permissions: The .p8 key must have the right permissions (Push Notifications)",
      issue5: "Team ID mismatch: Team ID in Firebase Console must match Apple Developer Team ID"
    }
    
    return NextResponse.json({
      success: true,
      message: 'Firebase Console diagnostic information',
      environment: envCheck,
      serviceAccount: serviceAccountInfo,
      firebaseConsoleChecklist,
      commonIssues,
      nextSteps: [
        "1. Verify Firebase Console APNs configuration matches exactly",
        "2. Check bundle ID is exactly 'com.sacavia.app'",
        "3. Ensure .p8 key is uploaded and recognized",
        "4. Wait for propagation (can take up to 30 minutes)",
        "5. Test with simple FCM endpoint first"
      ]
    })
    
  } catch (error) {
    console.error('❌ [Firebase Console Check] Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to check Firebase Console configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
