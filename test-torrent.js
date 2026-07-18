async function searchNyaa(title, episode) {
  const padEp = String(episode).padStart(2, '0');

  // Strategy 1: SubsPlease (the main weekly release group, covers most seasonal anime)
  const url1 = `https://nyaa.si/?f=0&c=1_2&q=${encodeURIComponent('[SubsPlease] ' + title + ' - ' + padEp)}&page=rss`;
  // Strategy 2: Erai-raws (another big group)
  const url2 = `https://nyaa.si/?f=0&c=1_2&q=${encodeURIComponent('[Erai-raws] ' + title + ' - ' + padEp)}&page=rss`;
  // Strategy 3: HorribleSubs (old group, good for older anime)
  const url3 = `https://nyaa.si/?f=0&c=1_2&q=${encodeURIComponent('[HorribleSubs] ' + title + ' - ' + padEp)}&page=rss`;
  // Strategy 4: Broad search without group
  const url4 = `https://nyaa.si/?f=0&c=1_2&q=${encodeURIComponent(title + ' ' + padEp + ' 1080p')}&page=rss`;
  
  for (const [label, url] of [['SubsPlease', url1], ['Erai-raws', url2], ['HorribleSubs', url3], ['Broad 1080p', url4]]) {
    const res = await globalThis.fetch(url);
    const xml = await res.text();
    const items = xml.split('<item>').slice(1);
    
    const results = items.map(item => {
      const titleMatch = item.match(/<title>([^<]+)<\/title>/);
      const linkMatch = item.match(/<nyaa:magnetLink>([^<]+)<\/nyaa:magnetLink>/);
      const seedMatch = item.match(/<nyaa:seeders>(\d+)<\/nyaa:seeders>/);
      const sizeMatch = item.match(/<nyaa:size>([^<]+)<\/nyaa:size>/);
      const size = sizeMatch ? sizeMatch[1] : '';
      // Filter: skip batches over 2GB (likely multi-episode)
      const isLikelySingle = !size.includes('GiB') || parseFloat(size) < 2.0;
      return {
        title: titleMatch ? titleMatch[1] : '',
        magnet: linkMatch ? linkMatch[1] : null,
        seeders: seedMatch ? parseInt(seedMatch[1]) : 0,
        size
      };
    }).filter(r => r.magnet && r.seeders > 0 && (!r.size.includes('GiB') || parseFloat(r.size) < 2.5));

    results.sort((a,b) => b.seeders - a.seeders);
    console.log(`[${label}] ${results.length} results`);
    results.slice(0,2).forEach(r => console.log(`  ✓ [${r.seeders} seeds | ${r.size}] ${r.title.substring(0,70)}`));
    
    if (results.length > 0) return results;
  }
  return [];
}

// Test for My Hero Academia season 1 episode 1
console.log('=== MHA S1E1 ===');
searchNyaa('Boku no Hero Academia', 1).then(results => {
  if (results.length === 0) {
    console.log('\nNo individual episode found - most common for older anime.');
    console.log('For anime before 2016, HorribleSubs is the main source.');
    console.log('Try searching the Romaji title on Nyaa browser to see what groups uploaded it.');
    
    // For completeness, check what's actually there for old anime
    return globalThis.fetch('https://nyaa.si/?f=0&c=1_2&q=boku+no+hero+academia+01&page=rss').then(r=>r.text()).then(xml => {
      const items = xml.split('<item>').slice(1).slice(0,8);
      console.log('\nAll results for "boku no hero academia 01":');
      items.forEach(item => {
        const t = item.match(/<title>([^<]+)<\/title>/);
        const s = item.match(/<nyaa:seeders>(\d+)<\/nyaa:seeders>/);
        const sz = item.match(/<nyaa:size>([^<]+)<\/nyaa:size>/);
        if (t) console.log(`  [${s?.[1]||0} seeds | ${sz?.[1]}] ${t[1].substring(0,70)}`);
      });
    });
  }
}).catch(console.error);
