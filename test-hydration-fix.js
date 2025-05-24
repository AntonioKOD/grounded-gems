const puppeteer = require('puppeteer');

async function testHydrationFix() {
  console.log('🔍 Testing hydration fix...\n');
  
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Listen for console errors and warnings
    const errors = [];
    const warnings = [];
    
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') {
        errors.push(text);
      } else if (msg.type() === 'warning') {
        warnings.push(text);
      }
    });
    
    // Listen for page errors
    page.on('pageerror', error => {
      errors.push(`Page Error: ${error.message}`);
    });
    
    console.log('📄 Navigating to homepage...');
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    console.log('✅ Page loaded successfully');
    
    // Wait for navigation to be rendered
    await page.waitForSelector('nav', { timeout: 10000 });
    console.log('✅ Navigation found on page');
    
    // Check for mobile navigation
    const mobileNav = await page.$('nav.md\\:hidden');
    console.log(mobileNav ? '✅ Mobile navigation found' : '❌ Mobile navigation not found');
    
    // Check for desktop navigation  
    const desktopNav = await page.$('nav:not(.md\\:hidden)');
    console.log(desktopNav ? '✅ Desktop navigation found' : '❌ Desktop navigation not found');
    
    // Test navigation links
    const feedLink = await page.$('a[href="/feed"]');
    console.log(feedLink ? '✅ Feed link found' : '❌ Feed link not found');
    
    const eventsLink = await page.$('a[href="/events"]');
    console.log(eventsLink ? '✅ Events link found' : '❌ Events link not found');
    
    // Filter out known non-critical errors
    const criticalErrors = errors.filter(error => 
      !error.includes('Failed to find Server Action') && 
      !error.includes('MongoExpiredSessionError') &&
      !error.includes('404') &&
      !error.includes('manifest.json') &&
      !error.includes('Unauthorized')
    );
    
    const hydrationErrors = errors.filter(error => 
      error.includes('Hydration') || 
      error.includes('hydration') ||
      error.includes('server rendered HTML') ||
      error.includes('client')
    );
    
    console.log('\n📊 Test Results:');
    console.log(`Total console errors: ${errors.length}`);
    console.log(`Critical errors: ${criticalErrors.length}`);
    console.log(`Hydration-related errors: ${hydrationErrors.length}`);
    console.log(`Warnings: ${warnings.length}`);
    
    if (hydrationErrors.length > 0) {
      console.log('\n❌ Hydration errors detected:');
      hydrationErrors.forEach(error => console.log(`  - ${error}`));
    } else {
      console.log('\n✅ No hydration errors detected!');
    }
    
    if (criticalErrors.length > 0) {
      console.log('\n⚠️  Critical errors detected:');
      criticalErrors.forEach(error => console.log(`  - ${error}`));
    } else {
      console.log('✅ No critical errors detected!');
    }
    
    // Test navigation click
    console.log('\n🖱️  Testing navigation interaction...');
    if (feedLink) {
      await feedLink.click();
      await new Promise(resolve => setTimeout(resolve, 2000));
      const currentUrl = page.url();
      console.log(currentUrl.includes('/feed') ? '✅ Feed navigation works' : '❌ Feed navigation failed');
    }
    
    console.log('\n🎉 Hydration test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testHydrationFix().then(() => {
  console.log('\n✨ Test suite finished');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
}); 