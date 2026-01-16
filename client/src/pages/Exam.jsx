import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Exam() {
  const navigate = useNavigate();
  const { user, token } = useAuth();

  // --- STATE YÖNETİMİ ---
  const [questions, setQuestions] = useState([]); 
  const [writingTopic, setWritingTopic] = useState("");
  const [speakingSentences, setSpeakingSentences] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [mcqAnswers, setMcqAnswers] = useState({});
  const [writingAnswer, setWritingAnswer] = useState("");
  
  // GELİŞMİŞ SES STATE'LERİ
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState(""); // Kullanıcının söylediği yazı
  const [recognitionInstance, setRecognitionInstance] = useState(null);
  
  const [showResult, setShowResult] = useState(false);
  const [scoreData, setScoreData] = useState({ mcq: 0, status: "" });

  // --- AUTHENTICATION KONTROLÜ VE SORU ÇEKME ---
  useEffect(() => {
    if (!user || !token) {
      console.log('DEBUG: User not authenticated, redirecting to login');
      navigate('/login');
      return;
    }

    // --- AI'DAN SORULARI ÇEKME ---
    const fetchExamFromAI = async () => {
    // Debug: Fetch exam from AI started
    console.log('DEBUG: Fetch exam from AI started');

      try {
        setLoading(true);
        const response = await fetch('http://localhost:3000/exam/generate', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

    // Debug: AI response status
    console.log('DEBUG: AI response status', response.status, response.ok);

        if (!response.ok) throw new Error('AI Servisine ulaşılamadı!');
        const data = await response.json();

    // Debug: AI data received
    console.log('DEBUG: AI data received', data.questions?.length, 'questions');

        setQuestions(data.questions || []);
        setWritingTopic(data.writingTopic || "Describe a memorable day.");
        setSpeakingSentences(data.speakingSentences || ["Hello world.", "This is a test."]);
        setLoading(false);
      } catch (err) {
        // #region agent log - Exam: AI fetch error
        console.log('DEBUG: AI fetch error', err.message);
        // #endregion

        console.error("Hata:", err);
        setError("Yapay zeka servisine ulaşılamıyor.");
        setLoading(false);
      }
    };
    fetchExamFromAI();
  }, [user, token, navigate]);

  // --- SPEECH RECOGNITION (SESİ YAZIYA ÇEVİRME) ---
  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Tarayıcın ses tanıma özelliğini desteklemiyor. Lütfen Google Chrome kullan.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US'; // İngilizce dinle
    recognition.continuous = true; // Sürekli dinle
    recognition.interimResults = true; // Anlık sonuçları göster

    recognition.onstart = () => {
      setIsRecording(true);
      setTranscript(""); // Kayıt başlayınca eskiyi sil
    };

    recognition.onresult = (event) => {
      let currentTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      setTranscript(prev => currentTranscript); 
    };

    recognition.onerror = (event) => {
      console.error("Ses tanıma hatası:", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
    setRecognitionInstance(recognition);
  };

  const stopRecording = () => {
    if (recognitionInstance) {
      recognitionInstance.stop();
      setIsRecording(false);
    }
  };

  // --- AKILLI PUAN HESAPLAMA (NOKTALAMA İŞARETLERİNİ YOK SAYAR) ---
  const calculateSpeakingScore = (spokenText, targetSentences) => {
    // #region agent log - Hypothesis A: Frontend calculateSpeakingScore entry
    fetch('http://127.0.0.1:7242/ingest/f9c9b66b-2ca2-4f39-b18c-d6a3354515e4', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'Exam.jsx:96',
        message: 'calculateSpeakingScore called',
        data: { spokenTextLength: spokenText?.length, targetSentencesCount: targetSentences?.length },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'initial',
        hypothesisId: 'A'
      })
    }).catch(() => {});
    // #endregion

    if (!spokenText) {
      // #region agent log - Hypothesis A: Early return for empty text
      fetch('http://127.0.0.1:7242/ingest/f9c9b66b-2ca2-4f39-b18c-d6a3354515e4', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'Exam.jsx:99',
          message: 'Early return: empty spokenText',
          data: { returnValue: 0 },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'initial',
          hypothesisId: 'A'
        })
      }).catch(() => {});
      // #endregion
      return 0;
    }

    // 1. Temizlik Fonksiyonu (Nokta, virgül, ünlem hepsini siler, küçültür)
    const cleanText = (text) => {
      return text
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "") // Noktalama işaretlerini sil
        .replace(/\s{2,}/g, " ") // Çift boşlukları teke indir
        .trim();
    };

    // 2. Senin dediğin metni temizle
    const spokenClean = cleanText(spokenText);
    const spokenWords = spokenClean.split(" ");

    // 3. Hedef cümleleri birleştir ve temizle
    const targetClean = cleanText(targetSentences.join(" "));
    const targetWords = targetClean.split(" ");

    // Konsola basalım ki neyi karşılaştırdığını gör (F12 Console'da çıkar)
    console.log("Senin Dediğin (Temiz):", spokenWords);
    console.log("Beklenen (Temiz):", targetWords);

    // #region agent log - Hypothesis A: Text processing results
    console.log('DEBUG: Speaking text processing', spokenWords.length, 'words');    // #endregion

    // 4. Eşleşme Sayısı (Basit Kelime Avı)
    let matchCount = 0;

    // Hedef kelimelerin kopyasını al ki eşleşeni listeden düşelim (aynı kelimeyi 2 kere saymasın)
    let targetWordsCopy = [...targetWords];

    spokenWords.forEach(word => {
      const index = targetWordsCopy.indexOf(word);
      if (index > -1) {
        matchCount++;
        targetWordsCopy.splice(index, 1); // Eşleşen kelimeyi havuzdan çıkar
      }
    });

    // 5. Yüzdelik Hesap (Max 20 Puan)
    let accuracyRate = matchCount / targetWords.length;

    // Puanı hesapla (0 ile 20 arası)
    let score = Math.floor(accuracyRate * 20);

    // Bonus: Eğer %80 üzeri tutturduysa direkt 20 ver (Motivasyon)
    if (accuracyRate > 0.8) score = 20;

    // #region agent log - Hypothesis A: Final score calculation
    console.log('DEBUG: Speaking score calculated', score);    // #endregion

    return score;
  };

  // --- GÖNDERME FONKSİYONU ---
  const handleMcqChange = (questionId, option) => {
    setMcqAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const handleSubmit = async () => {
    console.log("Sınav gönderiliyor...");

    console.log('DEBUG: Exam submit started');

    // 1. MCQ Puanı
    let calculatedMcqScore = 0;
    questions.forEach(q => {
      if (mcqAnswers[q.id] === q.correct) calculatedMcqScore += 3;
    });

    // #region agent log - Hypothesis B: MCQ score calculated
    console.log('DEBUG: MCQ score calculated', calculatedMcqScore);    // #endregion

    // 2. Speaking Puanı (Frontend'de AKILLI hesapla)
    const realSpeakingScore = calculateSpeakingScore(transcript, speakingSentences);

    // #region agent log - Hypothesis B: Speaking score calculated
    console.log('DEBUG: Speaking score calculated', realSpeakingScore);    // #endregion

    const payload = {
      mcqAnswers,
      writingAnswer,
      speakingTranscript: transcript,
      speakingScore: realSpeakingScore
    };

    // #region agent log - Hypothesis B: Payload prepared
    console.log('DEBUG: Payload prepared, speaking score:', payload.speakingScore);    // #endregion

    try {
      // #region agent log - Exam: Server request sent
      console.log('DEBUG: Server evaluate request sent');
      // #endregion

      const response = await fetch('http://localhost:3000/exam/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      // #region agent log - Exam: Server response status
      console.log('DEBUG: Server response status', response.status);      // #endregion

      if (!response.ok) throw new Error('Değerlendirme hatası');
      const aiResult = await response.json();

      // #region agent log - Exam: AI result received
      console.log('DEBUG: AI result received, speaking score:', aiResult.speaking?.score);      // #endregion

      // #region agent log - Hypothesis B: AI response received
      console.log('DEBUG: AI response received in old format');      // #endregion

      setScoreData({
        mcq: calculatedMcqScore,
        writing: aiResult.writing,
        speaking: aiResult.speaking,
        total: calculatedMcqScore + aiResult.writing.score + aiResult.speaking.score,
        status: "Değerlendirildi"
      });
      setShowResult(true);
    } catch (error) {
      // #region agent log - Hypothesis B: Error occurred
      console.log('DEBUG: Submit error', error.message);      // #endregion
      console.error("Hata:", error);
      alert("Hata oluştu.");
    }
  };

  // --- RENDER ---
  if (loading) return <div style={{height:'100vh', display:'flex', justifyContent:'center', alignItems:'center', color:'white', backgroundColor:'#111827'}}>Yükleniyor...</div>;
  if (error) return <div style={{height:'100vh', display:'flex', justifyContent:'center', alignItems:'center', color:'white', backgroundColor:'#111827'}}>{error}</div>;

  if (showResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl max-w-2xl w-full p-8 border border-white/20">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Exam Results</h1>
            <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              {scoreData.total}/100
            </div>
            <p className="text-gray-600 mt-2">Overall Score</p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-gray-800">Grammar & Vocabulary</h3>
                <span className="text-2xl font-bold text-blue-600">{scoreData.mcq}/60</span>
              </div>
              <div className="w-full bg-blue-100 rounded-full h-3">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full" style={{width: `${(scoreData.mcq/60)*100}%`}}></div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-gray-800">Writing</h3>
                <span className="text-2xl font-bold text-green-600">{scoreData.writing?.score}/20</span>
              </div>
              <div className="w-full bg-green-100 rounded-full h-3 mb-3">
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 h-3 rounded-full" style={{width: `${(scoreData.writing?.score/20)*100}%`}}></div>
              </div>
              <p className="text-sm text-gray-600 italic">"{scoreData.writing?.feedback}"</p>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-100">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-gray-800">Speaking</h3>
                <span className="text-2xl font-bold text-purple-600">{scoreData.speaking?.score}/20</span>
              </div>
              <div className="w-full bg-purple-100 rounded-full h-3 mb-3">
                <div className="bg-gradient-to-r from-purple-500 to-pink-600 h-3 rounded-full" style={{width: `${(scoreData.speaking?.score/20)*100}%`}}></div>
              </div>
              <p className="text-sm text-gray-600 italic mb-2">"{scoreData.speaking?.feedback}"</p>
              <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                <strong>Transcribed Speech:</strong> "{transcript || 'No speech detected'}"
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-6">
            <span className="text-3xl text-white">🎓</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">English Proficiency Exam</h1>
          <p className="text-lg text-gray-600">AI-Powered Assessment System</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          {/* PART 1: MCQ */}
          <div className="p-8 border-b border-gray-100">
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mr-4">
                <span className="text-blue-600 font-bold text-lg">1</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Grammar & Vocabulary</h2>
              <span className="ml-auto text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">60 points</span>
            </div>

            <div className="space-y-6">
              {questions.map((q, index) => (
                <div key={index} className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
                  <p className="text-lg font-medium text-gray-800 mb-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full text-sm font-bold mr-3">
                      {index + 1}
                    </span>
                    {q.text}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {q.options.map((opt, i) => (
                      <label key={i} className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all duration-200">
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          onChange={() => handleMcqChange(q.id, opt)}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-3 text-gray-700 font-medium">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PART 2: WRITING */}
          <div className="p-8 border-b border-gray-100">
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mr-4">
                <span className="text-green-600 font-bold text-lg">2</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Academic Writing</h2>
              <span className="ml-auto text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">20 points</span>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100 mb-6">
              <div className="flex items-start">
                <div className="flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full mr-3 mt-1">
                  <span className="text-sm font-bold">📝</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Essay Topic:</h3>
                  <p className="text-gray-700 leading-relaxed">{writingTopic}</p>
                </div>
              </div>
            </div>

            <textarea
              rows="8"
              onChange={(e) => setWritingAnswer(e.target.value)}
              placeholder="Write your academic essay here. Focus on structure, coherence, and academic language..."
              className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 resize-none text-gray-700"
            />
          </div>

          {/* PART 3: SPEAKING */}
          <div className="p-8">
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mr-4">
                <span className="text-purple-600 font-bold text-lg">3</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Academic Speaking</h2>
              <span className="ml-auto text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">20 points</span>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-100 mb-6">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                <span className="text-purple-600 mr-2">🎤</span>
                Read these academic sentences aloud:
              </h3>
              <div className="space-y-2">
                {speakingSentences.map((sent, i) => (
                  <div key={i} className="flex items-start">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-purple-200 text-purple-800 rounded-full text-sm font-bold mr-3 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-gray-700 leading-relaxed">{sent}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-6">
              {!isRecording ?
                <button
                  onClick={startRecording}
                  className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-8 py-4 rounded-full font-semibold hover:from-red-600 hover:to-pink-700 transform hover:scale-105 transition-all duration-200 shadow-lg flex items-center"
                >
                  <span className="mr-2">🎤</span>
                  Start Recording
                </button> :
                <button
                  onClick={stopRecording}
                  className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-8 py-4 rounded-full font-semibold hover:from-gray-700 hover:to-gray-800 transform hover:scale-105 transition-all duration-200 shadow-lg flex items-center"
                >
                  <span className="mr-2">⏹</span>
                  Stop Recording
                </button>
              }
              {isRecording && (
                <div className="flex items-center text-red-600 font-semibold animate-pulse">
                  <div className="w-3 h-3 bg-red-600 rounded-full mr-2 animate-ping"></div>
                  Listening...
                </div>
              )}
            </div>

            {/* Transcript Display */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="flex items-center mb-2">
                <span className="text-gray-600 mr-2">📝</span>
                <small className="text-gray-600 font-medium">Live Transcript:</small>
              </div>
              <p className="text-gray-800 italic min-h-[2rem] leading-relaxed">
                {transcript || "Click 'Start Recording' and speak clearly..."}
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="p-8 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
            <button
              onClick={handleSubmit}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-8 rounded-xl font-bold text-xl hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-300 shadow-xl"
            >
              Submit Exam & Get Results
            </button>
            <p className="text-center text-gray-500 text-sm mt-3">
              Make sure to complete all sections before submitting
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Exam;