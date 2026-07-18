const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function getWcoLinksForSlug(page, slug) {
  let videoLinks = [];
  
  // Intercept network requests
  const requestHandler = request => {
    const url = request.url();
    // Usually wcostream uses .mp4 or .m3u8 for video segments, or sometimes .flv
    // It's typically a direct cdn link like cizgi.com/... .mp4
    if ((url.includes('.mp4') || url.includes('.m3u8')) && !url.includes('blank.mp4')) {
      if (!videoLinks.includes(url)) {
        videoLinks.push(url);
      }
    }
  };
  
  page.on('request', requestHandler);
  
  try {
    const url = `https://www.wcostream.tv/${slug}`;
    console.log(`Navigating to ${url}`);
    
    // We use domcontentloaded because WCO has a lot of trackers that prevent networkidle
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait for the video player iframes to load and make requests
    await new Promise(r => setTimeout(r, 15000));
    
  } catch (err) {
    console.error(`Error navigating to ${slug}:`, err.message);
  } finally {
    page.off('request', requestHandler);
  }
  
  return videoLinks;
}

async function scrapeWCOFlix(title, episode) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Clean title for URL
    const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    
    let slug = `${cleanTitle}-episode-${episode}-english-dubbed`;
    let links = await getWcoLinksForSlug(page, slug);
    
    if (links.length === 0) {
      console.log("No dubbed links found, trying subbed...");
      slug = `${cleanTitle}-episode-${episode}-english-subbed`;
      links = await getWcoLinksForSlug(page, slug);
    }
    
    // Process and normalize the extracted links
    // WCO typically returns multiple MP4 links for SD and HD.
    // If we only get one, we'll assume it's 720p. If two, 480p and 720p.
    const sources = [];
    
    // Sort links by length or just assume order (often SD is first, HD is second)
    const mp4Links = links.filter(l => l.includes('.mp4'));
    
    if (mp4Links.length === 1) {
      sources.push({ quality: '720', url: mp4Links[0], isHls: false });
    } else if (mp4Links.length >= 2) {
      sources.push({ quality: '480', url: mp4Links[0], isHls: false });
      sources.push({ quality: '720', url: mp4Links[1], isHls: false });
    } else if (links.length > 0) {
      // Fallback for m3u8
      sources.push({ quality: '720', url: links[0], isHls: true });
    }
    
    return sources;
    
  } finally {
    await browser.close();
  }
}

module.exports = { scrapeWCOFlix };
