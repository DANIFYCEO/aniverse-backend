const { ANIME } = require('@consumet/extensions');

const provider = new ANIME.AnimeUnity();

async function getStreamUrl(title, episode) {
  console.log(`Searching AnimeUnity for: ${title}`);
  const search = await provider.search(title);
  
  if (!search.results || search.results.length === 0) {
    throw new Error('Anime not found on AnimeUnity');
  }

  // Filter exact matches if possible, otherwise use first result
  let animeId = search.results[0].id;
  
  // Clean title for matching (remove special chars)
  const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const res of search.results) {
    if (res.title.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanTitle) {
      animeId = res.id;
      break;
    }
  }

  console.log(`Getting episodes for ${animeId}...`);
  const animeInfo = await provider.fetchAnimeInfo(animeId);
  
  if (!animeInfo.episodes || animeInfo.episodes.length === 0) {
    throw new Error('No episodes found');
  }

  // Find the requested episode
  const epString = String(episode);
  const ep = animeInfo.episodes.find(e => String(e.number) === epString) || animeInfo.episodes[parseInt(epString) - 1];
  
  if (!ep) {
    throw new Error(`Episode ${episode} not found`);
  }

  console.log(`Fetching sources for episode ${ep.id}...`);
  const sources = await provider.fetchEpisodeSources(ep.id);
  
  if (!sources.sources || sources.sources.length === 0) {
    throw new Error('No streaming sources found for this episode');
  }
  
  return sources.sources;
}

module.exports = { getStreamUrl };
