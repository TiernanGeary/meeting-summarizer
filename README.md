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
3. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

1. Visit the application in your browser
2. Enter your Whisper API key (get one from [lemonfox.ai](https://lemonfox.ai))
3. Either record audio directly in the browser or upload an audio file
4. Wait for the transcription and summary to be generated

## Development

The application consists of:
- Next.js frontend (`pages/`)
- Express.js backend (`server.js`)
- API endpoints for transcription and analysis

## License

MIT
