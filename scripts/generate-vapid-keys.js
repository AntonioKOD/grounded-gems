#!/usr/bin/env node

import webpush from 'web-push'

console.log('🔑 Generating VAPID keys for push notifications...\n')

const vapidKeys = webpush.generateVAPIDKeys()

console.log('✅ VAPID keys generated successfully!\n')
console.log('📋 Add these to your environment variables:\n')
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`)
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}\n`)
console.log('🔒 Keep the private key secure and never commit it to version control!')
console.log('🌐 The public key can be safely shared and used in client-side code.\n')
console.log('📝 For development, you can use these keys directly.')
console.log('🚀 For production, generate new keys and store them securely.')
