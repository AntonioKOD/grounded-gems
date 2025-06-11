#!/usr/bin/env node

/**
 * Test script for Foursquare category synchronization
 * 
 * This script tests the /api/categories/sync-foursquare endpoint
 * to ensure categories are properly fetched and saved with hierarchical structure.
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const BASE_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';

async function testCategorySync() {
  console.log('🔄 Testing Foursquare Category Sync...\n');

  try {
    console.log('Making request to sync endpoint...');
    const response = await fetch(`${BASE_URL}/api/categories/sync-foursquare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Sync completed successfully!\n');
    
    console.log('📊 Sync Results:');
    console.log(`   📦 Total categories processed: ${result.total || 0}`);
    console.log(`   ✨ New categories created: ${result.created || 0}`);
    console.log(`   🔄 Existing categories updated: ${result.updated || 0}`);
    console.log(`   ❌ Errors encountered: ${result.errors?.length || 0}`);

    if (result.errors && result.errors.length > 0) {
      console.log('\n⚠️  Errors:');
      result.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    // Test getting categories with hierarchical structure
    console.log('\n🔍 Testing category retrieval...');
    const categoriesResponse = await fetch(`${BASE_URL}/api/categories`);
    
    if (categoriesResponse.ok) {
      const categoriesData = await categoriesResponse.json();
      const categories = categoriesData.docs || [];
      
      console.log(`📋 Total categories in database: ${categories.length}`);
      
      // Count by source
      const bySource = categories.reduce((acc, cat) => {
        const source = cat.source || 'manual';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {});
      
      console.log('📈 Categories by source:');
      Object.entries(bySource).forEach(([source, count]) => {
        console.log(`   ${source}: ${count}`);
      });

      // Show hierarchical structure examples
      const parentCategories = categories.filter(cat => !cat.parent);
      const childCategories = categories.filter(cat => cat.parent);
      
      console.log(`🌳 Hierarchical structure:`);
      console.log(`   📁 Parent categories: ${parentCategories.length}`);
      console.log(`   📄 Subcategories: ${childCategories.length}`);

      if (parentCategories.length > 0) {
        console.log('\n🔍 Sample category structure:');
        const sampleParent = parentCategories[0];
        console.log(`   📁 ${sampleParent.name} (${sampleParent.source})`);
        
        const children = categories.filter(cat => 
          cat.parent && (
            (typeof cat.parent === 'string' && cat.parent === sampleParent.id) ||
            (typeof cat.parent === 'object' && cat.parent.id === sampleParent.id)
          )
        );
        
        children.slice(0, 3).forEach(child => {
          console.log(`      └── 📄 ${child.name}`);
        });
        
        if (children.length > 3) {
          console.log(`      └── ... and ${children.length - 3} more`);
        }
      }
    }

    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\n🔧 Troubleshooting tips:');
    console.error('   1. Make sure your Next.js development server is running');
    console.error('   2. Check that FOURSQUARE_API_KEY is set in your .env.local');
    console.error('   3. Verify your database connection is working');
    console.error('   4. Check the console for any additional error details');
  }
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  console.log('🏢 Foursquare Category Sync Test');
  console.log('================================\n');
  console.log('This script will test the Foursquare category synchronization.');
  console.log('Make sure your development server is running on port 3000.\n');

  const proceed = await askQuestion('Do you want to proceed? (y/n): ');
  
  if (proceed.toLowerCase() === 'y' || proceed.toLowerCase() === 'yes') {
    await testCategorySync();
  } else {
    console.log('Test cancelled.');
  }

  rl.close();
}

// Run the test
main().catch(console.error); 