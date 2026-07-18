const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  let videoLinks = [];
  page.on('request', request => {
    const url = request.url();
    if (url.includes('.mp4') || url.includes('.m3u8')) {
      console.log('Intercepted:', url);
      videoLinks.push(url);
    }
  });
  
  try {
    console.log("Navigating...");
    await page.goto('https://www.wcostream.tv/naruto-episode-1-english-dubbed', { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log("Title:", await page.title());
    
    // wait for video to load or iframe
    await new Promise(r => setTimeout(r, 10000)); // 10 seconds to let iframes load and make requests
    
    console.log('Video links found:', videoLinks);
  } catch(e) {
    console.log('Error:', e);
  } finally {
    await browser.close();
  }
})();
