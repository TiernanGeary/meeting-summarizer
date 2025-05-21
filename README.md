# Meeting Summarizer

An AI-powered application that transcribes and summarizes meeting recordings. Built with Next.js and the Whisper API.

## Features

- Record audio directly in the browser
- Upload audio files for transcription
- Get AI-generated summaries of meeting content
- Speaker detection and segmentation
- Support for multiple languages

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory and add your Whisper API key:
   ```
   WHISPER_API_KEY=your_api_key_here
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

- `WHISPER_API_KEY`: Your Whisper API key from [lemonfox.ai](https://lemonfox.ai)

## Development

The application consists of:
- Next.js frontend (`pages/`)
- Express.js backend (`server.js`)
- API endpoints for transcription and analysis

## License

MIT
