#!/usr/bin/env node

/**
 * Script to run event metadata generation
 * Usage: node scripts/run-event-metadata.mjs
 */

import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('🚀 Starting event metadata generation...')
console.log('📝 This will generate AI metadata for all public events')
console.log('⏱️  This may take a few minutes depending on the number of events...\n')

// Run the metadata generation script
const scriptPath = path.join(__dirname, 'generate-event-metadata.mjs')
const child = spawn('node', [scriptPath], {
  stdio: 'inherit',
  cwd: process.cwd()
})

child.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Event metadata generation completed successfully!')
    console.log('🎉 All public events now have optimized metadata for search')
  } else {
    console.log(`\n❌ Event metadata generation failed with code ${code}`)
    process.exit(code)
  }
})

child.on('error', (error) => {
  console.error('❌ Failed to start metadata generation:', error)
  process.exit(1)
})

