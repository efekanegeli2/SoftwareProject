import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth.js';
import examRoutes from './routes/exam.js';
import dashboardRoutes from './routes/dashboard.js';

dotenv.config();

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

// --- YAPAY ZEKA SINAV OLUŞTURUCU (MOCK AI) ---
app.get('/api/exam/generate', (req, res) => {
  console.log("AI Sınav isteği aldı, sorular hazırlanıyor...");

  // 1. Havuzdaki Sorular (Genişletilebilir)
  const questionBank = [
    { text: "I _____ a student.", options: ["is", "are", "am", "be"], correct: "am" },
    { text: "She _____ to the gym every day.", options: ["go", "goes", "going", "gone"], correct: "goes" },
    { text: "They _____ football right now.", options: ["play", "plays", "are playing", "played"], correct: "are playing" },
    { text: "_____ you like coffee?", options: ["Do", "Does", "Is", "Are"], correct: "Do" },
    { text: "Yesterday, I _____ to the cinema.", options: ["go", "gone", "went", "was"], correct: "went" },
    { text: "This is the _____ book I have ever read.", options: ["good", "better", "best", "goodest"], correct: "best" },
    { text: "If it rains, we _____ stay at home.", options: ["will", "would", "are", "have"], correct: "will" },
    { text: "I have lived here _____ 2010.", options: ["for", "since", "ago", "in"], correct: "since" },
    { text: "He is interested _____ learning Spanish.", options: ["on", "at", "in", "with"], correct: "in" },
    { text: "I didn't _____ the answer.", options: ["know", "knew", "known", "knows"], correct: "know" },
    { text: "Where _____ you born?", options: ["was", "were", "are", "did"], correct: "were" },
    { text: "The car was _____ by my father.", options: ["wash", "washed", "washing", "washes"], correct: "washed" },
    { text: "She told me that she _____ busy.", options: ["is", "was", "were", "has"], correct: "was" },
    { text: "You _____ wear a seatbelt.", options: ["must", "should", "might", "can"], correct: "must" },
    { text: "I enjoy _____ movies.", options: ["watch", "watching", "to watch", "watched"], correct: "watching" },
    { text: "This tea is too hot _____ drink.", options: ["to", "for", "that", "so"], correct: "to" },
    { text: "Water _____ at 100 degrees Celsius.", options: ["boil", "boils", "boiling", "boiled"], correct: "boils" },
    { text: "I look forward _____ from you.", options: ["hear", "to hear", "hearing", "to hearing"], correct: "to hearing" },
    { text: "She is good _____ math.", options: ["in", "at", "on", "with"], correct: "at" },
    { text: "Have you ever _____ to Paris?", options: ["been", "gone", "went", "go"], correct: "been" }
  ];

  const writingTopics = [
    "Describe your dream holiday. Where would you go and why?",
    "What are the advantages and disadvantages of technology?",
    "Do you think money can buy happiness? Why or why not?",
    "Describe a person who has influenced you the most."
  ];

  const speakingSets = [
    ["Technology connects us.", "I like learning English.", "The weather is nice today."],
    ["Health is wealth.", "Books are our best friends.", "Travel broadens the mind."],
    ["Practice makes perfect.", "Time is money.", "Honesty is the best policy."]
  ];

  // 2. Rastgele 10 Soru Seç (AI Logiği)
  // Soruları karıştır
  const shuffledQuestions = questionBank.sort(() => 0.5 - Math.random());
  // İlk 10 tanesini al
  const selectedQuestions = shuffledQuestions.slice(0, 10).map((q, index) => ({
    id: index + 1, // Frontend için ID veriyoruz
    text: q.text,
    options: q.options.sort(() => 0.5 - Math.random()), // Şıkları da karıştır
    correct: q.correct
  }));

  // 3. Rastgele Writing ve Speaking Konusu Seç
  const randomTopic = writingTopics[Math.floor(Math.random() * writingTopics.length)];
  const randomSpeaking = speakingSets[Math.floor(Math.random() * speakingSets.length)];

  // 4. Paketi Frontend'e Gönder
  res.json({
    questions: selectedQuestions,
    writingTopic: randomTopic,
    speakingSentences: randomSpeaking
  });
});
// --- YAPAY ZEKA KODU BITTI ---


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

// --- YAPAY ZEKA DEĞERLENDİRME MOTORU (MOCK) ---
app.post('/api/exam/evaluate', (req, res) => {
  // speakingScore artık frontend'den geliyor!
  const { mcqAnswers, writingAnswer, speakingTranscript, speakingScore } = req.body;

  console.log("Gerçekçi Sınav Değerlendirmesi Başladı...");

  // 1. WRITING (Burası aynı kalabilir, kelime sayar)
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

  // 2. SPEAKING (ARTIK DAHA AKILLI)
  // Frontend'den gelen skoru alıyoruz (0-20 arası)
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
});