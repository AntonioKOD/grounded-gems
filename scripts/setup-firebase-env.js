#!/usr/bin/env node

/**
 * Firebase Environment Setup Script
 * 
 * This script helps you set up Firebase Admin SDK environment variables
 * for push notifications in your Sacavia backend.
 */

const fs = require('fs')
const path = require('path')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

async function setupFirebaseEnv() {
  console.log('🔥 Firebase Admin SDK Environment Setup')
  console.log('=====================================\n')
  
  console.log('📋 To get your Firebase service account key:')
  console.log('1. Go to https://console.firebase.google.com')
  console.log('2. Select your project')
  console.log('3. Go to Project Settings (gear icon)')
  console.log('4. Go to Service Accounts tab')
  console.log('5. Click "Generate new private key"')
  console.log('6. Download the JSON file\n')

  const serviceAccountPath = await question('📁 Path to your Firebase service account JSON file: ')
  
  if (!fs.existsSync(serviceAccountPath)) {
    console.log('❌ File not found. Please check the path and try again.')
    rl.close()
    return
  }

  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))
    
    console.log('\n✅ Service account loaded successfully')
    console.log(`📱 Project ID: ${serviceAccount.project_id}`)
    
    // Read existing .env.local file
    const envPath = path.join(process.cwd(), '.env.local')
    let envContent = ''
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8')
    }
    
    // Firebase environment variables
    const firebaseEnvVars = [
      `# Firebase Admin SDK Configuration`,
      `FIREBASE_PROJECT_ID=${serviceAccount.project_id}`,
      `FIREBASE_PRIVATE_KEY_ID=${serviceAccount.private_key_id}`,
      `FIREBASE_PRIVATE_KEY="${serviceAccount.private_key.replace(/\n/g, '\\n')}"`,
      `FIREBASE_CLIENT_EMAIL=${serviceAccount.client_email}`,
      `FIREBASE_CLIENT_ID=${serviceAccount.client_id}`,
      `FIREBASE_AUTH_URI=${serviceAccount.auth_uri}`,
      `FIREBASE_TOKEN_URI=${serviceAccount.token_uri}`,
      `FIREBASE_AUTH_PROVIDER_X509_CERT_URL=${serviceAccount.auth_provider_x509_cert_url}`,
      `FIREBASE_CLIENT_X509_CERT_URL=${serviceAccount.client_x509_cert_url}`,
      ``
    ].join('\n')
    
    // Remove existing Firebase variables if they exist
    const lines = envContent.split('\n')
    const filteredLines = lines.filter(line => !line.startsWith('FIREBASE_'))
    
    // Add new Firebase variables
    const newEnvContent = [...filteredLines, firebaseEnvVars].join('\n')
    
    // Write to .env.local
    fs.writeFileSync(envPath, newEnvContent)
    
    console.log('\n✅ Firebase environment variables added to .env.local')
    console.log('\n📋 Next steps:')
    console.log('1. Restart your development server')
    console.log('2. Test notifications from your iOS app')
    console.log('3. Check server logs for Firebase initialization')
    
    console.log('\n🔍 To test:')
    console.log('1. Start your server: npm run dev')
    console.log('2. Check logs for: "✅ Firebase Admin SDK initialized successfully"')
    console.log('3. Test notification endpoint: POST /api/mobile/notifications/test')
    
  } catch (error) {
    console.error('❌ Error processing service account file:', error.message)
  }
  
  rl.close()
}

// Handle script arguments
const args = process.argv.slice(2)

if (args.includes('--help') || args.includes('-h')) {
  console.log('🔥 Firebase Environment Setup')
  console.log('')
  console.log('Usage: node scripts/setup-firebase-env.js')
  console.log('')
  console.log('This script will help you set up Firebase Admin SDK')
  console.log('environment variables for push notifications.')
  console.log('')
  console.log('You will need your Firebase service account JSON file.')
  console.log('Get it from: https://console.firebase.google.com')
  console.log('  → Project Settings → Service Accounts → Generate new private key')
  process.exit(0)
}

setupFirebaseEnv().catch(console.error)
