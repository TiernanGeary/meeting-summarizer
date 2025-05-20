const express = require('express');
const multer = require('multer');
const cors = require('cors');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Log environment variable status
console.log('Environment check:');
console.log('WHISPER_API_KEY exists:', !!process.env.WHISPER_API_KEY);
console.log('WHISPER_API_KEY length:', process.env.WHISPER_API_KEY ? process.env.WHISPER_API_KEY.length : 0);

// Enable CORS
app.use(cors());
app.use(express.json());

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Transcription endpoint
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    console.log('Received transcription request');
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);

    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!process.env.WHISPER_API_KEY) {
      console.log('API key not configured');
      return res.status(500).json({ error: 'API key not configured' });
    }

    console.log('API key is configured, proceeding with transcription');
    const filePath = req.file.path;
    const prompt = req.body.prompt || '';

    console.log('Creating form data for Whisper API');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('response_format', 'verbose_json');
    formData.append('speaker_labels', 'true');
    formData.append('timestamp_granularities', 'segment');
    if (prompt) formData.append('prompt', prompt);

    console.log('Sending request to Whisper API');
    const response = await axios.post(
      'https://api.lemonfox.ai/v1/audio/transcriptions',
      formData,
      {
        headers: {
          Authorization: `Bearer ${process.env.WHISPER_API_KEY}`,
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    console.log('Received response from Whisper API');
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);

    // Clean up the uploaded file
    fs.unlinkSync(filePath);

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Transcription error:', {
      message: error.message,
      response: error.response?.data,
      stack: error.stack
    });

    // Clean up the file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }

    res.status(500).json({
      error: 'Transcription failed',
      details: error.response?.data || error.message
    });
  }
});

// Analysis endpoint
app.post('/api/analyze', async (req, res) => {
  const { transcript } = req.body;

  if (!transcript) {
    return res.status(400).json({ error: 'No transcript provided' });
  }

  if (!process.env.WHISPER_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that analyzes meeting transcripts and provides concise summaries and key insights.'
          },
          {
            role: 'user',
            content: `Please analyze this meeting transcript and provide:\n1. A brief summary of the main points discussed\n2. Key action items or decisions made\n3. Important topics or themes\n\nTranscript:\n${transcript}`
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.WHISPER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({ summary: response.data.choices[0].message.content });
  } catch (error) {
    console.error('Analysis error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to analyze transcript',
      details: error.response?.data?.error?.message || error.message
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 