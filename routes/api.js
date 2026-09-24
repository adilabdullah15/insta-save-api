/**
 * routes/api.js
 *
 * Public API:
 *   GET /api/info?url=<instagram url>      → JSON metadata {caption, author, thumbnail, type}
 *   GET /api/download?url=<instagram url>  → streams best-quality MP4 as an attachment
 *
 * Every request validates `url`: it must be an http(s) URL whose host is
 * instagram.com (or a subdomain like www.instagram.com). yt-dlp failures
 * surface as 502 {error: message}.
 */
const express = require('express');

const { getInfo, downloadStream } = require('../lib/ytdlp');

const router = express.Router();

/**
 * Validate the `url` query parameter.
 * @returns {{ok:true, value:string} | {ok:false, error:string}}
 */
function validateUrl(raw) {
  if (!raw || typeof raw !== 'string') {
    return { ok: false, error: 'Missing required query parameter: url' };
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch (_err) {
    return { ok: false, error: 'Invalid URL' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'URL must use http or https' };
  }

  const host = parsed.hostname.toLowerCase();
  if (host !== 'instagram.com' && !host.endsWith('.instagram.com')) {
    return { ok: false, error: 'URL must be an instagram.com link' };
  }

  return { ok: true, value: parsed.toString() };
}

/**
 * Sanitize a string for use as a download filename.
 * Keeps letters, numbers, dash, underscore; replaces the rest with '_'.
 */
function sanitizeFilename(name, fallback = 'instagram-video') {
  const base = (name || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return (base || fallback).slice(0, 80);
}

/**
 * GET /api/info?url=...
 * Returns metadata for an Instagram post/reel/story.
 */
router.get('/info', async (req, res) => {
  const check = validateUrl(req.query.url);
  if (!check.ok) {
    return res.status(400).json({ error: check.error });
  }

  try {
    const info = await getInfo(check.value);
    res.json(info);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

/**
 * GET /api/download?url=...
 * Streams the best-quality MP4 as a file download.
 */
router.get('/download', async (req, res) => {
  const check = validateUrl(req.query.url);
  if (!check.ok) {
    return res.status(400).json({ error: check.error });
  }

  // Fetch metadata first so the filename reflects the caption/author.
  let filename = 'instagram-video';
  try {
    const info = await getInfo(check.value);
    const seed = info.caption
      ? info.caption.slice(0, 60)
      : info.author || null;
    filename = sanitizeFilename(seed);
  } catch (err) {
    // Metadata failed: abort with 502 rather than guessing a filename,
    // since the download itself is likely to fail too.
    return res.status(502).json({ error: err.message });
  }

  const child = downloadStream(check.value);

  // Start the download headers as soon as streaming begins.
  child.stdout.once('data', () => {
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}.mp4"`
      );
    }
  });

  // If yt-dlp exits non-zero, the stream is useless — end with an error.
  let stderrBuf = '';
  child.stderr.on('data', (chunk) => {
    stderrBuf += chunk;
  });

  child.on('close', (code) => {
    if (code !== 0 && !res.headersSent) {
      const detail = stderrBuf.trim().split('\n').slice(-2).join(' ');
      res
        .status(502)
        .json({ error: detail ? `Download failed: ${detail}` : 'Download failed' });
    } else if (code !== 0) {
      // Headers already sent mid-stream: best we can do is terminate the response.
      res.destroy();
    }
  });

  child.on('error', (err) => {
    if (!res.headersSent) {
      res.status(502).json({ error: `Could not start download: ${err.message}` });
    } else {
      res.destroy();
    }
  });

  // Abort yt-dlp if the client disconnects.
  req.on('close', () => {
    if (!child.killed) child.kill('SIGKILL');
  });

  child.stdout.pipe(res);
});

module.exports = router;
