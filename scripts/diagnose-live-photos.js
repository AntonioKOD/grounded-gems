#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🔍 Live Photos Production Diagnostic Tool\n');

// Check environment
console.log('📋 Environment Information:');
console.log(`- Node.js version: ${process.version}`);
console.log(`- Platform: ${process.platform}`);
console.log(`- Architecture: ${process.arch}`);
console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`- Current working directory: ${process.cwd()}`);
console.log('');

// Check Sharp installation
console.log('🔧 Sharp Library Check:');
try {
  const sharp = await import('sharp');
  console.log('✅ Sharp is installed');
  
  // Check Sharp version
  const sharpVersion = sharp.default.versions;
  console.log(`- Sharp version: ${sharpVersion.sharp}`);
  console.log(`- Vips version: ${sharpVersion.vips}`);
  console.log(`- Platform: ${sharpVersion.platform}`);
  console.log(`- Architecture: ${sharpVersion.arch}`);
  
  // Test basic functionality
  console.log('\n🧪 Testing Sharp functionality:');
  const testBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  const processed = await sharp.default(testBuffer).jpeg().toBuffer();
  console.log('✅ Sharp can process images');
  console.log(`- Test image processed: ${processed.length} bytes`);
  
} catch (error) {
  console.log('❌ Sharp is not installed or not working');
  console.log(`- Error: ${error.message}`);
  
  // Try to install Sharp
  console.log('\n🔧 Attempting to install Sharp...');
  try {
    execSync('npm install sharp', { stdio: 'inherit' });
    console.log('✅ Sharp installation completed');
  } catch (installError) {
    console.log('❌ Sharp installation failed');
    console.log(`- Error: ${installError.message}`);
  }
}

// Check file system permissions
console.log('\n📁 File System Check:');
const mediaDir = path.join(process.cwd(), 'media');
console.log(`- Media directory: ${mediaDir}`);

if (fs.existsSync(mediaDir)) {
  console.log('✅ Media directory exists');
  
  try {
    // Test write permissions
    const testFile = path.join(mediaDir, '.test-write');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log('✅ Media directory is writable');
  } catch (error) {
    console.log('❌ Media directory is not writable');
    console.log(`- Error: ${error.message}`);
  }
} else {
  console.log('❌ Media directory does not exist');
  try {
    fs.mkdirSync(mediaDir, { recursive: true });
    console.log('✅ Media directory created');
  } catch (error) {
    console.log('❌ Failed to create media directory');
    console.log(`- Error: ${error.message}`);
  }
}

// Check available disk space
console.log('\n💾 Disk Space Check:');
try {
  const stats = fs.statfsSync(process.cwd());
  const freeSpaceGB = (stats.bavail * stats.bsize) / (1024 * 1024 * 1024);
  console.log(`- Available disk space: ${freeSpaceGB.toFixed(2)} GB`);
  
  if (freeSpaceGB < 1) {
    console.log('⚠️ Low disk space - may cause upload issues');
  } else {
    console.log('✅ Sufficient disk space available');
  }
} catch (error) {
  console.log('❌ Could not check disk space');
  console.log(`- Error: ${error.message}`);
}

// Check memory usage
console.log('\n🧠 Memory Check:');
const memUsage = process.memoryUsage();
console.log(`- RSS (Resident Set Size): ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`);
console.log(`- Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
console.log(`- Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);

// Check Node.js configuration
console.log('\n⚙️ Node.js Configuration:');
console.log(`- Max old space size: ${process.env.NODE_OPTIONS || 'not set'}`);
console.log(`- UV_THREADPOOL_SIZE: ${process.env.UV_THREADPOOL_SIZE || 'default (4)'}`);

// Recommendations
console.log('\n💡 Recommendations:');
console.log('1. Ensure Sharp is properly installed: npm install sharp');
console.log('2. Set appropriate file size limits in your server configuration');
console.log('3. Configure proper memory limits for image processing');
console.log('4. Monitor disk space for media uploads');
console.log('5. Set UV_THREADPOOL_SIZE=8 for better concurrent processing');

// Production-specific checks
if (process.env.NODE_ENV === 'production') {
  console.log('\n🚀 Production-Specific Checks:');
  
  // Check if running in container
  if (fs.existsSync('/.dockerenv')) {
    console.log('✅ Running in Docker container');
  }
  
  // Check for common production issues
  const commonIssues = [];
  
  if (!process.env.NODE_OPTIONS) {
    commonIssues.push('Consider setting NODE_OPTIONS="--max-old-space-size=2048"');
  }
  
  if (!process.env.UV_THREADPOOL_SIZE) {
    commonIssues.push('Consider setting UV_THREADPOOL_SIZE=8');
  }
  
  if (commonIssues.length > 0) {
    console.log('⚠️ Production optimizations:');
    commonIssues.forEach(issue => console.log(`- ${issue}`));
  } else {
    console.log('✅ Production configuration looks good');
  }
}

console.log('\n✅ Diagnostic complete!');
console.log('\n📱 To test Live Photo uploads:');
console.log('1. Navigate to /test-mobile-upload');
console.log('2. Select Live Photos from your device');
console.log('3. Watch the detailed logs for conversion progress');
console.log('4. Check for any errors in the processing log'); 