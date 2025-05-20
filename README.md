# Meeting Summarizer

A Next.js application that transcribes audio files using the Whisper API.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with the following variables:
```
PORT=3001
WHISPER_API_KEY=your_api_key_here
NEXT_PUBLIC_API_URL=http://localhost:3001
```

3. Create an `uploads` directory in the root of the project:
```bash
mkdir uploads
```

## Development

1. Start the Express server:
```bash
node server.js
```

2. In a separate terminal, start the Next.js development server:
```bash
npm run dev
```

The application will be available at http://localhost:3000

## Features

- Upload audio files (MP3, WAV, M4A, etc.)
- Automatic transcription using Whisper API
- Speaker detection and segmentation
- Optional context/prompt for better transcription
- File size limit: 50MB

## API Endpoints

- `POST /api/transcribe`: Upload and transcribe audio files
- `GET /health`: Health check endpoint

## Environment Variables

- `PORT`: Port for the Express server (default: 3001)
- `WHISPER_API_KEY`: Your Whisper API key
- `NEXT_PUBLIC_API_URL`: URL of the Express server (default: http://localhost:3001)

## Deployment

This application requires a traditional server environment rather than serverless functions due to file handling requirements. You can deploy it to:

1. A VPS (DigitalOcean, AWS EC2, etc.)
2. Railway
3. Render
4. Heroku

Make sure to:
1. Set up the environment variables
2. Create the `uploads` directory
3. Configure CORS if needed
4. Set up proper file cleanup

## License

MIT
