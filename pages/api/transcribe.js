import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import os from 'os';

export const config = {
  api: { bodyParser: false },
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

  // ─── Your existing formidable + Lemonfox logic goes below ──────────
  const { IncomingForm } = await import('formidable');
  const form = new IncomingForm({
    uploadDir: os.tmpdir(),
    keepExtensions: true,
    maxFileSize: 50 * 1024 * 1024,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'File upload failed' });
    }

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
        }
      );
      fs.unlinkSync(filePath);
      return res.status(200).json(response.data);
    } catch (error) {
      console.error('Transcription failed:', error.response?.data || error.message);
      return res.status(500).json({ error: 'Transcription failed' });
    }
  });
}
