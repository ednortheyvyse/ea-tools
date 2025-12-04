# Multi-stage build for optimized production image

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend source
COPY index.tsx tsconfig.json vite.config.ts ./
COPY index.html* ./

# Build frontend
RUN npm run build

# Stage 2: Production image
FROM python:3.12-slim

# Install FFmpeg and clean up in same layer to reduce image size
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Verify ffprobe is installed
RUN ffprobe -version

# Set working directory
WORKDIR /app

# Install Python dependencies first (for better layer caching)
RUN pip install --no-cache-dir flask gunicorn avb

# Copy backend code
COPY backend/main.py ./backend/

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/dist ./dist

# Create non-root user for security
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 5001

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=backend/main.py
ENV FFPROBE_PATH=ffprobe

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5001')" || exit 1

# Run with gunicorn for production
CMD ["gunicorn", "--bind", "0.0.0.0:5001", "--workers", "2", "--timeout", "120", "--chdir", "backend", "main:app"]
