import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const body = await req.json()
    
    // Validate required fields
    if (!body.title || !body.summary || !body.steps || !Array.isArray(body.steps)) {
      return NextResponse.json({ 
        error: 'Missing required fields: title, summary, and steps are required' 
      }, { status: 400 })
    }
    
    // Validate steps structure
    if (body.steps.length === 0) {
      return NextResponse.json({ 
        error: 'At least one step is required' 
      }, { status: 400 })
    }
    
    // Validate each step has the required structure
    for (let i = 0; i < body.steps.length; i++) {
      const step = body.steps[i]
      if (!step.step || typeof step.step !== 'string') {
        return NextResponse.json({ 
          error: `Step ${i + 1} is missing the required 'step' field` 
        }, { status: 400 })
      }
    }
    
    const journey = await payload.create({
      collection: 'journeys',
      data: {
        ...body,
        owner: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    })
    return NextResponse.json({ journey })
  } catch (err: any) {
    console.error('Journey creation error:', err)
    
    // Provide more specific error messages
    let errorMessage = 'Failed to create journey'
    let statusCode = 500
    
    if (err.message?.includes('validation')) {
      errorMessage = 'Invalid journey data. Please check your input.'
      statusCode = 400
    } else if (err.message?.includes('duplicate')) {
      errorMessage = 'A journey with this title already exists.'
      statusCode = 409
    } else if (err.message?.includes('Unauthorized')) {
      errorMessage = 'You must be logged in to create a journey.'
      statusCode = 401
    } else {
      errorMessage = err.message || 'Failed to create journey'
    }
    
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // Fetch journeys where user is owner or invitee
    const journeys = await payload.find({
      collection: 'journeys',
      where: {
        or: [
          { owner: { equals: user.id } },
          { 'invitees.user': { equals: user.id } },
        ],
      },
      sort: '-createdAt',
      limit: 100,
    })
    return NextResponse.json({ journeys: journeys.docs })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch journeys' }, { status: 500 })
  }
} 