const { ANIME, META } = require('@consumet/extensions');

async function test() {
  const gogo = new ANIME.Gogoanime();
  gogo.baseUrl = 'https://anitaku.pe';

  const zoro = new ANIME.Zoro();
  zoro.baseUrl = 'https://hianime.to';
  
  const tmdb = new META.TMDB();

  const providers = [gogo, zoro, tmdb];

  for (const provider of providers) {
    console.log(`\nTesting ${provider.name}...`);
    try {
      const results = await provider.search('One Piece');
      console.log(`Found ${results.results?.length} results. First ID:`, results.results?.[0]?.id);
      
      if (results.results?.length > 0) {
        const id = results.results[0].id;
        console.log(`Getting episodes for ${id}...`);
        const animeInfo = await provider.fetchAnimeInfo(id);
        
        if (animeInfo.episodes && animeInfo.episodes.length > 0) {
          const firstEp = animeInfo.episodes[0];
          console.log(`Getting stream sources for episode ${firstEp.id}...`);
          const sources = await provider.fetchEpisodeSources(firstEp.id);
          console.log(`Success! Found sources:`, sources.sources?.map(s => s.url).slice(0, 2));
        } else {
          console.log('No episodes found.');
        }
      }
    } catch (e) {
      console.error(`Error with ${provider.name}:`, e.message);
    }
  }
}

test().catch(console.error);
