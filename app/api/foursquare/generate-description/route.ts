import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_KEY
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('🤖 Foursquare Description Generator - Request:', body)
    
    const { locationName, website, categories, description } = body

    if (!locationName) {
      return NextResponse.json(
        { error: 'Location name is required' },
        { status: 400 }
      )
    }

    // Generate business description using AI
    const businessDescription = await generateBusinessDescription({
      locationName,
      website,
      categories,
      description
    })

    console.log('✅ Generated description:', businessDescription)

    return NextResponse.json({
      success: true,
      description: businessDescription
    })

  } catch (error) {
    console.error('❌ Error generating description:', error)
    return NextResponse.json(
      { error: 'Failed to generate business description' },
      { status: 500 }
    )
  }
}

async function generateBusinessDescription({
  locationName,
  website,
  categories,
  description
}: {
  locationName: string
  website?: string
  categories?: string[]
  description?: string
}): Promise<string> {
  try {
    // Create a comprehensive prompt
    const categoryText = categories && categories.length > 0 ? categories.join(', ') : 'general business'
    const websiteText = website ? `Website: ${website}` : ''
    const descriptionText = description ? `Current description: ${description}` : ''
    
    const prompt = `Write a compelling, engaging business description for "${locationName}", a ${categoryText} business.

${websiteText}
${descriptionText}

Create a description that:
- Is 2-3 sentences long
- Highlights what makes this place special and unique
- Appeals to potential visitors
- Mentions the atmosphere, experience, or key offerings
- Uses engaging, descriptive language
- Avoids generic phrases

Write in a warm, inviting tone that would make someone want to visit. Focus on the experience and what sets this place apart.`

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a skilled copywriter who creates compelling business descriptions that attract customers. Write engaging, specific descriptions that highlight what makes each place unique."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 300
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from AI')
    }

    return response.trim()

  } catch (error) {
    console.error('Error generating description:', error)
    
    // Return fallback description
    return generateFallbackDescription(locationName, categories?.[0])
  }
}

function generateFallbackDescription(locationName: string, category?: string): string {
  const categoryText = category || 'destination'
  return `${locationName} is a welcoming ${categoryText} that offers a unique experience for visitors. Known for its friendly atmosphere and quality service, this local favorite provides an authentic taste of the community. Whether you're a first-time visitor or a regular, you'll find something special that keeps you coming back.`
} 