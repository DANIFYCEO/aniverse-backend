const { ANIME } = require('@consumet/extensions');
const provider = new ANIME.AnimeUnity();

async function test(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Attempt ${i+1}...`);
      const search = await provider.search('One Piece');
      const id = search.results[0].id;
      const info = await provider.fetchAnimeInfo(id);
      const ep = info.episodes[0];
      const sources = await provider.fetchEpisodeSources(ep.id);
      console.log('Success!', sources.sources.map(s => s.url).slice(0, 2));
      return;
    } catch (e) {
      console.log('Failed:', e.message);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}
test();
