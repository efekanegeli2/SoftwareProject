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
  logCheatingEvent,
  listCheatingEventsForUser,
  listMcqQuestions,
  createMcqQuestion,
  deleteMcqQuestion
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

// --- INTEGRITY SESSION TRACKING (FR15 - multiple sessions) ---
// We keep a lightweight in-memory map of "active exam sessions" per attempt.
// This detects multiple tabs/devices during an active attempt without changing the DB schema.
const SESSION_TTL_MS = 2 * 60 * 1000; // consider a session active if seen within last 2 minutes
const attemptSessions = new Map(); // attemptId -> Map(sessionId -> { lastSeen, ip, ua, lastConflictLog })

function cleanupAttemptSessions(attemptId, nowMs) {
  const m = attemptSessions.get(attemptId);
  if (!m) return;
  for (const [sid, meta] of m.entries()) {
    if (!meta?.lastSeen || nowMs - meta.lastSeen > SESSION_TTL_MS) m.delete(sid);
  }
  if (m.size === 0) attemptSessions.delete(attemptId);
}

function getOtherActiveSessionIds(m, sessionId, nowMs) {
  const others = [];
  for (const [sid, meta] of m.entries()) {
    if (sid === sessionId) continue;
    if (meta?.lastSeen && nowMs - meta.lastSeen <= SESSION_TTL_MS) others.push(sid);
  }
  return others;
}

// --- REPORT EXPORT HELPERS (FR16) ---
function csvEscape(value) {
  const s = value === null || value === undefined ? '' : String(value);
  // Escape if contains delimiter, quotes, or new line.
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows) {
  return rows.map((row) => row.map(csvEscape).join(',')).join('\n');
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

function sendCsv(res, filenameBase, headerRow, dataRows) {
  // Add UTF-8 BOM for Excel compatibility.
  const csv = '\ufeff' + toCsv([headerRow, ...dataRows]);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.csv"`);
  res.status(200).send(csv);
}

function pdfTextEscape(value) {
  const s = value === null || value === undefined ? '' : String(value);
  // Escape characters that are special inside PDF literal strings.
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function wrapTextLines(line, maxLen = 92) {
  const str = String(line ?? '');
  if (str.length <= maxLen) return [str];

  const out = [];
  const words = str.split(/\s+/).filter(Boolean);
  let cur = '';

  for (const w of words) {
    if (!cur) {
      if (w.length > maxLen) {
        for (let i = 0; i < w.length; i += maxLen) out.push(w.slice(i, i + maxLen));
      } else {
        cur = w;
      }
      continue;
    }

    if (cur.length + 1 + w.length <= maxLen) {
      cur = `${cur} ${w}`;
    } else {
      out.push(cur);
      if (w.length > maxLen) {
        for (let i = 0; i < w.length; i += maxLen) out.push(w.slice(i, i + maxLen));
        cur = '';
      } else {
        cur = w;
      }
    }
  }

  if (cur) out.push(cur);
  return out.length ? out : [''];
}

function buildSimplePdf(title, lines) {
  const normalizedTitle = String(title || 'Report');
  const wrapped = [];
  for (const line of lines || []) {
    wrapped.push(...wrapTextLines(line, 92));
  }

  const linesPerPage = 48;
  const pages = [];
  for (let i = 0; i < wrapped.length; i += linesPerPage) {
    pages.push(wrapped.slice(i, i + linesPerPage));
  }
  if (pages.length === 0) pages.push([]);

  // PDF object numbering:
  // 1 = Catalog, 2 = Pages, 3 = Font, then [Page, Contents] pairs.
  const pageCount = pages.length;
  const pageObjNums = [];
  const contentObjNums = [];
  let nextNum = 4;
  for (let i = 0; i < pageCount; i++) {
    pageObjNums.push(nextNum);
    contentObjNums.push(nextNum + 1);
    nextNum += 2;
  }
  const maxObj = nextNum - 1;

  let out = '%PDF-1.4\n';
  const offsets = new Array(maxObj + 1).fill(0);

  const add = (s) => {
    out += s;
  };

  const addObj = (num, body) => {
    offsets[num] = Buffer.byteLength(out, 'utf8');
    add(`${num} 0 obj\n${body}\nendobj\n`);
  };

  const kids = pageObjNums.map((n) => `${n} 0 R`).join(' ');
  addObj(1, `<< /Type /Catalog /Pages 2 0 R >>`);
  addObj(2, `<< /Type /Pages /Kids [ ${kids} ] /Count ${pageCount} >>`);
  addObj(3, `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`);

  const mediaBox = '[0 0 595 842]'; // A4 in points

  for (let i = 0; i < pageCount; i++) {
    const pageNum = pageObjNums[i];
    const contentNum = contentObjNums[i];
    const pageTitle = pageCount > 1 ? `${normalizedTitle} (Page ${i + 1}/${pageCount})` : normalizedTitle;

    const ops = [];
    ops.push('BT');
    ops.push('/F1 18 Tf 50 800 Td');
    ops.push(`(${pdfTextEscape(pageTitle)}) Tj`);
    ops.push('/F1 10 Tf 0 -22 Td');

    const pageLines = pages[i] || [];
    if (!pageLines.length) {
      ops.push(`(${pdfTextEscape('No data.')}) Tj`);
    } else {
      for (let li = 0; li < pageLines.length; li++) {
        const line = pageLines[li];
        ops.push(`(${pdfTextEscape(line)}) Tj`);
        if (li !== pageLines.length - 1) ops.push('0 -14 Td');
      }
    }
    ops.push('ET');

    const content = ops.join('\n');
    const contentLen = Buffer.byteLength(content, 'utf8');

    addObj(
      pageNum,
      `<< /Type /Page /Parent 2 0 R /MediaBox ${mediaBox} /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentNum} 0 R >>`
    );
    addObj(contentNum, `<< /Length ${contentLen} >>\nstream\n${content}\nendstream`);
  }

  const xrefOffset = Buffer.byteLength(out, 'utf8');
  add(`xref\n0 ${maxObj + 1}\n`);
  add('0000000000 65535 f \n');
  for (let i = 1; i <= maxObj; i++) {
    const off = offsets[i] || 0;
    add(`${String(off).padStart(10, '0')} 00000 n \n`);
  }
  add(`trailer\n<< /Size ${maxObj + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return Buffer.from(out, 'utf8');
}

function sendPdf(res, filenameBase, title, lines) {
  const pdf = buildSimplePdf(title, lines);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.pdf"`);
  res.status(200).send(pdf);
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

// --- QUESTION BANK MANAGEMENT (TEACHER / ADMIN) ---
app.get('/api/questions/mcq', authenticate, requireRole('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const take = req.query?.take;
    const skip = req.query?.skip;
    const rows = await listMcqQuestions({ take, skip });
    res.json(rows);
  } catch (e) {
    console.error('List MCQ error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/questions/mcq', authenticate, requireRole('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const { text, options, correct, difficulty } = req.body || {};
    const created = await createMcqQuestion({ text, options, correct, difficulty });
    res.status(201).json(created);
  } catch (e) {
    if (e?.code === 'VALIDATION') {
      return res.status(400).json({ error: e.message });
    }
    console.error('Create MCQ error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/questions/mcq/:id', authenticate, requireRole('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const ok = await deleteMcqQuestion(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Question not found' });
    return res.json({ ok: true });
  } catch (e) {
    if (e?.code === 'VALIDATION') {
      return res.status(400).json({ error: e.message });
    }
    console.error('Delete MCQ error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});


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

// Track exam sessions per attempt to detect multiple concurrent sessions/tabs.
app.post('/api/integrity/session/start', authenticate, requireRole('STUDENT'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.body || {};
    const sid = String(sessionId || '').trim();
    if (!sid) return res.status(400).json({ error: 'sessionId is required' });

    const active = await getActiveExam(userId);
    if (!active?.attemptId) return res.status(409).json({ error: 'No active exam attempt' });

    const attemptId = Number(active.attemptId);
    const nowMs = Date.now();

    let m = attemptSessions.get(attemptId);
    if (!m) {
      m = new Map();
      attemptSessions.set(attemptId, m);
    }
    cleanupAttemptSessions(attemptId, nowMs);

    const others = getOtherActiveSessionIds(m, sid, nowMs);
    const conflict = others.length > 0;
    if (conflict) {
      await logCheatingEvent(userId, 'MULTIPLE_SESSIONS', {
        sessionId: sid,
        otherSessionIds: others,
        at: new Date().toISOString(),
        userAgent: req.headers['user-agent'] || null
      });
    }

    const meta = m.get(sid) || {};
    m.set(sid, {
      ...meta,
      lastSeen: nowMs,
      ip: req.ip,
      ua: req.headers['user-agent'] || '',
      lastConflictLog: meta.lastConflictLog || 0
    });

    res.json({ success: true, conflict, activeSessions: m.size });
  } catch (e) {
    console.error('Integrity session start error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/integrity/session/ping', authenticate, requireRole('STUDENT'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.body || {};
    const sid = String(sessionId || '').trim();
    if (!sid) return res.status(400).json({ error: 'sessionId is required' });

    const active = await getActiveExam(userId);
    if (!active?.attemptId) return res.status(409).json({ error: 'No active exam attempt' });

    const attemptId = Number(active.attemptId);
    const nowMs = Date.now();

    let m = attemptSessions.get(attemptId);
    if (!m) {
      m = new Map();
      attemptSessions.set(attemptId, m);
    }
    cleanupAttemptSessions(attemptId, nowMs);

    const meta = m.get(sid) || {};
    const others = getOtherActiveSessionIds(m, sid, nowMs);
    const conflict = others.length > 0;

    // Throttle conflict logs to avoid spamming DB.
    const lastLogged = Number(meta.lastConflictLog) || 0;
    if (conflict && nowMs - lastLogged > 30 * 1000) {
      await logCheatingEvent(userId, 'MULTIPLE_SESSIONS', {
        sessionId: sid,
        otherSessionIds: others,
        at: new Date().toISOString(),
        endpoint: 'ping',
        userAgent: req.headers['user-agent'] || null
      });
      meta.lastConflictLog = nowMs;
    }

    m.set(sid, {
      ...meta,
      lastSeen: nowMs,
      ip: req.ip,
      ua: req.headers['user-agent'] || ''
    });

    res.json({ success: true, conflict, activeSessions: m.size });
  } catch (e) {
    console.error('Integrity session ping error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/integrity/session/stop', authenticate, requireRole('STUDENT'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.body || {};
    const sid = String(sessionId || '').trim();
    if (!sid) return res.status(400).json({ error: 'sessionId is required' });

    const active = await getActiveExam(userId);
    if (!active?.attemptId) return res.json({ success: true });

    const attemptId = Number(active.attemptId);
    const m = attemptSessions.get(attemptId);
    if (m) {
      m.delete(sid);
      if (m.size === 0) attemptSessions.delete(attemptId);
    }
    res.json({ success: true });
  } catch (e) {
    console.error('Integrity session stop error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Teacher/Admin can view cheating logs for a student.
app.get('/api/integrity/teacher/student/:id/events', authenticate, requireRole('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid student id' });
    const take = req.query?.take;
    const skip = req.query?.skip;
    const events = await listCheatingEventsForUser(id, { take, skip });
    res.json(events);
  } catch (e) {
    console.error('Teacher integrity events error:', e);
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

// --- REPORTS (FR16) ---
app.get('/api/reports/student', authenticate, requireRole('STUDENT'), async (req, res) => {
  try {
    const format = String(req.query?.format || 'pdf').toLowerCase();
    if (!['pdf', 'csv'].includes(format)) {
      return res.status(400).json({ error: "format must be 'pdf' or 'csv'" });
    }

    const userId = Number(req.user.id);
    const user = await getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const history = await getExamResultsForUser(userId);
    const totalExams = history.length;
    const averageScore = totalExams > 0 ? Math.floor(history.reduce((a, r) => a + (r.score || 0), 0) / totalExams) : 0;
    const lastExamDate = totalExams > 0 ? history[0].date : null;

    const filenameBase = `student_report_${userId}_${dateStamp()}`;

    if (format === 'csv') {
      const header = ['Date', 'Level', 'TotalScore', 'Grammar', 'Listening', 'Writing', 'Speaking'];
      const rows = history.map((r) => [
        r.date,
        r.level,
        r.score,
        r.grammarScore,
        r.listeningScore,
        r.writingScore,
        r.speakingScore
      ]);
      return sendCsv(res, filenameBase, header, rows);
    }

    const lines = [];
    lines.push(`Student: ${user.email}`);
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push('');
    lines.push('Summary');
    lines.push(`Total exams: ${totalExams}`);
    lines.push(`Average score: ${averageScore}/100`);
    lines.push(`Last activity: ${lastExamDate ? new Date(lastExamDate).toLocaleString() : '-'}`);
    lines.push('');
    lines.push('Exam History');
    if (!history.length) {
      lines.push('No exams found.');
    } else {
      history.forEach((r, idx) => {
        lines.push(
          `${idx + 1}. ${new Date(r.date).toLocaleString()} • ${r.level} • ${r.score}/100 (G:${r.grammarScore}, L:${r.listeningScore}, W:${r.writingScore}, S:${r.speakingScore})`
        );
      });
    }
    return sendPdf(res, filenameBase, 'Student Report', lines);
  } catch (e) {
    console.error('Student report export error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/reports/teacher', authenticate, requireRole('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const format = String(req.query?.format || 'pdf').toLowerCase();
    if (!['pdf', 'csv'].includes(format)) {
      return res.status(400).json({ error: "format must be 'pdf' or 'csv'" });
    }

    const users = (await listUsers()).filter((u) => u.role === 'STUDENT');

    const rows = await Promise.all(
      users.map(async (u) => {
        const history = await getExamResultsForUser(u.id);
        const totalExams = history.length;
        const averageScore = totalExams > 0 ? Math.floor(history.reduce((a, r) => a + (r.score || 0), 0) / totalExams) : 0;
        const latest = history[0] || null;
        return {
          id: u.id,
          email: u.email,
          totalExams,
          averageScore,
          latestDate: latest ? latest.date : null,
          latestScore: latest ? latest.score : null,
          latestLevel: latest ? latest.level : null
        };
      })
    );

    const filenameBase = `teacher_report_${dateStamp()}`;

    if (format === 'csv') {
      const header = ['StudentId', 'Email', 'TotalExams', 'AverageScore', 'LatestDate', 'LatestScore', 'LatestLevel'];
      const dataRows = rows.map((r) => [
        r.id,
        r.email,
        r.totalExams,
        r.averageScore,
        r.latestDate || '',
        r.latestScore ?? '',
        r.latestLevel || ''
      ]);
      return sendCsv(res, filenameBase, header, dataRows);
    }

    const lines = [];
    lines.push(`Teacher: ${req.user.email}`);
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push('');
    lines.push('Students Overview');
    if (!rows.length) {
      lines.push('No students found.');
    } else {
      rows.forEach((r, idx) => {
        const latestPart = r.latestDate
          ? `${new Date(r.latestDate).toLocaleString()} • ${r.latestLevel} • ${r.latestScore}/100`
          : '-';
        lines.push(`${idx + 1}. ${r.email} (ID: ${r.id}) — Exams: ${r.totalExams}, Avg: ${r.averageScore}/100, Latest: ${latestPart}`);
      });
    }
    return sendPdf(res, filenameBase, 'Teacher Report', lines);
  } catch (e) {
    console.error('Teacher report export error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/reports/teacher/student/:id', authenticate, requireRole('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const format = String(req.query?.format || 'pdf').toLowerCase();
    if (!['pdf', 'csv'].includes(format)) {
      return res.status(400).json({ error: "format must be 'pdf' or 'csv'" });
    }

    const id = Number(req.params.id);
    const user = await getUserById(id);
    if (!user || user.role !== 'STUDENT') return res.status(404).json({ error: 'Student not found' });

    const history = await getExamResultsForUser(id);
    const totalExams = history.length;
    const averageScore = totalExams > 0 ? Math.floor(history.reduce((a, r) => a + (r.score || 0), 0) / totalExams) : 0;
    const lastExamDate = totalExams > 0 ? history[0].date : null;

    const filenameBase = `student_report_${id}_${dateStamp()}`;

    if (format === 'csv') {
      const header = ['Date', 'Level', 'TotalScore', 'Grammar', 'Listening', 'Writing', 'Speaking'];
      const rows = history.map((r) => [
        r.date,
        r.level,
        r.score,
        r.grammarScore,
        r.listeningScore,
        r.writingScore,
        r.speakingScore
      ]);
      return sendCsv(res, filenameBase, header, rows);
    }

    const lines = [];
    lines.push(`Student: ${user.email}`);
    lines.push(`Generated by: ${req.user.email}`);
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push('');
    lines.push('Summary');
    lines.push(`Total exams: ${totalExams}`);
    lines.push(`Average score: ${averageScore}/100`);
    lines.push(`Last activity: ${lastExamDate ? new Date(lastExamDate).toLocaleString() : '-'}`);
    lines.push('');
    lines.push('Exam History');
    if (!history.length) {
      lines.push('No exams found.');
    } else {
      history.forEach((r, idx) => {
        lines.push(
          `${idx + 1}. ${new Date(r.date).toLocaleString()} • ${r.level} • ${r.score}/100 (G:${r.grammarScore}, L:${r.listeningScore}, W:${r.writingScore}, S:${r.speakingScore})`
        );
      });
    }
    return sendPdf(res, filenameBase, 'Student Report', lines);
  } catch (e) {
    console.error('Teacher student report export error:', e);
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
