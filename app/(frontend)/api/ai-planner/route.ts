import { NextRequest, NextResponse } from 'next/server'
import { getServerSideUser } from '@/lib/auth-server'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  const user = await getServerSideUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { input, context } = await req.json()
    // TODO: Fetch user preferences from session/db
    const userPreferences = 'Live music, Italian food, cozy places, outdoor seating' // Placeholder
    const userLocation = 'Tirana, Albania' // Mock location
    const weather = 'clear and warm' // Mock weather
    const now = new Date()
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' })
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

    // Compose the prompt for OpenAI (requesting JSON output)
    const prompt = `You are Gem Journey, an expert local planner. The user wants to plan a night out.\n\nUser input: ${input}\nContext: ${context}\nPreferences: ${userPreferences}\nLocation: ${userLocation}\nDay: ${dayOfWeek}\nTime: ${time}\nWeather: ${weather}\n\nSuggest a personalized plan for tonight, including specific places, times, and a short summary.\n\nRespond in the following JSON format:\n{\n  \"title\": string,\n  \"summary\": string,\n  \"steps\": string[],\n  \"context\": string\n}`

    // Call OpenAI API
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPEN_AI_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful, creative local planner called Gem Journey.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 700,
        temperature: 0.9,
      })
    })

    if (!openaiRes.ok) {
      const error = await openaiRes.text()
      return NextResponse.json({ error: 'OpenAI error: ' + error }, { status: 500 })
    }
    const data = await openaiRes.json()
    let planRaw = data.choices?.[0]?.message?.content || ''
    let plan
    try {
      // Try to parse JSON from the AI response
      const jsonStart = planRaw.indexOf('{')
      const jsonEnd = planRaw.lastIndexOf('}') + 1
      plan = JSON.parse(planRaw.slice(jsonStart, jsonEnd))
    } catch (e) {
      // Fallback: return as plain text if parsing fails
      plan = { title: 'Gem Journey', summary: planRaw, steps: [], context }
    }
    return NextResponse.json({ plan })
  } catch (err) {
    return NextResponse.json({ error: 'Server error: ' + (err as any)?.message }, { status: 500 })
  }
} 