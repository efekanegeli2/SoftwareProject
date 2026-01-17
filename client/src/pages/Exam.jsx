import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../context/I18nContext.jsx';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:3000';

function Exam() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { t } = useI18n();

  // --- STATE ---
  const [questions, setQuestions] = useState([]); 
  const [listeningPassage, setListeningPassage] = useState("");
  const [listeningQuestions, setListeningQuestions] = useState([]);
  const [writingTopic, setWritingTopic] = useState("");
  const [speakingSentences, setSpeakingSentences] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cevaplar
  const [mcqAnswers, setMcqAnswers] = useState({});
  const [listeningAnswers, setListeningAnswers] = useState({});
  const [writingAnswer, setWritingAnswer] = useState("");
  
  // Speaking
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [recognitionInstance, setRecognitionInstance] = useState(null);
  
  const [showResult, setShowResult] = useState(false);
  const [scoreData, setScoreData] = useState({});

  // Integrity warnings (FR15)
  const [integrityWarning, setIntegrityWarning] = useState('');

  const getSessionId = () => {
    let sid = sessionStorage.getItem('exam_session_id');
    if (!sid) {
      sid = (window.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(16).slice(2)}`);
      sessionStorage.setItem('exam_session_id', sid);
    }
    return sid;
  };

  const postIntegrity = async (path, body) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}${path}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body || {}),
        // keepalive helps deliver events while navigating away
        keepalive: true
      }
    );
    return res;
  };

  useEffect(() => {
    const fetchExam = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/exam/generate`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        // Not logged in / token expired
        if (res.status === 401 || res.status === 403) {
          logout();
          navigate('/login');
          return;
        }

        if (!res.ok) throw new Error(t({ tr: 'Server hatası', en: 'Server error' }));
        const data = await res.json();

        setQuestions(data.questions || []);
        setListeningPassage(data.listeningPassage || "");
        setListeningQuestions(data.listeningQuestions || []);
        setWritingTopic(data.writingTopic || "");
        setSpeakingSentences(data.speakingSentences || []);
        setLoading(false);
      } catch (err) {
        setError(
          t({
            tr: 'Sınav yüklenemedi. Backend çalışmıyor olabilir ya da giriş yapılmamış olabilir.',
            en: 'The exam could not be loaded. The backend may be down or you may not be logged in.'
          })
        );
        setLoading(false);
      }
    };
    fetchExam();
  }, []);

  // --- FR15: detect tab switching / focus loss and multiple sessions ---
  useEffect(() => {
    if (loading || showResult || error) return;

    let mounted = true;
    const sid = getSessionId();
    let lastLogMs = 0;

    const logEvent = async (type, details) => {
      try {
        const now = Date.now();
        // throttle noisy events
        if (now - lastLogMs < 1200) return;
        lastLogMs = now;
        await postIntegrity('/api/integrity/event', { type, details });
      } catch {
        // ignore
      }
    };

    const start = async () => {
      try {
        const res = await postIntegrity('/api/integrity/session/start', { sessionId: sid });
        if (!res.ok) return;
        const data = await res.json();
        if (mounted && data?.conflict) {
          setIntegrityWarning(
            t({
              tr: '⚠️ Birden fazla sekme/oturum tespit edildi. Bu durum kaydedildi.',
              en: '⚠️ Multiple tabs/sessions detected. This has been logged.'
            })
          );
        }
      } catch {
        // ignore
      }
    };

    const ping = async () => {
      try {
        const res = await postIntegrity('/api/integrity/session/ping', { sessionId: sid });
        if (!res.ok) return;
        const data = await res.json();
        if (mounted && data?.conflict) {
          setIntegrityWarning(
            t({
              tr: '⚠️ Birden fazla sekme/oturum tespit edildi. Bu durum kaydedildi.',
              en: '⚠️ Multiple tabs/sessions detected. This has been logged.'
            })
          );
        }
      } catch {
        // ignore
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        logEvent('TAB_SWITCH', { event: 'visibilitychange', hidden: true, at: new Date().toISOString() });
      }
    };

    const onBlur = () => {
      logEvent('TAB_SWITCH', { event: 'blur', at: new Date().toISOString() });
    };

    const onBeforeUnload = () => {
      // best-effort session stop
      postIntegrity('/api/integrity/session/stop', { sessionId: sid }).catch(() => {});
    };

    start();
    const interval = setInterval(ping, 10000);

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      mounted = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('beforeunload', onBeforeUnload);
      // best-effort stop on unmount
      postIntegrity('/api/integrity/session/stop', { sessionId: sid }).catch(() => {});
    };
  }, [loading, showResult, error]);

  const playAudio = () => {
    if (!listeningPassage) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(listeningPassage);
    utterance.lang = 'en-US'; 
    utterance.rate = 0.9; 
    window.speechSynthesis.speak(utterance);
  };

  const calculateSpeakingScore = (spokenText, targetSentences) => {
    if (!spokenText) return 0;
    const clean = (t) => t.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();
    const spoken = clean(spokenText).split(" ");
    const target = clean(targetSentences.join(" ")).split(" ");
    
    let match = 0;
    spoken.forEach(w => { if(target.includes(w)) match++; });
    
    // Basit kelime eşleşme oranı
    let score = Math.floor((match / target.length) * 20); 
    // Bonus puan: Cümle sayısı arttığı için eşleşme zorlaşabilir, biraz tolerans tanıyalım
    if (score > 20) score = 20;
    return score;
  };

  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition)
      return alert(
        t({
          tr: 'Konuşma tanıma için lütfen Google Chrome kullanın.',
          en: 'Please use Google Chrome for speech recognition.'
        })
      );
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => { setIsRecording(true); setTranscript(""); };
    recognition.onresult = (e) => {
      let t = '';
      for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript;
      setTranscript(t);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.start();
    setRecognitionInstance(recognition);
  };

  const stopRecording = () => {
    if (recognitionInstance) recognitionInstance.stop();
  };

  const handleSubmit = async () => {
    // 1. MCQ Score (Grammar)
    // 15 Soru x 3 Puan = 45 Puan
    let mcqScore = 0;
    questions.forEach(q => { if (mcqAnswers[q.id] === q.correct) mcqScore += 3; });

    // 2. Speaking Score
    const spkScore = calculateSpeakingScore(transcript, speakingSentences);

    const payload = {
      mcqAnswers,
      listeningAnswers,
      writingAnswer,
      speakingTranscript: transcript,
      speakingScore: spkScore
    };

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/exam/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 401 || res.status === 403) {
        logout();
        navigate('/login');
        return;
      }

      if (!res.ok) throw new Error('Evaluation failed');
      const data = await res.json();

      setScoreData({
        total: data.totalScore,
        level: data.cefrLevel,
        mcq: data.details?.grammar || mcqScore,
        listening: data.details?.listening || 0,
        writing: data.details?.writing?.score || 0,
        speaking: data.details?.speaking?.score || spkScore
      });
      setShowResult(true);

    } catch (err) {
      console.error(err);
      alert(
        t({
          tr: 'Gönderim başarısız. Backend açık mı ve giriş yaptın mı kontrol et.',
          en: 'Submission failed. Check if the backend is running and you are logged in.'
        })
      );
    }
  };

  if (loading) return <div style={{ padding: '50px', textAlign: 'center', color: '#666' }}>{t({ tr: 'Sınav yükleniyor...', en: 'Loading exam...' })}</div>;
  if (error) return <div style={{padding:'50px', textAlign:'center', color:'red'}}>{error}</div>;

  if (showResult) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#111827', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
        <div style={{ backgroundColor: '#1f2937', padding: '40px', borderRadius: '15px', maxWidth: '600px', width: '100%', textAlign: 'center' }}>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}><LanguageSwitcher /></div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>{t({ tr: '🎉 Sınav Tamamlandı!', en: '🎉 Exam Completed!' })}</h1>
          
          <div style={{ margin: '20px 0', padding: '20px', backgroundColor: '#374151', borderRadius: '10px' }}>
            <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '5px' }}>{t({ tr: 'İngilizce Seviyen', en: 'Your English Level' })}</p>
            <div style={{ fontSize: '3.5rem', fontWeight: 'bold', color: '#34d399' }}>{scoreData.level}</div>
            <p style={{ color: 'white', fontSize: '1.2rem', marginTop: '10px' }}>{t({ tr: 'Toplam Puan', en: 'Total Score' })}: {scoreData.total} / 100</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', textAlign: 'left' }}>
            <div style={{backgroundColor:'#111827', padding:'10px', borderRadius:'8px'}}>📚 {t({ tr: 'Dilbilgisi', en: 'Grammar' })}: <span style={{float:'right'}}>{scoreData.mcq} / 45</span></div>
            <div style={{backgroundColor:'#111827', padding:'10px', borderRadius:'8px'}}>🎧 {t({ tr: 'Dinleme', en: 'Listening' })}: <span style={{float:'right'}}>{scoreData.listening} / 20</span></div>
            <div style={{backgroundColor:'#111827', padding:'10px', borderRadius:'8px'}}>✍️ {t({ tr: 'Yazma', en: 'Writing' })}: <span style={{float:'right'}}>{scoreData.writing} / 15</span></div>
            <div style={{backgroundColor:'#111827', padding:'10px', borderRadius:'8px'}}>🎤 {t({ tr: 'Konuşma', en: 'Speaking' })}: <span style={{float:'right'}}>{scoreData.speaking} / 20</span></div>
          </div>
          
          <button onClick={() => navigate('/profile')} style={{ width: '100%', marginTop: '30px', padding: '15px', backgroundColor: '#4F46E5', color: 'white', borderRadius: '8px', fontWeight: 'bold', cursor:'pointer', border:'none', fontSize: '1.1rem' }}>
            {t({ tr: 'Profile Git ➡️', en: 'Go to Profile ➡️' })}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '40px 20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: 'white', padding: '40px', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
          <LanguageSwitcher />
        </div>
        {integrityWarning ? (
          <div
            style={{
              marginBottom: '20px',
              padding: '12px 14px',
              backgroundColor: '#fff7ed',
              border: '1px solid #fed7aa',
              borderRadius: '10px',
              color: '#9a3412',
              fontWeight: 600
            }}
          >
            {integrityWarning}
          </div>
        ) : null}
        <h1 style={{ textAlign: 'center', marginBottom: '30px', color: '#1f2937', fontSize: '2rem' }}>{t({ tr: 'İngilizce Seviye Değerlendirmesi', en: 'English Proficiency Assessment' })}</h1>

        {/* 1. GRAMMAR */}
        <div style={{marginBottom:'40px'}}>
          <h2 style={{ color: '#4F46E5', borderBottom: '2px solid #e5e7eb', paddingBottom: '10px', marginBottom: '20px' }}>
            {t({ tr: 'Bölüm 1: Dilbilgisi & Kelime (45 Puan)', en: 'Part 1: Grammar & Vocabulary (45 Pts)' })}
          </h2>
          {questions.map((q, i) => (
            <div key={i} style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <p style={{marginBottom: '10px', fontWeight: '500'}}>{i+1}. {q.text}</p>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                {q.options.map(opt => (
                  <label key={opt} style={{ cursor:'pointer', display: 'flex', alignItems: 'center' }}>
                    <input type="radio" name={`q-${q.id}`} onChange={() => setMcqAnswers({...mcqAnswers, [q.id]: opt})} style={{marginRight: '8px'}} /> 
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 2. WRITING */}
        <div style={{marginBottom:'40px'}}>
          <h2 style={{ color: '#4F46E5', borderBottom: '2px solid #e5e7eb', paddingBottom: '10px', marginBottom: '20px' }}>
            {t({ tr: 'Bölüm 2: Yazma (15 Puan)', en: 'Part 2: Writing (15 Pts)' })}
          </h2>
          <div style={{backgroundColor:'#fff7ed', padding:'15px', marginBottom:'15px', borderRadius:'8px', borderLeft: '4px solid #f97316'}}>
            <b style={{ color: '#c2410c' }}>{t({ tr: 'Konu:', en: 'Topic:' })}</b> {writingTopic}
          </div>
          <textarea
            rows="6"
            style={{ width: '100%', padding: '15px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '1rem' }}
            placeholder={t({ tr: 'Denemeni buraya yaz...', en: 'Type your essay here...' })}
            onChange={(e) => setWritingAnswer(e.target.value)}
          ></textarea>
        </div>

        {/* 3. SPEAKING */}
        <div style={{marginBottom:'40px'}}>
          <h2 style={{ color: '#4F46E5', borderBottom: '2px solid #e5e7eb', paddingBottom: '10px', marginBottom: '20px' }}>
            {t({ tr: 'Bölüm 3: Konuşma (20 Puan)', en: 'Part 3: Speaking (20 Pts)' })}
          </h2>
          <div style={{backgroundColor:'#f0fdf4', padding:'15px', marginBottom:'15px', borderRadius:'8px', borderLeft: '4px solid #22c55e'}}>
            <p style={{ fontWeight: 'bold', color: '#15803d', marginBottom: '5px' }}>{t({ tr: 'Aşağıdaki cümleleri sesli okuyun:', en: 'Read the following sentences aloud:' })}</p>
            <ul style={{listStyleType: 'disc', paddingLeft: '20px', color: '#166534'}}>
              {speakingSentences.map((s, i) => <li key={i} style={{marginBottom: '5px'}}>{s}</li>)}
            </ul>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:'15px', backgroundColor: '#f3f4f6', padding: '15px', borderRadius: '50px'}}>
            <button onClick={isRecording ? stopRecording : startRecording} style={{ padding: '12px 25px', backgroundColor: isRecording ? '#dc2626' : '#4F46E5', color: 'white', borderRadius: '50px', cursor:'pointer', border:'none', fontWeight: 'bold', minWidth: '120px' }}>
              {isRecording ? t({ tr: 'Dur ⏹', en: 'Stop ⏹' }) : t({ tr: 'Kayıt 🎤', en: 'Record 🎤' })}
            </button>
            <span style={{ color: '#4b5563', fontStyle: 'italic', flex: 1 }}>
              {transcript || t({ tr: 'Kayıt butonuna basıp konuşmaya başlayın...', en: 'Click Record and start speaking...' })}
            </span>
          </div>
        </div>

        {/* 4. LISTENING */}
        <div style={{marginBottom:'40px'}}>
          <h2 style={{ color: '#4F46E5', borderBottom: '2px solid #e5e7eb', paddingBottom: '10px', marginBottom: '20px' }}>
            {t({ tr: 'Bölüm 4: Dinleme (20 Puan)', en: 'Part 4: Listening (20 Pts)' })}
          </h2>
          
          <div style={{ textAlign: 'center', marginBottom: '30px', padding: '20px', backgroundColor: '#eff6ff', borderRadius: '10px' }}>
            <button onClick={playAudio} style={{ padding: '12px 30px', backgroundColor: '#F59E0B', color: 'white', border: 'none', borderRadius: '50px', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', margin: '0 auto' }}>
              🔊 {t({ tr: 'Sesli Metni Oynat', en: 'Play Audio Passage' })}
            </button>
            <p style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: '10px' }}>{t({ tr: 'Metni dikkatle dinleyin. Gerekirse tekrar oynatabilirsiniz.', en: 'Listen carefully to the passage. You can replay it if needed.' })}</p>
          </div>

          {listeningQuestions.map((q, i) => (
            <div key={i} style={{ marginBottom: '15px', padding: '15px', backgroundColor: '#fffbeb', borderRadius: '8px', border: '1px solid #fef3c7' }}>
              <p style={{marginBottom: '10px', fontWeight: 'bold', color: '#92400e'}}>{i+1}. {q.text}</p>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                {q.options.map(opt => (
                  <label key={opt} style={{ cursor:'pointer', display: 'flex', alignItems: 'center' }}>
                    <input type="radio" name={`lq-${q.id}`} onChange={() => setListeningAnswers({...listeningAnswers, [q.id]: opt})} style={{marginRight: '8px'}} /> 
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button onClick={handleSubmit} style={{ width: '100%', padding: '20px', backgroundColor: '#10b981', color: 'white', borderRadius: '10px', fontSize: '1.3rem', fontWeight: 'bold', cursor:'pointer', border:'none', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)' }}>
          {t({ tr: 'Sınavı Gönder ✅', en: 'Submit Exam ✅' })}
        </button>

      </div>
    </div>
  );
}

export default Exam;