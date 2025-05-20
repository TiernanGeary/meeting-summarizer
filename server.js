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
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!process.env.WHISPER_API_KEY) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const filePath = req.file.path;
    const prompt = req.body.prompt || '';

    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('response_format', 'verbose_json');
    formData.append('speaker_labels', 'true');
    formData.append('timestamp_granularities', 'segment');
    if (prompt) formData.append('prompt', prompt);

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

    // Clean up the uploaded file
    fs.unlinkSync(filePath);

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Transcription error:', {
      message: error.message,
      response: error.response?.data
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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 