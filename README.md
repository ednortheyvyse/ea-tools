# EA Tools

A suite of offline-first utilities designed for the modern Assistant Editor. Simple, fast, and secure.

🔗 **Live:** [eatools.edvyse.co.uk](https://eatools.edvyse.co.uk)

## Features

- **Timecode Calculator** - Add, subtract, and convert timecodes
- **Zoom Calculator** - Calculate scaling % for mixed resolutions
- **Speed Calculator** - Find speed ramp % or restore footage
- **Mask Generator** - Generate PNG overlays for cinema aspect ratios
- **EDL Hacker** - Convert EDL to CSV for spreadsheets
- **AVB Hacker** - Extract data from Avid Bins (.avb)
- **MXF Inspector** - Probe technical metadata of MXF files with FFprobe
- **Data Rate Calculator** - Estimate storage needs for shoots
- **Duration Guesstimator** - Calculate how much footage fits on a drive

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Backend:** Python Flask
- **Styling:** Tailwind CSS
- **Deployment:** Docker + Cloudflare Tunnel

## Local Development

### Prerequisites
- Node.js 20+
- Python 3.12+
- FFmpeg (for MXF Inspector)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ea-tools.git
   cd ea-tools
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install FFmpeg** (macOS)
   ```bash
   brew install ffmpeg
   ```

4. **Start the development servers**

   Terminal 1 - Frontend:
   ```bash
   npm run dev
   ```

   Terminal 2 - Backend:
   ```bash
   cd backend
   python3 main.py
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

## Docker Deployment

### Using Docker Compose (Recommended)

```bash
docker-compose up -d
```

The app will be available on `http://localhost:5001`

### Manual Docker Build

```bash
# Build the image
docker build -t ea-tools .

# Run the container
docker run -d -p 5001:5001 --name ea-tools ea-tools
```

## Production Deployment (Unraid)

This project is configured for simple deployment directly from GitHub to Unraid.

### Setup on Unraid

1. **Clone the repository on Unraid:**
   ```bash
   ssh root@your-unraid-ip
   cd /mnt/user/appdata
   git clone https://github.com/yourusername/ea-tools.git
   cd ea-tools
   ```

2. **Build and run:**
   ```bash
   docker-compose up -d --build
   ```

3. **Configure Cloudflare Tunnel:**
   - Create tunnel pointing to `http://localhost:5001`
   - Set domain: `eatools.edvyse.co.uk`

4. **To update:**
   ```bash
   git pull
   docker-compose down
   docker-compose up -d --build
   ```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FLASK_ENV` | `production` | Flask environment |
| `FFPROBE_PATH` | `ffprobe` | Path to ffprobe executable |
| `PORT` | `5001` | Port to run the server on |

## Architecture

```
ea-tools/
├── backend/           # Flask backend
│   └── main.py       # API endpoints
├── frontend/
│   ├── index.tsx     # React app
│   └── vite.config.ts
├── Dockerfile        # Multi-stage production build
├── docker-compose.yml
└── .github/workflows/
    └── docker-build.yml
```

## Building for Production

The Dockerfile uses a multi-stage build:

1. **Stage 1:** Builds the React frontend with Vite
2. **Stage 2:** Creates production Python image with Flask, FFmpeg, and serves static files

## Security Features

- ✅ Runs as non-root user
- ✅ No unnecessary packages in production image
- ✅ Health checks configured
- ✅ All file uploads are temporary and cleaned up
- ✅ Production WSGI server (Gunicorn)

## License

MIT

## Author

Ed Northeyvyse
