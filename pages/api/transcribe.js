import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import os from 'os';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method not allowed');
  }

  const { IncomingForm } = await import('formidable');
  const form = new IncomingForm({
    uploadDir: os.tmpdir(),      // ← write into the ephemeral /tmp folder
    keepExtensions: true,
    maxFileSize: 50 * 1024 * 1024, // 50 MB
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'File upload failed' });
    }

    const uploaded = files.audio;
    const filePath = Array.isArray(uploaded) ? uploaded[0].filepath : uploaded?.filepath;

    if (!filePath) {
      return res.status(400).json({ error: 'No file uploaded or filepath missing' });
    }

    const prompt = fields.prompt || ''; // pull user prompt from form

    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('response_format', 'verbose_json'); // includes timestamps
    formData.append('speaker_labels', 'true');
    formData.append('timestamp_granularities', 'segment');
    if (prompt) {
      formData.append('prompt', prompt);
    }

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
      console.log('Whisper response:', response.data);
      res.status(200).json(response.data);
    } catch (error) {
      console.error('Transcription failed:', error.response?.data || error.message);
      res.status(500).json({ error: 'Transcription failed' });
    }
  });
}
