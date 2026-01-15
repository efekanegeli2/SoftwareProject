import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API_URL = 'http://localhost:3000';

const StudentPanel = () => {
  const { user, logout } = useAuth();
  const [examData, setExamData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [mcqAnswers, setMcqAnswers] = useState({});
  const [writingText, setWritingText] = useState('');
  const [speakingText, setSpeakingText] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    loadExam();
  }, []);

  const loadExam = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/exam/generate`);
      setExamData(response.data);
    } catch (error) {
      console.error('Error loading exam:', error);
      alert('Failed to load exam. Please try again.');
    }
    setLoading(false);
  };

  const handleMcqChange = (questionId, answer) => {
    setMcqAnswers({ ...mcqAnswers, [questionId]: answer });
  };

  const handleRecordToggle = () => {
    setIsRecording(!isRecording);
    // Mock: Simulate recording
    if (!isRecording) {
      setTimeout(() => {
        setSpeakingText('The sun sets in the west. Technology has changed our daily lives significantly. Learning a new language requires dedication and practice.');
        setIsRecording(false);
      }, 2000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Convert MCQ answers to array
      const mcqAnswersArray = examData.mcqQuestions.map((q) => mcqAnswers[q.id] || '');

      const response = await axios.post(`${API_URL}/exam/submit`, {
        mcqAnswers: mcqAnswersArray,
        writingText,
        speakingText
      });

      setResult(response.data);
    } catch (error) {
      console.error('Error submitting exam:', error);
      alert('Failed to submit exam. Please try again.');
    }

    setSubmitting(false);
  };

  if (result) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Assessment Complete!</h1>
              <p className="text-gray-600">Your results are ready</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Overall Score</h3>
                <p className="text-4xl font-bold text-blue-600">{result.overallScore}/100</p>
              </div>

              <div className="bg-green-50 rounded-lg p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">CEFR Level</h3>
                <p className="text-4xl font-bold text-green-600">{result.cefrLevel}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Feedback</h3>
              <p className="text-gray-700">{result.feedback}</p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setResult(null);
                  setMcqAnswers({});
                  setWritingText('');
                  setSpeakingText('');
                  loadExam();
                }}
                className="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-md hover:bg-indigo-700 font-medium"
              >
                Take Another Test
              </button>
              <button
                onClick={logout}
                className="flex-1 bg-gray-600 text-white py-3 px-6 rounded-md hover:bg-gray-700 font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !examData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading exam...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">English Proficiency Assessment</h1>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">{user?.email}</span>
              <button
                onClick={logout}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section A: MCQ */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Section A: Multiple Choice Questions</h2>
            <div className="space-y-4">
              {examData.mcqQuestions.map((question, index) => (
                <div key={question.id} className="border-b border-gray-200 pb-4">
                  <p className="font-medium text-gray-700 mb-2">
                    {index + 1}. {question.question}
                  </p>
                  <div className="space-y-2">
                    {question.options.map((option) => (
                      <label key={option} className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name={question.id}
                          value={option}
                          checked={mcqAnswers[question.id] === option}
                          onChange={() => handleMcqChange(question.id, option)}
                          className="mr-2"
                        />
                        <span className="text-gray-700">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section B: Writing */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Section B: Writing Task</h2>
            <div className="mb-4">
              <p className="font-medium text-gray-700 mb-2">Topic:</p>
              <p className="text-gray-600 bg-gray-50 p-3 rounded">{examData.writingTopic.topic}</p>
            </div>
            <div>
              <p className="font-medium text-gray-700 mb-2">Instructions:</p>
              <p className="text-gray-600 mb-3">{examData.writingTopic.instructions}</p>
              <textarea
                value={writingText}
                onChange={(e) => setWritingText(e.target.value)}
                rows={8}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Write your essay here..."
              />
            </div>
          </div>

          {/* Section C: Speaking */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Section C: Speaking Task</h2>
            <div className="mb-4">
              <p className="font-medium text-gray-700 mb-2">Please read the following sentences:</p>
              <ul className="list-disc list-inside text-gray-600 bg-gray-50 p-3 rounded space-y-1">
                {examData.speakingSentences.map((sentence, index) => (
                  <li key={index}>{sentence}</li>
                ))}
              </ul>
            </div>
            <div>
              <button
                type="button"
                onClick={handleRecordToggle}
                className={`px-6 py-3 rounded-md font-medium ${
                  isRecording
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isRecording ? '⏹ Stop Recording' : '🎤 Start Recording'}
              </button>
              {speakingText && (
                <div className="mt-4 p-3 bg-gray-50 rounded">
                  <p className="text-sm text-gray-600">Recorded text:</p>
                  <p className="text-gray-800">{speakingText}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 text-white py-3 px-6 rounded-md hover:bg-indigo-700 disabled:opacity-50 font-medium text-lg"
            >
              {submitting ? 'Submitting...' : 'Submit Assessment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentPanel;
