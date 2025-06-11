/**
 * Migration script to convert legacy paragraph insider tips to structured format
 * Run this script to upgrade existing location data to the new structured insider tips system
 */

import { getPayloadHMR } from '@payloadcms/next/utilities'
import configPromise from '../payload.config'
import { legacyTipsToStructuredFormat } from '../lib/structured-insider-tips'

interface LegacyLocation {
  id: string
  name: string
  insiderTips?: string | any[]
}

async function migrateInsiderTips() {
  console.log('🚀 Starting insider tips migration...')
  
  try {
    const payload = await getPayloadHMR({ config: configPromise })
    
    // Find all locations with legacy insider tips
    const locations = await payload.find({
      collection: 'locations',
      limit: 1000, // Process in batches if needed
      where: {
        insiderTips: {
          exists: true,
        }
      }
    })

    console.log(`📍 Found ${locations.docs.length} locations with insider tips`)

    let migratedCount = 0
    let skippedCount = 0
    let errorCount = 0

    for (const location of locations.docs as LegacyLocation[]) {
      try {
        console.log(`\n🔄 Processing: ${location.name}`)
        
        // Skip if already structured (array format)
        if (Array.isArray(location.insiderTips)) {
          console.log(`   ⏭️  Already structured, skipping`)
          skippedCount++
          continue
        }

        // Skip if no insider tips or empty string
        if (!location.insiderTips || typeof location.insiderTips !== 'string' || location.insiderTips.trim().length === 0) {
          console.log(`   ⏭️  No insider tips to migrate, skipping`)
          skippedCount++
          continue
        }

        // Convert legacy tips to structured format
        const structuredTips = legacyTipsToStructuredFormat(location.insiderTips)
        
        if (structuredTips.length === 0) {
          console.log(`   ⚠️  Could not convert tips, skipping`)
          skippedCount++
          continue
        }

        console.log(`   📝 Converting ${structuredTips.length} tips:`)
        structuredTips.forEach((tip, index) => {
          console.log(`      ${index + 1}. [${tip.category}] ${tip.tip.substring(0, 60)}${tip.tip.length > 60 ? '...' : ''}`)
        })

        // Update the location with structured tips
        await payload.update({
          collection: 'locations',
          id: location.id,
          data: {
            insiderTips: structuredTips
          }
        })

        console.log(`   ✅ Successfully migrated`)
        migratedCount++

      } catch (error) {
        console.error(`   ❌ Error migrating ${location.name}:`, error)
        errorCount++
      }
    }

    console.log('\n📊 Migration Summary:')
    console.log(`   ✅ Successfully migrated: ${migratedCount} locations`)
    console.log(`   ⏭️  Skipped: ${skippedCount} locations`)
    console.log(`   ❌ Errors: ${errorCount} locations`)
    console.log(`   📍 Total processed: ${locations.docs.length} locations`)

    if (migratedCount > 0) {
      console.log('\n🎉 Migration completed successfully!')
      console.log('💡 Tip: You can now use the new StructuredInsiderTips component to display these tips with proper categorization and styling.')
    }

  } catch (error) {
    console.error('💥 Migration failed:', error)
    process.exit(1)
  }
}

// Dry run function to preview changes without making updates
async function dryRunMigration() {
  console.log('🔍 Running dry run migration preview...')
  
  try {
    const payload = await getPayloadHMR({ config: configPromise })
    
    const locations = await payload.find({
      collection: 'locations',
      limit: 10, // Preview first 10 locations
      where: {
        insiderTips: {
          exists: true,
        }
      }
    })

    console.log(`\n📍 Preview of ${Math.min(10, locations.docs.length)} locations:`)

    for (const location of locations.docs as LegacyLocation[]) {
      console.log(`\n🏪 ${location.name}`)
      console.log(`   Current tips: ${typeof location.insiderTips}`)
      
      if (Array.isArray(location.insiderTips)) {
        console.log(`   ✅ Already structured (${location.insiderTips.length} tips)`)
      } else if (typeof location.insiderTips === 'string') {
        console.log(`   📝 Legacy format: "${location.insiderTips.substring(0, 100)}${location.insiderTips.length > 100 ? '...' : ''}"`)
        
        const structuredTips = legacyTipsToStructuredFormat(location.insiderTips)
        console.log(`   🔄 Would convert to ${structuredTips.length} structured tips:`)
        structuredTips.forEach((tip, index) => {
          console.log(`      ${index + 1}. [${tip.category}/${tip.priority}] ${tip.tip}`)
        })
      } else {
        console.log(`   ⚠️  Unexpected format: ${location.insiderTips}`)
      }
    }

    console.log('\n💡 This was a dry run. No changes were made.')
    console.log('   Run migrateInsiderTips() to perform the actual migration.')

  } catch (error) {
    console.error('💥 Dry run failed:', error)
  }
}

// Rollback function to revert to legacy format if needed
async function rollbackMigration() {
  console.log('⏪ Starting rollback migration...')
  
  try {
    const payload = await getPayloadHMR({ config: configPromise })
    
    const locations = await payload.find({
      collection: 'locations',
      limit: 1000,
      where: {
        insiderTips: {
          exists: true,
        }
      }
    })

    console.log(`📍 Found ${locations.docs.length} locations to check for rollback`)

    let rolledBackCount = 0

    for (const location of locations.docs as LegacyLocation[]) {
      try {
        // Only rollback if currently structured (array format)
        if (Array.isArray(location.insiderTips) && location.insiderTips.length > 0) {
          console.log(`🔄 Rolling back: ${location.name}`)
          
          // Convert structured tips back to legacy paragraph format
          const legacyFormat = location.insiderTips
            .map((tip: any) => tip.tip)
            .join('. ') + '.'

          await payload.update({
            collection: 'locations',
            id: location.id,
            data: {
              insiderTips: legacyFormat
            }
          })

          console.log(`   ✅ Rolled back to legacy format`)
          rolledBackCount++
        }
      } catch (error) {
        console.error(`❌ Error rolling back ${location.name}:`, error)
      }
    }

    console.log(`\n📊 Rollback Summary: ${rolledBackCount} locations rolled back`)

  } catch (error) {
    console.error('💥 Rollback failed:', error)
  }
}

// Command line interface
const args = process.argv.slice(2)
const command = args[0]

switch (command) {
  case 'dry-run':
    dryRunMigration()
    break
  case 'migrate':
    migrateInsiderTips()
    break
  case 'rollback':
    rollbackMigration()
    break
  default:
    console.log('📚 Insider Tips Migration Utility')
    console.log('\nUsage:')
    console.log('  npm run migrate:tips dry-run   - Preview changes without making updates')
    console.log('  npm run migrate:tips migrate   - Perform the actual migration')
    console.log('  npm run migrate:tips rollback  - Rollback to legacy format')
    console.log('\nExample:')
    console.log('  npm run migrate:tips dry-run')
    break
} 