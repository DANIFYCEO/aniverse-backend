const { chromium } = require('playwright');

async function searchTsukihime(query) {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Go to the main site to pass Cloudflare
    await page.goto('https://tsukihime.org');
    await page.waitForTimeout(2000); // Wait for CF challenge to pass
    
    // Now fetch the API
    const res = await page.evaluate(async (q) => {
      const r = await fetch(`https://api.tsukihime.org/v1/search/torrents?q=${encodeURIComponent(q)}&limit=5&offset=0`);
      return r.json();
    }, query);
    
    await browser.close();

    // Look for AV1 or HEVC dual audio batch releases from Altair or similar groups
    const bestTorrent = res?.data?.find(t => t.name.includes('BD') || t.filecount > 10) || res?.data?.[0];
    if (bestTorrent) {
      console.log("Found torrent on Tsukihime:", bestTorrent.name);
      return `magnet:?xt=urn:btih:${bestTorrent.btih}`;
    }
    return null;
  } catch (err) {
    if (browser) await browser.close();
    console.error("Tsukihime scraper error:", err);
    return null;
  }
}

module.exports = { searchTsukihime };
