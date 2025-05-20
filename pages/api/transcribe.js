import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import os from 'os';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: '50mb',
  },
};

export default async function handler(req, res) {
  console.log('API route hit - Method:', req.method);
  
  // ─── CORS & Preflight ───────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    console.log('Invalid method:', req.method);
    res.setHeader('Allow', 'POST,OPTIONS');
    return res.status(405).end('Method Not Allowed');
  }

  if (!process.env.WHISPER_API_KEY) {
    console.error('WHISPER_API_KEY is not configured');
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    console.log('Starting file processing...');
    const { IncomingForm } = await import('formidable');
    const form = new IncomingForm({
      uploadDir: os.tmpdir(),
      keepExtensions: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      maxFieldsSize: 50 * 1024 * 1024, // 50MB
    });

    console.log('Parsing form data...');
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('Form parsing error:', err);
          if (err.code === 'LIMIT_FILE_SIZE') {
            reject(new Error('File size too large. Maximum size is 50MB.'));
          } else {
            reject(err);
          }
        }
        console.log('Form parsed successfully:', { fields, files });
        resolve([fields, files]);
      });
    });

    const uploaded = files.audio;
    console.log('Uploaded file info:', uploaded);
    
    if (!uploaded) {
      console.error('No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = Array.isArray(uploaded)
      ? uploaded[0].filepath
      : uploaded?.filepath;

    if (!filePath) {
      console.error('No file path found in upload');
      return res.status(400).json({ error: 'No file uploaded or filepath missing' });
    }

    console.log('File path:', filePath);
    console.log('Checking if file exists...');
    
    if (!fs.existsSync(filePath)) {
      console.error('File does not exist at path:', filePath);
      return res.status(400).json({ error: 'Uploaded file not found' });
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
