import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

import { PORT, JWT_SECRET } from './config.js';

import { authenticate, requireRole } from './middleware/auth.js';
import {
  ensureSeeded,
  getUserByEmail,
  getUserById,
  createUser,
  listUsers,
  deleteUser,
  addExamResult,
  getExamResultsForUser,
  generateExamForUser,
  getActiveExam,
  clearActiveExam,
  logCheatingEvent
} from './store.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// NOTE: Demo users are seeded on server start (see start() at bottom).

// --- HELPERS ---
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function calculateCEFR(score) {
  if (score >= 90) return 'C2 (Mastery)';
  if (score >= 75) return 'C1 (Advanced)';
  if (score >= 60) return 'B2 (Upper Intermediate)';
  if (score >= 45) return 'B1 (Intermediate)';
  if (score >= 30) return 'A2 (Elementary)';
  return 'A1 (Beginner)';
}

// --- AUTH ---
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, role } = req.body || {};
    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, password, and role are required' });
    }
    if (!['STUDENT', 'TEACHER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be STUDENT, TEACHER, or ADMIN' });
    }
    const user = await createUser({ email, password, role });
    const token = signToken(user);
    res.status(201).json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (e) {
    if (e.code === 'USER_EXISTS') {
      return res.status(400).json({ error: 'User already exists' });
    }
    console.error('Register error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await getUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user);
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- HEALTH ---
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// --- QUESTION BANKS ---
const ADVANCED_QUESTION_BANK = [
  // A1-A2
  { text: 'I _____ strictly forbidden from smoking in this area.', options: ['am', 'is', 'be', 'are'], correct: 'am' },
  { text: 'Where _____ you go last summer holiday?', options: ['did', 'do', 'were', 'was'], correct: 'did' },
  { text: 'She _____ usually _____ breakfast at 7 AM.', options: ['do / eat', 'does / eat', 'does / eats', 'do / eats'], correct: 'does / eat' },
  { text: 'Yesterday, I _____ to the cinema with my friends.', options: ['go', 'gone', 'went', 'was'], correct: 'went' },
  { text: 'This is the _____ book I have ever read.', options: ['good', 'better', 'best', 'most good'], correct: 'best' },

  // B1-B2
  { text: 'If I _____ you, I would accept that offer immediately.', options: ['was', 'am', 'were', 'be'], correct: 'were' },
  { text: 'He is the man _____ car was stolen yesterday.', options: ['who', 'which', 'whose', 'that'], correct: 'whose' },
  { text: 'By the time we arrived, the film _____ already _____.', options: ['has / started', 'had / started', 'was / starting', 'did / start'], correct: 'had / started' },
  { text: 'I look forward to _____ from you soon.', options: ['hear', 'hearing', 'heard', 'be heard'], correct: 'hearing' },
  { text: 'Despite _____ tired, he continued working.', options: ['he was', 'of being', 'being', 'to be'], correct: 'being' },
  { text: 'You _____ better see a doctor if the pain persists.', options: ['would', 'should', 'had', 'must'], correct: 'had' },

  // C1-C2
  { text: 'Not only _____ the deadline, but he also submitted a flawless report.', options: ['he met', 'did he meet', 'he did meet', 'met he'], correct: 'did he meet' },
  { text: 'The government is considering _____ a new tax on luxury goods.', options: ['to impose', 'imposing', 'impose', 'of imposing'], correct: 'imposing' },
  { text: 'Scarcely had he entered the room _____ the phone rang.', options: ['when', 'than', 'after', 'while'], correct: 'when' },
  { text: 'It is high time we _____ measures to protect the environment.', options: ['take', 'took', 'will take', 'have taken'], correct: 'took' },
  { text: 'This methodology is _____ to yield significant results.', options: ['bound', 'likely', 'probable', 'possible'], correct: 'bound' },
  { text: 'Had I known about the risks, I _____ participated.', options: ['would not have', 'will not have', 'would not', 'had not'], correct: 'would not have' },
  { text: "I'd rather you _____ make so much noise.", options: ["don't", "didn't", "won't", 'not'], correct: "didn't" },
  { text: 'Under no circumstances _____ allowed to enter.', options: ['are you', 'you are', 'do you', 'you do'], correct: 'are you' },
  { text: 'Hardly _____ the news when he burst into tears.', options: ['had he heard', 'he had heard', 'did he hear', 'he heard'], correct: 'had he heard' }
];

const WRITING_TOPICS = [
  'Discuss the impact of Artificial Intelligence on future job markets.',
  'Is climate change the greatest threat facing humanity?',
  'Should education be completely free for everyone?',
  'The role of social media in shaping modern democracy.',
  'Describe a significant technological advancement and its effects.'
];

const LISTENING_SCENARIOS = [
  {
    id: 'mars',
    topic: 'Mars Colonization',
    passage:
      'As humanity looks towards the stars, Mars has become the primary candidate for colonization. However, the challenges are immense. Radiation levels, lack of breathable atmosphere, and extreme cold make it a hostile environment. Scientists are proposing terraforming as a long-term solution, essentially engineering the planet to support human life.',
    questions: [
      { id: 'L1', text: 'What is the primary candidate for colonization?', options: ['Moon', 'Mars', 'Venus', 'Jupiter'], correct: 'Mars' },
      { id: 'L2', text: 'What is mentioned as a major challenge?', options: ['Aliens', 'Radiation', 'Heat', 'Gravity'], correct: 'Radiation' },
      { id: 'L3', text: 'What long-term solution is proposed?', options: ['Terraforming', 'Building Domes', 'Underground Cities', 'Space Stations'], correct: 'Terraforming' },
      { id: 'L4', text: 'Mars is described as a _____ environment.', options: ['Friendly', 'Hostile', 'Warm', 'Wet'], correct: 'Hostile' },
      { id: 'L5', text: 'Terraforming means engineering the planet to support...', options: ['Robot life', 'Plant life', 'Human life', 'No life'], correct: 'Human life' }
    ]
  },
  {
    id: 'internet',
    topic: 'History of the Internet',
    passage:
      "The Internet started in the 1960s as a way for government researchers to share information. Computers in the '60s were large and immobile and in order to make use of information stored in any one computer, one had to either travel to the site of the computer or have magnetic tapes sent through the conventional postal system.",
    questions: [
      { id: 'L1', text: 'When did the Internet start?', options: ['1980s', '1960s', '1990s', '2000s'], correct: '1960s' },
      { id: 'L2', text: 'Who was it originally for?', options: ['Students', 'Gamers', 'Government researchers', 'Businessmen'], correct: 'Government researchers' },
      { id: 'L3', text: 'Computers in the 60s were...', options: ['Small', 'Mobile', 'Large and immobile', 'Wireless'], correct: 'Large and immobile' },
      { id: 'L4', text: 'How was data physically shared?', options: ['USB Drives', 'Magnetic tapes', 'CDs', 'Cloud'], correct: 'Magnetic tapes' },
      { id: 'L5', text: 'To use data, one had to _____ to the site.', options: ['Email', 'Call', 'Travel', 'Fax'], correct: 'Travel' }
    ]
  }
];

const SPEAKING_SETS = [
  ['Artificial Intelligence is transforming the world.', 'Sustainability is key to our future.', 'Critical thinking is an essential skill.'],
  ['Global warming requires urgent action.', 'Education is the most powerful weapon.', 'Technology brings people together.'],
  ['Learning a new language opens many doors.', 'Healthy habits lead to a happier life.', 'Creativity is intelligence having fun.']
];

// --- EXAM ---
app.get('/api/exam/generate', authenticate, requireRole('STUDENT'), async (req, res) => {
  try {
    const userId = req.user.id;
    // Pull randomized content from the DB (question bank, scenarios, topics, speaking prompts)
    // and persist the active attempt (FR11, FR20).
    const payload = await generateExamForUser(userId);
    res.json(payload);
  } catch (e) {
    console.error('Generate exam error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/exam/evaluate', authenticate, requireRole('STUDENT'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { mcqAnswers, listeningAnswers, writingAnswer, speakingTranscript, speakingScore } = req.body || {};

    const active = await getActiveExam(userId);
    const mcqCorrect = active?.mcqCorrect || {};
    const listeningCorrect = active?.listeningCorrect || {};

  // 1) Grammar (45 pts) => 15 * 3
  let grammarScore = 0;
  if (mcqAnswers && typeof mcqAnswers === 'object') {
    for (const [qid, ans] of Object.entries(mcqAnswers)) {
      if (String(ans) === String(mcqCorrect[String(qid)])) grammarScore += 3;
    }
  }
  if (grammarScore > 45) grammarScore = 45;

  // 2) Listening (20 pts) => 5 * 4
  let listeningScore = 0;
  if (listeningAnswers && typeof listeningAnswers === 'object') {
    for (const [qid, ans] of Object.entries(listeningAnswers)) {
      if (String(ans) === String(listeningCorrect[String(qid)])) listeningScore += 4;
    }
  }
  if (listeningScore > 20) listeningScore = 20;

  // 3) Writing (15 pts) => IMPORTANT: empty => 0
  let writingScore = 0;
  const text = (writingAnswer || '').trim();
  if (text) {
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    if (wordCount > 50) writingScore = 15;
    else if (wordCount > 20) writingScore = 10;
    else writingScore = 5;
  }

  // 4) Speaking (20 pts) => from client
  const finalSpeakingScore = Number.isFinite(Number(speakingScore)) ? Number(speakingScore) : 0;
  const speakingPts = Math.max(0, Math.min(20, finalSpeakingScore));

  const totalScore = grammarScore + listeningScore + writingScore + speakingPts;
  const cefrLevel = calculateCEFR(totalScore);

    // Persist result + student's submission snapshot (FR7, FR20)
    const saved = await addExamResult(userId, {
      score: totalScore,
      grammarScore,
      writingScore,
      speakingScore: speakingPts,
      listeningScore,
      level: cefrLevel,
      mcqAnswers: mcqAnswers ?? null,
      listeningAnswers: listeningAnswers ?? null,
      writingAnswer: writingAnswer ?? null,
      speakingTranscript: speakingTranscript ?? null
    });

    await clearActiveExam(userId);

    res.json({
      totalScore,
      cefrLevel,
      details: {
        grammar: grammarScore,
        listening: listeningScore,
        writing: { score: writingScore },
        speaking: { score: speakingPts }
      },
      savedExamId: saved.id
    });
  } catch (e) {
    console.error('Evaluate exam error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- INTEGRITY (FR15) ---
// Client can call this when it detects tab-switch / focus loss, etc.
app.post('/api/integrity/event', authenticate, requireRole('STUDENT'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, details } = req.body || {};
    if (!type) return res.status(400).json({ error: 'type is required' });
    await logCheatingEvent(userId, String(type), details ?? null);
    res.json({ success: true });
  } catch (e) {
    console.error('Integrity event error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- DASHBOARD (STUDENT) ---
app.get('/api/dashboard/profile', authenticate, requireRole('STUDENT'), async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const history = await getExamResultsForUser(userId);
    const totalExams = history.length;
    const averageScore = totalExams > 0 ? Math.floor(history.reduce((a, r) => a + (r.score || 0), 0) / totalExams) : 0;
    const lastExamDate = totalExams > 0 ? history[0].date : null;

    res.json({
      user: { id: user.id, name: user.email?.split('@')[0], email: user.email },
      stats: { totalExams, averageScore, lastExamDate },
      history
    });
  } catch (e) {
    console.error('Profile dashboard error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- TEACHER ---
app.get('/api/dashboard/teacher', authenticate, requireRole('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const users = (await listUsers()).filter(u => u.role === 'STUDENT');

    const rows = await Promise.all(
      users.map(async (u) => {
        const history = await getExamResultsForUser(u.id);
        const latest = history[0] || null;
        const totalExams = history.length;
        const averageScore = totalExams > 0 ? Math.floor(history.reduce((a, r) => a + (r.score || 0), 0) / totalExams) : 0;
        return {
          id: u.id,
          email: u.email,
          totalExams,
          averageScore,
          latest: latest ? { date: latest.date, score: latest.score, level: latest.level } : null
        };
      })
    );

    res.json(rows);
  } catch (e) {
    console.error('Teacher dashboard error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/dashboard/teacher/student/:id', authenticate, requireRole('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const user = await getUserById(id);
    if (!user || user.role !== 'STUDENT') return res.status(404).json({ error: 'Student not found' });
    const history = await getExamResultsForUser(id);
    res.json({ id: user.id, email: user.email, history });
  } catch (e) {
    console.error('Teacher student dashboard error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- ADMIN ---
app.get('/api/dashboard/admin', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const users = await listUsers();
    const totalUsers = users.length;
    const students = users.filter(u => u.role === 'STUDENT').length;
    const teachers = users.filter(u => u.role === 'TEACHER').length;
    const admins = users.filter(u => u.role === 'ADMIN').length;

    const histories = await Promise.all(users.map(u => getExamResultsForUser(u.id)));
    const totalExams = histories.reduce((acc, h) => acc + h.length, 0);

    res.json({
      stats: { totalUsers, students, teachers, admins, totalExams },
      users
    });
  } catch (e) {
    console.error('Admin dashboard error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/dashboard/admin/user/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const targetId = Number(req.params.id);
    if (targetId === Number(req.user.id)) {
      return res.status(400).json({ error: 'You cannot delete yourself' });
    }
    const ok = await deleteUser(targetId);
    if (!ok) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true });
  } catch (e) {
    console.error('Delete user error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function start() {
  await ensureSeeded();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
