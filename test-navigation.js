const puppeteer = require('puppeteer');

async function testNavigation() {
  console.log('Testing navigation hydration...');
  
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Listen for console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Listen for page errors
    page.on('pageerror', error => {
      errors.push(error.message);
    });
    
    console.log('Navigating to homepage...');
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Wait for navigation to load
    await page.waitForTimeout(2000);
    
    // Check if desktop navigation is present
    const desktopNav = await page.$('.hidden.md\\:block nav, .fixed.top-0');
    console.log('Desktop navigation found:', !!desktopNav);
    
    // Check if mobile navigation is present
    const mobileNav = await page.$('.md\\:hidden .fixed.bottom-0, .fixed.bottom-0.md\\:hidden');
    console.log('Mobile navigation found:', !!mobileNav);
    
    // Check for hydration errors
    const hydrationErrors = errors.filter(error => 
      error.includes('Hydration') || 
      error.includes('hydration') ||
      error.includes('server-rendered HTML') ||
      error.includes('client-side')
    );
    
    console.log('Total console errors:', errors.length);
    console.log('Hydration-related errors:', hydrationErrors.length);
    
    if (hydrationErrors.length > 0) {
      console.log('Hydration errors found:');
      hydrationErrors.forEach(error => console.log('  -', error));
    } else {
      console.log('✅ No hydration errors detected!');
    }
    
    // Test navigation responsiveness
    await page.setViewport({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    
    await page.setViewport({ width: 1200, height: 800 });
    await page.waitForTimeout(1000);
    
    console.log('Navigation test completed');
    
    return hydrationErrors.length === 0;
    
  } catch (error) {
    console.error('Test failed:', error.message);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testNavigation()
  .then(success => {
    console.log(success ? '✅ Navigation test passed!' : '❌ Navigation test failed!');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  }); 