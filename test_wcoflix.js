const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  try {
    console.log("Navigating to wcoflix.tv...");
    await page.goto('https://www.wcoflix.tv/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log("Title:", await page.title());
    
    // Check if it's Just a moment...
    if ((await page.title()).includes('Just a moment')) {
      console.log('Got Cloudflare. Waiting...');
      await page.waitForTimeout(10000);
      console.log("Title after wait:", await page.title());
    }
  } catch(e) {
    console.log('Error:', e);
  } finally {
    await browser.close();
  }
})();
