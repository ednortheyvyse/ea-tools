# Stage 1: Build the frontend
FROM node:18-slim AS builder

WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json ./
COPY package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the frontend code
COPY . .

# Build the frontend
RUN npm run build

# Stage 2: Create the final image
FROM python:3.9-slim

WORKDIR /app

RUN apt-get update && apt-get install -y ffmpeg

# Install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend code
COPY backend/ ./backend

# Copy the built frontend from the builder stage
COPY --from=builder /app/dist ./dist

# Expose the port the app runs on
EXPOSE 5001

# Run the app
CMD ["python", "backend/main.py"]
