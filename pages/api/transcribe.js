import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import os from 'os';
import formidable from 'formidable';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: '50mb',
  },
};

async function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({
      uploadDir: os.tmpdir(),
      keepExtensions: true,
      maxFileSize: 50 * 1024 * 1024,
      maxFieldsSize: 50 * 1024 * 1024,
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        console.error('Form parsing error:', err);
        reject(err);
        return;
      }
      resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  console.log('API route hit - Method:', req.method);
  console.log('Environment check - WHISPER_API_KEY exists:', !!process.env.WHISPER_API_KEY);
  console.log('Environment check - TMPDIR:', os.tmpdir());
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.WHISPER_API_KEY) {
    console.error('WHISPER_API_KEY is not configured');
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    console.log('Starting file processing...');
    const { fields, files } = await parseForm(req);
    console.log('Form parsed successfully');
    console.log('Files received:', Object.keys(files));

    const uploaded = files.audio;
    if (!uploaded) {
      console.error('No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = Array.isArray(uploaded) ? uploaded[0].filepath : uploaded.filepath;
    console.log('File path:', filePath);

    if (!filePath || !fs.existsSync(filePath)) {
      console.error('File not found at path:', filePath);
      return res.status(400).json({ error: 'File not found' });
    }

    const fileStats = fs.statSync(filePath);
    console.log('File size:', fileStats.size, 'bytes');

    if (fileStats.size > 50 * 1024 * 1024) {
      console.error('File too large:', fileStats.size);
      return res.status(400).json({ error: 'File size too large. Maximum size is 50MB.' });
    }

    const prompt = fields.prompt || '';
    console.log('Creating form data for API request...');

    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('response_format', 'verbose_json');
    formData.append('speaker_labels', 'true');
    formData.append('timestamp_granularities', 'segment');
    if (prompt) formData.append('prompt', prompt);

    console.log('Sending request to Lemonfox API...');
    try {
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

      console.log('API response received:', response.status);

      // Clean up the temporary file
      try {
        fs.unlinkSync(filePath);
        console.log('Temporary file cleaned up');
      } catch (cleanupError) {
        console.error('Error cleaning up temporary file:', cleanupError);
      }

      return res.status(200).json(response.data);
    } catch (error) {
      console.error('Transcription API error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        stack: error.stack
      });

      // Clean up the temporary file in case of error
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        console.error('Error cleaning up temporary file:', cleanupError);
      }

      return res.status(500).json({ 
        error: 'Transcription failed',
        details: error.response?.data || error.message
      });
    }
  } catch (error) {
    console.error('Request processing error:', {
      message: error.message,
      stack: error.stack
    });
    return res.status(500).json({ 
      error: 'Failed to process request',
      details: error.message
    });
  }
}
