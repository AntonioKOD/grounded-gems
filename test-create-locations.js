const { getPayload } = require('payload')
const config = require('./payload.config.ts').default

async function createTestLocations() {
  const payload = await getPayload({ config })

  const testLocations = [
    {
      name: "Boston Common",
      description: "Historic park in downtown Boston",
      shortDescription: "America's oldest public park",
      address: {
        street: "139 Tremont St",
        city: "Boston",
        state: "MA",
        zip: "02111",
        country: "USA"
      },
      coordinates: {
        latitude: 42.3601,
        longitude: -71.0589
      },
      status: "published",
      isFeatured: true,
      isVerified: true
    },
    {
      name: "MIT Campus",
      description: "Massachusetts Institute of Technology campus",
      shortDescription: "World-renowned technology institute",
      address: {
        street: "77 Massachusetts Ave",
        city: "Cambridge",
        state: "MA",
        zip: "02139",
        country: "USA"
      },
      coordinates: {
        latitude: 42.3601,
        longitude: -71.0942
      },
      status: "published",
      isFeatured: true,
      isVerified: true
    },
    {
      name: "Harvard University",
      description: "Historic Ivy League university",
      shortDescription: "America's oldest institution of higher education",
      address: {
        street: "Harvard Yard",
        city: "Cambridge",
        state: "MA",
        zip: "02138",
        country: "USA"
      },
      coordinates: {
        latitude: 42.3770,
        longitude: -71.1167
      },
      status: "published",
      isFeatured: true,
      isVerified: true
    },
    {
      name: "Fenway Park",
      description: "Historic baseball stadium, home of the Boston Red Sox",
      shortDescription: "America's Most Beloved Ballpark",
      address: {
        street: "4 Yawkey Way",
        city: "Boston",
        state: "MA",
        zip: "02215",
        country: "USA"
      },
      coordinates: {
        latitude: 42.3467,
        longitude: -71.0972
      },
      status: "published",
      isFeatured: true,
      isVerified: true
    },
    {
      name: "Boston Tea Party Ships & Museum",
      description: "Interactive museum and historic ships",
      shortDescription: "Relive the famous Boston Tea Party",
      address: {
        street: "306 Congress St",
        city: "Boston",
        state: "MA",
        zip: "02210",
        country: "USA"
      },
      coordinates: {
        latitude: 42.3520,
        longitude: -71.0552
      },
      status: "published",
      isFeatured: true,
      isVerified: true
    }
  ]

  try {
    console.log('Creating test locations...')
    
    for (const locationData of testLocations) {
      try {
        const location = await payload.create({
          collection: 'locations',
          data: locationData
        })
        console.log(`✅ Created location: ${location.name} (ID: ${location.id})`)
      } catch (error) {
        console.error(`❌ Error creating location ${locationData.name}:`, error.message)
      }
    }
    
    console.log('\n🎉 Test locations created successfully!')
    console.log('You can now test the map functionality.')
    
  } catch (error) {
    console.error('Error creating test locations:', error)
  } finally {
    process.exit(0)
  }
}

createTestLocations() 