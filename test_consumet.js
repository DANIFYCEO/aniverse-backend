const { ANIME } = require('@consumet/extensions');

(async () => {
  const gogoanime = new ANIME.Gogoanime();
  try {
    const search = await gogoanime.search('naruto');
    console.log("Search:", search.results.length);
    
    if (search.results.length > 0) {
      const info = await gogoanime.fetchAnimeInfo(search.results[0].id);
      console.log("Episodes:", info.episodes.length);
      
      const links = await gogoanime.fetchEpisodeSources(info.episodes[0].id);
      console.log("Links:", links);
    }
  } catch(e) {
    console.log("Error:", e);
  }
})();
