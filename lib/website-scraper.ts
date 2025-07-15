import isUrl from 'is-url'

interface ScrapedContent {
  title?: string
  description?: string
  headings: string[]
  content: string
  menuItems?: string[]
  contactInfo?: {
    phone?: string
    email?: string
    address?: string
  }
}

export async function scrapeWebsiteContent(url: string): Promise<string | null> {
  try {
    if (!url || !isUrl(url)) {
      throw new Error('Invalid website URL provided')
    }

    console.log('🔍 Scraping website:', url)
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SacaviaBot/1.0; +https://sacavia.com/bot)'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch website: ${response.statusText}`)
    }

    const html = await response.text()
    if (!html || html.length < 50) {
      throw new Error('Could not extract meaningful content from website')
    }

    const scrapedData = extractStructuredContent(html)
    const formattedContent = formatContentForAI(scrapedData)
    
    console.log('✅ Successfully scraped website content:', {
      title: scrapedData.title,
      headingsCount: scrapedData.headings.length,
      contentLength: scrapedData.content.length,
      hasContactInfo: !!scrapedData.contactInfo
    })

    return formattedContent
  } catch (error) {
    console.error('❌ Error scraping website:', error)
    return null
  }
}

function extractStructuredContent(html: string): ScrapedContent {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const title = titleMatch ? titleMatch[1]?.trim() : undefined

  // Extract meta description
  const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i)
  const description = metaDescMatch ? metaDescMatch[1]?.trim() : undefined

  // Extract headings (h1, h2, h3)
  const headingMatches = html.match(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/gi) || []
  const headings = headingMatches
    .map(h => h.replace(/<[^>]+>/g, '').trim())
    .filter(h => h.length > 0)

  // Extract menu-related content
  const menuKeywords = ['menu', 'food', 'dish', 'pizza', 'pasta', 'sandwich', 'special', 'appetizer', 'entree', 'dessert']
  const menuMatches = html.match(new RegExp(`<[^>]*(?:${menuKeywords.join('|')})[^>]*>([^<]+)<`, 'gi')) || []
  const menuItems = menuMatches
    .map(m => m.replace(/<[^>]+>/g, '').trim())
    .filter(m => m.length > 2 && m.length < 100)

  // Extract contact information
  const phoneMatch = html.match(/(?:phone|tel|call)[^>]*>?\s*([+]?[\d\s\-\(\)\.]{10,})/i)
  const emailMatch = html.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)
  const addressMatch = html.match(/(?:address|location)[^>]*>?\s*([^<]{20,100})/i)

  const contactInfo = {
    phone: phoneMatch ? phoneMatch[1]?.trim() : undefined,
    email: emailMatch ? emailMatch[1]?.trim() : undefined,
    address: addressMatch ? addressMatch[1]?.trim() : undefined
  }

  // Clean main content
  const cleanedContent = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove styles
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '') // Remove navigation
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '') // Remove footer
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '') // Remove header
    .replace(/<[^>]+>/g, ' ') // Remove remaining HTML tags
    .replace(/\s+/g, ' ') // Remove extra whitespace
    .trim()

  return {
    title,
    description,
    headings,
    content: cleanedContent,
    menuItems: menuItems.slice(0, 10), // Limit to 10 menu items
    contactInfo: Object.values(contactInfo).some(v => v) ? contactInfo : undefined
  }
}

function formatContentForAI(data: ScrapedContent): string {
  const sections = []

  if (data.title) {
    sections.push(`TITLE: ${data.title}`)
  }

  if (data.description) {
    sections.push(`DESCRIPTION: ${data.description}`)
  }

  if (data.headings.length > 0) {
    sections.push(`HEADINGS: ${data.headings.slice(0, 5).join(' | ')}`)
  }

  if (data.menuItems && data.menuItems.length > 0) {
    sections.push(`MENU ITEMS: ${data.menuItems.join(' | ')}`)
  }

  if (data.contactInfo) {
    const contact = []
    if (data.contactInfo.phone) contact.push(`Phone: ${data.contactInfo.phone}`)
    if (data.contactInfo.email) contact.push(`Email: ${data.contactInfo.email}`)
    if (data.contactInfo.address) contact.push(`Address: ${data.contactInfo.address}`)
    if (contact.length > 0) {
      sections.push(`CONTACT: ${contact.join(' | ')}`)
    }
  }

  // Add main content (truncated to avoid token limits)
  const truncatedContent = data.content.length > 1000 
    ? data.content.substring(0, 1000) + '...'
    : data.content

  if (truncatedContent.length > 50) {
    sections.push(`CONTENT: ${truncatedContent}`)
  }

  return sections.join('\n\n')
} 