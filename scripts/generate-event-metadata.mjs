#!/usr/bin/env node

/**
 * Script to generate AI metadata for existing events
 * This will backfill metadata for events that don't have it
 */

import { getPayload } from 'payload'
import config from '@payload-config'

const generateEventMetadata = async (event) => {
  try {
    console.log(`🤖 Generating metadata for event: ${event.name}`)
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://sacavia.com'}/api/ai/generate-event-metadata`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: event.name,
        description: event.description,
        category: event.category,
        eventType: event.eventType,
        location: event.location?.name || 'TBD',
        startDate: event.startDate
      })
    })

    if (response.ok) {
      const data = await response.json()
      if (data.success && data.metadata) {
        return {
          title: data.metadata.title,
          description: data.metadata.description,
          keywords: data.metadata.keywords
        }
      }
    }
    
    console.log(`⚠️ Failed to generate metadata for ${event.name}, using fallback`)
    return {
      title: `${event.name} - Events on Sacavia`,
      description: event.description?.substring(0, 160) || '',
      keywords: `${event.category}, ${event.eventType}, events, sacavia, local events`
    }
  } catch (error) {
    console.error(`❌ Error generating metadata for ${event.name}:`, error)
    return {
      title: `${event.name} - Events on Sacavia`,
      description: event.description?.substring(0, 160) || '',
      keywords: `${event.category}, ${event.eventType}, events, sacavia, local events`
    }
  }
}

const main = async () => {
  try {
    console.log('🚀 Starting event metadata generation...')
    
    const payload = await getPayload({ config })
    
    // Get all published public events that don't have metadata or have basic metadata
    const events = await payload.find({
      collection: 'events',
      where: {
        status: { equals: 'published' },
        privacy: { equals: 'public' },
        or: [
          { meta: { exists: false } },
          { 'meta.title': { like: '%Events on Sacavia' } }
        ]
      },
      limit: 100, // Process in batches
      depth: 1
    })
    
    console.log(`📊 Found ${events.docs.length} events to process`)
    
    let processed = 0
    let success = 0
    let failed = 0
    
    for (const event of events.docs) {
      try {
        console.log(`\n📝 Processing event ${processed + 1}/${events.docs.length}: ${event.name}`)
        
        const metadata = await generateEventMetadata(event)
        
        // Update the event with new metadata
        await payload.update({
          collection: 'events',
          id: event.id,
          data: {
            meta: metadata
          }
        })
        
        console.log(`✅ Updated metadata for: ${event.name}`)
        success++
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (error) {
        console.error(`❌ Failed to update event ${event.name}:`, error)
        failed++
      }
      
      processed++
    }
    
    console.log(`\n🎉 Metadata generation complete!`)
    console.log(`📊 Processed: ${processed}`)
    console.log(`✅ Success: ${success}`)
    console.log(`❌ Failed: ${failed}`)
    
  } catch (error) {
    console.error('❌ Script failed:', error)
    process.exit(1)
  }
}

main()
