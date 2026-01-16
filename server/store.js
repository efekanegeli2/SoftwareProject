import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DATA_DIR = new URL('./data/', import.meta.url);
const STORE_PATH = new URL('./data/store.json', import.meta.url);

function ensureDir() {
  const dirPath = path.dirname(STORE_PATH.pathname);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function defaultStore() {
  return {
    meta: { nextUserId: 4, nextExamId: 1 },
    users: [],
    examResults: [],
    // active exams keyed by userId (string)
    activeExams: {}
  };
}

function readStore() {
  ensureDir();
  if (!fs.existsSync(STORE_PATH.pathname)) {
    const s = defaultStore();
    fs.writeFileSync(STORE_PATH.pathname, JSON.stringify(s, null, 2), 'utf8');
    return s;
  }
  try {
    const raw = fs.readFileSync(STORE_PATH.pathname, 'utf8');
    const parsed = JSON.parse(raw);
    // basic shape guard
    return {
      meta: parsed.meta || { nextUserId: 1, nextExamId: 1 },
      users: Array.isArray(parsed.users) ? parsed.users : [],
      examResults: Array.isArray(parsed.examResults) ? parsed.examResults : [],
      activeExams: parsed.activeExams || {}
    };
  } catch {
    const s = defaultStore();
    fs.writeFileSync(STORE_PATH.pathname, JSON.stringify(s, null, 2), 'utf8');
    return s;
  }
}

function writeStore(store) {
  ensureDir();
  fs.writeFileSync(STORE_PATH.pathname, JSON.stringify(store, null, 2), 'utf8');
}

export async function ensureSeeded() {
  const store = readStore();
  const hasDemo = store.users.some(u => u.email?.endsWith('@demo.com'));
  if (store.users.length > 0 && hasDemo) return;

  // Seed demo accounts
  const passwordHash = await bcrypt.hash('demo123', 10);
  const demoUsers = [
    { id: 1, email: 'student@demo.com', role: 'STUDENT', password: passwordHash },
    { id: 2, email: 'teacher@demo.com', role: 'TEACHER', password: passwordHash },
    { id: 3, email: 'admin@demo.com', role: 'ADMIN', password: passwordHash }
  ];

  store.users = demoUsers;
  store.meta = { nextUserId: 4, nextExamId: 1 };
  store.examResults = [];
  store.activeExams = {};
  writeStore(store);
}

export function getUserByEmail(email) {
  const store = readStore();
  return store.users.find(u => u.email?.toLowerCase() === String(email).toLowerCase()) || null;
}

export function getUserById(id) {
  const store = readStore();
  const num = Number(id);
  return store.users.find(u => u.id === num) || null;
}

export async function createUser({ email, password, role }) {
  const store = readStore();
  const exists = store.users.some(u => u.email?.toLowerCase() === String(email).toLowerCase());
  if (exists) {
    const err = new Error('User already exists');
    err.code = 'USER_EXISTS';
    throw err;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = {
    id: store.meta.nextUserId || (store.users.length + 1),
    email,
    role,
    password: passwordHash
  };
  store.users.push(newUser);
  store.meta.nextUserId = (newUser.id + 1);
  writeStore(store);
  return { ...newUser, password: undefined };
}

export function listUsers() {
  const store = readStore();
  return store.users.map(u => ({ id: u.id, email: u.email, role: u.role }));
}

export function deleteUser(userId) {
  const store = readStore();
  const id = Number(userId);
  const before = store.users.length;
  store.users = store.users.filter(u => u.id !== id);
  // Also delete exam results
  store.examResults = store.examResults.filter(r => r.userId !== id);
  delete store.activeExams[String(id)];
  writeStore(store);
  return store.users.length !== before;
}

export function addExamResult(userId, result) {
  const store = readStore();
  const id = Number(userId);
  const rec = {
    id: store.meta.nextExamId || (store.examResults.length + 1),
    userId: id,
    date: new Date().toISOString(),
    ...result
  };
  store.examResults.unshift(rec);
  store.meta.nextExamId = rec.id + 1;
  writeStore(store);
  return rec;
}

export function getExamResultsForUser(userId) {
  const store = readStore();
  const id = Number(userId);
  return store.examResults.filter(r => r.userId === id);
}

export function setActiveExam(userId, activeExam) {
  const store = readStore();
  store.activeExams[String(userId)] = activeExam;
  writeStore(store);
}

export function getActiveExam(userId) {
  const store = readStore();
  return store.activeExams[String(userId)] || null;
}

export function clearActiveExam(userId) {
  const store = readStore();
  delete store.activeExams[String(userId)];
  writeStore(store);
}
