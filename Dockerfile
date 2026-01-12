# Stage 1: Build Client
FROM node:20-slim AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install

# Build Args for Client
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Set usage for build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

COPY client/ ./
RUN npm run build

# Stage 2: Build Server
FROM node:20-slim AS server-build

# Install build dependencies for youtube-dl-exec (requires python3)
RUN apt-get update && apt-get install -y python3 build-essential && rm -rf /var/lib/apt/lists/*

WORKDIR /app/server
COPY server/package*.json ./
RUN npm install
COPY server/ ./
RUN npm run build

# Stage 3: Production Runtime
FROM node:20-slim

# Install system dependencies (ffmpeg, python3 for youtube-dl)
RUN apt-get update && apt-get install -y ffmpeg python3 ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy server package files and install production dependencies
COPY server/package*.json ./
RUN npm install --production

# Copy server build
COPY --from=server-build /app/server/dist ./dist

# Copy client build to public directory (served by express)
COPY --from=client-build /app/client/dist ./public

# Expose port (must match process.env.PORT or default 3000)
Expose 3000

# Start command
CMD ["node", "dist/index.js"]
