import { useState } from 'react';

export default function Home() {
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [transcript, setTranscript] = useState('');
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);

    const formData = new FormData();
    formData.append('audio', file);
    formData.append('prompt', prompt);

    const res = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    setLoading(false);

    if (data.segments) {
      setSegments(data.segments);
    }

    setTranscript(data.text || 'No transcript received');
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

      <input
        type="file"
        accept="audio/*"
        onChange={(e) => setFile(e.target.files[0])}
        className="mb-4"
      />

      <button
        onClick={handleUpload}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
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
