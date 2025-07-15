import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { name, address } = await req.json()

    if (!name || !address) {
      return NextResponse.json(
        { error: 'Name and address are required' },
        { status: 400 }
      )
    }

    // Check for exact name matches
    const nameMatches = await payload.find({
      collection: 'locations',
      where: {
        name: {
          equals: name.trim()
        }
      },
      limit: 5
    })

    // Check for similar names (fuzzy matching)
    const similarNameMatches = await payload.find({
      collection: 'locations',
      where: {
        name: {
          like: name.trim()
        }
      },
      limit: 5
    })

    // Check for locations at the same address
    const addressParts = address.split(',').map((part: string) => part.trim())
    let addressMatches = { docs: [] as any[] }
    
    if (addressParts.length >= 2) {
      // Try to match against street and city
      const street = addressParts[0]
      const city = addressParts[1]
      
      addressMatches = await payload.find({
        collection: 'locations',
        where: {
          and: [
            {
              'address.street': {
                like: street
              }
            },
            {
              'address.city': {
                like: city
              }
            }
          ]
        },
        limit: 5
      })
    }

    // Combine all potential duplicates
    const allMatches = [
      ...nameMatches.docs,
      ...similarNameMatches.docs,
      ...addressMatches.docs
    ]

    // Remove duplicates by ID
    const uniqueMatches = allMatches.filter((location, index, array) => 
      array.findIndex(l => l.id === location.id) === index
    )

    if (uniqueMatches.length > 0) {
      // Find the closest match
      const exactNameMatch = uniqueMatches.find(loc => 
        loc.name.toLowerCase() === name.toLowerCase()
      )

      const exactAddressMatch = uniqueMatches.find(loc => {
        const locAddress = `${loc.address?.street || ''}, ${loc.address?.city || ''}`.toLowerCase()
        return locAddress.includes(addressParts[0]?.toLowerCase() || '') && 
               locAddress.includes(addressParts[1]?.toLowerCase() || '')
      })

      let isDuplicate = false
      let message = ''
      let existingLocation = null

      if (exactNameMatch && exactAddressMatch && exactNameMatch.id === exactAddressMatch.id) {
        // Exact duplicate
        isDuplicate = true
        message = `A location named "${exactNameMatch.name}" already exists at this address.`
        existingLocation = exactNameMatch
      } else if (exactNameMatch) {
        isDuplicate = true
        message = `A location named "${exactNameMatch.name}" already exists.`
        existingLocation = exactNameMatch
      } else if (exactAddressMatch) {
        isDuplicate = true
        message = `A location named "${exactAddressMatch.name}" already exists at this address.`
        existingLocation = exactAddressMatch
      } else {
        // Similar matches found
        message = `Similar locations found. Please verify this isn't a duplicate.`
        existingLocation = uniqueMatches[0]
      }

      return NextResponse.json({
        isDuplicate,
        message,
        existingLocation: {
          id: existingLocation.id,
          name: existingLocation.name,
          address: existingLocation.address,
          slug: existingLocation.slug
        },
        suggestions: uniqueMatches.slice(0, 3).map(loc => ({
          id: loc.id,
          name: loc.name,
          address: loc.address,
          slug: loc.slug
        }))
      })
    }

    return NextResponse.json({
      isDuplicate: false,
      message: 'No duplicates found'
    })

  } catch (error) {
    console.error('Error checking for duplicates:', error)
    return NextResponse.json(
      { error: 'Failed to check for duplicates' },
      { status: 500 }
    )
  }
} 