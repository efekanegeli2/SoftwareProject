import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Exam() {
  const navigate = useNavigate();

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

  // --- AI'DAN SORULARI ÇEKME ---
  useEffect(() => {
    const fetchExamFromAI = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:3000/api/exam/generate');
        if (!response.ok) throw new Error('AI Servisine ulaşılamadı!');
        const data = await response.json();

        setQuestions(data.questions || []); 
        setWritingTopic(data.writingTopic || "Describe a memorable day.");
        setSpeakingSentences(data.speakingSentences || ["Hello world.", "This is a test."]);
        setLoading(false);
      } catch (err) {
        console.error("Hata:", err);
        setError("Yapay zeka servisine ulaşılamıyor.");
        setLoading(false);
      }
    };
    fetchExamFromAI();
  }, []);

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
    if (!spokenText) return 0;
    
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
    
    return score;
  };

  // --- GÖNDERME FONKSİYONU ---
  const handleMcqChange = (questionId, option) => {
    setMcqAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const handleSubmit = async () => {
    console.log("Sınav gönderiliyor...");

    // 1. MCQ Puanı
    let calculatedMcqScore = 0;
    questions.forEach(q => {
      if (mcqAnswers[q.id] === q.correct) calculatedMcqScore += 3; 
    });

    // 2. Speaking Puanı (Frontend'de AKILLI hesapla)
    const realSpeakingScore = calculateSpeakingScore(transcript, speakingSentences);

    const payload = {
      mcqAnswers,
      writingAnswer,
      speakingTranscript: transcript, 
      speakingScore: realSpeakingScore 
    };

    try {
      const response = await fetch('http://localhost:3000/api/exam/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Değerlendirme hatası');
      const aiResult = await response.json();

      setScoreData({
        mcq: calculatedMcqScore,
        writing: aiResult.writing,
        speaking: aiResult.speaking,
        total: calculatedMcqScore + aiResult.writing.score + aiResult.speaking.score,
        status: "Değerlendirildi"
      });
      setShowResult(true);
    } catch (error) {
      console.error("Hata:", error);
      alert("Hata oluştu.");
    }
  };

  // --- RENDER ---
  if (loading) return <div style={{height:'100vh', display:'flex', justifyContent:'center', alignItems:'center', color:'white', backgroundColor:'#111827'}}>Yükleniyor...</div>;
  if (error) return <div style={{height:'100vh', display:'flex', justifyContent:'center', alignItems:'center', color:'white', backgroundColor:'#111827'}}>{error}</div>;

  if (showResult) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#111827', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ backgroundColor: '#1f2937', padding: '40px', borderRadius: '15px', maxWidth: '600px', width: '100%' }}>
          <h1 style={{ textAlign: 'center' }}>📝 Sınav Karnesi</h1>
          <div style={{ textAlign: 'center', fontSize: '1.2rem', marginBottom: '20px', color: '#34d399' }}>Toplam: {scoreData.total} / 100</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ backgroundColor: '#374151', padding: '15px', borderRadius: '10px' }}>
              <h3>Grammar: {scoreData.mcq} / 60</h3>
            </div>
            <div style={{ backgroundColor: '#374151', padding: '15px', borderRadius: '10px' }}>
              <h3>Writing: {scoreData.writing?.score} / 20</h3>
              <p style={{ fontSize: '0.9rem', color: '#d1d5db' }}>"{scoreData.writing?.feedback}"</p>
            </div>
            <div style={{ backgroundColor: '#374151', padding: '15px', borderRadius: '10px' }}>
              <h3>Speaking: {scoreData.speaking?.score} / 20</h3>
              <p style={{ fontSize: '0.9rem', color: '#d1d5db' }}>"{scoreData.speaking?.feedback}"</p>
              <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop:'5px' }}>Algılanan Ses: "{transcript || 'Ses algılanamadı'}"</p>
            </div>
          </div>
          <button onClick={() => navigate('/dashboard')} style={{ width: '100%', marginTop: '20px', padding: '15px', backgroundColor: '#4F46E5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Dashboard'a Dön</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '40px 20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: 'white', padding: '40px', borderRadius: '15px' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '40px' }}>English Exam (AI Powered)</h1>

        {/* PART 1: MCQ */}
        <div style={{ marginBottom: '40px' }}>
          <h2>Part 1: Grammar</h2>
          {questions.map((q, index) => (
            <div key={index} style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f9fafb' }}>
              <p><b>{index + 1}. {q.text}</b></p>
              {q.options.map((opt, i) => (
                <label key={i} style={{ display: 'block', margin: '5px 0' }}>
                  <input type="radio" name={`q-${q.id}`} onChange={() => handleMcqChange(q.id, opt)} /> {opt}
                </label>
              ))}
            </div>
          ))}
        </div>

        {/* PART 2: WRITING */}
        <div style={{ marginBottom: '40px' }}>
          <h2>Part 2: Writing</h2>
          <div style={{ padding: '10px', backgroundColor: '#fff7ed', marginBottom: '10px' }}><b>Topic:</b> {writingTopic}</div>
          <textarea rows="6" style={{ width: '100%', padding:'10px' }} onChange={(e) => setWritingAnswer(e.target.value)} placeholder="Write here..."></textarea>
        </div>

        {/* PART 3: SPEAKING (YENİLENMİŞ) */}
        <div style={{ marginBottom: '40px' }}>
          <h2>Part 3: Speaking</h2>
          <p>Read these sentences aloud:</p>
          <div style={{ padding: '15px', backgroundColor: '#f0fdf4', marginBottom: '15px' }}>
            {speakingSentences.map((sent, i) => <p key={i}>• {sent}</p>)}
          </div>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {!isRecording ? 
              <button onClick={startRecording} style={{ padding: '10px 20px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '50px', cursor:'pointer' }}>🎤 Start Speaking</button> :
              <button onClick={stopRecording} style={{ padding: '10px 20px', backgroundColor: '#374151', color: 'white', border: 'none', borderRadius: '50px', cursor:'pointer' }}>⏹ Stop</button>
            }
            {isRecording && <span style={{color:'red'}}>Dinliyorum...</span>}
          </div>
          
          {/* Anlık Ne Duyduğunu Göster */}
          <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#eee', borderRadius: '5px', minHeight:'40px' }}>
            <small style={{color:'#666'}}>Transkript (Algılanan):</small>
            <p style={{fontStyle:'italic'}}>{transcript}</p>
          </div>
        </div>

        <button onClick={handleSubmit} style={{ width: '100%', padding: '15px', backgroundColor: '#4F46E5', color: 'white', border: 'none', borderRadius: '10px', fontSize:'1.2rem', cursor:'pointer' }}>Finish Exam</button>
      </div>
    </div>
  );
}

export default Exam;