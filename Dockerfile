# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Production stage
FROM node:18-alpine

# Add labels
LABEL org.opencontainers.image.title="Sefria API"
LABEL org.opencontainers.image.description="API for Jewish religious texts - Tanach, Mishna, Gemara, Rambam, Tur, and Prayers"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.source="https://github.com/yourusername/api-sefria"

# Install tini for proper signal handling
RUN apk add --no-cache tini

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application source
COPY src/ ./src/

# Copy data directory (will be overridden by volume mount if used)
COPY data/ ./data/

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Use tini as entrypoint
ENTRYPOINT ["tini", "--"]

# Start the application
CMD ["node", "src/server.js"]
