#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Production Live Photos Fix Script\n');

// Configuration
const MEDIA_DIR = path.join(process.cwd(), 'media');
const MAX_RETRIES = 3;

// Helper function to run command with error handling
const runCommand = (command, description) => {
  try {
    console.log(`🔄 ${description}...`);
    const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    console.log(`✅ ${description} completed`);
    return result;
  } catch (error) {
    console.log(`❌ ${description} failed: ${error.message}`);
    return null;
  }
};

// Helper function to check if file exists and is readable
const checkFile = (filePath, description) => {
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`✅ ${description}: ${filePath} (${stats.size} bytes)`);
      return true;
    } else {
      console.log(`❌ ${description}: ${filePath} does not exist`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${description}: ${filePath} - ${error.message}`);
    return false;
  }
};

// Step 1: Environment Check
console.log('📋 Step 1: Environment Check');
console.log(`- Node.js version: ${process.version}`);
console.log(`- Platform: ${process.platform}`);
console.log(`- Architecture: ${process.arch}`);
console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`- Current directory: ${process.cwd()}`);
console.log(`- Media directory: ${MEDIA_DIR}`);
console.log('');

// Step 2: Check Sharp Installation
console.log('🔧 Step 2: Sharp Library Check');
let sharpAvailable = false;

try {
  const sharp = require('sharp');
  const versions = sharp.versions;
  console.log(`✅ Sharp is installed`);
  console.log(`- Sharp version: ${versions.sharp || 'unknown'}`);
  console.log(`- Vips version: ${versions.vips || 'unknown'}`);
  sharpAvailable = true;
} catch (error) {
  console.log(`❌ Sharp is not available: ${error.message}`);
  
  // Try to fix Sharp installation
  console.log('🔄 Attempting to fix Sharp installation...');
  
  // Try reinstalling Sharp
  runCommand('npm uninstall sharp', 'Uninstalling Sharp');
  runCommand('npm install sharp', 'Installing Sharp');
  
  // Try rebuilding Sharp
  runCommand('npm rebuild sharp', 'Rebuilding Sharp');
  
  // Check if Sharp is now available
  try {
    const sharp = require('sharp');
    console.log('✅ Sharp is now available after reinstallation');
    sharpAvailable = true;
  } catch (reinstallError) {
    console.log(`❌ Sharp still not available after reinstallation: ${reinstallError.message}`);
  }
}
console.log('');

// Step 3: File System Check
console.log('📁 Step 3: File System Check');

// Check if media directory exists
if (!fs.existsSync(MEDIA_DIR)) {
  console.log('📁 Creating media directory...');
  try {
    fs.mkdirSync(MEDIA_DIR, { recursive: true });
    console.log('✅ Media directory created');
  } catch (error) {
    console.log(`❌ Failed to create media directory: ${error.message}`);
  }
}

// Check permissions
try {
  const testFile = path.join(MEDIA_DIR, '.test-permissions');
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
  console.log('✅ Media directory is writable');
} catch (error) {
  console.log(`❌ Media directory permission error: ${error.message}`);
  
  // Try to fix permissions
  console.log('🔄 Attempting to fix permissions...');
  runCommand(`chmod -R 755 ${MEDIA_DIR}`, 'Setting directory permissions');
  runCommand(`chown -R $USER:$USER ${MEDIA_DIR}`, 'Setting directory ownership');
}
console.log('');

// Step 4: Check for Failed Conversions
console.log('📱 Step 4: Checking for Failed Live Photo Conversions');

try {
  const files = fs.readdirSync(MEDIA_DIR);
  const heicFiles = files.filter(file => 
    file.toLowerCase().endsWith('.heic') || 
    file.toLowerCase().endsWith('.heif')
  );
  
  console.log(`Found ${heicFiles.length} HEIC/HEIF files`);
  
  if (heicFiles.length > 0) {
    console.log('🔄 Attempting to convert failed HEIC files...');
    
    for (const heicFile of heicFiles.slice(0, 5)) { // Limit to first 5 files
      const heicPath = path.join(MEDIA_DIR, heicFile);
      const baseName = path.basename(heicFile, path.extname(heicFile));
      const jpegPath = path.join(MEDIA_DIR, `${baseName}_converted.jpg`);
      
      console.log(`Converting ${heicFile}...`);
      
      if (sharpAvailable) {
        try {
          const sharp = require('sharp');
          await sharp(heicPath)
            .jpeg({ quality: 90, progressive: true, force: true })
            .toFile(jpegPath);
          
          if (fs.existsSync(jpegPath)) {
            const stats = fs.statSync(jpegPath);
            console.log(`✅ Converted ${heicFile} -> ${path.basename(jpegPath)} (${stats.size} bytes)`);
            
            // Optionally remove original HEIC file
            // fs.unlinkSync(heicPath);
            // console.log(`🗑️ Removed original ${heicFile}`);
          } else {
            console.log(`❌ Conversion failed for ${heicFile} - output file not created`);
          }
        } catch (conversionError) {
          console.log(`❌ Conversion failed for ${heicFile}: ${conversionError.message}`);
        }
      } else {
        console.log(`⚠️ Skipping ${heicFile} - Sharp not available`);
      }
    }
  }
} catch (error) {
  console.log(`❌ Error checking HEIC files: ${error.message}`);
}
console.log('');

// Step 5: System Resources Check
console.log('💾 Step 5: System Resources Check');

try {
  const os = require('os');
  const totalMem = Math.round(os.totalmem() / 1024 / 1024 / 1024);
  const freeMem = Math.round(os.freemem() / 1024 / 1024 / 1024);
  const usedMem = totalMem - freeMem;
  
  console.log(`- Total memory: ${totalMem}GB`);
  console.log(`- Used memory: ${usedMem}GB`);
  console.log(`- Free memory: ${freeMem}GB`);
  console.log(`- Memory usage: ${Math.round((usedMem / totalMem) * 100)}%`);
  console.log(`- CPU cores: ${os.cpus().length}`);
  
  if (freeMem < 1) {
    console.log('⚠️ Warning: Less than 1GB free memory available');
  }
  
  // Check disk space
  try {
    const diskUsage = execSync('df -h .', { encoding: 'utf8' });
    console.log('- Disk usage:');
    console.log(diskUsage);
  } catch (diskError) {
    console.log(`❌ Could not check disk usage: ${diskError.message}`);
  }
} catch (error) {
  console.log(`❌ Error checking system resources: ${error.message}`);
}
console.log('');

// Step 6: Test HEIC Conversion
console.log('🔄 Step 6: Testing HEIC Conversion');

if (sharpAvailable) {
  const testHeicFile = path.join(MEDIA_DIR, 'test-conversion.heic');
  const testJpegFile = path.join(MEDIA_DIR, 'test-conversion.jpg');
  
  try {
    // Create a dummy HEIC file for testing
    const dummyContent = Buffer.from('This is a dummy HEIC file for testing conversion');
    fs.writeFileSync(testHeicFile, dummyContent);
    console.log('✅ Created test HEIC file');
    
    // Try to convert it
    const sharp = require('sharp');
    await sharp(testHeicFile)
      .jpeg({ quality: 90, progressive: true, force: true })
      .toFile(testJpegFile);
    
    if (fs.existsSync(testJpegFile)) {
      const stats = fs.statSync(testJpegFile);
      console.log(`✅ HEIC conversion test successful (${stats.size} bytes)`);
      fs.unlinkSync(testJpegFile);
    } else {
      console.log('❌ HEIC conversion test failed - output file not created');
    }
    
    // Clean up test file
    fs.unlinkSync(testHeicFile);
  } catch (testError) {
    console.log(`❌ HEIC conversion test failed: ${testError.message}`);
    
    // Clean up test file if it exists
    if (fs.existsSync(testHeicFile)) {
      fs.unlinkSync(testHeicFile);
    }
  }
} else {
  console.log('⚠️ Skipping HEIC conversion test - Sharp not available');
}
console.log('');

// Step 7: Recommendations
console.log('💡 Step 7: Recommendations');

if (!sharpAvailable) {
  console.log('❌ CRITICAL: Sharp library is not available');
  console.log('   - Run: npm install sharp');
  console.log('   - Run: npm rebuild sharp');
  console.log('   - For Docker: npm install --platform=linux --arch=x64 sharp');
}

console.log('📋 Next Steps:');
console.log('1. Deploy the updated Media collection with enhanced error handling');
console.log('2. Deploy the updated post creation API with fixed media assignment');
console.log('3. Restart your application');
console.log('4. Test with a single Live Photo first');
console.log('5. Then test with multiple Live Photos');
console.log('6. Monitor logs for detailed error information');

console.log('\n🔧 Fix script completed. Check the output above for any issues.'); 