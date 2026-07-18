const express = require('express');
const cors = require('cors');
const { fetchStreamFromRapidAPI } = require('./rapidapi-service');

const app = express();
const port = 3000;

app.use(cors());



app.get('/api/watch', async (req, res) => {
  const { title, episode } = req.query;
  
  if (!title || !episode) {
    return res.status(400).json({ error: 'Missing title or episode query parameters' });
  }

  try {
    const streamLinks = await fetchStreamFromRapidAPI(title, episode);
    
    if (!streamLinks || streamLinks.length === 0) {
      return res.status(404).json({ error: 'No stream links found' });
    }
    
    res.json({ sources: streamLinks });
  } catch (error) {
    console.error('Error fetching stream:', error);
    res.status(500).json({ error: error.message });
  }
});

const { startStream, TEMP_DIR } = require('./torrent-engine');
const expressStatic = express.static;

// HLS static file server
app.use('/hls', expressStatic(TEMP_DIR));

app.get('/api/stream/torrent', async (req, res) => {
  const { title, episode } = req.query;
  if (!title || !episode) return res.status(400).json({ error: 'Missing title or episode' });

  try {
    const streamId = await startStream(title, episode);
    
    // We get the local IP so the mobile app can reach the HLS server on the host machine.
    // However, it's safer to just return a relative path or expect the client to use the same host.
    // The mobile app will prefix this with the BACKEND_URL (http://10.0.2.2:3000)
    res.json({
      streamId: streamId,
      url: `/hls/${streamId}/master.m3u8`
    });
  } catch (err) {
    console.error('Torrent stream error:', err);
    res.status(500).json({ error: err.message });
  }
});

const { scrapeWCOFlix } = require('./wcoflix-scraper');

app.get('/api/download-links', async (req, res) => {
  const { title, episode } = req.query;
  if (!title || !episode) {
    return res.status(400).json({ error: 'Missing title or episode' });
  }
  try {
    const links = await scrapeWCOFlix(title, episode);
    res.json({ sources: links });
  } catch (error) {
    console.error('Error fetching download links:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Aniverse Backend listening on port ${port}`);
});
