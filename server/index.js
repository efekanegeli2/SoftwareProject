import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './db.js'; 
import authRoutes from './routes/auth.js';
import examRoutes from './routes/exam.js';
import dashboardRoutes from './routes/dashboard.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/exam', examRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// --- GENİŞLETİLMİŞ SORU HAVUZU (EN AZ 20 SORU) ---
const ADVANCED_QUESTION_BANK = [
  // A1-A2
  { text: "I _____ strictly forbidden from smoking in this area.", options: ["am", "is", "be", "are"], correct: "am" },
  { text: "Where _____ you go last summer holiday?", options: ["did", "do", "were", "was"], correct: "did" },
  { text: "She _____ usually _____ breakfast at 7 AM.", options: ["do / eat", "does / eat", "does / eats", "do / eats"], correct: "does / eat" },
  { text: "Yesterday, I _____ to the cinema with my friends.", options: ["go", "gone", "went", "was"], correct: "went" },
  { text: "This is the _____ book I have ever read.", options: ["good", "better", "best", "most good"], correct: "best" },
  
  // B1-B2
  { text: "If I _____ you, I would accept that offer immediately.", options: ["was", "am", "were", "be"], correct: "were" },
  { text: "He is the man _____ car was stolen yesterday.", options: ["who", "which", "whose", "that"], correct: "whose" },
  { text: "By the time we arrived, the film _____ already _____.", options: ["has / started", "had / started", "was / starting", "did / start"], correct: "had / started" },
  { text: "I look forward to _____ from you soon.", options: ["hear", "hearing", "heard", "be heard"], correct: "hearing" },
  { text: "Despite _____ tired, he continued working.", options: ["he was", "of being", "being", "to be"], correct: "being" },
  { text: "You _____ better see a doctor if the pain persists.", options: ["would", "should", "had", "must"], correct: "had" },
  
  // C1-C2
  { text: "Not only _____ the deadline, but he also submitted a flawless report.", options: ["he met", "did he meet", "he did meet", "met he"], correct: "did he meet" },
  { text: "The government is considering _____ a new tax on luxury goods.", options: ["to impose", "imposing", "impose", "of imposing"], correct: "imposing" },
  { text: "Scarcely had he entered the room _____ the phone rang.", options: ["when", "than", "after", "while"], correct: "when" },
  { text: "It is high time we _____ measures to protect the environment.", options: ["take", "took", "will take", "have taken"], correct: "took" },
  { text: "This methodology is _____ to yield significant results.", options: ["bound", "likely", "probable", "possible"], correct: "bound" },
  { text: "Had I known about the risks, I _____ participated.", options: ["would not have", "will not have", "would not", "had not"], correct: "would not have" },
  { text: "I'd rather you _____ make so much noise.", options: ["don't", "didn't", "won't", "not"], correct: "didn't" },
  { text: "Under no circumstances _____ allowed to enter.", options: ["are you", "you are", "do you", "you do"], correct: "are you" },
  { text: "Hardly _____ the news when he burst into tears.", options: ["had he heard", "he had heard", "did he hear", "he heard"], correct: "had he heard" }
];

const WRITING_TOPICS = [
  "Discuss the impact of Artificial Intelligence on future job markets.",
  "Is climate change the greatest threat facing humanity?",
  "Should education be completely free for everyone?",
  "The role of social media in shaping modern democracy.",
  "Describe a significant technological advancement and its effects."
];

// --- LISTENING (5 SORUYA ÇIKARILDI) ---
const LISTENING_SCENARIOS = [
  {
    topic: "Mars Colonization",
    passage: "As humanity looks towards the stars, Mars has become the primary candidate for colonization. However, the challenges are immense. Radiation levels, lack of breathable atmosphere, and extreme cold make it a hostile environment. Scientists are proposing terraforming as a long-term solution, essentially engineering the planet to support human life.",
    questions: [
      { id: 'L1', text: "What is the primary candidate for colonization?", options: ["Moon", "Mars", "Venus", "Jupiter"], correct: "Mars" },
      { id: 'L2', text: "What is mentioned as a major challenge?", options: ["Aliens", "Radiation", "Heat", "Gravity"], correct: "Radiation" },
      { id: 'L3', text: "What long-term solution is proposed?", options: ["Terraforming", "Building Domes", "Underground Cities", "Space Stations"], correct: "Terraforming" },
      { id: 'L4', text: "Mars is described as a _____ environment.", options: ["Friendly", "Hostile", "Warm", "Wet"], correct: "Hostile" },
      { id: 'L5', text: "Terraforming means engineering the planet to support...", options: ["Robot life", "Plant life", "Human life", "No life"], correct: "Human life" }
    ]
  },
  {
    topic: "History of the Internet",
    passage: "The Internet started in the 1960s as a way for government researchers to share information. Computers in the '60s were large and immobile and in order to make use of information stored in any one computer, one had to either travel to the site of the computer or have magnetic tapes sent through the conventional postal system.",
    questions: [
      { id: 'L1', text: "When did the Internet start?", options: ["1980s", "1960s", "1990s", "2000s"], correct: "1960s" },
      { id: 'L2', text: "Who was it originally for?", options: ["Students", "Gamers", "Government researchers", "Businessmen"], correct: "Government researchers" },
      { id: 'L3', text: "Computers in the 60s were...", options: ["Small", "Mobile", "Large and immobile", "Wireless"], correct: "Large and immobile" },
      { id: 'L4', text: "How was data physically shared?", options: ["USB Drives", "Magnetic tapes", "CDs", "Cloud"], correct: "Magnetic tapes" },
      { id: 'L5', text: "To use data, one had to _____ to the site.", options: ["Email", "Call", "Travel", "Fax"], correct: "Travel" }
    ]
  }
];

// --- SPEAKING (3 CÜMLEYE ÇIKARILDI) ---
const SPEAKING_SETS = [
  ["Artificial Intelligence is transforming the world.", "Sustainability is key to our future.", "Critical thinking is an essential skill."],
  ["Global warming requires urgent action.", "Education is the most powerful weapon.", "Technology brings people together."],
  ["Learning a new language opens many doors.", "Healthy habits lead to a happier life.", "Creativity is intelligence having fun."]
];

app.get('/api/exam/generate', (req, res) => {
  console.log("AI Generating Unique Exam (15 MCQ, 5 Listening, 3 Speaking)...");
  
  // 15 Soru Seç (MCQ)
  const shuffledQuestions = ADVANCED_QUESTION_BANK.sort(() => 0.5 - Math.random()).slice(0, 15);
  
  const randomTopic = WRITING_TOPICS[Math.floor(Math.random() * WRITING_TOPICS.length)];
  const randomListening = LISTENING_SCENARIOS[Math.floor(Math.random() * LISTENING_SCENARIOS.length)];
  const randomSpeaking = SPEAKING_SETS[Math.floor(Math.random() * SPEAKING_SETS.length)];

  res.json({
    questions: shuffledQuestions.map((q, i) => ({ ...q, id: i + 1 })),
    listeningPassage: randomListening.passage,
    listeningQuestions: randomListening.questions,
    writingTopic: randomTopic,
    speakingSentences: randomSpeaking
  });
});

function calculateCEFR(score) {
  if (score >= 90) return "C2 (Mastery)";
  if (score >= 75) return "C1 (Advanced)";
  if (score >= 60) return "B2 (Upper Intermediate)";
  if (score >= 45) return "B1 (Intermediate)";
  if (score >= 30) return "A2 (Elementary)";
  return "A1 (Beginner)";
}

app.post('/api/exam/evaluate', async (req, res) => {
  const { mcqAnswers, listeningAnswers, writingAnswer, speakingScore, userId, mcqScore } = req.body;

  // Puanlama Sistemi (Toplam 100)
  // Writing: Max 15 Puan
  let writingScore = 5;
  if (writingAnswer) {
    const len = writingAnswer.trim().split(/\s+/).length;
    if (len > 50) writingScore = 15;
    else if (len > 20) writingScore = 10;
  }

  // Listening: 5 Soru * 4 Puan = 20 Puan
  let listeningScore = 0;
  if (listeningAnswers) {
     listeningScore = Object.keys(listeningAnswers).length * 4; 
     if(listeningScore > 20) listeningScore = 20;
  }

  // Speaking: Max 20 Puan (Frontend'den geliyor)
  const finalSpeakingScore = speakingScore || 0;
  
  // Grammar: Max 45 Puan (Frontend'den 15 * 3 olarak gelmeli)
  const finalMcqScore = mcqScore || 0;

  const totalScore = finalMcqScore + writingScore + finalSpeakingScore + listeningScore;
  const cefrLevel = calculateCEFR(totalScore);

  if (userId) {
    try {
      const uId = parseInt(userId);
      const userExists = await prisma.user.findUnique({ where: { id: uId } });
      if (userExists) {
        await prisma.examResult.create({
          data: {
            userId: uId,
            score: totalScore,
            grammarScore: finalMcqScore,
            writingScore: writingScore,
            speakingScore: finalSpeakingScore,
            listeningScore: listeningScore,
            level: cefrLevel,
            date: new Date()
          }
        });
        console.log(`✅ Saved! Score: ${totalScore}, Level: ${cefrLevel}`);
      }
    } catch (e) { console.log("DB Error:", e.message); }
  }

  res.json({
    totalScore,
    cefrLevel,
    details: { grammar: finalMcqScore, listening: listeningScore, writing: {score: writingScore}, speaking: {score: finalSpeakingScore} }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));