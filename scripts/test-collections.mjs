import { getPayload } from 'payload'
import config from '../payload.config.ts'

async function testCollections() {
  try {
    console.log('🚀 Testing Payload collections...')
    const payload = await getPayload({ config })
    
    // Test if collections exist
    console.log('📚 Available collections:', Object.keys(payload.collections))
    
    // Test challenges collection
    try {
      const challenges = await payload.find({
        collection: 'challenges',
        limit: 5
      })
      console.log(`✅ Challenges collection: ${challenges.docs.length} documents found`)
      if (challenges.docs.length > 0) {
        console.log('📅 Sample challenge:', challenges.docs[0].title)
      }
    } catch (error) {
      console.log('❌ Challenges collection error:', error.message)
    }
    
    // Test challenge-suggestions collection
    try {
      const suggestions = await payload.find({
        collection: 'challenge-suggestions',
        limit: 5
      })
      console.log(`✅ Challenge-suggestions collection: ${suggestions.docs.length} documents found`)
      if (suggestions.docs.length > 0) {
        console.log('🗳️ Sample suggestion:', suggestions.docs[0].title)
      }
    } catch (error) {
      console.log('❌ Challenge-suggestions collection error:', error.message)
    }
    
    // Test challenge-votes collection
    try {
      const votes = await payload.find({
        collection: 'challenge-votes',
        limit: 5
      })
      console.log(`✅ Challenge-votes collection: ${votes.docs.length} documents found`)
    } catch (error) {
      console.log('❌ Challenge-votes collection error:', error.message)
    }
    
  } catch (error) {
    console.error('❌ Error testing collections:', error)
  }
}

testCollections()
  .then(() => {
    console.log('✅ Test completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }) 