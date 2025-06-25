import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    
    console.log('🔍 Testing collections access...')
    
    const results = {
      collections: Object.keys(payload.collections),
      challenges: null,
      suggestions: null,
      votes: null
    }
    
    // Test challenges collection
    try {
      const challenges = await payload.find({
        collection: 'challenges',
        limit: 5
      })
      results.challenges = {
        count: challenges.docs.length,
        sample: challenges.docs[0] ? challenges.docs[0].title : null
      }
      console.log(`✅ Challenges: ${challenges.docs.length} found`)
    } catch (error) {
      results.challenges = { error: error.message }
      console.log('❌ Challenges error:', error.message)
    }
    
    // Test challenge-suggestions collection
    try {
      const suggestions = await payload.find({
        collection: 'challenge-suggestions',
        limit: 5
      })
      results.suggestions = {
        count: suggestions.docs.length,
        sample: suggestions.docs[0] ? suggestions.docs[0].title : null
      }
      console.log(`✅ Suggestions: ${suggestions.docs.length} found`)
    } catch (error) {
      results.suggestions = { error: error.message }
      console.log('❌ Suggestions error:', error.message)
    }
    
    // Test challenge-votes collection
    try {
      const votes = await payload.find({
        collection: 'challenge-votes',
        limit: 5
      })
      results.votes = {
        count: votes.docs.length
      }
      console.log(`✅ Votes: ${votes.docs.length} found`)
    } catch (error) {
      results.votes = { error: error.message }
      console.log('❌ Votes error:', error.message)
    }
    
    return NextResponse.json({
      success: true,
      data: results
    })
    
  } catch (error) {
    console.error('❌ Test collections error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 