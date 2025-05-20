import { useState } from 'react';

export default function Home() {
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [transcript, setTranscript] = useState('');
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setLoading(true);
    setError('');
    setTranscript('');
    setSegments([]);

    const formData = new FormData();
    formData.append('audio', file);
    formData.append('prompt', prompt);

    try {
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.details || 'Failed to transcribe audio');
      }

      if (data.segments) {
        setSegments(data.segments);
      }

      setTranscript(data.text || 'No transcript received');
    } catch (err) {
      setError(err.message || 'An error occurred while processing your request');
      console.error('Transcription error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🎙️ AI Meeting Transcriber</h1>

      <textarea
        placeholder="Enter any context, speaker names, or expected terms (optional)"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="w-full p-2 border mb-4 rounded"
        rows={3}
      ></textarea>

      <div className="mb-4">
        <input
          type="file"
          accept="audio/*"
          onChange={(e) => {
            setFile(e.target.files[0]);
            setError('');
          }}
          className="mb-2"
        />
        <p className="text-sm text-gray-600">
          Supported formats: MP3, WAV, M4A, etc. (Max size: 50MB)
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600">
          {error}
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={loading}
        className={`w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed`}
      >
        {loading ? 'Transcribing...' : 'Upload & Transcribe'}
      </button>

      {transcript && (
        <div className="mt-6">
          <h2 className="font-semibold text-lg mb-2">📝 Full Transcript</h2>
          <p className="whitespace-pre-wrap text-sm text-gray-800">
            {transcript}
          </p>
        </div>
      )}

      {segments.length > 0 && (
        <div className="mt-8">
          <h2 className="font-semibold text-lg mb-2">🗣️ Speaker Breakdown</h2>
          <div className="space-y-3">
            {segments.map((seg, idx) => (
              <div key={idx} className="border p-3 rounded bg-gray-50">
                <p className="text-xs text-gray-600 mb-1">
                  {seg.speaker || 'Speaker'} | ⏱ {seg.start.toFixed(1)}s - {seg.end.toFixed(1)}s
                </p>
                <p className="text-sm">{seg.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
