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
    await page.goto('https://www.wcostream.tv/naruto-episode-1-english-dubbed', { waitUntil: 'networkidle2' });
    console.log("Title:", await page.title());
    
    // Dump some HTML
    const html = await page.content();
    console.log(html.includes("iframe"));
    console.log("Search page length:", html.length);
    
  } catch(e) {
    console.log('Error:', e);
  } finally {
    await browser.close();
  }
})();
