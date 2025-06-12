import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Test endpoint called')
    
    // Test the AI insights API directly
    const testPayload = {
      locationName: "Test Restaurant",
      website: "https://example.com",
      categories: ["restaurant"],
      description: "A test restaurant",
      type: "insider_tips"
    }
    
    console.log('🧪 Sending test payload to AI insights:', testPayload)
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/ai/insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    })
    
    console.log('🧪 AI insights response status:', response.status)
    
    const data = await response.json()
    console.log('🧪 AI insights response data:', data)
    
    return NextResponse.json({
      success: true,
      testPayload,
      aiResponse: {
        status: response.status,
        data
      }
    })
  } catch (error) {
    console.error('🧪 Test error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
} 