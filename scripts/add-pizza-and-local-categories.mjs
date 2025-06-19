// Script to add additional pizza and local place categories
// Run this script to populate your categories collection with new categories

// Instructions:
// 1. Start your development server: `npm run dev`
// 2. Run this script: `node scripts/add-pizza-and-local-categories.mjs`

const categories = [
  // 🍕 More Pizza Specifics
  {
    name: 'Pizza Shop',
    slug: 'pizza-shop',
    type: 'location',
    source: 'manual',
    description: 'Traditional neighborhood pizza shops and local pizzerias',
    color: '#FF6B6B',
    order: 51,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Deep Dish Pizza',
    slug: 'deep-dish-pizza',
    type: 'location',
    source: 'manual',
    description: 'Chicago-style deep dish pizza restaurants',
    color: '#FF6B6B',
    order: 52,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Sicilian Pizza',
    slug: 'sicilian-pizza',
    type: 'location',
    source: 'manual',
    description: 'Authentic Sicilian-style thick crust pizza places',
    color: '#FF6B6B',
    order: 53,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Wood-Fired Pizza',
    slug: 'wood-fired-pizza',
    type: 'location',
    source: 'manual',
    description: 'Pizzerias using wood-fired ovens for authentic flavor',
    color: '#FF6B6B',
    order: 54,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Pizza by the Slice',
    slug: 'pizza-by-the-slice',
    type: 'location',
    source: 'manual',
    description: 'Quick-service spots selling pizza by the slice',
    color: '#FF6B6B',
    order: 55,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },

  // 🏪 Local & Neighborhood Specifics
  {
    name: 'Corner Store',
    slug: 'corner-store',
    type: 'location',
    source: 'manual',
    description: 'Local convenience stores and corner shops in neighborhoods',
    color: '#4ECDC4',
    order: 56,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Family Restaurant',
    slug: 'family-restaurant',
    type: 'location',
    source: 'manual',
    description: 'Family-owned restaurants serving home-style cooking',
    color: '#FFE66D',
    order: 57,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Local Bakery',
    slug: 'local-bakery',
    type: 'location',
    source: 'manual',
    description: 'Neighborhood bakeries with fresh bread and pastries',
    color: '#FF8E53',
    order: 58,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Mom & Pop Shop',
    slug: 'mom-and-pop-shop',
    type: 'location',
    source: 'manual',
    description: 'Small family-owned businesses and shops',
    color: '#8B5CF6',
    order: 59,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Neighborhood Deli',
    slug: 'neighborhood-deli',
    type: 'location',
    source: 'manual',
    description: 'Local delis serving sandwiches and prepared foods',
    color: '#10B981',
    order: 60,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Local Market',
    slug: 'local-market',
    type: 'location',
    source: 'manual',
    description: 'Small local markets and grocery stores',
    color: '#F59E0B',
    order: 61,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Barbershop',
    slug: 'barbershop',
    type: 'location',
    source: 'manual',
    description: 'Traditional barbershops and hair cutting establishments',
    color: '#3B82F6',
    order: 62,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Local Laundromat',
    slug: 'local-laundromat',
    type: 'location',
    source: 'manual',
    description: 'Neighborhood laundromats and washing facilities',
    color: '#6366F1',
    order: 63,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Hardware Store',
    slug: 'hardware-store',
    type: 'location',
    source: 'manual',
    description: 'Local hardware stores for tools and home improvement',
    color: '#EF4444',
    order: 64,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Auto Repair Shop',
    slug: 'auto-repair-shop',
    type: 'location',
    source: 'manual',
    description: 'Local automotive repair and service shops',
    color: '#DC2626',
    order: 65,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },

  // 🍻 Local Food Culture
  {
    name: 'Dive Bar',
    slug: 'dive-bar',
    type: 'location',
    source: 'manual',
    description: 'Local dive bars with character and community',
    color: '#92400E',
    order: 66,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Sports Bar',
    slug: 'sports-bar',
    type: 'location',
    source: 'manual',
    description: 'Local sports bars for watching games with friends',
    color: '#059669',
    order: 67,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Hole-in-the-Wall',
    slug: 'hole-in-the-wall',
    type: 'location',
    source: 'manual',
    description: 'Hidden gems and local favorites off the beaten path',
    color: '#7C2D12',
    order: 68,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Food Truck',
    slug: 'food-truck',
    type: 'location',
    source: 'manual',
    description: 'Mobile food trucks and street food vendors',
    color: '#B45309',
    order: 69,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Local Brewery',
    slug: 'local-brewery',
    type: 'location',
    source: 'manual',
    description: 'Craft breweries and local beer makers',
    color: '#C2410C',
    order: 70,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Coffee Roaster',
    slug: 'coffee-roaster',
    type: 'location',
    source: 'manual',
    description: 'Local coffee roasters and specialty coffee shops',
    color: '#A16207',
    order: 71,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  }
]

const addCategories = async () => {
  try {
    console.log('🎯 Adding 21 new pizza and local place categories...')
    
    let successful = 0
    let failed = 0
    let skipped = 0

    for (const category of categories) {
      try {
        // Add meta fields
        const categoryData = {
          ...category,
          meta: {
            title: `${category.name} | Sacavia`,
            description: category.description,
            keywords: category.name.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, ', ')
          }
        }

        const response = await fetch('http://localhost:3000/api/categories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(categoryData)
        })

        if (response.ok) {
          const result = await response.json()
          console.log(`✅ Added: ${category.name} (${result.doc.id})`)
          successful++
        } else {
          const errorData = await response.json()
          if (errorData.errors && errorData.errors.some(err => err.message?.includes('duplicate key') || err.message?.includes('unique'))) {
            console.log(`⚠️  Category "${category.name}" already exists, skipping...`)
            skipped++
          } else {
            console.error(`❌ Failed to add ${category.name}:`, errorData.errors?.[0]?.message || response.statusText)
            failed++
          }
        }
      } catch (error) {
        console.error(`❌ Failed to add ${category.name}:`, error.message)
        failed++
      }
    }

    console.log(`\n🎉 Summary:`)
    console.log(`✅ Successfully added: ${successful} categories`)
    console.log(`⚠️  Skipped (already exist): ${skipped} categories`)
    console.log(`❌ Failed: ${failed} categories`)
    console.log(`📊 Total attempted: ${categories.length} categories`)

    console.log(`\n🍕 Pizza Categories Added:`)
    categories.slice(0, 5).forEach(cat => {
      console.log(`   • ${cat.name}`)
    })

    console.log(`\n🏪 Local Place Categories Added:`)
    categories.slice(5).forEach(cat => {
      console.log(`   • ${cat.name}`)
    })
    
  } catch (error) {
    console.error('❌ Script failed:', error.message)
    console.log('\n📝 Make sure:')
    console.log('  1. Your development server is running (npm run dev)')
    console.log('  2. Your database connection is working')
    console.log('  3. The categories API endpoint is available')
  }
}

// Run the script
addCategories() 