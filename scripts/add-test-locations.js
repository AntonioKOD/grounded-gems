import { getPayload } from 'payload'
import config from '../payload.config.js'

async function addTestLocations() {
  try {
    const payload = await getPayload({ config })
    
    console.log('🗺️ Adding test locations...')
    
    const testLocations = [
      {
        name: 'Central Park Coffee',
        description: 'Cozy coffee shop with amazing pastries and outdoor seating',
        category: 'Café',
        rating: 4.7,
        priceRange: 'moderate',
        address: '123 Main St, Boston, MA',
        coordinates: {
          latitude: 42.3601,
          longitude: -71.0589
        },
        status: 'published',
        featuredImage: null,
        images: [],
        categories: ['Coffee', 'Food', 'Outdoor Seating']
      },
      {
        name: 'Harbor View Restaurant',
        description: 'Upscale seafood restaurant with stunning harbor views',
        category: 'Restaurant',
        rating: 4.9,
        priceRange: 'expensive',
        address: '456 Harbor Dr, Boston, MA',
        coordinates: {
          latitude: 42.3584,
          longitude: -71.0598
        },
        status: 'published',
        featuredImage: null,
        images: [],
        categories: ['Seafood', 'Fine Dining', 'Waterfront']
      },
      {
        name: 'Tech Hub Co-working',
        description: 'Modern co-working space for entrepreneurs and remote workers',
        category: 'Co-working',
        rating: 4.5,
        priceRange: 'moderate',
        address: '789 Innovation Ave, Boston, MA',
        coordinates: {
          latitude: 42.3618,
          longitude: -71.0563
        },
        status: 'published',
        featuredImage: null,
        images: [],
        categories: ['Co-working', 'Business', 'Networking']
      },
      {
        name: 'Green Gardens Park',
        description: 'Beautiful urban park with walking trails and picnic areas',
        category: 'Park',
        rating: 4.6,
        priceRange: 'budget',
        address: '321 Nature Way, Boston, MA',
        coordinates: {
          latitude: 42.3632,
          longitude: -71.0612
        },
        status: 'published',
        featuredImage: null,
        images: [],
        categories: ['Outdoor', 'Recreation', 'Family-friendly']
      },
      {
        name: 'Artisan Bakery',
        description: 'Handcrafted breads and pastries made fresh daily',
        category: 'Bakery',
        rating: 4.8,
        priceRange: 'moderate',
        address: '654 Baker St, Boston, MA',
        coordinates: {
          latitude: 42.3576,
          longitude: -71.0554
        },
        status: 'published',
        featuredImage: null,
        images: [],
        categories: ['Bakery', 'Food', 'Local']
      }
    ]
    
    for (const locationData of testLocations) {
      try {
        const location = await payload.create({
          collection: 'locations',
          data: locationData
        })
        console.log(`✅ Added location: ${location.name}`)
      } catch (error) {
        console.error(`❌ Failed to add location ${locationData.name}:`, error.message)
      }
    }
    
    console.log('🎉 Test locations added successfully!')
    process.exit(0)
    
  } catch (error) {
    console.error('❌ Error adding test locations:', error)
    process.exit(1)
  }
}

addTestLocations() 