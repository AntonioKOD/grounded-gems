import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_KEY,
})

export interface InsiderTipsResult {
  tips: string
  confidence: number
  error?: string
}

export interface LocationInsights {
  insiderTips: string
  enhancedDescription: string
  bestTimeToVisit: string[]
  tags: string[]
}

/**
 * Scrape and analyze website content to generate insider tips
 */
export async function generateInsiderTipsFromWebsite(
  websiteUrl: string,
  locationName: string,
  locationCategory?: string
): Promise<InsiderTipsResult> {
  try {
    // Validate URL
    if (!websiteUrl || !isValidUrl(websiteUrl)) {
      return {
        tips: '',
        confidence: 0,
        error: 'Invalid website URL provided'
      }
    }

    // Fetch website content
    const websiteContent = await scrapeWebsiteContent(websiteUrl)
    
    if (!websiteContent || websiteContent.length < 50) {
      return {
        tips: '',
        confidence: 0,
        error: 'Could not extract meaningful content from website'
      }
    }

    // Generate insider tips using AI
    const prompt = createInsiderTipsPrompt(locationName, locationCategory, websiteContent)
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a local expert and travel writer who specializes in discovering insider tips and hidden gems about places. Generate authentic, practical insider tips that only locals would know. Write in clear, conversational sentences without using markdown formatting, headers, or bullet points. Focus on actionable advice that visitors can use.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 300,
      temperature: 0.7,
    })

    const generatedTips = response.choices[0]?.message?.content?.trim()
    
    if (!generatedTips) {
      return {
        tips: '',
        confidence: 0,
        error: 'AI failed to generate insider tips'
      }
    }

    // Clean up the generated tips by removing extra characters and formatting
    const cleanedTips = cleanAIResponse(generatedTips)
    
    // Format the tips for better readability
    const formattedTips = formatInsiderTips(cleanedTips)

    // Calculate confidence based on content quality
    const confidence = calculateTipsConfidence(formattedTips, websiteContent)

    return {
      tips: formattedTips,
      confidence,
    }
  } catch (error) {
    console.error('Error generating insider tips:', error)
    return {
      tips: '',
      confidence: 0,
      error: `Failed to generate tips: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Generate comprehensive location insights including enhanced description and tags
 */
export async function generateLocationInsights(
  locationName: string,
  description: string,
  category: string,
  websiteUrl?: string
): Promise<LocationInsights> {
  try {
    let websiteContent = ''
    
    // Get website content if URL provided
    if (websiteUrl && isValidUrl(websiteUrl)) {
      websiteContent = await scrapeWebsiteContent(websiteUrl)
    }

    const prompt = `
Analyze this location and generate comprehensive insights:

Location: ${locationName}
Category: ${category}
Description: ${description}
${websiteContent ? `Website Content: ${websiteContent.substring(0, 1000)}` : ''}

Please provide:
1. Enhanced description (2-3 sentences that capture the essence and unique appeal)
2. Insider tips (practical, local knowledge that visitors wouldn't easily find)
3. Best times to visit (specific seasons, days, or times)
4. Relevant tags (specific features, atmosphere, or characteristics)

Format your response as JSON:
{
  "enhancedDescription": "...",
  "insiderTips": "...",
  "bestTimeToVisit": ["...", "..."],
  "tags": ["...", "...", "..."]
}
`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional travel writer and local expert. Generate authentic, helpful insights about locations. Write all text content in clear, conversational sentences without markdown formatting, headers, or bullet points. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    })

    const result = response.choices[0]?.message?.content?.trim()
    
    if (!result) {
      throw new Error('No response from AI')
    }

    // Parse JSON response
    const insights = JSON.parse(result) as LocationInsights
    
    // Validate the response structure
    if (!insights.enhancedDescription || !insights.insiderTips) {
      throw new Error('Invalid AI response structure')
    }

    // Clean up the AI responses
    insights.enhancedDescription = cleanAIResponse(insights.enhancedDescription)
    insights.insiderTips = formatInsiderTips(cleanAIResponse(insights.insiderTips))
    
    // Clean up tags and bestTimeToVisit arrays
    if (insights.tags) {
      insights.tags = insights.tags.map(tag => cleanAIResponse(tag))
    }
    if (insights.bestTimeToVisit) {
      insights.bestTimeToVisit = insights.bestTimeToVisit.map(time => cleanAIResponse(time))
    }

    return insights
  } catch (error) {
    console.error('Error generating location insights:', error)
    
    // Return fallback insights
    return {
      enhancedDescription: description || `Discover ${locationName}, a unique ${category.toLowerCase()} experience.`,
      insiderTips: `Visit ${locationName} for an authentic local experience. Ask locals for their recommendations!`,
      bestTimeToVisit: ['Year-round'],
      tags: [category.toLowerCase(), 'local favorite']
    }
  }
}

/**
 * Format AI text for better readability
 */
function formatInsiderTips(text: string): string {
  if (!text) return text
  
  // Split into sentences and clean each
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  
  // Format each sentence and rejoin
  return sentences
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length > 10) // Remove very short fragments
    .map(sentence => {
      // Capitalize first letter
      return sentence.charAt(0).toUpperCase() + sentence.slice(1)
    })
    .join('. ') + (sentences.length > 0 ? '.' : '')
}

/**
 * Clean AI response by removing extra characters and formatting
 */
function cleanAIResponse(text: string): string {
  return text
    // Remove markdown headers
    .replace(/^#{1,6}\s*/gm, '')     // Remove # ## ### etc. at start of lines
    .replace(/#{1,6}\s*/g, '')       // Remove # ## ### anywhere in text
    // Remove markdown formatting
    .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
    .replace(/\*(.*?)\*/g, '$1')     // Italic
    .replace(/`(.*?)`/g, '$1')       // Code
    .replace(/~~(.*?)~~/g, '$1')     // Strikethrough
    // Remove markdown lists
    .replace(/^[\s]*[-*+]\s+/gm, '') // Remove bullet points
    .replace(/^[\s]*\d+\.\s+/gm, '') // Remove numbered lists
    // Remove quotes if they wrap the entire response
    .replace(/^["']|["']$/g, '')
    // Remove extra markdown formatting
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links but keep text
    .replace(/>\s*/gm, '')           // Remove blockquotes
    // Clean up whitespace and line breaks
    .replace(/\n{3,}/g, '\n\n')      // Max 2 line breaks
    .replace(/\s+/g, ' ')            // Multiple spaces to single space
    .replace(/\n\s+/g, '\n')         // Remove leading spaces on new lines
    .replace(/\s+\n/g, '\n')         // Remove trailing spaces before line breaks
    // Remove leading/trailing whitespace
    .trim()
}

/**
 * Scrape website content for analysis
 */
async function scrapeWebsiteContent(url: string): Promise<string> {
  try {
    // Use a simple fetch approach - in production, you might want to use a service like Puppeteer
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SacaviaBot/1.0; +https://sacavia.com/bot)'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    
    // Extract text content (basic HTML parsing)
    const textContent = extractTextFromHTML(html)
    
    // Return first 2000 characters for analysis
    return textContent.substring(0, 2000)
  } catch (error) {
    console.error('Error scraping website:', error)
    return ''
  }
}

/**
 * Extract text content from HTML
 */
function extractTextFromHTML(html: string): string {
  // Remove script and style elements
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  
  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, ' ')
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim()
  
  return text
}

/**
 * Create a prompt for generating insider tips
 */
function createInsiderTipsPrompt(
  locationName: string,
  category: string = '',
  websiteContent: string
): string {
  return `
Based on the following information about ${locationName}${category ? ` (${category})` : ''}, generate insider tips that only locals would know:

Website Content:
${websiteContent}

Generate 2-4 insider tips that cover:
- Best times to visit (specific hours, days, seasons)
- Hidden features or lesser-known aspects
- Local secrets or pro tips for the best experience
- What to order/try/do that tourists might miss

Write in clear, flowing sentences without using bullet points, headers, or markdown formatting. Make it conversational and practical. Focus on actionable advice that enhances the visitor experience.
`
}

/**
 * Calculate confidence score for generated tips
 */
function calculateTipsConfidence(tips: string, sourceContent: string): number {
  let confidence = 0.5 // Base confidence
  
  // Increase confidence based on tip length and detail
  if (tips.length > 100) confidence += 0.1
  if (tips.length > 200) confidence += 0.1
  
  // Increase confidence if tips mention specific details
  const specificKeywords = ['hour', 'time', 'day', 'season', 'order', 'ask', 'try', 'visit', 'avoid']
  const keywordMatches = specificKeywords.filter(keyword => 
    tips.toLowerCase().includes(keyword)
  ).length
  
  confidence += Math.min(keywordMatches * 0.05, 0.2)
  
  // Increase confidence if source content is substantial
  if (sourceContent.length > 500) confidence += 0.1
  if (sourceContent.length > 1000) confidence += 0.1
  
  return Math.min(confidence, 1.0)
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Generate fallback insider tips when AI fails
 */
export function generateFallbackTips(locationName: string, category: string = ''): string {
  const categoryTips: Record<string, string[]> = {
    restaurant: [
      "Ask your server for daily specials or chef's recommendations",
      "Visit during off-peak hours for better service and atmosphere",
      "Check if they have a happy hour or special lunch menu"
    ],
    bar: [
      "Ask the bartender for their signature cocktail",
      "Visit on weeknights for a more intimate experience",
      "Check if they have a hidden menu or seasonal specials"
    ],
    coffee: [
      "Try their single-origin coffee or seasonal blend",
      "Visit in the morning for the freshest pastries",
      "Ask about their brewing methods or coffee sourcing"
    ],
    park: [
      "Visit early morning or late afternoon for the best lighting",
      "Look for hidden trails or less crowded areas",
      "Check for seasonal events or guided tours"
    ],
    shop: [
      "Ask staff about their best-selling or unique items",
      "Check for seasonal sales or loyalty programs",
      "Look for locally-made or exclusive products"
    ]
  }

  const lowerCategory = category.toLowerCase()
  const tips = categoryTips[lowerCategory] || [
    "Visit during off-peak times for a better experience",
    "Ask locals or staff for their personal recommendations",
    "Check for special events or seasonal offerings"
  ]

  return tips.join('. ') + '.'
} 