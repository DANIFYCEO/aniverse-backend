const { ANIME } = require('@consumet/extensions');

(async () => {
  try {
    const pahe = new ANIME.AnimePahe();
    const search = await pahe.search('naruto');
    console.log("Pahe Search:", search.results[0].title);
    
    if (search.results.length > 0) {
      const info = await pahe.fetchAnimeInfo(search.results[0].id);
      console.log("Episodes:", info.episodes.length);
      
      const links = await pahe.fetchEpisodeSources(info.episodes[0].id);
      console.log("Links:", links);
    }
  } catch(e) {
    console.log("Pahe Error:", e);
  }
  
  try {
    const hianime = new ANIME.Hianime();
    const search2 = await hianime.search('naruto');
    console.log("Hianime Search:", search2.results[0].title);
    
    if (search2.results.length > 0) {
      const info = await hianime.fetchAnimeInfo(search2.results[0].id);
      console.log("Episodes:", info.episodes.length);
      
      const links = await hianime.fetchEpisodeSources(info.episodes[0].id);
      console.log("Links:", links);
    }
  } catch(e) {
    console.log("Hianime Error:", e);
  }
})();
