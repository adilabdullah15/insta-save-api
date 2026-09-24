/**
 * lib/ytdlp.js
 *
 * Thin wrapper around the `yt-dlp` CLI for Instagram media.
 *
 * - getInfo(url):     metadata (caption, author, thumbnail, type) via --dump-json
 * - downloadStream(url): best-quality MP4 stream piped from yt-dlp to the caller
 *
 * Optional login cookies: if the COOKIES_FILE env var is set and the file
 * exists, `--cookies <file>` is appended to every yt-dlp invocation.
 * This is often required by Instagram, which rate-limits or login-gates
 * anonymous requests.
 */
const { spawn } = require('child_process');
const fs = require('fs');

const YTDLP_TIMEOUT_MS = 15000; // metadata fetch timeout
const YTDLP_BIN = process.env.YTDLP_BIN || 'yt-dlp';

/**
 * Build extra CLI flags: login cookies when COOKIES_FILE is set and readable.
 * @returns {string[]} extra argv entries (possibly empty)
 */
function cookieArgs() {
  const cookiesFile = process.env.COOKIES_FILE;
  if (cookiesFile && fs.existsSync(cookiesFile)) {
    return ['--cookies', cookiesFile];
  }
  return [];
}

/**
 * Run yt-dlp, capture stdout as a string.
 * Rejects with a clean Error on non-zero exit or timeout.
 *
 * @param {string[]} args - argv for yt-dlp (before cookie args)
 * @param {number} timeoutMs - kill the process after this many ms
 * @returns {Promise<string>} stdout text
 */
function runYtDlp(args, timeoutMs = YTDLP_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const child = spawn(YTDLP_BIN, [...args, ...cookieArgs()], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('yt-dlp timed out'));
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      if (err.code === 'ENOENT') {
        reject(
          new Error(
            'yt-dlp is not installed or not on PATH. Install it with: pip install yt-dlp'
          )
        );
      } else {
        reject(new Error(`Failed to start yt-dlp: ${err.message}`));
      }
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(stdout);
      } else {
        // yt-dlp prints useful diagnostics on stderr; keep the message short.
        const detail = stderr.trim().split('\n').slice(-2).join(' ');
        reject(
          new Error(
            detail
              ? `yt-dlp failed: ${detail}`
              : `yt-dlp exited with code ${code}`
          )
        );
      }
    });
  });
}

/**
 * Fetch metadata for an Instagram post/reel URL.
 *
 * @param {string} url - validated Instagram media URL
 * @returns {Promise<{caption:string|null, author:string|null, thumbnail:string|null, type:string|null}>}
 */
async function getInfo(url) {
  let raw;
  try {
    raw = await runYtDlp(['--dump-json', '--no-playlist', url]);
  } catch (err) {
    throw new Error(`Could not fetch video info: ${err.message}`);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (_err) {
    throw new Error('Could not parse metadata returned by yt-dlp');
  }

  return {
    caption: data.description || data.title || null,
    author: data.uploader || data.uploader_id || null,
    thumbnail: data.thumbnail || null,
    type: data.ext || data.format_note || null,
  };
}

/**
 * Spawn yt-dlp streaming the best-quality MP4 to stdout.
 * The caller pipes `child.stdout` into the HTTP response.
 * Format selector: best[ext=mp4]/best — highest quality available as MP4,
 * falling back to whatever best is.
 *
 * @param {string} url - validated Instagram media URL
 * @returns {ChildProcess} the spawned yt-dlp process (caller owns stdio)
 */
function downloadStream(url) {
  const child = spawn(
    YTDLP_BIN,
    ['-f', 'best[ext=mp4]/best', '--no-playlist', '-o', '-', url, ...cookieArgs()],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  );

  child.on('error', (err) => {
    // If spawning itself fails, destroy the streams so the caller can end the response.
    child.stdout.destroy(err);
  });

  return child;
}

module.exports = { getInfo, downloadStream };
