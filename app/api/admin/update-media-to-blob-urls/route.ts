import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(req: NextRequest) {
  try {
    console.log('🔄 Starting media URL update to blob storage...')
    
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ 
        error: 'BLOB_READ_WRITE_TOKEN not found in environment variables' 
      }, { status: 500 })
    }

    const payload = await getPayload({ config })
    
    // Get all media records
    const mediaRecords = await payload.find({
      collection: 'media',
      limit: 1000, // Adjust as needed
      depth: 0
    })

    console.log(`📊 Found ${mediaRecords.docs.length} media records to process`)

    const blobHostname = process.env.BLOB_READ_WRITE_TOKEN.replace('vercel_blob_rw_', '')
    let updatedCount = 0
    let skippedCount = 0
    const errors: string[] = []

    for (const media of mediaRecords.docs) {
      try {
        // Check if URL is already a blob storage URL
        if (media.url && media.url.includes('blob.vercel-storage.com')) {
          console.log(`⏭️  Skipping ${media.filename} - already using blob storage`)
          skippedCount++
          continue
        }

        // Construct blob storage URL
        const blobUrl = `https://${blobHostname}.public.blob.vercel-storage.com/${media.filename}`
        
        // Update the media record
        await payload.update({
          collection: 'media',
          id: media.id,
          data: {
            url: blobUrl
          }
        })

        console.log(`✅ Updated ${media.filename}: ${media.url} → ${blobUrl}`)
        updatedCount++

      } catch (error: any) {
        const errorMsg = `Failed to update ${media.filename}: ${error.message}`
        console.error(`❌ ${errorMsg}`)
        errors.push(errorMsg)
      }
    }

    console.log(`\n🎉 Update complete!`)
    console.log(`✅ Updated: ${updatedCount} records`)
    console.log(`⏭️  Skipped: ${skippedCount} records`)
    console.log(`📊 Total processed: ${mediaRecords.docs.length} records`)

    return NextResponse.json({
      success: true,
      message: 'Media URLs updated to blob storage',
      stats: {
        total: mediaRecords.docs.length,
        updated: updatedCount,
        skipped: skippedCount,
        errors: errors.length
      },
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error: any) {
    console.error('❌ Script failed:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to update media URLs' 
    }, { status: 500 })
  }
}







