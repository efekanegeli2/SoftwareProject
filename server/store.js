import bcrypt from 'bcryptjs';
import { prisma } from './db.js';

// Prisma + SQLite does not support Json columns.
// We store JSON data as TEXT and serialize/deserialize here.
function toJsonText(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function fromJsonText(value, fallback) {
  if (value === undefined || value === null) return fallback;
  // If we later switch to Postgres/MySQL, Prisma may return objects for Json columns.
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

// ------------------------------
// Seed content (Question Banks)
// ------------------------------
// NOTE: These are the same demo items the app previously kept in-memory.
// We persist them in the DB to meet FR11 (question bank driven generation).
const MCQ_BANK = [
  // A1-A2
  { text: 'I _____ strictly forbidden from smoking in this area.', options: ['am', 'is', 'be', 'are'], correct: 'am', difficulty: 'A1-A2' },
  { text: 'Where _____ you go last summer holiday?', options: ['did', 'do', 'were', 'was'], correct: 'did', difficulty: 'A1-A2' },
  { text: 'She _____ usually _____ breakfast at 7 AM.', options: ['do / eat', 'does / eat', 'does / eats', 'do / eats'], correct: 'does / eat', difficulty: 'A1-A2' },
  { text: 'Yesterday, I _____ to the cinema with my friends.', options: ['go', 'gone', 'went', 'was'], correct: 'went', difficulty: 'A1-A2' },
  { text: 'This is the _____ book I have ever read.', options: ['good', 'better', 'best', 'most good'], correct: 'best', difficulty: 'A1-A2' },

  // B1-B2
  { text: 'If I _____ you, I would accept that offer immediately.', options: ['was', 'am', 'were', 'be'], correct: 'were', difficulty: 'B1-B2' },
  { text: 'He is the man _____ car was stolen yesterday.', options: ['who', 'which', 'whose', 'that'], correct: 'whose', difficulty: 'B1-B2' },
  { text: 'By the time we arrived, the film _____ already _____.', options: ['has / started', 'had / started', 'was / starting', 'did / start'], correct: 'had / started', difficulty: 'B1-B2' },
  { text: 'I look forward to _____ from you soon.', options: ['hear', 'hearing', 'heard', 'be heard'], correct: 'hearing', difficulty: 'B1-B2' },
  { text: 'Despite _____ tired, he continued working.', options: ['he was', 'of being', 'being', 'to be'], correct: 'being', difficulty: 'B1-B2' },
  { text: 'You _____ better see a doctor if the pain persists.', options: ['would', 'should', 'had', 'must'], correct: 'had', difficulty: 'B1-B2' },

  // C1-C2
  { text: 'Not only _____ the deadline, but he also submitted a flawless report.', options: ['he met', 'did he met', 'he did meet', 'met he'], correct: 'did he met', difficulty: 'C1-C2' },
  { text: 'The government is considering _____ a new tax on luxury goods.', options: ['to impose', 'imposing', 'impose', 'of imposing'], correct: 'imposing', difficulty: 'C1-C2' },
  { text: 'Scarcely had he entered the room _____ the phone rang.', options: ['when', 'than', 'after', 'while'], correct: 'when', difficulty: 'C1-C2' },
  { text: 'It is high time we _____ measures to protect the environment.', options: ['take', 'took', 'will take', 'have taken'], correct: 'took', difficulty: 'C1-C2' },
  { text: 'This methodology is _____ to yield significant results.', options: ['bound', 'likely', 'probable', 'possible'], correct: 'bound', difficulty: 'C1-C2' },
  { text: 'Had I known about the risks, I _____ participated.', options: ['would not have', 'will not have', 'would not', 'had not'], correct: 'would not have', difficulty: 'C1-C2' },
  { text: "I'd rather you _____ make so much noise.", options: ["don't", "didn't", "won't", 'not'], correct: "didn't", difficulty: 'C1-C2' },
  { text: 'Under no circumstances _____ allowed to enter.', options: ['are you', 'you are', 'do you', 'you do'], correct: 'are you', difficulty: 'C1-C2' },
  { text: 'Hardly _____ the news when he burst into tears.', options: ['had he heard', 'he had heard', 'did he hear', 'he heard'], correct: 'had he heard', difficulty: 'C1-C2' }
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
    topic: 'Mars Colonization',
    difficulty: 'B1-B2',
    passage:
      'As humanity looks towards the stars, Mars has become the primary candidate for colonization. However, the challenges are immense. Radiation levels, lack of breathable atmosphere, and extreme cold make it a hostile environment. Scientists are proposing terraforming as a long-term solution, essentially engineering the planet to support human life.',
    questions: [
      { qid: 'L1', text: 'What is the primary candidate for colonization?', options: ['Moon', 'Mars', 'Venus', 'Jupiter'], correct: 'Mars' },
      { qid: 'L2', text: 'What is mentioned as a major challenge?', options: ['Aliens', 'Radiation', 'Heat', 'Gravity'], correct: 'Radiation' },
      { qid: 'L3', text: 'What long-term solution is proposed?', options: ['Terraforming', 'Building Domes', 'Underground Cities', 'Space Stations'], correct: 'Terraforming' },
      { qid: 'L4', text: 'Mars is described as a _____ environment.', options: ['Friendly', 'Hostile', 'Warm', 'Wet'], correct: 'Hostile' },
      { qid: 'L5', text: 'Terraforming means engineering the planet to support...', options: ['Robot life', 'Plant life', 'Human life', 'No life'], correct: 'Human life' }
    ]
  },
  {
    topic: 'History of the Internet',
    difficulty: 'A2-B1',
    passage:
      "The Internet started in the 1960s as a way for government researchers to share information. Computers in the '60s were large and immobile and in order to make use of information stored in any one computer, one had to either travel to the site of the computer or have magnetic tapes sent through the conventional postal system.",
    questions: [
      { qid: 'L1', text: 'When did the Internet start?', options: ['1980s', '1960s', '1990s', '2000s'], correct: '1960s' },
      { qid: 'L2', text: 'Who was it originally for?', options: ['Students', 'Gamers', 'Government researchers', 'Businessmen'], correct: 'Government researchers' },
      { qid: 'L3', text: 'Computers in the 60s were...', options: ['Small', 'Mobile', 'Large and immobile', 'Wireless'], correct: 'Large and immobile' },
      { qid: 'L4', text: 'How was data physically shared?', options: ['USB Drives', 'Magnetic tapes', 'CDs', 'Cloud'], correct: 'Magnetic tapes' },
      { qid: 'L5', text: 'To use data, one had to _____ to the site.', options: ['Email', 'Call', 'Travel', 'Fax'], correct: 'Travel' }
    ]
  }
];

const SPEAKING_SETS = [
  ['Artificial Intelligence is transforming the world.', 'Sustainability is key to our future.', 'Critical thinking is an essential skill.'],
  ['Global warming requires urgent action.', 'Education is the most powerful weapon.', 'Technology brings people together.'],
  ['Learning a new language opens many doors.', 'Healthy habits lead to a happier life.', 'Creativity is intelligence having fun.']
];

function shuffle(arr) {
  return [...arr].sort(() => 0.5 - Math.random());
}

// ------------------------------
// Seeds
// ------------------------------
export async function ensureSeeded() {
  // 1) Demo users (for quick login buttons)
  const demoUsers = await prisma.user.findMany({
    where: { email: { endsWith: '@demo.com' } },
    select: { id: true }
  });

  if (demoUsers.length < 3) {
    const passwordHash = await bcrypt.hash('demo123', 10);
    const users = [
      { email: 'student@demo.com', role: 'STUDENT' },
      { email: 'teacher@demo.com', role: 'TEACHER' },
      { email: 'admin@demo.com', role: 'ADMIN' }
    ];

    for (const u of users) {
      await prisma.user.upsert({
        where: { email: u.email },
        update: { role: u.role },
        create: { email: u.email, role: u.role, password: passwordHash }
      });
    }
  }

  // 2) Content seeds
  const mcqCount = await prisma.mcqQuestion.count();
  if (mcqCount === 0) {
    await prisma.mcqQuestion.createMany({
      data: MCQ_BANK.map(q => ({
        text: q.text,
        options: toJsonText(q.options),
        correct: q.correct,
        difficulty: q.difficulty
      }))
    });
  }

  const writingCount = await prisma.writingTopic.count();
  if (writingCount === 0) {
    await prisma.writingTopic.createMany({
      data: WRITING_TOPICS.map(t => ({ topic: t }))
    });
  }

  const listeningCount = await prisma.listeningScenario.count();
  if (listeningCount === 0) {
    for (const scenario of LISTENING_SCENARIOS) {
      await prisma.listeningScenario.create({
        data: {
          topic: scenario.topic,
          passage: scenario.passage,
          difficulty: scenario.difficulty,
          questions: {
            create: scenario.questions.map(q => ({
              qid: q.qid,
              text: q.text,
              options: toJsonText(q.options),
              correct: q.correct
            }))
          }
        }
      });
    }
  }

  const speakingSetCount = await prisma.speakingSet.count();
  if (speakingSetCount === 0) {
    for (const prompts of SPEAKING_SETS) {
      await prisma.speakingSet.create({
        data: {
          prompts: {
            create: prompts.map(p => ({ text: p }))
          }
        }
      });
    }
  }
}

// ------------------------------
// Users
// ------------------------------
export async function getUserByEmail(email) {
  if (!email) return null;
  return prisma.user.findUnique({ where: { email: String(email).toLowerCase() } });
}

export async function getUserById(id) {
  const num = Number(id);
  if (!Number.isFinite(num)) return null;
  return prisma.user.findUnique({ where: { id: num } });
}

export async function createUser({ email, password, role }) {
  const normalizedEmail = String(email).toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
  if (exists) {
    const err = new Error('User already exists');
    err.code = 'USER_EXISTS';
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      password: passwordHash,
      role
    },
    select: { id: true, email: true, role: true }
  });

  return user;
}

export async function listUsers() {
  return prisma.user.findMany({ select: { id: true, email: true, role: true } });
}

export async function deleteUser(userId) {
  const id = Number(userId);
  if (!Number.isFinite(id)) return false;
  try {
    await prisma.user.delete({ where: { id } });
    return true;
  } catch (e) {
    if (e.code === 'P2025') return false;
    throw e;
  }
}

// ------------------------------
// Exam results & history
// ------------------------------
export async function addExamResult(userId, resultAndSubmission) {
  const id = Number(userId);
  if (!Number.isFinite(id)) throw new Error('Invalid userId');

  const active = await prisma.activeExam.findUnique({ where: { userId: id } });

  // Create an attempt if none exists (shouldn't happen in normal flow)
  let attemptId = active?.attemptId;
  if (!attemptId) {
    const attempt = await prisma.examAttempt.create({ data: { userId: id, status: 'SUBMITTED', submittedAt: new Date() } });
    attemptId = attempt.id;
  }

  // Update attempt with the student's submission snapshot
  await prisma.examAttempt.update({
    where: { id: attemptId },
    data: {
      status: 'SUBMITTED',
      submittedAt: new Date(),
      mcqAnswers: resultAndSubmission.mcqAnswers !== undefined ? toJsonText(resultAndSubmission.mcqAnswers) : undefined,
      listeningAnswers: resultAndSubmission.listeningAnswers !== undefined ? toJsonText(resultAndSubmission.listeningAnswers) : undefined,
      writingAnswer: resultAndSubmission.writingAnswer ?? undefined,
      speakingTranscript: resultAndSubmission.speakingTranscript ?? undefined,
      speakingScore: Number.isFinite(Number(resultAndSubmission.speakingScore)) ? Number(resultAndSubmission.speakingScore) : undefined
    }
  });

  // Create result row
  const created = await prisma.examResult.create({
    data: {
      attemptId,
      userId: id,
      score: resultAndSubmission.score,
      grammarScore: resultAndSubmission.grammarScore,
      writingScore: resultAndSubmission.writingScore,
      speakingScore: resultAndSubmission.speakingScore,
      listeningScore: resultAndSubmission.listeningScore,
      level: resultAndSubmission.level
    }
  });

  return created;
}

export async function getExamResultsForUser(userId) {
  const id = Number(userId);
  if (!Number.isFinite(id)) return [];

  const results = await prisma.examResult.findMany({
    where: { userId: id },
    orderBy: { createdAt: 'desc' }
  });

  // Keep legacy response shape ("date" string) for existing client.
  return results.map(r => ({
    id: r.id,
    userId: r.userId,
    date: r.createdAt.toISOString(),
    score: r.score,
    grammarScore: r.grammarScore,
    writingScore: r.writingScore,
    speakingScore: r.speakingScore,
    listeningScore: r.listeningScore,
    level: r.level
  }));
}

// ------------------------------
// Active exam session
// ------------------------------
export async function setActiveExam(userId, activeExam) {
  const id = Number(userId);
  if (!Number.isFinite(id)) throw new Error('Invalid userId');

  // If the user already has an active exam, mark it abandoned and replace.
  const existing = await prisma.activeExam.findUnique({ where: { userId: id } });
  if (existing) {
    await prisma.examAttempt.update({
      where: { id: existing.attemptId },
      data: { status: 'ABANDONED' }
    }).catch(() => {});

    await prisma.activeExam.delete({ where: { userId: id } }).catch(() => {});
  }

  // Create attempt
  const attempt = await prisma.examAttempt.create({
    data: {
      userId: id,
      status: 'IN_PROGRESS',
      createdAt: activeExam?.createdAt ? new Date(activeExam.createdAt) : new Date(),
      mcqQuestionIds: activeExam?.mcqQuestionIds !== undefined ? toJsonText(activeExam?.mcqQuestionIds) : undefined,
      listeningScenarioId: activeExam?.listeningScenarioId ?? undefined,
      writingTopicId: activeExam?.writingTopicId ?? undefined,
      speakingSetId: activeExam?.speakingSetId ?? undefined
    }
  });

  // Create active pointer (stores correct maps to keep grading logic intact)
  await prisma.activeExam.create({
    data: {
      userId: id,
      attemptId: attempt.id,
      createdAt: activeExam?.createdAt ? new Date(activeExam.createdAt) : new Date(),
      mcqCorrect: toJsonText(activeExam?.mcqCorrect || {}),
      listeningCorrect: toJsonText(activeExam?.listeningCorrect || {})
    }
  });

  return attempt;
}

export async function getActiveExam(userId) {
  const id = Number(userId);
  if (!Number.isFinite(id)) return null;

  const rec = await prisma.activeExam.findUnique({ where: { userId: id } });
  if (!rec) return null;

  return {
    createdAt: rec.createdAt.toISOString(),
    mcqCorrect: fromJsonText(rec.mcqCorrect, {}) || {},
    listeningCorrect: fromJsonText(rec.listeningCorrect, {}) || {},
    attemptId: rec.attemptId
  };
}

export async function clearActiveExam(userId) {
  const id = Number(userId);
  if (!Number.isFinite(id)) return;
  await prisma.activeExam.delete({ where: { userId: id } }).catch(() => {});
}

// ------------------------------
// Exam content generation from DB
// ------------------------------
export async function generateExamForUser(userId) {
  const id = Number(userId);
  if (!Number.isFinite(id)) throw new Error('Invalid userId');

  // Pull from DB (seeded in ensureSeeded)
  const mcqAll = await prisma.mcqQuestion.findMany();
  const picked = shuffle(mcqAll).slice(0, 15);

  const writingTopics = await prisma.writingTopic.findMany();
  const writingTopic = writingTopics[Math.floor(Math.random() * writingTopics.length)] || null;

  const listeningScenarios = await prisma.listeningScenario.findMany({ include: { questions: true } });
  const listeningScenario = listeningScenarios[Math.floor(Math.random() * listeningScenarios.length)] || null;

  const speakingSets = await prisma.speakingSet.findMany({ include: { prompts: true } });
  const speakingSet = speakingSets[Math.floor(Math.random() * speakingSets.length)] || null;

  // Build correct maps (keeps current /api/exam/evaluate implementation)
  const mcqCorrect = {};
  picked.forEach(q => {
    mcqCorrect[String(q.id)] = q.correct;
  });

  const listeningCorrect = {};
  (listeningScenario?.questions || []).forEach(q => {
    listeningCorrect[String(q.qid)] = q.correct;
  });

  // Persist active exam
  await setActiveExam(id, {
    createdAt: new Date().toISOString(),
    mcqCorrect,
    listeningCorrect,
    mcqQuestionIds: picked.map(q => q.id),
    listeningScenarioId: listeningScenario?.id ?? null,
    writingTopicId: writingTopic?.id ?? null,
    speakingSetId: speakingSet?.id ?? null
  });

  // Return payload shape expected by existing client
  return {
    questions: picked.map(q => ({
      id: q.id,
      text: q.text,
      options: fromJsonText(q.options, []),
      correct: q.correct
    })),
    listeningPassage: listeningScenario?.passage || '',
    listeningQuestions: (listeningScenario?.questions || []).map(q => ({
      id: q.qid,
      text: q.text,
      options: fromJsonText(q.options, []),
      correct: q.correct
    })),
    writingTopic: writingTopic?.topic || '',
    speakingSentences: (speakingSet?.prompts || []).map(p => p.text)
  };
}

// ------------------------------
// Integrity logging (optional)
// ------------------------------
export async function logCheatingEvent(userId, type, details = null) {
  const id = Number(userId);
  if (!Number.isFinite(id)) return;

  const active = await prisma.activeExam.findUnique({ where: { userId: id } });
  if (!active) return;

  await prisma.cheatingEvent.create({
    data: {
      attemptId: active.attemptId,
      type,
      details: details === undefined ? undefined : toJsonText(details)
    }
  });
}

export async function listCheatingEventsForUser(userId, { take = 200, skip = 0 } = {}) {
  const id = Number(userId);
  if (!Number.isFinite(id)) return [];

  const t = Math.max(1, Math.min(500, Number(take) || 200));
  const s = Math.max(0, Number(skip) || 0);

  const events = await prisma.cheatingEvent.findMany({
    where: {
      attempt: {
        userId: id
      }
    },
    orderBy: { createdAt: 'desc' },
    take: t,
    skip: s,
    include: {
      attempt: {
        select: {
          id: true,
          status: true,
          createdAt: true,
          submittedAt: true
        }
      }
    }
  });

  return events.map((e) => ({
    id: e.id,
    attemptId: e.attemptId,
    type: e.type,
    details: fromJsonText(e.details, e.details ?? null),
    createdAt: e.createdAt.toISOString(),
    attempt: e.attempt
      ? {
          id: e.attempt.id,
          status: e.attempt.status,
          createdAt: e.attempt.createdAt.toISOString(),
          submittedAt: e.attempt.submittedAt ? e.attempt.submittedAt.toISOString() : null
        }
      : null
  }));
}

// ------------------------------
// Teacher content management
// ------------------------------
export async function listMcqQuestions({ take = 50, skip = 0 } = {}) {
  const t = Math.max(1, Math.min(200, Number(take) || 50));
  const s = Math.max(0, Number(skip) || 0);

  const rows = await prisma.mcqQuestion.findMany({
    orderBy: { createdAt: 'desc' },
    take: t,
    skip: s
  });

  return rows.map((q) => ({
    id: q.id,
    text: q.text,
    options: fromJsonText(q.options, []),
    correct: q.correct,
    difficulty: q.difficulty || null,
    createdAt: q.createdAt.toISOString()
  }));
}

export async function createMcqQuestion({ text, options, correct, difficulty } = {}) {
  const t = String(text || '').trim();
  const opts = Array.isArray(options) ? options.map((o) => String(o).trim()).filter(Boolean) : [];
  const c = String(correct || '').trim();
  const diff = difficulty === undefined || difficulty === null || String(difficulty).trim() === '' ? null : String(difficulty).trim();

  if (!t) {
    const err = new Error('text is required');
    err.code = 'VALIDATION';
    throw err;
  }
  if (opts.length < 2) {
    const err = new Error('options must have at least 2 items');
    err.code = 'VALIDATION';
    throw err;
  }
  if (!c || !opts.includes(c)) {
    const err = new Error('correct must match one of the options');
    err.code = 'VALIDATION';
    throw err;
  }

  const created = await prisma.mcqQuestion.create({
    data: {
      text: t,
      options: toJsonText(opts),
      correct: c,
      difficulty: diff
    }
  });

  return {
    id: created.id,
    text: created.text,
    options: opts,
    correct: created.correct,
    difficulty: created.difficulty || null,
    createdAt: created.createdAt.toISOString()
  };
}

export async function deleteMcqQuestion(id) {
  const num = Number(id);
  if (!Number.isFinite(num)) {
    const err = new Error('Invalid id');
    err.code = 'VALIDATION';
    throw err;
  }

  try {
    await prisma.mcqQuestion.delete({ where: { id: num } });
    return true;
  } catch (e) {
    // Record not found
    if (e?.code === 'P2025') return false;
    throw e;
  }
}
