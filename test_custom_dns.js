require('./custom-dns.js');
const { ANIME } = require('@consumet/extensions');

async function test() {
  const zoro = new ANIME.Hianime();

  try {
    console.log('Testing Hianime search with Custom DNS...');
    const results = await zoro.search('One Piece');
    console.log('Found results:', results.results?.length);
    if (results.results?.length > 0) {
      console.log('First result ID:', results.results[0].id);
    }
  } catch (e) {
    console.error('Hianime failed:', e.message);
  }
}

test();
