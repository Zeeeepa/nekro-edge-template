const { chromium } = require('playwright');

(async () => {
  console.log('🎭 Starting Playwright test...\n');
  
  // Launch browser
  console.log('1️⃣  Launching Chromium browser...');
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Test 1: Navigate to frontend
    console.log('\n2️⃣  Testing frontend at http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 10000 });
    const title = await page.title();
    console.log(`   ✅ Page loaded successfully`);
    console.log(`   📄 Title: ${title}`);

    // Check if React app mounted
    const appElement = await page.$('#root');
    if (appElement) {
      console.log(`   ✅ React app mounted (#root element found)`);
    } else {
      console.log(`   ⚠️  Warning: #root element not found`);
    }

    // Take a screenshot
    await page.screenshot({ path: 'frontend-screenshot.png', fullPage: true });
    console.log(`   📸 Screenshot saved: frontend-screenshot.png`);

    // Test 2: Test API health endpoint
    console.log('\n3️⃣  Testing API health endpoint...');
    const healthResponse = await page.evaluate(async () => {
      const response = await fetch('http://localhost:8787/v1/health');
      return {
        status: response.status,
        data: await response.json()
      };
    });
    console.log(`   ✅ API responded with status: ${healthResponse.status}`);
    console.log(`   📊 Health data:`, JSON.stringify(healthResponse.data, null, 2));

    // Test 3: Navigate to Gateway page (if exists)
    console.log('\n4️⃣  Testing navigation...');
    const links = await page.$$eval('a', anchors => 
      anchors.map(a => ({ text: a.textContent, href: a.href })).slice(0, 5)
    );
    console.log(`   🔗 Found ${links.length} links on homepage`);
    if (links.length > 0) {
      links.forEach((link, i) => {
        console.log(`      ${i+1}. ${link.text.trim()} -> ${link.href}`);
      });
    }

    // Test 4: Check console errors
    const consoleMessages = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleMessages.push(msg.text());
      }
    });
    
    await page.reload();
    await page.waitForTimeout(2000);
    
    if (consoleMessages.length > 0) {
      console.log(`\n   ⚠️  Console errors detected:`);
      consoleMessages.forEach(msg => console.log(`      - ${msg}`));
    } else {
      console.log(`\n   ✅ No console errors detected`);
    }

    // Test 5: Check responsive design
    console.log('\n5️⃣  Testing responsive design...');
    const viewports = [
      { name: 'Desktop', width: 1920, height: 1080 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Mobile', width: 375, height: 667 }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(500);
      await page.screenshot({ 
        path: `screenshot-${viewport.name.toLowerCase()}.png` 
      });
      console.log(`   📱 ${viewport.name} (${viewport.width}x${viewport.height}) - Screenshot saved`);
    }

    console.log('\n✨ All tests completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await page.screenshot({ path: 'error-screenshot.png' });
    console.log('   📸 Error screenshot saved: error-screenshot.png');
  } finally {
    await browser.close();
    console.log('🏁 Browser closed\n');
  }
})();

