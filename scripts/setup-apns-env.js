#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import readline from 'readline'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('🔧 APNs Environment Setup Script')
console.log('================================\n')

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local')
const envExists = fs.existsSync(envPath)

if (!envExists) {
  console.log('❌ .env.local file not found. Creating it...')
  fs.writeFileSync(envPath, '')
}

// Read current .env.local
let envContent = envExists ? fs.readFileSync(envPath, 'utf8') : ''

// Check if APNs variables already exist
const hasApnKeyId = envContent.includes('APN_KEY_ID=')
const hasApnTeamId = envContent.includes('APN_TEAM_ID=')
const hasApnKeyPath = envContent.includes('APN_KEY_PATH=')

console.log('📋 Current APNs Configuration:')
console.log(`   APN_KEY_ID: ${hasApnKeyId ? '✅ Set' : '❌ Missing'}`)
console.log(`   APN_TEAM_ID: ${hasApnTeamId ? '✅ Set' : '❌ Missing'}`)
console.log(`   APN_KEY_PATH: ${hasApnKeyPath ? '✅ Set' : '❌ Missing'}`)
console.log('')

if (!hasApnKeyId || !hasApnTeamId || !hasApnKeyPath) {
  console.log('🔧 Please provide the following information:')
  console.log('')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  const question = (query) => new Promise((resolve) => rl.question(query, resolve))

  const setupApns = async () => {
    try {
      console.log('📝 Enter your APNs configuration:')
      console.log('')
      
      const keyId = await question('🔑 APN Key ID (from Apple Developer Portal): ')
      const teamId = await question('👥 Team ID (from Apple Developer Portal): ')
      const keyPath = await question('📁 Path to your .p8 file (e.g., /path/to/AuthKey_KEYID.p8): ')
      
      console.log('')
      console.log('📋 Configuration Summary:')
      console.log(`   Key ID: ${keyId}`)
      console.log(`   Team ID: ${teamId}`)
      console.log(`   Key Path: ${keyPath}`)
      console.log('')
      
      const confirm = await question('✅ Is this correct? (y/n): ')
      
      if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
        // Add APNs variables to .env.local
        const apnsVars = `
# APNs Configuration for iOS Push Notifications
APN_KEY_ID=${keyId}
APN_TEAM_ID=${teamId}
APN_KEY_PATH=${keyPath}
APN_BUNDLE_ID=com.sacavia.app
`
        
        // Append to .env.local
        fs.appendFileSync(envPath, apnsVars)
        
        console.log('✅ APNs environment variables added to .env.local')
        console.log('')
        console.log('📋 Next Steps:')
        console.log('1. Upload your .p8 file to the server')
        console.log('2. Set proper permissions: chmod 600 /path/to/AuthKey_KEYID.p8')
        console.log('3. Restart your development server')
        console.log('4. Test push notifications in the iOS app')
        
      } else {
        console.log('❌ Setup cancelled')
      }
      
    } catch (error) {
      console.error('❌ Error during setup:', error)
    } finally {
      rl.close()
    }
  }

  setupApns()
  
} else {
  console.log('✅ APNs environment variables are already configured!')
  console.log('')
  console.log('📋 To test:')
  console.log('1. Ensure your .p8 file is uploaded to the server')
  console.log('2. Restart your development server')
  console.log('3. Test push notifications in the iOS app')
}
