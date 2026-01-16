import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth.js';
import examRoutes from './routes/exam.js';
import dashboardRoutes from './routes/dashboard.js';

dotenv.config();

// Fallback environment variables if .env file is missing
process.env.DATABASE_URL = process.env.DATABASE_URL || "file:./prisma/dev.db";
process.env.JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
process.env.AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8001";
process.env.PORT = process.env.PORT || 3000;

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/exam', examRoutes);
app.use('/dashboard', dashboardRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'server' });
});

const PORT = process.env.PORT || 3000;

// --- ADMIN API ENDPOINTS ---
// Admin soru üretme endpoint'i
app.post('/api/admin/generate-question', async (req, res) => {
  const { topic, difficulty, count } = req.body;

  try {
    // AI Service'e istek gönder
    const aiPayload = {
      topic: topic || 'grammar',
      difficulty: difficulty || 'intermediate',
      count: Math.min(count || 1, 10) // Max 10 soru
    };

    const aiResponse = await axios.post('http://localhost:8001/generate-questions', aiPayload);

    const response = {
      success: true,
      questions: aiResponse.data
    };

    res.json(response);

  } catch (error) {
    console.error('AI Service soru üretme hatası:', error.message);
    res.status(500).json({
      success: false,
      error: 'AI ile soru üretilemedi',
      questions: []
    });
  }
});

// --- YAPAY ZEKA KODU KALDIRILDI - exam.js'de yeni kod var ---


app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export { prisma };

// --- JSON Veri Okuma Limiti (Ses dosyası için gerekebilir) ---
app.use(express.json({ limit: '50mb' })); // Büyük veriler için limit artırımı

  // Old evaluate endpoint removed - now handled in exam.js
app.post('/api/exam/evaluate', async (req, res) => {
    const { mcqAnswers, writingAnswer, speakingTranscript, speakingScore } = req.body;

    // #region agent log - Server: Evaluate endpoint called
    require('fs').appendFileSync('c:\\Users\\Burkay Çakar\\Desktop\\SoftwareProject\\.cursor\\debug.log', JSON.stringify({id:'log_' + Date.now() + '_server',timestamp:Date.now(),location:'server/index.js:112',message:'Server evaluate endpoint called',data:{speakingScore,mcqAnswersCount:Object.keys(mcqAnswers||{}).length,writingLength:writingAnswer?.length,transcriptLength:speakingTranscript?.length},sessionId:'debug-session',runId:'exam-submit-test',hypothesisId:'C'}) + '\n');
    // #endregion

    console.log("AI Service ile sınav değerlendirmesi başladı...");

    try {
      // AI Service'e istek gönder
      const aiPayload = {
        mcq_answers: Object.values(mcqAnswers || {}), // Array formatına çevir
        writing_text: writingAnswer || "",
        speaking_text: speakingTranscript || "",
        speaking_score: speakingScore // Frontend'den hesaplanan speaking score
      };

      // #region agent log - Server: AI service payload prepared
      require('fs').appendFileSync('c:\\Users\\Burkay Çakar\\Desktop\\SoftwareProject\\.cursor\\debug.log', JSON.stringify({id:'log_' + Date.now() + '_server_payload',timestamp:Date.now(),location:'server/index.js:202',message:'AI service payload prepared',data:{aiPayloadKeys:Object.keys(aiPayload),speaking_score:aiPayload.speaking_score},sessionId:'debug-session',runId:'exam-submit-test',hypothesisId:'C'}) + '\n');
      // #endregion

      // #region agent log - Server: AI service request sent
      require('fs').appendFileSync('c:\\Users\\Burkay Çakar\\Desktop\\SoftwareProject\\.cursor\\debug.log', JSON.stringify({id:'log_' + Date.now() + '_server_ai_request',timestamp:Date.now(),location:'server/index.js:206',message:'AI service request sent',data:{url:'http://localhost:8001/score'},sessionId:'debug-session',runId:'exam-submit-test',hypothesisId:'A'}) + '\n');
      // #endregion

      const aiResponse = await axios.post('http://localhost:8001/score', aiPayload);

      const aiResult = aiResponse.data;

      // #region agent log - Server: AI service response received
      require('fs').appendFileSync('c:\\Users\\Burkay Çakar\\Desktop\\SoftwareProject\\.cursor\\debug.log', JSON.stringify({id:'log_' + Date.now() + '_server_response',timestamp:Date.now(),location:'server/index.js:211',message:'AI service response received',data:{aiResultKeys:Object.keys(aiResult),overall_score:aiResult.overall_score,individual_scores:aiResult.individual_scores},sessionId:'debug-session',runId:'exam-submit-test',hypothesisId:'A'}) + '\n');
      // #endregion

      // Frontend formatına çevir - AI service'den gelen individual scores'u kullan
      const finalResponse = {
        writing: {
          score: Math.round((aiResult.individual_scores?.writing_score || 0) / 5), // 0-100 -> 0-20 scale
          feedback: aiResult.feedback
        },
        speaking: {
          score: Math.round((aiResult.individual_scores?.speaking_score || 0) / 5), // 0-100 -> 0-20 scale
          feedback: aiResult.feedback
        }
      };

      // #region agent log - Hypothesis C: Final response prepared
      require('fs').appendFileSync('c:\\Users\\Burkay Çakar\\Desktop\\SoftwareProject\\.cursor\\debug.log', JSON.stringify({id:'log_' + Date.now() + '_server_final',timestamp:Date.now(),location:'server/index.js:148',message:'Final response prepared',data:{finalWritingScore:finalResponse.writing.score,finalSpeakingScore:finalResponse.speaking.score},sessionId:'debug-session',runId:'initial',hypothesisId:'C'}) + '\n');
      // #endregion

      res.json(finalResponse);

    } catch (error) {
      console.error("AI Service hatası:", error.message);

      // #region agent log - Server: AI service error, using fallback
      require('fs').appendFileSync('c:\\Users\\Burkay Çakar\\Desktop\\SoftwareProject\\.cursor\\debug.log', JSON.stringify({id:'log_' + Date.now() + '_server_error',timestamp:Date.now(),location:'server/index.js:239',message:'AI service error, using fallback',data:{error:error.message,errorCode:error.code,speakingScore},sessionId:'debug-session',runId:'exam-submit-test',hypothesisId:'A'}) + '\n');
      // #endregion

      // Fallback: Eski mantıkla devam et
      let writingScore = 0;
      let writingFeedback = "";
      const wordCount = writingAnswer ? writingAnswer.trim().split(/\s+/).length : 0;

      if (wordCount < 10) {
        writingScore = 5;
        writingFeedback = "Too short. Please elaborate more.";
      } else if (wordCount < 40) {
        writingScore = 12;
        writingFeedback = "Good effort, but try to use more complex sentences.";
      } else {
        writingScore = 20;
        writingFeedback = "Excellent writing! Detailed and clear.";
      }

      let finalSpeakingScore = speakingScore || 0;
      let speakingFeedback = "";

      if (finalSpeakingScore === 0) {
        speakingFeedback = "No speech detected or completely off-topic.";
      } else if (finalSpeakingScore < 10) {
        speakingFeedback = "Your pronunciation needs work. Some words were not recognized.";
      } else if (finalSpeakingScore < 16) {
        speakingFeedback = "Good pronunciation! You missed a few words but overall understandable.";
      } else {
        speakingFeedback = "Native-like pronunciation! Perfect match.";
      }

      res.json({
        writing: { score: writingScore, feedback: writingFeedback },
        speaking: { score: finalSpeakingScore, feedback: speakingFeedback }
      });
    }
  });