/**
 * insta-save-api — Instagram Video Downloader API (HD)
 *
 * Bootstraps the Express app, mounts API routes, and starts the HTTP server.
 */
const express = require('express');
const cors = require('cors');

const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Allow cross-origin requests (frontend widgets, other apps).
app.use(cors());
// Parse JSON request bodies (harmless for GET-only API, useful for future POSTs).
app.use(express.json());

// Health check — useful for uptime monitors and Docker healthchecks.
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// All downloader endpoints live under /api.
app.use('/api', apiRoutes);

// 404 for anything else.
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler — catches anything not handled in routes.
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err && err.message ? err.message : err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`insta-save-api listening on port ${PORT}`);
});
