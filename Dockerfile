# Node 20 slim base — small image, no build tools we don't need.
FROM node:20-slim

# Install Python 3 + pip, then install yt-dlp from PyPI.
# (yt-dlp is the download engine; it shells out through child_process.)
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip \
    && pip3 install --no-cache-dir --break-system-packages yt-dlp \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first for better layer caching.
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Copy the application source.
COPY server.js ./server.js
COPY routes ./routes
COPY lib ./lib

EXPOSE 3000

# Optional: point at your exported cookies file if Instagram login-gates requests.
# ENV COOKIES_FILE=/app/cookies.txt

CMD ["node", "server.js"]
