const torrentStream = require('torrent-stream');
const ffmpeg = require('fluent-ffmpeg');
const { parseStringPromise } = require('xml2js');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { v4: uuidv4 } = require('uuid');

const activeStreams = new Map();

// Ensure temp directory exists
const TEMP_DIR = path.join(__dirname, 'temp_hls');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Helper to search Nyaa for highly seeded episodes with fallback to AnimeTosho
async function searchNyaa(title, episode) {
  const episodeStr = String(episode).padStart(2, '0');
  
  const queries = [
    `[SubsPlease] ${title} - ${episodeStr} (1080p)`,
    `[Erai-raws] ${title} - ${episodeStr} [1080p]`,
    `[SubsPlease] ${title} - ${episodeStr} (720p)`,
    `[Erai-raws] ${title} - ${episodeStr} [720p]`,
    `${title} - ${episodeStr} 1080p`,
    `${title} - ${episodeStr} 720p`,
    `${title} - ${episodeStr}`,
    `${title} ${episodeStr}`,
  ];

  for (const q of queries) {
    const nyaaUrl = `https://nyaa.si/?q=${encodeURIComponent(q)}&f=0&c=1_2&s=seeders&o=desc`;
    console.log("Searching Nyaa:", nyaaUrl);
    try {
      const res = await fetch(nyaaUrl, { signal: AbortSignal.timeout(6000) });
      const html = await res.text();
      
      const match = html.match(/\/download\/(\d+)\.torrent/);
      if (match) {
        const torrentUrl = `https://nyaa.si/download/${match[1]}.torrent`;
        console.log("Found best seeded torrent on Nyaa:", torrentUrl);
        return torrentUrl;
      }
    } catch (e) {
      console.warn(`Nyaa search failed/timeout for "${q}"`);
    }
  }
  return null;
}

async function startStream(title, episode) {
  let torrentUrl = await searchNyaa(title, episode);
  if (!torrentUrl) throw new Error("No torrent found on Nyaa");

  const streamId = uuidv4();
  const outputDir = path.join(TEMP_DIR, streamId);
  fs.mkdirSync(outputDir, { recursive: true });

  return new Promise(async (resolve, reject) => {
    try {
      console.log("Fetching torrent file:", torrentUrl);
      const torrentRes = await fetch(torrentUrl, { signal: AbortSignal.timeout(15000) });
      if (!torrentRes.ok) throw new Error(`Torrent fetch failed: ${torrentRes.status}`);
      
      const torrentBuffer = Buffer.from(await torrentRes.arrayBuffer());
      console.log("Starting torrent-stream engine...");
      
      const engine = torrentStream(torrentBuffer, {
        tmp: TEMP_DIR,
        path: path.join(TEMP_DIR, `data_${streamId}`),
        trackers: [
          'udp://tracker.opentrackr.org:1337/announce',
          'udp://open.stealth.si:80/announce',
          'udp://exodus.desync.com:6969/announce',
          'http://nyaa.tracker.wf:7777/announce'
        ]
      });

      engine.on('download', (pieceIndex) => {
        if (pieceIndex % 20 === 0) console.log(`Torrent: downloaded piece ${pieceIndex}`);
      });

      engine.on('peer', (peer) => {
        console.log(`Torrent: new peer connected`);
      });

      engine.on('ready', () => {
        // Try to find the specific episode file if it's a batch, otherwise pick largest
        const episodeStr = String(episode).padStart(2, '0');
        let file = engine.files.find(f => new RegExp(`[\\s\\-0]${episodeStr}[\\s\\[\\(v\\.]`).test(f.name));
        
        if (!file) {
           file = engine.files.reduce((a, b) => a.length > b.length ? a : b);
        }
        
        console.log(`Video file selected: ${file.name} (${(file.length / 1e6).toFixed(2)} MB)`);
        
        // Select the file so torrent-stream starts downloading it
        file.select();

        // Step 1: Create an HTTP server from torrent-stream pieces
        // This supports Range requests so FFmpeg can seek to the start
        const feedServer = http.createServer((req, res) => {
          const range = req.headers.range;
          
          if (!range) {
            res.writeHead(200, { 'Content-Length': file.length, 'Content-Type': 'video/x-matroska' });
            file.createReadStream().pipe(res);
            return;
          }
          
          const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
          const start = parseInt(startStr, 10);
          const end = endStr ? parseInt(endStr, 10) : file.length - 1;
          
          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${file.length}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': end - start + 1,
            'Content-Type': 'video/x-matroska'
          });
          file.createReadStream({ start, end }).pipe(res);
        });

        feedServer.listen(0, '0.0.0.0', () => {
          const feedPort = feedServer.address().port;
          const feedUrl = `http://localhost:${feedPort}/`;
          console.log(`Torrent feed server on port ${feedPort}`);
          
          const m3u8Path = path.join(outputDir, 'master.m3u8');

          // Step 2: FFmpeg reads from the feed server and outputs HLS segments
          // Using web-safe H.264/AAC codec in an HLS container
          const command = ffmpeg(feedUrl)
            .inputOptions([
              '-analyzeduration 10M',  // Give FFmpeg more time to analyse MKV container
              '-probesize 10M'
            ])
            .videoCodec('libx264')
            .audioCodec('aac')
            .addOptions([
              '-preset ultrafast',
              '-crf 28',
              '-vf scale=-2:480',   // 480p to save mobile data
              '-profile:v baseline',
              '-level 3.0',
              '-movflags +faststart',
              '-hls_time 6',
              '-hls_list_size 0',
              '-hls_flags independent_segments',
              `-hls_segment_filename ${path.join(outputDir, 'segment_%04d.ts')}`
            ])
            .output(m3u8Path)
            .on('start', (cmdLine) => {
              console.log('FFmpeg started:', cmdLine);
            })
            .on('progress', (progress) => {
              console.log('FFmpeg progress:', progress);
            })
            .on('stderr', (stderrLine) => {
              console.log('FFmpeg stderr:', stderrLine);
            })
            .on('error', (err, stdout, stderr) => {
              console.error('FFmpeg error:', err.message);
            })
            .on('end', () => {
              console.log('FFmpeg finished:', streamId);
            });

          command.run();

          // Step 3: Wait for the first .m3u8 file to appear before resolving
          // This ensures the stream is ready for the client
          const startTime = Date.now();
          const checkInterval = setInterval(() => {
            if (fs.existsSync(m3u8Path)) {
              clearInterval(checkInterval);
              activeStreams.set(streamId, { engine, feedServer, command, outputDir });
              console.log("✅ HLS Stream Ready:", streamId);
              resolve(streamId);
            } else if (Date.now() - startTime > 300000) {
              // 90-second timeout
              clearInterval(checkInterval);
              reject(new Error("Timed out waiting for HLS segments"));
            }
          }, 500);
        });
      });

      engine.on('error', (err) => {
        console.error("Torrent engine error:", err.message);
        reject(err);
      });

    } catch (err) {
      reject(err);
    }
  });
}

function cleanupStream(streamId) {
  const stream = activeStreams.get(streamId);
  if (stream) {
    try { stream.command.kill('SIGKILL'); } catch(e) {}
    try { stream.feedServer.close(); } catch(e) {}
    try { stream.engine.destroy(); } catch(e) {}
    try { fs.rmSync(stream.outputDir, { recursive: true, force: true }); } catch(e) {}
    try { fs.rmSync(path.join(TEMP_DIR, `data_${streamId}`), { recursive: true, force: true }); } catch(e) {}
    activeStreams.delete(streamId);
    console.log("Cleaned up stream:", streamId);
  }
}

module.exports = {
  startStream,
  cleanupStream,
  activeStreams,
  TEMP_DIR
};
