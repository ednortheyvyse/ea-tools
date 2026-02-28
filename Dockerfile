# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Build Backend & Serve
FROM python:3.9-slim
WORKDIR /app

# Install system dependencies (ffmpeg for mxf inspector)
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir gunicorn

# Copy Backend Code
COPY backend/ .

# Copy Frontend Build from Stage 1
# main.py expects static_folder='../dist', so we place it at /dist
COPY --from=frontend-build /app/dist /dist

ENV FLASK_ENV=production
EXPOSE 5001

CMD ["gunicorn", "--workers", "4", "--bind", "0.0.0.0:5001", "main:app"]