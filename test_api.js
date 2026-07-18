async function test() {
  const CONSUMET_INSTANCES = [
    "https://api.consumet.org",
    "https://consumet-api.vercel.app",
    "https://consumet.anime-plus.com",
    "https://api.amvstr.me",  // Another popular api
  ];

  const PROVIDERS = ["gogoanime", "zoro", "animepahe"];

  for (const base of CONSUMET_INSTANCES) {
    console.log(`\nTesting instance: ${base}`);
    for (const provider of PROVIDERS) {
      const url = `${base}/anime/${provider}/one piece?page=1`;
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        console.log(`  ${provider}: ${res.status}`);
        if (res.ok) {
          const text = await res.text();
          console.log(`  Data: ${text.substring(0, 100)}`);
        }
      } catch (e) {
        console.log(`  ${provider}: ERROR - ${e.message}`);
      }
    }
  }
}

test().catch(console.error);
