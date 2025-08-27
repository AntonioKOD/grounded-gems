#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

console.log('🔧 APNs Configuration Manager');
console.log('=============================\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

class APNsManager {
  constructor() {
    this.envPath = '.env.local';
    this.config = {
      keyId: process.env.APN_KEY_ID || '',
      teamId: process.env.APN_TEAM_ID || '',
      bundleId: process.env.APN_BUNDLE_ID || 'com.sacavia.app',
      keyPath: process.env.APN_KEY_PATH || '',
      environment: process.env.NODE_ENV || 'development'
    };
  }

  async showMenu() {
    console.log('📋 Available Actions:');
    console.log('1. Show current configuration');
    console.log('2. Test APNs configuration');
    console.log('3. Update APNs settings');
    console.log('4. Validate key file');
    console.log('5. Generate environment template');
    console.log('6. Exit');
    console.log('');

    const choice = await question('Select an action (1-6): ');
    
    switch (choice.trim()) {
      case '1':
        await this.showConfiguration();
        break;
      case '2':
        await this.testConfiguration();
        break;
      case '3':
        await this.updateConfiguration();
        break;
      case '4':
        await this.validateKeyFile();
        break;
      case '5':
        await this.generateTemplate();
        break;
      case '6':
        console.log('👋 Goodbye!');
        rl.close();
        return;
      default:
        console.log('❌ Invalid choice. Please try again.\n');
        await this.showMenu();
    }
  }

  showConfiguration() {
    console.log('\n📋 Current APNs Configuration:');
    console.log('==============================');
    console.log(`Key ID: ${this.config.keyId || '❌ NOT SET'}`);
    console.log(`Team ID: ${this.config.teamId || '❌ NOT SET'}`);
    console.log(`Bundle ID: ${this.config.bundleId}`);
    console.log(`Key Path: ${this.config.keyPath || '❌ NOT SET'}`);
    console.log(`Environment: ${this.config.environment}`);
    
    if (this.config.keyPath) {
      const keyExists = fs.existsSync(this.config.keyPath);
      console.log(`Key File: ${keyExists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
      
      if (keyExists) {
        const stats = fs.statSync(this.config.keyPath);
        console.log(`File Size: ${stats.size} bytes`);
        console.log(`Permissions: ${stats.mode.toString(8)}`);
      }
    }
    
    console.log('');
    this.showMenu();
  }

  async testConfiguration() {
    console.log('\n🧪 Testing APNs Configuration...');
    console.log('================================');
    
    const errors = [];
    
    // Check environment variables
    if (!this.config.keyId) errors.push('APN_KEY_ID not set');
    if (!this.config.teamId) errors.push('APN_TEAM_ID not set');
    if (!this.config.bundleId) errors.push('APN_BUNDLE_ID not set');
    if (!this.config.keyPath) errors.push('APN_KEY_PATH not set');
    
    // Check key file
    if (this.config.keyPath && !fs.existsSync(this.config.keyPath)) {
      errors.push(`Key file not found at: ${this.config.keyPath}`);
    }
    
    if (errors.length > 0) {
      console.log('❌ Configuration errors found:');
      errors.forEach(error => console.log(`   - ${error}`));
    } else {
      console.log('✅ All configuration checks passed!');
      
      // Try to read the key file
      try {
        const keyContent = fs.readFileSync(this.config.keyPath, 'utf8');
        if (keyContent.includes('-----BEGIN PRIVATE KEY-----')) {
          console.log('✅ Key file format appears correct');
        } else {
          console.log('⚠️ Key file format may be incorrect');
        }
      } catch (error) {
        console.log(`❌ Error reading key file: ${error.message}`);
      }
    }
    
    console.log('');
    this.showMenu();
  }

  async updateConfiguration() {
    console.log('\n⚙️ Update APNs Configuration');
    console.log('============================');
    
    const newConfig = { ...this.config };
    
    console.log('Enter new values (press Enter to keep current value):\n');
    
    newConfig.keyId = await question(`Key ID (${this.config.keyId || 'not set'}): `) || this.config.keyId;
    newConfig.teamId = await question(`Team ID (${this.config.teamId || 'not set'}): `) || this.config.teamId;
    newConfig.bundleId = await question(`Bundle ID (${this.config.bundleId}): `) || this.config.bundleId;
    newConfig.keyPath = await question(`Key Path (${this.config.keyPath || 'not set'}): `) || this.config.keyPath;
    
    console.log('\n📋 New Configuration:');
    console.log(`Key ID: ${newConfig.keyId}`);
    console.log(`Team ID: ${newConfig.teamId}`);
    console.log(`Bundle ID: ${newConfig.bundleId}`);
    console.log(`Key Path: ${newConfig.keyPath}`);
    
    const confirm = await question('\n✅ Save this configuration? (y/n): ');
    
    if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
      await this.saveConfiguration(newConfig);
      console.log('✅ Configuration saved successfully!');
    } else {
      console.log('❌ Configuration not saved.');
    }
    
    console.log('');
    this.showMenu();
  }

  async saveConfiguration(config) {
    let envContent = '';
    
    if (fs.existsSync(this.envPath)) {
      envContent = fs.readFileSync(this.envPath, 'utf8');
    }
    
    // Remove existing APNs variables
    const lines = envContent.split('\n').filter(line => 
      !line.startsWith('APN_KEY_ID=') &&
      !line.startsWith('APN_TEAM_ID=') &&
      !line.startsWith('APN_BUNDLE_ID=') &&
      !line.startsWith('APN_KEY_PATH=')
    );
    
    // Add new APNs variables
    lines.push('');
    lines.push('# APNs Configuration for iOS Push Notifications');
    lines.push(`APN_KEY_ID=${config.keyId}`);
    lines.push(`APN_TEAM_ID=${config.teamId}`);
    lines.push(`APN_BUNDLE_ID=${config.bundleId}`);
    lines.push(`APN_KEY_PATH=${config.keyPath}`);
    
    fs.writeFileSync(this.envPath, lines.join('\n'));
  }

  async validateKeyFile() {
    console.log('\n🔍 Validating APNs Key File');
    console.log('==========================');
    
    if (!this.config.keyPath) {
      console.log('❌ APN_KEY_PATH not set');
      console.log('');
      this.showMenu();
      return;
    }
    
    if (!fs.existsSync(this.config.keyPath)) {
      console.log(`❌ Key file not found at: ${this.config.keyPath}`);
      console.log('');
      this.showMenu();
      return;
    }
    
    try {
      const keyContent = fs.readFileSync(this.config.keyPath, 'utf8');
      const stats = fs.statSync(this.config.keyPath);
      
      console.log('✅ Key file found and readable');
      console.log(`📏 File size: ${stats.size} bytes`);
      console.log(`🔐 Permissions: ${stats.mode.toString(8)}`);
      
      if (keyContent.includes('-----BEGIN PRIVATE KEY-----')) {
        console.log('✅ File format appears to be a valid private key');
      } else {
        console.log('⚠️ File format may not be a valid private key');
      }
      
      if (stats.size < 100) {
        console.log('⚠️ File seems too small for a private key');
      } else if (stats.size > 10000) {
        console.log('⚠️ File seems too large for a private key');
      } else {
        console.log('✅ File size looks appropriate');
      }
      
    } catch (error) {
      console.log(`❌ Error reading key file: ${error.message}`);
    }
    
    console.log('');
    this.showMenu();
  }

  async generateTemplate() {
    console.log('\n📝 APNs Environment Template');
    console.log('============================');
    
    const template = `# APNs Configuration for iOS Push Notifications
# Replace these values with your actual APNs configuration

# Your APNs Key ID (from Apple Developer Portal)
APN_KEY_ID=YOUR_KEY_ID_HERE

# Your Team ID (from Apple Developer Portal)
APN_TEAM_ID=YOUR_TEAM_ID_HERE

# Your App Bundle ID
APN_BUNDLE_ID=com.sacavia.app

# Path to your APNs key file (.p8)
APN_KEY_PATH=/path/to/your/AuthKey_KEYID.p8

# Optional: Retry configuration
APN_RETRY_ATTEMPTS=3
APN_RETRY_DELAY=1000
`;
    
    console.log(template);
    
    const save = await question('\n💾 Save this template to apns-template.env? (y/n): ');
    
    if (save.toLowerCase() === 'y' || save.toLowerCase() === 'yes') {
      fs.writeFileSync('apns-template.env', template);
      console.log('✅ Template saved to apns-template.env');
    }
    
    console.log('');
    this.showMenu();
  }
}

// Run the manager
async function main() {
  const manager = new APNsManager();
  await manager.showMenu();
}

main().catch(console.error);
