#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
  const sharp = require('sharp');
  console.log('✅ Sharp is installed');
  
  // Check Sharp version
  const sharpVersion = sharp.versions;
  console.log(`- Sharp version: ${sharpVersion.sharp || 'unknown'}`);
  console.log(`- Vips version: ${sharpVersion.vips || 'unknown'}`);
  
  // Test Sharp functionality
  try {
    const testBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    const result = sharp(testBuffer).jpeg().toBuffer();
    console.log('✅ Sharp can process images');
  } catch (sharpError) {
    console.log('❌ Sharp image processing failed:', sharpError.message);
  }
} catch (sharpError) {
  console.log('❌ Sharp is not installed or not accessible');
  console.log(`- Error: ${sharpError.message}`);
}
console.log('');

// Check file system permissions
console.log('📁 File System Check:');
const mediaDir = path.join(process.cwd(), 'media');
console.log(`- Media directory: ${mediaDir}`);

if (fs.existsSync(mediaDir)) {
  console.log('✅ Media directory exists');
  
  try {
    // Test read permissions
    const testFiles = fs.readdirSync(mediaDir);
    console.log(`✅ Media directory is readable (${testFiles.length} files)`);
    
    // Test write permissions
    const testFile = path.join(mediaDir, '.test-write');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log('✅ Media directory is writable');
  } catch (permError) {
    console.log('❌ Media directory permission error:', permError.message);
  }
} else {
  console.log('❌ Media directory does not exist');
  
  try {
    fs.mkdirSync(mediaDir, { recursive: true });
    console.log('✅ Created media directory');
  } catch (mkdirError) {
    console.log('❌ Failed to create media directory:', mkdirError.message);
  }
}
console.log('');

// Check for HEIC files
console.log('📱 HEIC Files Check:');
try {
  const files = fs.readdirSync(mediaDir);
  const heicFiles = files.filter(file => 
    file.toLowerCase().endsWith('.heic') || 
    file.toLowerCase().endsWith('.heif')
  );
  
  console.log(`- Found ${heicFiles.length} HEIC/HEIF files`);
  
  if (heicFiles.length > 0) {
    console.log('- HEIC files found:');
    heicFiles.slice(0, 5).forEach(file => {
      const filePath = path.join(mediaDir, file);
      const stats = fs.statSync(filePath);
      console.log(`  - ${file} (${stats.size} bytes)`);
    });
    
    if (heicFiles.length > 5) {
      console.log(`  - ... and ${heicFiles.length - 5} more`);
    }
  }
} catch (readError) {
  console.log('❌ Error reading media directory:', readError.message);
}
console.log('');

// Check system resources
console.log('💾 System Resources:');
try {
  const os = require('os');
  console.log(`- Total memory: ${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`);
  console.log(`- Free memory: ${Math.round(os.freemem() / 1024 / 1024 / 1024)}GB`);
  console.log(`- CPU cores: ${os.cpus().length}`);
  
  // Check disk space
  const diskUsage = execSync('df -h .', { encoding: 'utf8' });
  console.log('- Disk usage:');
  console.log(diskUsage);
} catch (resourceError) {
  console.log('❌ Error checking system resources:', resourceError.message);
}
console.log('');

// Check Node.js modules
console.log('📦 Node.js Modules Check:');
const requiredModules = ['sharp', 'payload', 'next'];
requiredModules.forEach(moduleName => {
  try {
    require.resolve(moduleName);
    console.log(`✅ ${moduleName} is available`);
  } catch (moduleError) {
    console.log(`❌ ${moduleName} is not available`);
  }
});
console.log('');

// Test HEIC conversion
console.log('🔄 HEIC Conversion Test:');
const testHeicFile = path.join(mediaDir, 'test-conversion.heic');
const testJpegFile = path.join(mediaDir, 'test-conversion.jpg');

// Create a dummy HEIC file for testing
try {
  const dummyHeicContent = Buffer.from('This is a dummy HEIC file for testing');
  fs.writeFileSync(testHeicFile, dummyHeicContent);
  console.log('✅ Created test HEIC file');
  
  // Try to convert it
  try {
    const sharp = require('sharp');
    await sharp(testHeicFile)
      .jpeg({ quality: 90 })
      .toFile(testJpegFile);
    
    if (fs.existsSync(testJpegFile)) {
      const stats = fs.statSync(testJpegFile);
      console.log(`✅ HEIC conversion test successful (${stats.size} bytes)`);
      fs.unlinkSync(testJpegFile);
    } else {
      console.log('❌ HEIC conversion test failed - output file not created');
    }
  } catch (conversionError) {
    console.log('❌ HEIC conversion test failed:', conversionError.message);
  }
  
  // Clean up test file
  fs.unlinkSync(testHeicFile);
} catch (testError) {
  console.log('❌ HEIC conversion test setup failed:', testError.message);
}
console.log('');

// Check Payload configuration
console.log('⚙️ Payload Configuration Check:');
try {
  const payloadConfig = require('../payload.config');
  console.log('✅ Payload config is accessible');
  
  if (payloadConfig.media) {
    console.log('✅ Media collection is configured');
  } else {
    console.log('⚠️ Media collection not found in config');
  }
} catch (configError) {
  console.log('❌ Payload config error:', configError.message);
}
console.log('');

// Recommendations
console.log('💡 Recommendations:');
console.log('1. If Sharp is not installed: npm install sharp');
console.log('2. If Sharp fails to load: npm rebuild sharp');
console.log('3. If file permissions fail: check directory permissions');
console.log('4. If conversion fails: check available memory and disk space');
console.log('5. For production: ensure Sharp is properly installed in production environment');
console.log('');

console.log('🔍 Diagnostic complete. Check the output above for any issues.'); 