# insta-save-api — Instagram Video Downloader API (HD)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)
![yt-dlp](https://img.shields.io/badge/engine-yt--dlp-blue)

A simple REST API that fetches Instagram video metadata and streams best-quality MP4 downloads, powered by [yt-dlp](https://github.com/yt-dlp/yt-dlp).

## Features

- 🎬 Fetch Instagram video metadata: caption, author, thumbnail, media type
- ⬇️ Download best-quality MP4 streams directly as file attachments
- 🧹 Sanitized, caption-based filenames for downloads
- 🍪 Optional login cookies support (for content Instagram rate-limits or login-gates)
- 🐳 Docker-ready (Python 3 + yt-dlp installed in the image)
- ✅ Strict input validation — only `instagram.com` URLs are accepted

## Quick Start

### Requirements

- Node.js ≥ 18
- `yt-dlp` on your PATH (Docker image installs it automatically)

```bash
# Clone and install
git clone https://github.com/adilabdullah15/insta-save-api.git
cd insta-save-api
npm install

# Install yt-dlp (Linux/macOS)
pip install yt-dlp

# Start the server (port 3000)
npm start
```

### Try it

```bash
# Health check
curl http://localhost:3000/health

# Video info
curl "http://localhost:3000/api/info?url=https://www.instagram.com/reel/EXAMPLE/"

# Download the video as MP4
curl -L "http://localhost:3000/api/download?url=https://www.instagram.com/reel/EXAMPLE/" -o video.mp4
```

## API

Base URL: `http://localhost:3000` (or your deployed host)

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET` | `/health` | Health check → `{ "status": "ok" }` |
| `GET` | `/api/info?url=<instagram url>` | Returns JSON metadata: `caption`, `author`, `thumbnail`, `type` |
| `GET` | `/api/download?url=<instagram url>` | Streams the best-quality MP4 as an attachment download |

### Examples

**Get video info**

```bash
curl "http://localhost:3000/api/info?url=https://www.instagram.com/reel/DiQaJcRzXyZ/"
```

Response:

```json
{
  "caption": "Sunset timelapse from the rooftop 🌇",
  "author": "some_creator",
  "thumbnail": "https://scontent.example.com/thumb.jpg",
  "type": "mp4"
}
```

**Download video**

```bash
curl -L "http://localhost:3000/api/download?url=https://www.instagram.com/reel/DiQaJcRzXyZ/" -o sunset-timelapse.mp4
```

Response: binary MP4 with header `Content-Disposition: attachment; filename="sunset-timelapse-from-the-rooftop.mp4"`.

### Errors

- `400 { "error": "..." }` — missing/invalid `url` parameter, or not an `instagram.com` link
- `502 { "error": "..." }` — yt-dlp failed (video unavailable, removed, login required, network error)

## Login cookies (COOKIES_FILE)

Instagram sometimes rate-limits or login-gates requests — anonymous fetches can fail with errors like *"Log in to continue"* or *"Rate-limit reached"*. To fix this, export your browser's cookies and point the API at them:

1. Install a cookie-export extension in your browser (e.g. "Get cookies.txt LOCALLY" for Chrome/Firefox).
2. While logged in to Instagram, export cookies for `instagram.com` as a Netscape-format `cookies.txt` file.
3. Point the API at it before starting the server:

```bash
export COOKIES_FILE=/path/to/cookies.txt
npm start
```

When `COOKIES_FILE` is set and the file exists, `--cookies <file>` is appended to every yt-dlp invocation. Without it, everything still works for publicly fetchable content. ⚠️ Keep your cookies file private — never commit it (it's already in `.gitignore`).

## Use responsibly

**Only download content you have the rights to.** Instagram's Terms of Service and applicable copyright law apply — this tool is intended for downloading your own content, content you've been given permission to download, or where fair use / local law permits. The author is not responsible for misuse.

## Deploy with Docker

```bash
# Build the image (installs python3, pip, and yt-dlp automatically)
docker build -t insta-save-api .

# Run it
docker run -p 3000:3000 insta-save-api

# With login cookies mounted in
docker run -p 3000:3000 \
  -v /path/to/cookies.txt:/app/cookies.txt:ro \
  -e COOKIES_FILE=/app/cookies.txt \
  insta-save-api
```

## Author

**Adil Abdullah Khan** — BS Information Technology, Thal University Bhakkar, Pakistan

- 📧 Email: adilabdullahkhan35@gmail.com
- 🐙 GitHub: [adilabdullah15](https://github.com/adilabdullah15)

## License

MIT — see [LICENSE](LICENSE) for details.
