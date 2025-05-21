import { useState, useRef, useEffect } from 'react';

const API_URL = 'http://localhost:3001';

export default function Home() {
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [transcript, setTranscript] = useState('');
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [summary, setSummary] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    // Check for stored API key
    const storedApiKey = localStorage.getItem('whisperApiKey');
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        const audioFile = new File([audioBlob], 'recording.mp3', { type: 'audio/mp3' });
        setFile(audioFile);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setError('Error accessing microphone: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleApiKeyChange = (e) => {
    const newApiKey = e.target.value;
    setApiKey(newApiKey);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!apiKey) {
      setError('Please enter your Whisper API key first');
      return;
    }

    setIsTranscribing(true);
    setError('');
    setTranscript('');
    setSummary('');

    const formData = new FormData();
    formData.append('audio', file);

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Transcription failed');
      }

      const data = await response.json();
      setTranscript(data.text);
      await analyzeTranscript(data.text);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsTranscribing(false);
    }
  };

  const analyzeTranscript = async (text) => {
    if (!text) return;

    setIsAnalyzing(true);
    setError('');

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Analysis failed');
      }

      const data = await response.json();
      setSummary(data.choices[0].message.content);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError('File size too large. Maximum size is 50MB.');
        setFile(null);
      } else {
        setFile(selectedFile);
        setError('');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
          🎙️ AI Meeting Assistant
        </h1>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🔑 Whisper API Key
              <a 
                href="https://lemonfox.ai" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="ml-2 text-blue-600 hover:text-blue-800 text-sm"
              >
                (Get your API key here)
              </a>
            </label>
            <input
              type="password"
              placeholder="Enter your Whisper API Key"
              value={apiKey}
              onChange={handleApiKeyChange}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
            />
            <button
              onClick={() => {
                if (apiKey) {
                  localStorage.setItem('whisperApiKey', apiKey);
                  setError('');
                } else {
                  setError('Please enter your API key');
                }
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save API Key
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">🎥 Record Meeting</h2>
            <div className="flex items-center space-x-4">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="bg-red-600 text-white px-6 py-2 rounded-full hover:bg-red-700 transition-colors"
                >
                  Start Recording
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="bg-gray-600 text-white px-6 py-2 rounded-full hover:bg-gray-700 transition-colors"
                >
                  Stop Recording
                </button>
              )}
              {isRecording && (
                <div className="text-red-600 font-medium">
                  Recording: {formatTime(recordingTime)}
                </div>
              )}
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">📤 Upload Audio</h2>
            <div className="space-y-4">
      <textarea
        placeholder="Enter any context, speaker names, or expected terms (optional)"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        rows={3}
      ></textarea>

              <div className="flex items-center space-x-4">
      <input
        type="file"
        accept="audio/*"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
      />
      <button
        onClick={handleFileUpload}
                  disabled={loading || !file}
                  className={`px-6 py-2 rounded-full text-white font-medium
                    ${loading || !file
                      ? 'bg-blue-300 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                    } transition-colors`}
      >
                  {loading ? 'Transcribing...' : 'Transcribe'}
      </button>
              </div>

              {file && (
                <p className="text-sm text-gray-600">
                  Selected file: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)}MB)
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
              {error}
            </div>
          )}

      {transcript && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">📝 Transcript</h2>
                <button
                  onClick={analyzeTranscript}
                  disabled={isAnalyzing}
                  className={`px-4 py-2 rounded-full text-white font-medium
                    ${isAnalyzing
                      ? 'bg-purple-300 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700'
                    } transition-colors`}
                >
                  {isAnalyzing ? 'Analyzing...' : 'Analyze Transcript'}
                </button>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="whitespace-pre-wrap text-gray-800">{transcript}</p>
              </div>
            </div>
          )}

          {summary && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">📊 Analysis</h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="whitespace-pre-wrap text-gray-800">{summary}</p>
              </div>
        </div>
      )}

      {segments.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">🗣️ Speaker Breakdown</h2>
          <div className="space-y-3">
            {segments.map((seg, idx) => (
                  <div key={idx} className="border p-4 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-600 mb-1">
                  {seg.speaker || 'Speaker'} | ⏱ {seg.start.toFixed(1)}s - {seg.end.toFixed(1)}s
                </p>
                    <p className="text-gray-800">{seg.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
