const fetch = require('node-fetch');

async function searchTsukihime(title, episode) {
  const query = `${title} ${episode} 480p`;
  console.log(`Searching Tsukihime for: ${query}`);
  const res = await fetch(`https://tsukihime.org/api/search?q=${encodeURIComponent(query)}`);
  
  if (res.ok) {
    const data = await res.json();
    console.log("Tsukihime API Data:", data);
  } else {
    console.log("Tsukihime API failed:", res.status);
    const html = await res.text();
    const regex = /<script>self\.__next_f\.push\(\[1,\"(.+?)\"\]\)<\/script>/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
      if (match[1].includes("magnet:")) {
        console.log("Found magnet in Next.js chunks!");
      }
    }
    console.log("HTML length:", html.length);
  }
}

searchTsukihime('One Piece', '1100');
