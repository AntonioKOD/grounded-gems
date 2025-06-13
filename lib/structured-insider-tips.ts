import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_KEY,
})

export interface StructuredTip {
  category: 'timing' | 'food' | 'secrets' | 'protips' | 'access' | 'savings' | 'recommendations' | 'hidden'
  tip: string
  priority: 'high' | 'medium' | 'low'
  isVerified: boolean
  source: 'ai_generated' | 'user_submitted' | 'business_provided' | 'staff_verified'
}

export interface StructuredInsiderTipsResult {
  tips: StructuredTip[]
  confidence: number
  error?: string
}

/**
 * Generate structured insider tips from website content
 */
export async function generateStructuredInsiderTips(
  websiteUrl: string,
  locationName: string,
  locationCategory?: string
): Promise<StructuredInsiderTipsResult> {
  try {
    // Validate URL
    if (!websiteUrl || !isValidUrl(websiteUrl)) {
      return {
        tips: [],
        confidence: 0,
        error: 'Invalid website URL provided'
      }
    }

    // Fetch website content
    const websiteContent = await scrapeWebsiteContent(websiteUrl)
    
    if (!websiteContent || websiteContent.length < 50) {
      return {
        tips: [],
        confidence: 0,
        error: 'Could not extract meaningful content from website'
      }
    }

    // Generate structured insider tips using AI
    const prompt = createStructuredTipsPrompt(locationName, locationCategory, websiteContent)
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a local expert and travel writer who specializes in discovering insider tips about places. Generate structured, actionable insider tips that only locals would know. 

CRITICAL: Respond ONLY with a valid JSON array of objects. Each object must have these exact fields:
- category: one of ["timing", "food", "secrets", "protips", "access", "savings", "recommendations", "hidden"]
- tip: a concise, actionable tip (under 150 characters) - NO priority labels like [HELPFUL] in the text
- priority: one of ["high", "medium", "low"]

Example response format:
[
  {
    "category": "timing",
    "tip": "Visit between 2-4pm on weekdays to avoid crowds and get personal attention from staff",
    "priority": "high"
  },
  {
    "category": "food", 
    "tip": "Ask for the off-menu seasonal special - it's usually their best dish",
    "priority": "medium"
  }
]

IMPORTANT: The tip text should be clean and natural without any brackets, labels, or indicators. Do not include any other text, explanations, or markdown formatting. Only return the JSON array.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 800,
      temperature: 0.7,
    })

    const generatedContent = response.choices[0]?.message?.content?.trim()
    
    if (!generatedContent) {
      return {
        tips: [],
        confidence: 0,
        error: 'AI failed to generate insider tips'
      }
    }

    // Parse the JSON response
    const structuredTips = parseAIResponseToStructuredTips(generatedContent)
    
    // Calculate confidence based on content quality
    const confidence = calculateStructuredTipsConfidence(structuredTips, websiteContent)

    return {
      tips: structuredTips,
      confidence,
    }
  } catch (error) {
    console.error('Error generating structured insider tips:', error)
    return {
      tips: generateFallbackStructuredTips(locationName, locationCategory || ''),
      confidence: 0.3,
      error: `Failed to generate tips: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Parse AI response into structured tips
 */
function parseAIResponseToStructuredTips(aiResponse: string): StructuredTip[] {
  try {
    // Clean the response to ensure it's valid JSON
    let cleanedResponse = aiResponse.trim()
    
    // Remove any markdown code blocks
    cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    
    // Find JSON array in the response
    const jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error('No JSON array found in response')
    }
    
    const parsedTips = JSON.parse(jsonMatch[0])
    
    if (!Array.isArray(parsedTips)) {
      throw new Error('Response is not an array')
    }

    // Validate and transform each tip
    return parsedTips
      .filter(tip => tip && typeof tip === 'object')
      .map(tip => ({
        category: validateCategory(tip.category),
        tip: validateTipText(tip.tip),
        priority: validatePriority(tip.priority),
        isVerified: false,
        source: 'ai_generated' as const
      }))
      .filter(tip => tip.tip.length > 10) // Remove very short tips
      .slice(0, 6) // Limit to 6 tips max
  } catch (error) {
    console.error('Error parsing AI response:', error)
    console.log('AI Response:', aiResponse)
    
    // Fallback: try to extract tips from plain text
    return parseTextToStructuredTips(aiResponse)
  }
}

/**
 * Fallback: parse plain text into structured tips
 */
function parseTextToStructuredTips(text: string): StructuredTip[] {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20)
  
  return sentences.slice(0, 4).map((sentence, index) => {
    const cleanTip = sentence.trim()
    const category = inferTipCategory(cleanTip)
    
    return {
      category,
      tip: cleanTip.length > 150 ? cleanTip.substring(0, 147) + '...' : cleanTip,
      priority: index === 0 ? 'high' : 'medium',
      isVerified: false,
      source: 'ai_generated' as const
    }
  })
}

/**
 * Infer tip category from content
 */
function inferTipCategory(tip: string): StructuredTip['category'] {
  const tipLower = tip.toLowerCase()
  
  if (tipLower.includes('time') || tipLower.includes('hour') || tipLower.includes('when') || tipLower.includes('avoid crowd')) {
    return 'timing'
  }
  if (tipLower.includes('order') || tipLower.includes('menu') || tipLower.includes('food') || tipLower.includes('drink')) {
    return 'food'
  }
  if (tipLower.includes('secret') || tipLower.includes('hidden') || tipLower.includes('know')) {
    return 'secrets'
  }
  if (tipLower.includes('park') || tipLower.includes('get there') || tipLower.includes('entrance')) {
    return 'access'
  }
  if (tipLower.includes('discount') || tipLower.includes('free') || tipLower.includes('save') || tipLower.includes('cheaper')) {
    return 'savings'
  }
  if (tipLower.includes('ask for') || tipLower.includes('try') || tipLower.includes('recommend')) {
    return 'recommendations'
  }
  
  return 'protips'
}

/**
 * Validate tip category
 */
function validateCategory(category: any): StructuredTip['category'] {
  const validCategories: StructuredTip['category'][] = ['timing', 'food', 'secrets', 'protips', 'access', 'savings', 'recommendations', 'hidden']
  return validCategories.includes(category) ? category : 'protips'
}

/**
 * Validate tip text
 */
function validateTipText(tip: any): string {
  if (typeof tip !== 'string' || tip.length < 10) {
    return 'Ask locals for their personal recommendations'
  }
  
  // Clean the tip text
  let cleanTip = tip.trim()
  
  // Remove priority indicators that might be in the text
  cleanTip = cleanTip.replace(/^\[ESSENTIAL\]\s*/i, '')
  cleanTip = cleanTip.replace(/^\[HELPFUL\]\s*/i, '')
  cleanTip = cleanTip.replace(/^\[NICE TO KNOW\]\s*/i, '')
  
  // Remove category labels if they're at the start
  const categoryLabels = [
    'Best Times:', 'Food & Drinks:', 'Local Secrets:', 'Pro Tips:',
    'Getting There:', 'Money Saving:', 'What to Order/Try:', 'Hidden Features:'
  ]
  for (const label of categoryLabels) {
    const regex = new RegExp(`^${label}\\s*`, 'i')
    cleanTip = cleanTip.replace(regex, '')
  }
  
  // Remove quotes if they wrap the entire tip
  cleanTip = cleanTip.replace(/^["']|["']$/g, '')
  
  // Ensure it starts with capital letter
  if (cleanTip.length > 0) {
    cleanTip = cleanTip.charAt(0).toUpperCase() + cleanTip.slice(1)
  }
  
  // Ensure it doesn't end with a period (we'll add formatting later)
  cleanTip = cleanTip.replace(/\.+$/, '')
  
  // Limit length
  if (cleanTip.length > 150) {
    cleanTip = cleanTip.substring(0, 147) + '...'
  }
  
  return cleanTip
}

/**
 * Validate priority level
 */
function validatePriority(priority: any): StructuredTip['priority'] {
  const validPriorities: StructuredTip['priority'][] = ['high', 'medium', 'low']
  return validPriorities.includes(priority) ? priority : 'medium'
}

/**
 * Calculate confidence score for structured tips
 */
export function calculateStructuredTipsConfidence(tips: StructuredTip[], sourceContent: string): number {
  let confidence = 0.5 // Base confidence
  
  // Increase confidence based on number of tips
  confidence += Math.min(tips.length * 0.05, 0.15)
  
  // Increase confidence if tips have good variety
  const categories = new Set(tips.map(t => t.category))
  confidence += Math.min(categories.size * 0.05, 0.15)
  
  // Increase confidence if tips mention specific details
  const specificKeywords = ['hour', 'time', 'day', 'season', 'order', 'ask', 'try', 'visit', 'avoid']
  const keywordMatches = tips.reduce((count, tip) => {
    return count + specificKeywords.filter(keyword => 
      tip.tip.toLowerCase().includes(keyword)
    ).length
  }, 0)
  
  confidence += Math.min(keywordMatches * 0.02, 0.2)
  
  // Increase confidence if source content is substantial
  if (sourceContent.length > 500) confidence += 0.1
  if (sourceContent.length > 1000) confidence += 0.1
  
  return Math.min(confidence, 1.0)
}

/**
 * Create prompt for structured tips generation
 */
function createStructuredTipsPrompt(
  locationName: string,
  category: string = '',
  websiteContent: string
): string {
  return `
Analyze this information about ${locationName}${category ? ` (${category})` : ''} and generate 3-5 insider tips that only locals would know:

Website Content:
${websiteContent}

Generate insider tips covering these areas:
- TIMING: Best times to visit (specific hours, days, seasons)
- FOOD: What to order, ask for, or try that tourists miss
- SECRETS: Hidden features or lesser-known aspects
- PROTIPS: Local hacks for the best experience
- ACCESS: Getting there, parking, entrance tips
- SAVINGS: Money-saving opportunities
- RECOMMENDATIONS: Specific things to ask for or try
- HIDDEN: Features most people don't know about

Each tip should be:
- Actionable and specific
- Under 150 characters
- Something only locals would know
- Practical for visitors to use

Respond with a JSON array of objects with category, tip, and priority fields only.
`
}

/**
 * Generate fallback structured tips when AI fails
 */
export function generateFallbackStructuredTips(locationName: string, category: string = ''): StructuredTip[] {
  const categoryTips: Record<string, StructuredTip[]> = {
    restaurant: [
      {
        category: 'timing',
        tip: 'Visit between 2-4pm on weekdays for the best service and atmosphere',
        priority: 'high',
        isVerified: false,
        source: 'ai_generated'
      },
      {
        category: 'food',
        tip: 'Ask your server for daily specials or chef\'s recommendations',
        priority: 'high',
        isVerified: false,
        source: 'ai_generated'
      },
      {
        category: 'savings',
        tip: 'Check if they have a happy hour or special lunch menu',
        priority: 'medium',
        isVerified: false,
        source: 'ai_generated'
      }
    ],
    bar: [
      {
        category: 'food',
        tip: 'Ask the bartender for their signature cocktail',
        priority: 'high',
        isVerified: false,
        source: 'ai_generated'
      },
      {
        category: 'timing',
        tip: 'Visit on weeknights for a more intimate experience',
        priority: 'medium',
        isVerified: false,
        source: 'ai_generated'
      },
      {
        category: 'secrets',
        tip: 'Check if they have a hidden menu or seasonal specials',
        priority: 'medium',
        isVerified: false,
        source: 'ai_generated'
      }
    ],
    coffee: [
      {
        category: 'food',
        tip: 'Try their single-origin coffee or seasonal blend',
        priority: 'high',
        isVerified: false,
        source: 'ai_generated'
      },
      {
        category: 'timing',
        tip: 'Visit in the morning for the freshest pastries',
        priority: 'medium',
        isVerified: false,
        source: 'ai_generated'
      },
      {
        category: 'protips',
        tip: 'Ask about their brewing methods or coffee sourcing',
        priority: 'medium',
        isVerified: false,
        source: 'ai_generated'
      }
    ],
    park: [
      {
        category: 'timing',
        tip: 'Visit early morning or late afternoon for the best lighting',
        priority: 'high',
        isVerified: false,
        source: 'ai_generated'
      },
      {
        category: 'secrets',
        tip: 'Look for hidden trails or less crowded areas',
        priority: 'medium',
        isVerified: false,
        source: 'ai_generated'
      },
      {
        category: 'protips',
        tip: 'Check for seasonal events or guided tours',
        priority: 'medium',
        isVerified: false,
        source: 'ai_generated'
      }
    ],
    shop: [
      {
        category: 'protips',
        tip: 'Ask staff about their best-selling or unique items',
        priority: 'high',
        isVerified: false,
        source: 'ai_generated'
      },
      {
        category: 'savings',
        tip: 'Check for seasonal sales or loyalty programs',
        priority: 'medium',
        isVerified: false,
        source: 'ai_generated'
      },
      {
        category: 'recommendations',
        tip: 'Look for locally-made or exclusive products',
        priority: 'medium',
        isVerified: false,
        source: 'ai_generated'
      }
    ]
  }

  const lowerCategory = category.toLowerCase()
  return categoryTips[lowerCategory] || [
    {
      category: 'timing',
      tip: 'Visit during off-peak times for a better experience',
      priority: 'high',
      isVerified: false,
      source: 'ai_generated'
    },
    {
      category: 'protips',
      tip: 'Ask locals or staff for their personal recommendations',
      priority: 'medium',
      isVerified: false,
      source: 'ai_generated'
    },
    {
      category: 'secrets',
      tip: 'Check for special events or seasonal offerings',
      priority: 'medium',
      isVerified: false,
      source: 'ai_generated'
    }
  ]
}

/**
 * Convert structured tips to legacy format for backward compatibility
 */
export function structuredTipsToLegacyFormat(tips: StructuredTip[]): string {
  if (!tips || tips.length === 0) return ''
  
  // Group by priority and format
  const highPriority = tips.filter(t => t.priority === 'high')
  const mediumPriority = tips.filter(t => t.priority === 'medium')
  const lowPriority = tips.filter(t => t.priority === 'low')
  
  const allTips = [...highPriority, ...mediumPriority, ...lowPriority]
  
  return allTips.map(tip => tip.tip).join('. ') + (allTips.length > 0 ? '.' : '')
}

/**
 * Convert legacy text tips to structured format
 */
export function legacyTipsToStructuredFormat(legacyTips: string): StructuredTip[] {
  if (!legacyTips || legacyTips.trim().length === 0) return []
  
  // Handle tips with priority indicators (from Foursquare import editing)
  if (legacyTips.includes('[ESSENTIAL]') || legacyTips.includes('[HELPFUL]') || legacyTips.includes('[NICE TO KNOW]')) {
    const lines = legacyTips.split('\n\n').filter(line => line.trim())
    return lines.map((line, index) => {
      // Extract priority
      let priority: StructuredTip['priority'] = 'medium'
      let cleanLine = line.trim()
      
      if (cleanLine.includes('[ESSENTIAL]')) {
        priority = 'high'
        cleanLine = cleanLine.replace(/\[ESSENTIAL\]\s*/gi, '').trim()
      } else if (cleanLine.includes('[HELPFUL]')) {
        priority = 'medium'
        cleanLine = cleanLine.replace(/\[HELPFUL\]\s*/gi, '').trim()
      } else if (cleanLine.includes('[NICE TO KNOW]')) {
        priority = 'low'
        cleanLine = cleanLine.replace(/\[NICE TO KNOW\]\s*/gi, '').trim()
      }
      
      // Extract category and clean tip text
      const category = inferTipCategory(cleanLine)
      const cleanTip = validateTipText(cleanLine)
      
      return {
        category,
        tip: cleanTip,
        priority,
        isVerified: false,
        source: 'ai_generated' as const
      }
    }).filter(tip => tip.tip && tip.tip.trim().length > 5)
  }
  
  // Split by periods or pipe characters for regular legacy tips
  const tipTexts = legacyTips.split(/[.|]+/)
    .map(tip => tip.trim())
    .filter(tip => tip.length > 10)
  
  return tipTexts.slice(0, 5).map((tip, index) => ({
    category: inferTipCategory(tip),
    tip: validateTipText(tip),
    priority: index === 0 ? 'high' : 'medium',
    isVerified: false,
    source: 'ai_generated' as const
  }))
}

/**
 * Utility functions
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

async function scrapeWebsiteContent(url: string): Promise<string> {
  try {
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
    const textContent = extractTextFromHTML(html)
    return textContent.substring(0, 2000)
  } catch (error) {
    console.error('Error scraping website:', error)
    return ''
  }
}

function extractTextFromHTML(html: string): string {
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  text = text.replace(/<[^>]*>/g, ' ')
  text = text.replace(/\s+/g, ' ').trim()
  return text
}

/**
 * Clean tip text by removing priority indicators and category labels
 * Useful for cleaning up existing tips that may have these artifacts
 */
export function cleanTipText(tipText: string): string {
  if (!tipText || typeof tipText !== 'string') return ''
  
  let cleaned = tipText.trim()
  
  // Remove priority indicators
  cleaned = cleaned.replace(/^\[ESSENTIAL\]\s*/gi, '')
  cleaned = cleaned.replace(/^\[HELPFUL\]\s*/gi, '')
  cleaned = cleaned.replace(/^\[NICE TO KNOW\]\s*/gi, '')
  
  // Remove category labels
  const categoryLabels = [
    'Best Times:', 'Food & Drinks:', 'Local Secrets:', 'Pro Tips:',
    'Getting There:', 'Money Saving:', 'What to Order/Try:', 'Hidden Features:'
  ]
  for (const label of categoryLabels) {
    const regex = new RegExp(`^${label}\\s*`, 'i')
    cleaned = cleaned.replace(regex, '')
  }
  
  // Remove extra whitespace and ensure proper capitalization
  cleaned = cleaned.trim()
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }
  
  return cleaned
}

/**
 * Batch clean multiple tips from text input
 * Useful for cleaning pasted text with multiple tips
 */
export function cleanMultipleTips(text: string): string[] {
  if (!text || typeof text !== 'string') return []
  
  // Split by double newlines or lines that start with priority indicators
  const lines = text.split(/\n\n|\n(?=\[(?:ESSENTIAL|HELPFUL|NICE TO KNOW)\])/)
    .map(line => cleanTipText(line))
    .filter(line => line.length > 10)
  
  return lines
} 