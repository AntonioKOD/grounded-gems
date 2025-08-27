import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { apnsSender } from '@/lib/apns-config'

// GET /api/mobile/system/status - Get comprehensive system status
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [System Status] Status check request received')
    
    const startTime = Date.now()
    const status = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      checks: {
        database: false,
        apns: false,
        authentication: false
      },
      details: {
        database: null as any,
        apns: null as any,
        authentication: null as any
      },
      errors: [] as string[]
    }

    // Check database connectivity
    try {
      const payload = await getPayload({ config })
      const collections = await payload.find({ collection: 'users', limit: 1 })
      
      status.checks.database = true
      status.details.database = {
        connected: true,
        collections: Object.keys(payload.collections),
        userCount: collections.totalDocs
      }
    } catch (error) {
      status.checks.database = false
      status.details.database = {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown database error'
      }
      status.errors.push(`Database: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Check APNs configuration
    try {
      const apnsStatus = apnsSender.getStatus()
      status.checks.apns = apnsStatus.configured
      status.details.apns = {
        ...apnsStatus,
        environment: apnsStatus.environment,
        bundleId: apnsStatus.bundleId,
        keyId: apnsStatus.keyId ? `${apnsStatus.keyId.substring(0, 8)}...` : 'Not set',
        teamId: apnsStatus.teamId ? `${apnsStatus.teamId.substring(0, 8)}...` : 'Not set'
      }
      
      if (!apnsStatus.configured) {
        status.errors.push('APNs: Configuration incomplete')
      }
    } catch (error) {
      status.checks.apns = false
      status.details.apns = {
        configured: false,
        error: error instanceof Error ? error.message : 'Unknown APNs error'
      }
      status.errors.push(`APNs: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Check authentication (optional - only if token provided)
    const authorization = request.headers.get('authorization')
    if (authorization && authorization.startsWith('Bearer ')) {
      try {
        const payload = await getPayload({ config })
        const { user } = await payload.auth({ headers: request.headers })
        
        status.checks.authentication = !!user
        status.details.authentication = {
          authenticated: !!user,
          userId: user?.id || null,
          userEmail: user?.email || null
        }
        
        if (!user) {
          status.errors.push('Authentication: Invalid token')
        }
      } catch (error) {
        status.checks.authentication = false
        status.details.authentication = {
          authenticated: false,
          error: error instanceof Error ? error.message : 'Authentication error'
        }
        status.errors.push(`Authentication: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } else {
      status.details.authentication = {
        authenticated: false,
        reason: 'No authentication token provided'
      }
    }

    // Calculate overall health
    const totalChecks = Object.keys(status.checks).length
    const passedChecks = Object.values(status.checks).filter(Boolean).length
    const healthPercentage = Math.round((passedChecks / totalChecks) * 100)
    
    const responseTime = Date.now() - startTime

    const response = {
      success: true,
      message: 'System status check completed',
      data: {
        ...status,
        health: {
          percentage: healthPercentage,
          status: healthPercentage >= 80 ? 'healthy' : healthPercentage >= 60 ? 'warning' : 'critical',
          passedChecks,
          totalChecks,
          responseTime: `${responseTime}ms`
        }
      }
    }

    console.log(`🔍 [System Status] Status check completed in ${responseTime}ms - Health: ${healthPercentage}%`)

    return NextResponse.json(response)

  } catch (error) {
    console.error('🔍 [System Status] Error during status check:', error)
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to check system status',
      code: 'SYSTEM_STATUS_FAILED',
      details: error instanceof Error ? error.message : 'Unknown error',
      data: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      }
    }, { status: 500 })
  }
}
