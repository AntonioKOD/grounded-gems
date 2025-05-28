#!/usr/bin/env node

/**
 * Test script to verify /api/users/me endpoint behavior
 * Run with: node scripts/test-auth-endpoint.js
 */

const https = require('https');

const testEndpoint = async (url) => {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Test-Script/1.0',
        'Accept': 'application/json',
      }
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          redirected: res.statusCode >= 300 && res.statusCode < 400
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
};

const main = async () => {
  console.log('🧪 Testing /api/users/me endpoint...\n');
  
  const testUrl = 'https://groundedgems.com/api/users/me';
  
  try {
    const result = await testEndpoint(testUrl);
    
    console.log(`📊 Results for ${testUrl}:`);
    console.log(`   Status Code: ${result.statusCode}`);
    console.log(`   Redirected: ${result.redirected ? '❌ YES' : '✅ NO'}`);
    
    if (result.redirected) {
      console.log(`   Location: ${result.headers.location || 'Not specified'}`);
      console.log('\n❌ ISSUE: Endpoint is still being redirected!');
      console.log('   This means middleware is still intercepting the request.');
    } else if (result.statusCode === 401) {
      console.log('\n✅ SUCCESS: Endpoint returns 401 (expected for unauthenticated request)');
      console.log('   This means middleware is NOT intercepting the request.');
    } else if (result.statusCode === 200) {
      console.log('\n✅ SUCCESS: Endpoint returns 200 (user is authenticated)');
    } else {
      console.log(`\n⚠️  UNEXPECTED: Status code ${result.statusCode}`);
      console.log(`   Body: ${result.body.substring(0, 200)}...`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

main(); 