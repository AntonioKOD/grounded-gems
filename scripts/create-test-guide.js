import { getPayload } from 'payload'
import config from '../payload.config.ts'

async function createTestGuide() {
  try {
    const payload = await getPayload({ config })
    
    console.log('Creating test guide...')
    
    // First, let's find a location to use
    const locations = await payload.find({
      collection: 'locations',
      limit: 1
    })
    
    if (locations.docs.length === 0) {
      console.log('No locations found. Creating a test location first...')
      
      // Create a test location
      const testLocation = await payload.create({
        collection: 'locations',
        data: {
          name: 'Test Location NYC',
          description: 'A test location in New York City',
          address: {
            street: '123 Test Street',
            city: 'New York',
            state: 'NY',
            zip: '10001',
            country: 'USA'
          },
          coordinates: {
            latitude: 40.7128,
            longitude: -74.0060
          },
          status: 'published',
          isVerified: true
        }
      })
      
      console.log('Created test location:', testLocation.id)
      locations.docs.push(testLocation)
    }
    
    const testLocation = locations.docs[0]
    console.log('Using location:', testLocation.name)
    
    // Create a test guide
    const guide = await payload.create({
      collection: 'guides',
      data: {
        title: 'Test Guide: NYC Food Tour',
        description: 'A comprehensive guide to the best food spots in New York City. Perfect for testing location-based filtering.',
        primaryLocation: testLocation.id,
        locations: [
          {
            location: testLocation.id,
            order: 1,
            description: 'Start your food tour here',
            estimatedTime: 120,
            tips: [{ tip: 'Come hungry!' }],
            isRequired: true
          }
        ],
        difficulty: 'easy',
        duration: { value: 4, unit: 'hours' },
        pricing: { type: 'free' },
        highlights: [
          { highlight: 'Best pizza in the city' },
          { highlight: 'Hidden gem bakeries' },
          { highlight: 'Local favorite delis' }
        ],
        content: {
          root: {
            type: 'root',
            format: '',
            indent: 0,
            version: 1,
            children: [
              {
                type: 'paragraph',
                format: '',
                indent: 0,
                version: 1,
                children: [
                  {
                    type: 'text',
                    format: 0,
                    style: '',
                    mode: 'normal',
                    text: 'Welcome to the ultimate NYC food tour! This guide will take you through the best culinary experiences the city has to offer.',
                    version: 1
                  }
                ]
              },
              {
                type: 'paragraph',
                format: '',
                indent: 0,
                version: 1,
                children: [
                  {
                    type: 'text',
                    format: 0,
                    style: '',
                    mode: 'normal',
                    text: 'From world-famous pizza joints to hidden gem bakeries, you\'ll discover the flavors that make NYC a food lover\'s paradise.',
                    version: 1
                  }
                ]
              }
            ]
          }
        },
        insiderTips: [
          {
            category: 'secrets',
            tip: 'Ask for the off-menu specials - most places have them!',
            priority: 'high'
          }
        ],
        tags: [
          { tag: 'food' },
          { tag: 'nyc' },
          { tag: 'restaurants' }
        ],
        language: 'en',
        status: 'published', // Set as published for testing
        stats: {
          views: 0,
          purchases: 0,
          reviewCount: 0
        }
      }
    })
    
    console.log('✅ Created test guide:', guide.id)
    console.log('Title:', guide.title)
    console.log('Status:', guide.status)
    console.log('Location:', testLocation.name, `(${testLocation.address?.city}, ${testLocation.address?.state})`)
    
    return guide
    
  } catch (error) {
    console.error('❌ Error creating test guide:', error)
    throw error
  }
}

// Run the script
createTestGuide()
  .then(() => {
    console.log('✅ Test guide creation completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  }) 