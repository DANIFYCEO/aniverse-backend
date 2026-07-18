const axios = require('axios');
require('dotenv').config();

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = "anime-streaming.p.rapidapi.com";

async function fetchStreamFromRapidAPI(title, episodeNumber) {
  if (!RAPIDAPI_KEY || RAPIDAPI_KEY === 'your_rapidapi_key_here') {
    throw new Error('RAPIDAPI_KEY is not configured in the backend environment.');
  }

  try {
    // 1. Search for the anime by title to get the internal ID
    console.log(`Searching RapidAPI for: ${title}`);
    const searchRes = await axios.get(`https://${RAPIDAPI_HOST}/search/${encodeURIComponent(title)}`, {
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
      }
    });

    const searchResults = searchRes.data;
    if (!searchResults || searchResults.length === 0) {
      throw new Error('Anime not found on RapidAPI');
    }

    const animeId = searchResults[0].id; // Assuming the API returns an array with 'id'
    console.log(`Found Anime ID: ${animeId}. Fetching episodes...`);

    // 2. Fetch the episodes list
    const epsRes = await axios.get(`https://${RAPIDAPI_HOST}/episodes/${animeId}`, {
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
      }
    });

    const episodes = epsRes.data;
    const targetEp = episodes.find(ep => ep.number === parseInt(episodeNumber) || ep.id.includes(`episode-${episodeNumber}`));
    
    if (!targetEp) {
      throw new Error(`Episode ${episodeNumber} not found for this anime.`);
    }

    console.log(`Found Episode ID: ${targetEp.id}. Fetching streaming links...`);

    // 3. Fetch streaming links
    const streamRes = await axios.get(`https://${RAPIDAPI_HOST}/watch/${targetEp.id}`, {
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
      }
    });

    // The API usually returns sources in an array
    const sources = streamRes.data.sources || streamRes.data;
    
    return sources;

  } catch (error) {
    console.error('RapidAPI Error:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = { fetchStreamFromRapidAPI };
