// Script to create comprehensive hierarchical categories for Grounded Gems
const createCategories = async () => {
  // Define the category structure with hierarchy
  const categoryStructure = [
    {
      name: "Food & Drink",
      slug: "food-drink",
      description: "Restaurants, cafés, bars, and culinary experiences",
      color: "#FF6B6B",
      type: "location",
      order: 1,
      isActive: true,
      isFeatured: true,
      subcategories: [
        {
          name: "Restaurants",
          slug: "restaurants",
          description: "Dining establishments and eateries",
          color: "#FF6B6B",
          type: "location",
          order: 1,
          subcategories: [
            { name: "Fine Dining", slug: "fine-dining", description: "Upscale restaurants with premium cuisine" },
            { name: "Casual Dining", slug: "casual-dining", description: "Relaxed dining atmosphere" },
            { name: "Food Trucks", slug: "food-trucks", description: "Mobile food vendors" },
            { name: "Family-Style", slug: "family-style", description: "Family-friendly restaurants" }
          ]
        },
        {
          name: "Cafés & Bakeries",
          slug: "cafes-bakeries",
          description: "Coffee shops, tea houses, and bakeries",
          color: "#D2691E",
          type: "location",
          order: 2,
          subcategories: [
            { name: "Coffee Shops", slug: "coffee-shops", description: "Coffee houses and espresso bars" },
            { name: "Tea Houses", slug: "tea-houses", description: "Specialty tea establishments" },
            { name: "Artisan Bakeries", slug: "artisan-bakeries", description: "Craft bakeries and pastry shops" }
          ]
        },
        {
          name: "Bars & Nightlife",
          slug: "bars-nightlife",
          description: "Bars, breweries, and nighttime venues",
          color: "#8A2BE2",
          type: "location",
          order: 3,
          subcategories: [
            { name: "Cocktail Bars", slug: "cocktail-bars", description: "Craft cocktail establishments" },
            { name: "Breweries & Taprooms", slug: "breweries-taprooms", description: "Local beer producers and tasting rooms" },
            { name: "Wine Bars", slug: "wine-bars", description: "Wine-focused establishments" },
            { name: "Live Music Venues", slug: "live-music-venues", description: "Bars and clubs with live entertainment" }
          ]
        }
      ]
    },
    {
      name: "Outdoors & Nature",
      slug: "outdoors-nature",
      description: "Parks, trails, beaches, and natural attractions",
      color: "#4ECDC4",
      type: "location",
      order: 2,
      isActive: true,
      isFeatured: true,
      subcategories: [
        {
          name: "Parks & Gardens",
          slug: "parks-gardens",
          description: "Public parks and garden spaces",
          color: "#228B22",
          type: "location",
          order: 1,
          subcategories: [
            { name: "Urban Parks", slug: "urban-parks", description: "City parks and green spaces" },
            { name: "Botanical Gardens", slug: "botanical-gardens", description: "Curated plant collections and gardens" },
            { name: "Rooftop Gardens", slug: "rooftop-gardens", description: "Elevated garden spaces" }
          ]
        },
        {
          name: "Trails & Lookouts",
          slug: "trails-lookouts",
          description: "Hiking trails and scenic viewpoints",
          color: "#8FBC8F",
          type: "location",
          order: 2,
          subcategories: [
            { name: "Hiking Trails", slug: "hiking-trails", description: "Walking and hiking paths" },
            { name: "Scenic Overlooks", slug: "scenic-overlooks", description: "Viewpoints and observation areas" }
          ]
        },
        {
          name: "Water & Beaches",
          slug: "water-beaches",
          description: "Waterfront areas and aquatic locations",
          color: "#00CED1",
          type: "location",
          order: 3,
          subcategories: [
            { name: "Beaches", slug: "beaches", description: "Sandy shores and swimming areas" },
            { name: "Lakesides", slug: "lakesides", description: "Lake shores and water features" },
            { name: "Waterfront Boardwalks", slug: "waterfront-boardwalks", description: "Walkways along water bodies" }
          ]
        }
      ]
    },
    {
      name: "Arts & Culture",
      slug: "arts-culture",
      description: "Museums, galleries, and cultural attractions",
      color: "#845EC2",
      type: "location",
      order: 3,
      isActive: true,
      isFeatured: true,
      subcategories: [
        {
          name: "Museums & Galleries",
          slug: "museums-galleries",
          description: "Art and cultural exhibition spaces",
          color: "#9370DB",
          type: "location",
          order: 1,
          subcategories: [
            { name: "Art Museums", slug: "art-museums", description: "Fine arts and contemporary art museums" },
            { name: "History Museums", slug: "history-museums", description: "Historical exhibits and collections" },
            { name: "Contemporary Galleries", slug: "contemporary-galleries", description: "Modern art galleries" },
            { name: "Street Art & Murals", slug: "street-art-murals", description: "Public art and street murals" }
          ]
        },
        {
          name: "Historical Sites",
          slug: "historical-sites",
          description: "Historic landmarks and heritage locations",
          color: "#B8860B",
          type: "location",
          order: 2,
          subcategories: [
            { name: "Landmarks", slug: "landmarks", description: "Notable historical landmarks" },
            { name: "Heritage Buildings", slug: "heritage-buildings", description: "Architecturally significant buildings" }
          ]
        }
      ]
    },
    {
      name: "Shopping & Markets",
      slug: "shopping-markets",
      description: "Retail stores, markets, and shopping destinations",
      color: "#F17EB8",
      type: "location",
      order: 4,
      isActive: true,
      isFeatured: true,
      subcategories: [
        { name: "Boutiques", slug: "boutiques", description: "Unique retail shops and specialty stores", color: "#FF69B4" },
        { name: "Farmers' Markets", slug: "farmers-markets", description: "Local produce and artisan markets", color: "#32CD32" },
        { name: "Vintage & Thrift", slug: "vintage-thrift", description: "Second-hand and vintage shops", color: "#DDA0DD" },
        { name: "Artisan Shops", slug: "artisan-shops", description: "Handcrafted goods and local artisans", color: "#CD853F" }
      ]
    },
    {
      name: "Wellness & Fitness",
      slug: "wellness-fitness",
      description: "Health, wellness, and fitness facilities",
      color: "#20B2AA",
      type: "location",
      order: 5,
      isActive: true,
      isFeatured: true,
      subcategories: [
        { name: "Spas & Retreats", slug: "spas-retreats", description: "Relaxation and wellness centers", color: "#98FB98" },
        { name: "Yoga & Meditation Studios", slug: "yoga-meditation", description: "Mindfulness and yoga practices", color: "#DDA0DD" },
        { name: "Gyms & Climbing Centers", slug: "gyms-climbing", description: "Fitness facilities and climbing gyms", color: "#FF6347" }
      ]
    },
    {
      name: "Events & Experiences",
      slug: "events-experiences",
      description: "Special events, performances, and unique experiences",
      color: "#FF9A00",
      type: "event",
      order: 6,
      isActive: true,
      isFeatured: true,
      subcategories: [
        { name: "Festivals & Fairs", slug: "festivals-fairs", description: "Community festivals and seasonal fairs", color: "#FFD700" },
        { name: "Concerts & Live Performances", slug: "concerts-performances", description: "Musical and theatrical performances", color: "#FF1493" },
        { name: "Workshops & Classes", slug: "workshops-classes", description: "Educational and skill-building activities", color: "#4169E1" },
        { name: "Pop-up Events", slug: "popup-events", description: "Temporary and unique experiences", color: "#FF4500" }
      ]
    },
    {
      name: "Family & Kid-Friendly",
      slug: "family-kid-friendly",
      description: "Family-oriented attractions and activities",
      color: "#3498DB",
      type: "location",
      order: 7,
      isActive: true,
      isFeatured: true,
      subcategories: [
        { name: "Playgrounds & Parks", slug: "playgrounds-parks", description: "Children's play areas and family parks", color: "#00FF7F" },
        { name: "Zoos & Aquariums", slug: "zoos-aquariums", description: "Animal exhibits and educational centers", color: "#4682B4" },
        { name: "Planetariums & Science Centers", slug: "planetariums-science", description: "Educational science and space exhibits", color: "#6A5ACD" }
      ]
    }
  ];

  console.log('🚀 Creating comprehensive category structure...');

  const baseUrl = 'http://localhost:3000/api';
  
  // Store created category IDs for parent-child relationships
  const createdCategories = new Map();

  // First pass: Create all main categories
  for (const mainCategory of categoryStructure) {
    try {
      console.log(`\n📂 Creating main category: ${mainCategory.name}`);
      
      const response = await fetch(`${baseUrl}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: mainCategory.name,
          slug: mainCategory.slug,
          description: mainCategory.description,
          color: mainCategory.color,
          type: mainCategory.type,
          order: mainCategory.order,
          isActive: mainCategory.isActive,
          isFeatured: mainCategory.isFeatured
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Created main category: ${mainCategory.name} (ID: ${result.doc?.id})`);
        createdCategories.set(mainCategory.slug, result.doc?.id);
      } else {
        const error = await response.json();
        console.log(`❌ Failed to create ${mainCategory.name}:`, error);
      }
    } catch (error) {
      console.error(`❌ Error creating ${mainCategory.name}:`, error);
    }
  }

  // Second pass: Create subcategories with parent relationships
  for (const mainCategory of categoryStructure) {
    const parentId = createdCategories.get(mainCategory.slug);
    if (!parentId || !mainCategory.subcategories) continue;

    for (const subCategory of mainCategory.subcategories) {
      try {
        console.log(`  📁 Creating subcategory: ${subCategory.name}`);
        
        const response = await fetch(`${baseUrl}/categories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: subCategory.name,
            slug: subCategory.slug,
            description: subCategory.description,
            color: subCategory.color || mainCategory.color,
            type: subCategory.type || mainCategory.type,
            order: subCategory.order || 1,
            isActive: true,
            parent: parentId
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`    ✅ Created subcategory: ${subCategory.name} (ID: ${result.doc?.id})`);
          createdCategories.set(subCategory.slug, result.doc?.id);
        } else {
          const error = await response.json();
          console.log(`    ❌ Failed to create ${subCategory.name}:`, error);
        }
      } catch (error) {
        console.error(`    ❌ Error creating ${subCategory.name}:`, error);
      }
    }
  }

  // Third pass: Create sub-subcategories
  for (const mainCategory of categoryStructure) {
    if (!mainCategory.subcategories) continue;

    for (const subCategory of mainCategory.subcategories) {
      const parentId = createdCategories.get(subCategory.slug);
      if (!parentId || !subCategory.subcategories) continue;

      for (const subSubCategory of subCategory.subcategories) {
        try {
          console.log(`    📄 Creating sub-subcategory: ${subSubCategory.name}`);
          
          const response = await fetch(`${baseUrl}/categories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: subSubCategory.name,
              slug: subSubCategory.slug,
              description: subSubCategory.description,
              color: subSubCategory.color || subCategory.color || mainCategory.color,
              type: subSubCategory.type || subCategory.type || mainCategory.type,
              order: subSubCategory.order || 1,
              isActive: true,
              parent: parentId
            })
          });

          if (response.ok) {
            const result = await response.json();
            console.log(`      ✅ Created sub-subcategory: ${subSubCategory.name} (ID: ${result.doc?.id})`);
          } else {
            const error = await response.json();
            console.log(`      ❌ Failed to create ${subSubCategory.name}:`, error);
          }
        } catch (error) {
          console.error(`      ❌ Error creating ${subSubCategory.name}:`, error);
        }
      }
    }
  }

  console.log('\n🎉 Finished creating category structure!');
  console.log('\n📊 Summary:');
  console.log(`   • ${categoryStructure.length} main categories`);
  console.log(`   • ${categoryStructure.reduce((sum, cat) => sum + (cat.subcategories?.length || 0), 0)} subcategories`);
  console.log(`   • ${categoryStructure.reduce((sum, cat) => 
    sum + (cat.subcategories?.reduce((subSum, sub) => subSum + (sub.subcategories?.length || 0), 0) || 0), 0)} sub-subcategories`);
};

// Run the script
createCategories(); 