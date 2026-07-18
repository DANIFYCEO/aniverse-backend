const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const fs = require('fs');

chromium.use(stealth);

async function test() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  console.log('Navigating to hianime.to using Stealth...');
  try {
    await page.goto('https://hianime.to/search?keyword=one+piece', { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Wait for the cloudflare challenge to complete
    await page.waitForTimeout(15000);
    const html = await page.content();
    fs.writeFileSync('hianime_search.html', html);
    console.log(`Saved hianime_search.html (${html.length} bytes)`);
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  await browser.close();
}

test().catch(console.error);
