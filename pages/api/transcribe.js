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
  // ─── CORS & Preflight ───────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    // browser preflight
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    // any other non-POST request
    res.setHeader('Allow', 'POST,OPTIONS');
    return res.status(405).end('Method Not Allowed');
  }

  if (!process.env.WHISPER_API_KEY) {
    console.error('WHISPER_API_KEY is not configured');
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { IncomingForm } = await import('formidable');
    const form = new IncomingForm({
      uploadDir: os.tmpdir(),
      keepExtensions: true,
      maxFileSize: 50 * 1024 * 1024,
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    const uploaded = files.audio;
    const filePath = Array.isArray(uploaded)
      ? uploaded[0].filepath
      : uploaded?.filepath;

    if (!filePath) {
      return res.status(400).json({ error: 'No file uploaded or filepath missing' });
    }

    const prompt = fields.prompt || '';
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('response_format', 'verbose_json');
    formData.append('speaker_labels', 'true');
    formData.append('timestamp_granularities', 'segment');
    if (prompt) formData.append('prompt', prompt);

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

      // Clean up the temporary file
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        console.error('Error cleaning up temporary file:', cleanupError);
      }

      return res.status(200).json(response.data);
    } catch (error) {
      console.error('Transcription API error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      return res.status(500).json({ 
        error: 'Transcription failed',
        details: error.response?.data || error.message
      });
    }
  } catch (error) {
    console.error('Request processing error:', error);
    return res.status(500).json({ 
      error: 'Failed to process request',
      details: error.message
    });
  }
}
