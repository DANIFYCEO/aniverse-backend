const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

async function scrapeGogoanime(slug) {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    const url = `https://gogoanime3.co/${slug}`;
    console.log(`Navigating to ${url}`);
    
    // Go to the episode page
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait for the download button to appear (handles cloudflare implicitly since it waits for the selector)
    console.log('Waiting for download button...');
    const downloadBtn = await page.waitForSelector('.dowloads a, .download a, .favorites_book ul li a', { timeout: 15000 });
    
    const downloadUrl = await page.evaluate(el => el.href, downloadBtn);
    console.log(`Found download page URL: ${downloadUrl}`);
    
    // Now navigate to the download page
    const dlPage = await browser.newPage();
    await dlPage.goto(downloadUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    console.log('Extracting video links from download page...');
    await dlPage.waitForSelector('.mirror_link a', { timeout: 15000 });
    
    const links = await dlPage.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('.mirror_link a'));
      return anchors.map(a => {
        const rawText = a.textContent.replace('Download', '').trim();
        const match = rawText.match(/([0-9]{3,4})P/i);
        return {
          quality: match ? match[1] : rawText,
          rawQuality: rawText,
          url: a.href,
          isHls: a.href.includes('.m3u8')
        };
      });
    });
    
    await browser.close();
    return links;
  } catch (error) {
    console.error('Scraping failed:', error);
    await browser.close();
    throw error;
  }
}

module.exports = { scrapeGogoanime };
