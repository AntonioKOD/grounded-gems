import { getPayload } from 'payload'
import config from '../payload.config.ts'

async function addTestProfileData() {
  try {
    const payload = await getPayload({ config })
    
    console.log('🔧 Adding test profile data...')
    
    // Get the first user
    const usersResult = await payload.find({
      collection: 'users',
      limit: 1,
      depth: 1,
    })
    
    if (usersResult.docs.length === 0) {
      console.log('❌ No users found in database')
      return
    }
    
    const user = usersResult.docs[0]
    console.log(`🔧 Found user: ${user.name} (${user.id})`)
    
    // Update user with interests and social links
    const updatedUser = await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        interests: ['Travel', 'Food', 'Adventure', 'Photography', 'Technology'],
        socialLinks: [
          {
            platform: 'instagram',
            url: 'https://instagram.com/testuser'
          },
          {
            platform: 'twitter',
            url: 'https://twitter.com/testuser'
          },
          {
            platform: 'youtube',
            url: 'https://youtube.com/@testuser'
          }
        ],
        bio: 'Passionate traveler and food enthusiast. Always looking for the next adventure! 📸✈️🍕'
      }
    })
    
    console.log('✅ Updated user with interests and social links')
    
    // Create some test posts for the user
    const testPosts = [
      {
        title: 'Amazing Sunset in Bali',
        content: 'Just witnessed the most incredible sunset in Bali today! The colors were absolutely breathtaking. This is why I love traveling - these magical moments that take your breath away. 🌅 #Bali #Sunset #Travel',
        type: 'post',
        author: user.id,
        status: 'published',
        visibility: 'public'
      },
      {
        title: 'Best Pizza in NYC',
        content: 'Found this hidden gem in Brooklyn - hands down the best pizza I\'ve ever had! The crust was perfectly crispy and the sauce was incredible. If you\'re in NYC, you have to try this place! 🍕 #NYC #Pizza #Foodie',
        type: 'review',
        rating: 5,
        author: user.id,
        status: 'published',
        visibility: 'public'
      },
      {
        title: 'Adventure Photography Tips',
        content: 'Some tips for capturing amazing adventure photos: 1) Always carry extra batteries 2) Use natural light when possible 3) Don\'t be afraid to get dirty for the perfect shot 4) Patience is key! 📸 #Photography #Adventure #Tips',
        type: 'post',
        author: user.id,
        status: 'published',
        visibility: 'public'
      },
      {
        title: 'Tech Conference Highlights',
        content: 'Just got back from an amazing tech conference! Learned so much about AI and machine learning. The future is here and it\'s exciting! 🤖 #Tech #AI #Conference',
        type: 'post',
        author: user.id,
        status: 'published',
        visibility: 'public'
      }
    ]
    
    console.log('🔧 Creating test posts...')
    
    for (const postData of testPosts) {
      const post = await payload.create({
        collection: 'posts',
        data: postData
      })
      console.log(`✅ Created post: ${post.title}`)
    }
    
    console.log('🎉 Test profile data added successfully!')
    console.log(`📊 User now has ${updatedUser.interests?.length || 0} interests and ${updatedUser.socialLinks?.length || 0} social links`)
    
  } catch (error) {
    console.error('❌ Error adding test profile data:', error)
  }
  
  process.exit(0)
}

addTestProfileData() 