import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../context/I18nContext.jsx';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:3000';

function authHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

function Button({
  children,
  onClick,
  className = '',
  variant = 'primary',
  type = 'button',
  disabled = false,
  title
}) {
  const base =
    'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-indigo-500/60';

  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm',
    outline: 'bg-white/70 text-gray-900 border border-gray-200 hover:bg-white',
    soft: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cx(base, variants[variant], disabled ? 'opacity-50 cursor-not-allowed' : '', className)}
    >
      {children}
    </button>
  );
}

function StatCard({ title, value, hint }) {
  return (
    <div className="rounded-2xl bg-white/80 backdrop-blur border border-white/40 shadow-sm p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-gray-500">{title}</div>
      <div className="mt-2 text-3xl font-extrabold text-gray-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-gray-500">{hint}</div> : null}
    </div>
  );
}

function EmptyState({ title, subtitle }) {
  return (
    <div className="py-12 text-center">
      <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center text-2xl">🎓</div>
      <div className="mt-4 font-extrabold text-gray-900">{title}</div>
      {subtitle ? <div className="mt-1 text-sm text-gray-600">{subtitle}</div> : null}
    </div>
  );
}

export default function TeacherPanel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 1500);
  };

  const [tab, setTab] = useState('students'); // students | questions

  // Students
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [students, setStudents] = useState([]);
  const [studentQuery, setStudentQuery] = useState('');
  const [modal, setModal] = useState({ open: false, student: null });
  const [detail, setDetail] = useState(null);
  const [detailTab, setDetailTab] = useState('history'); // history | integrity
  const [integrity, setIntegrity] = useState({ loading: false, events: [], error: '' });

  // Questions
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [mcqQuestions, setMcqQuestions] = useState([]);
  const [qError, setQError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const [qText, setQText] = useState('');
  const [qDifficulty, setQDifficulty] = useState('A1-A2');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qCorrectIndex, setQCorrectIndex] = useState(0);
  const [qSubmitting, setQSubmitting] = useState(false);

  const canCreateQuestion = useMemo(() => {
    const textOk = qText.trim().length >= 5;
    const opts = qOptions.map((o) => o.trim()).filter(Boolean);
    const optsOk = opts.length >= 2;
    const correctOk = Boolean(qOptions[qCorrectIndex]?.trim());
    return textOk && optsOk && correctOk;
  }, [qText, qOptions, qCorrectIndex]);

  const visibleStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const email = String(s.email || '').toLowerCase();
      const id = String(s.id ?? '');
      return email.includes(q) || id.includes(q);
    });
  }, [students, studentQuery]);

  const teacherStats = useMemo(() => {
    const totalStudents = students.length;
    const totalExams = students.reduce((sum, s) => sum + (Number(s.totalExams) || 0), 0);
    const scored = students.filter((s) => (Number(s.totalExams) || 0) > 0 && typeof s.averageScore === 'number');
    const avgScore = scored.length ? Math.round(scored.reduce((sum, s) => sum + s.averageScore, 0) / scored.length) : 0;

    const levelCount = {};
    for (const s of students) {
      const lvl = s?.latest?.level;
      if (!lvl) continue;
      levelCount[lvl] = (levelCount[lvl] || 0) + 1;
    }
    let commonLevel = '-';
    let max = 0;
    for (const [lvl, c] of Object.entries(levelCount)) {
      if (c > max) {
        max = c;
        commonLevel = lvl;
      }
    }

    return { totalStudents, totalExams, avgScore, commonLevel };
  }, [students]);


  useEffect(() => {
    loadStudents();
    loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAuthError = (e) => {
    const status = e?.response?.status;
    if (status === 401 || status === 403) {
      logout();
      navigate('/login');
      return true;
    }
    return false;
  };

  const loadStudents = async () => {
    setLoadingStudents(true);
    try {
      const res = await axios.get(`${API_URL}/api/dashboard/teacher`, {
        headers: authHeader()
      });
      setStudents(res.data || []);
    } catch (e) {
      console.error(e);
      if (handleAuthError(e)) return;
      alert(t({ tr: 'Öğretmen listesi alınamadı. Server çalışıyor mu?', en: 'Could not fetch teacher list. Is the server running?' }));
    } finally {
      setLoadingStudents(false);
    }
  };

  const downloadTeacherReport = async (format) => {
    try {
      const res = await axios.get(`${API_URL}/api/reports/teacher?format=${format}`, {
        headers: authHeader(),
        responseType: 'blob'
      });
      const ext = format === 'csv' ? 'csv' : 'pdf';
      downloadBlob(res.data, `teacher_report_${new Date().toISOString().slice(0, 10)}.${ext}`);
    } catch (e) {
      console.error(e);
      if (handleAuthError(e)) return;
      alert(t({ tr: 'Rapor indirilemedi.', en: 'Report download failed.' }));
    }
  };

  const downloadStudentReport = async (studentId, format) => {
    try {
      const res = await axios.get(`${API_URL}/api/reports/teacher/student/${studentId}?format=${format}`, {
        headers: authHeader(),
        responseType: 'blob'
      });
      const ext = format === 'csv' ? 'csv' : 'pdf';
      downloadBlob(res.data, `student_report_${studentId}_${new Date().toISOString().slice(0, 10)}.${ext}`);
    } catch (e) {
      console.error(e);
      if (handleAuthError(e)) return;
      alert(t({ tr: 'Öğrenci raporu indirilemedi.', en: 'Student report download failed.' }));
    }
  };

  const openDetails = async (student) => {
    setModal({ open: true, student });
    setDetail(null);
    setDetailTab('history');
    setIntegrity({ loading: true, events: [], error: '' });
    try {
      const res = await axios.get(`${API_URL}/api/dashboard/teacher/student/${student.id}`, {
        headers: authHeader()
      });
      setDetail(res.data);

      // Fetch integrity/cheating events (FR15)
      try {
        const ires = await axios.get(`${API_URL}/api/integrity/teacher/student/${student.id}/events?take=200`, {
          headers: authHeader()
        });
        setIntegrity({ loading: false, events: ires.data || [], error: '' });
      } catch (ie) {
        console.error(ie);
        if (handleAuthError(ie)) return;
        setIntegrity({
          loading: false,
          events: [],
          error: t({ tr: 'Integrity logları alınamadı.', en: 'Could not fetch integrity logs.' })
        });
      }
    } catch (e) {
      console.error(e);
      if (handleAuthError(e)) return;
      alert(t({ tr: 'Öğrenci detayları alınamadı.', en: 'Could not fetch student details.' }));
      setIntegrity({ loading: false, events: [], error: '' });
    }
  };

  const loadQuestions = async () => {
    setLoadingQuestions(true);
    setQError('');
    try {
      const res = await axios.get(`${API_URL}/api/questions/mcq?take=50`, {
        headers: authHeader()
      });
      setMcqQuestions(res.data || []);
    } catch (e) {
      console.error(e);
      if (handleAuthError(e)) return;
      setQError(e?.response?.data?.error || t({ tr: 'Soru listesi alınamadı.', en: 'Could not fetch question list.' }));
    } finally {
      setLoadingQuestions(false);
    }
  };

  const createQuestion = async (e) => {
    e.preventDefault();
    setQError('');

    if (!canCreateQuestion) {
      setQError(
        t({
          tr: 'Soru metni ve en az 2 seçenek doldurulmalı. Doğru seçenek boş olamaz.',
          en: 'Question text and at least 2 options are required. The correct option cannot be empty.'
        })
      );
      return;
    }

    const cleanedOptions = qOptions.map((o) => o.trim()).filter(Boolean);
    const correct = qOptions[qCorrectIndex].trim();

    setQSubmitting(true);
    try {
      await axios.post(
        `${API_URL}/api/questions/mcq`,
        {
          text: qText.trim(),
          options: cleanedOptions,
          correct,
          difficulty: qDifficulty
        },
        { headers: authHeader() }
      );

      setQText('');
      setQOptions(['', '', '', '']);
      setQCorrectIndex(0);
      setQDifficulty('A1-A2');

      await loadQuestions();
      setTab('questions');
    } catch (e2) {
      console.error(e2);
      if (handleAuthError(e2)) return;
      setQError(e2?.response?.data?.error || t({ tr: 'Soru eklenemedi.', en: 'Could not add question.' }));
    } finally {
      setQSubmitting(false);
    }
  };

  const deleteQuestion = async (id) => {
    if (deletingId) return;
    const ok = window.confirm(t({ tr: 'Bu soruyu silmek istediğine emin misin?', en: 'Are you sure you want to delete this question?' }));
    if (!ok) return;

    setDeletingId(id);
    setQError('');
    try {
      await axios.delete(`${API_URL}/api/questions/mcq/${id}`, {
        headers: authHeader()
      });
      setMcqQuestions((prev) => prev.filter((q) => q.id !== id));
    } catch (e) {
      console.error(e);
      if (handleAuthError(e)) return;
      setQError(e?.response?.data?.error || t({ tr: 'Soru silinemedi.', en: 'Could not delete question.' }));
    } finally {
      setDeletingId(null);
    }
  };

  const filteredStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const email = String(s.email || '').toLowerCase();
      const id = String(s.id || '');
      return email.includes(q) || id.includes(q);
    });
  }, [students, studentQuery]);

  const stats = useMemo(() => {
    const totalStudents = students.length;
    const totalExams = students.reduce((acc, s) => acc + (Number(s.totalExams) || 0), 0);

    const scored = students.filter((s) => (Number(s.totalExams) || 0) > 0 && typeof s.averageScore === 'number');
    const avgScore = scored.length ? Math.round(scored.reduce((a, s) => a + s.averageScore, 0) / scored.length) : 0;

    const levelCounts = {};
    students.forEach((s) => {
      const lvl = s?.latest?.level;
      if (lvl) levelCounts[lvl] = (levelCounts[lvl] || 0) + 1;
    });
    const topLevel = Object.entries(levelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

    return { totalStudents, totalExams, avgScore, topLevel };
  }, [students]);

  const GlassCard = ({ children, className = '' }) => (
    <div className={cx('rounded-2xl bg-white/85 backdrop-blur border border-white/40 shadow-lg', className)}>{children}</div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600">
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Top Bar */}
          <div className="sticky top-4 z-40">
            <div className="rounded-3xl bg-white/80 backdrop-blur border border-white/40 shadow-xl px-5 py-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl shadow-sm">🎓</div>
                  <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">{t({ tr: 'Öğretmen Paneli', en: 'Teacher Panel' })}</h1>
                    <p className="text-sm text-gray-600">
                      {t({ tr: 'Öğrencileri yönet, rapor indir ve soru havuzunu düzenle.', en: 'Manage students, download reports, and curate the question pool.' })}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <LanguageSwitcher className="sm:mr-2" />
                    <span className="text-sm text-gray-600 truncate max-w-[240px]">{user?.email}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-2xl bg-gray-900/5 p-1">
                      <button
                        onClick={() => setTab('students')}
                        className={cx(
                          'px-4 py-2 rounded-xl text-sm font-bold transition',
                          tab === 'students' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
                        )}
                      >
                        {t({ tr: 'Öğrenciler', en: 'Students' })}
                      </button>
                      <button
                        onClick={() => setTab('questions')}
                        className={cx(
                          'px-4 py-2 rounded-xl text-sm font-bold transition',
                          tab === 'questions' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
                        )}
                      >
                        {t({ tr: 'Soru Bankası', en: 'Question Bank' })}
                      </button>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => (tab === 'students' ? loadStudents() : loadQuestions())}
                      title={t({ tr: 'Verileri yenile', en: 'Refresh data' })}
                    >
                      ⟳ {t({ tr: 'Yenile', en: 'Refresh' })}
                    </Button>

                    <Button variant="danger" onClick={logout} title={t({ tr: 'Çıkış yap', en: 'Logout' })}>
                      ⇦ {t({ tr: 'Çıkış', en: 'Logout' })}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title={t({ tr: 'Öğrenciler', en: 'Students' })} value={stats.totalStudents} hint={t({ tr: 'Toplam kayıtlı', en: 'Total assigned to you' })} />
            <StatCard title={t({ tr: 'Toplam Sınav', en: 'Total Exams' })} value={stats.totalExams} hint={t({ tr: 'Tüm öğrenciler', en: 'Across all students' })} />
            <StatCard title={t({ tr: 'Ortalama', en: 'Average' })} value={`${stats.avgScore}/100`} hint={t({ tr: 'Sınav alanlar için', en: 'Among students with exams' })} />
            <StatCard title={t({ tr: 'En Yaygın Seviye', en: 'Most Common Level' })} value={stats.topLevel} hint={t({ tr: 'Son sınavlara göre', en: 'Based on latest exams' })} />
          </div>

          {/* Content */}
          <div className="mt-6">
            {tab === 'students' ? (
              <GlassCard>
                <div className="p-5 border-b border-white/40 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-extrabold text-gray-900">{t({ tr: 'Öğrenci Listesi', en: 'Student List' })}</h2>
                    <p className="text-sm text-gray-600">{t({ tr: 'Detayları görüntüle, rapor indir ve integrity kayıtlarına bak.', en: 'Open details, download reports, and inspect integrity logs.' })}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <input
                        value={studentQuery}
                        onChange={(e) => setStudentQuery(e.target.value)}
                        placeholder={t({ tr: 'Ara: email veya ID', en: 'Search: email or ID' })}
                        className="w-56 sm:w-64 px-4 py-2 rounded-xl bg-white/70 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                      />
                    </div>

                    <Button
                      variant="soft"
                      onClick={() => downloadTeacherReport('pdf')}
                      title={t({ tr: 'Sınıf raporunu PDF indir', en: 'Download class report as PDF' })}
                    >
                      📄 {t({ tr: 'PDF', en: 'PDF' })}
                    </Button>
                    <Button
                      variant="soft"
                      onClick={() => downloadTeacherReport('csv')}
                      title={t({ tr: 'Sınıf raporunu CSV indir', en: 'Download class report as CSV' })}
                    >
                      🧾 CSV
                    </Button>
                  </div>
                </div>

                {loadingStudents ? (
                  <div className="p-10 text-center text-gray-700">{t({ tr: 'Yükleniyor...', en: 'Loading...' })}</div>
                ) : filteredStudents.length === 0 ? (
                  <EmptyState
                    title={t({ tr: 'Öğrenci bulunamadı', en: 'No students found' })}
                    subtitle={t({ tr: 'Arama kriterini değiştir veya yenilemeyi dene.', en: 'Try changing your search or hit refresh.' })}
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                          <th className="px-6 py-4">{t({ tr: 'Öğrenci', en: 'Student' })}</th>
                          <th className="px-6 py-4">{t({ tr: 'Toplam Sınav', en: 'Total Exams' })}</th>
                          <th className="px-6 py-4">{t({ tr: 'Ortalama', en: 'Avg' })}</th>
                          <th className="px-6 py-4">{t({ tr: 'Son', en: 'Latest' })}</th>
                          <th className="px-6 py-4">{t({ tr: 'İşlemler', en: 'Actions' })}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/40">
                        {filteredStudents.map((s) => (
                          <tr key={s.id} className="group hover:bg-white/50 transition">
                            <td className="px-6 py-4">
                              <div className="font-semibold text-gray-900">{s.email}</div>
                              <div className="text-xs text-gray-500">ID: {s.id}</div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-800">{s.totalExams}</td>
                            <td className="px-6 py-4 text-sm text-gray-800">{s.totalExams ? `${s.averageScore}/100` : '—'}</td>
                            <td className="px-6 py-4 text-sm text-gray-800">
                              {s.latest ? (
                                <span className="inline-flex items-center gap-2">
                                  <span className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs">{s.latest.level}</span>
                                  <span className="text-gray-700">{s.latest.score}/100</span>
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <Button variant="primary" onClick={() => openDetails(s)}>
                                {t({ tr: 'Detay', en: 'Details' })} →
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </GlassCard>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GlassCard>
                  <div className="p-5 border-b border-white/40">
                    <h2 className="text-lg font-extrabold text-gray-900">{t({ tr: 'Yeni Grammar (MCQ) Sorusu', en: 'New Grammar (MCQ) Question' })}</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {t({
                        tr: 'Eklediğin sorular sınav oluşturma sırasında otomatik havuza dahil olur.',
                        en: 'Questions you add will automatically be included in the pool when creating exams.'
                      })}
                    </p>
                  </div>

                  <div className="p-5">
                    {qError ? (
                      <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">{qError}</div>
                    ) : null}

                    <form onSubmit={createQuestion} className="space-y-4">
                      <div>
                        <label className="text-sm font-semibold text-gray-700">{t({ tr: 'Soru Metni', en: 'Question Text' })}</label>
                        <textarea
                          value={qText}
                          onChange={(e) => setQText(e.target.value)}
                          className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                          placeholder={t({ tr: 'Örn: I ___ to school every day.', en: 'e.g., I ___ to school every day.' })}
                          rows={3}
                          required
                        />
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-gray-700">{t({ tr: 'Zorluk (CEFR)', en: 'Difficulty (CEFR)' })}</label>
                        <select
                          value={qDifficulty}
                          onChange={(e) => setQDifficulty(e.target.value)}
                          className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                        >
                          <option value="A1-A2">A1-A2</option>
                          <option value="A2-B1">A2-B1</option>
                          <option value="B1-B2">B1-B2</option>
                          <option value="C1-C2">C1-C2</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {qOptions.map((opt, idx) => (
                          <div key={idx}>
                            <label className="text-sm font-semibold text-gray-700">{t({ tr: `Seçenek ${idx + 1}`, en: `Option ${idx + 1}` })}</label>
                            <input
                              value={opt}
                              onChange={(e) =>
                                setQOptions((prev) => {
                                  const next = [...prev];
                                  next[idx] = e.target.value;
                                  return next;
                                })
                              }
                              className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                              placeholder={t({ tr: `Seçenek ${idx + 1}`, en: `Option ${idx + 1}` })}
                            />
                          </div>
                        ))}
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-gray-700">{t({ tr: 'Doğru Seçenek', en: 'Correct Option' })}</label>
                        <select
                          value={qCorrectIndex}
                          onChange={(e) => setQCorrectIndex(Number(e.target.value))}
                          className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                        >
                          {qOptions.map((o, idx) => (
                            <option key={idx} value={idx}>
                              {t({
                                tr: `Seçenek ${idx + 1}${o.trim() ? `: ${o.trim()}` : ''}`,
                                en: `Option ${idx + 1}${o.trim() ? `: ${o.trim()}` : ''}`
                              })}
                            </option>
                          ))}
                        </select>
                      </div>

                      <Button
                        type="submit"
                        variant="primary"
                        disabled={qSubmitting || !canCreateQuestion}
                        className="w-full py-3"
                      >
                        {qSubmitting ? t({ tr: 'Ekleniyor...', en: 'Adding...' }) : t({ tr: 'Soru Ekle', en: 'Add Question' })}
                      </Button>
                    </form>
                  </div>
                </GlassCard>

                <GlassCard>
                  <div className="p-5 border-b border-white/40 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-extrabold text-gray-900">{t({ tr: 'Son Eklenen Sorular', en: 'Latest Added Questions' })}</h2>
                      <p className="text-sm text-gray-600">{t({ tr: '(En son 50)', en: '(Last 50)' })}</p>
                    </div>
                    <Button variant="outline" onClick={loadQuestions}>
                      ⟳ {t({ tr: 'Yenile', en: 'Refresh' })}
                    </Button>
                  </div>

                  <div className="p-5">
                    {loadingQuestions ? (
                      <div className="text-gray-700">{t({ tr: 'Yükleniyor...', en: 'Loading...' })}</div>
                    ) : mcqQuestions.length === 0 ? (
                      <EmptyState title={t({ tr: 'Henüz soru yok', en: 'No questions yet' })} subtitle={t({ tr: 'Sol taraftan soru ekleyebilirsin.', en: 'Create one using the form on the left.' })} />
                    ) : (
                      <div className="space-y-4">
                        {mcqQuestions.map((q) => (
                          <div key={q.id} className="rounded-2xl border border-gray-200 bg-white/70 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="text-xs text-gray-500">#{q.id}</div>
                              <div className="flex items-center gap-2">
                                <div className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg">{q.difficulty || '-'}</div>
                                <Button
                                  onClick={() => deleteQuestion(q.id)}
                                  disabled={deletingId === q.id}
                                  variant="danger"
                                  className="px-3 py-1.5 text-xs"
                                  title={t({ tr: 'Soruyu sil', en: 'Delete question' })}
                                >
                                  {deletingId === q.id ? t({ tr: 'Siliniyor...', en: 'Deleting...' }) : t({ tr: 'Sil', en: 'Delete' })}
                                </Button>
                              </div>
                            </div>
                            <div className="mt-2 font-semibold text-gray-900">{q.text}</div>
                            <ul className="mt-2 space-y-1 text-sm text-gray-800">
                              {(q.options || []).map((opt) => (
                                <li key={opt} className={cx('rounded-lg px-2 py-1', opt === q.correct ? 'bg-emerald-50 text-emerald-800 font-bold' : 'bg-gray-50 text-gray-800')}>
                                  • {opt}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </GlassCard>
              </div>
            )}
          </div>

          {/* Modal (Student Details) */}
          {modal.open && (
            <div className="fixed inset-0 z-50">
              <div
                className="absolute inset-0 bg-black/50"
                onClick={() => {
                  setModal({ open: false, student: null });
                  setDetail(null);
                }}
              />

              <div className="absolute inset-0 p-4 flex items-center justify-center">
                <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl">
                  <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="text-lg font-extrabold text-gray-900">{modal.student?.email}</div>
                      <div className="text-sm text-gray-600">{t({ tr: 'Öğrenci detayları', en: 'Student details' })}</div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex rounded-2xl bg-gray-900/5 p-1">
                        <button
                          onClick={() => setDetailTab('history')}
                          className={cx(
                            'px-3 py-2 rounded-xl text-sm font-bold transition',
                            detailTab === 'history' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
                          )}
                        >
                          {t({ tr: 'Sınav Geçmişi', en: 'Exam History' })}
                        </button>
                        <button
                          onClick={() => setDetailTab('integrity')}
                          className={cx(
                            'px-3 py-2 rounded-xl text-sm font-bold transition',
                            detailTab === 'integrity' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
                          )}
                        >
                          {t({ tr: 'Integrity', en: 'Integrity' })}
                        </button>
                      </div>

                      <Button
                        variant="soft"
                        onClick={() => downloadStudentReport(modal.student?.id, 'pdf')}
                        title={t({ tr: 'Bu öğrencinin raporunu PDF indir', en: 'Download this student report as PDF' })}
                      >
                        📄 PDF
                      </Button>
                      <Button
                        variant="soft"
                        onClick={() => downloadStudentReport(modal.student?.id, 'csv')}
                        title={t({ tr: 'Bu öğrencinin raporunu CSV indir', en: 'Download this student report as CSV' })}
                      >
                        🧾 CSV
                      </Button>

                      <button
                        onClick={() => {
                          setModal({ open: false, student: null });
                          setDetail(null);
                        }}
                        className="ml-1 w-10 h-10 rounded-2xl bg-gray-900/5 hover:bg-gray-900/10 text-gray-700 text-xl font-bold"
                        aria-label={t({ tr: 'Kapat', en: 'Close' })}
                        title={t({ tr: 'Kapat', en: 'Close' })}
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    {!detail ? (
                      <div className="text-gray-700">{t({ tr: 'Yükleniyor...', en: 'Loading...' })}</div>
                    ) : detailTab === 'history' ? (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-extrabold text-gray-900">{t({ tr: 'Sınav Geçmişi', en: 'Exam History' })}</h3>
                          <span className="text-xs text-gray-500">{t({ tr: '{n} kayıt', en: '{n} records' }, { n: detail.history?.length || 0 })}</span>
                        </div>

                        {detail.history?.length ? (
                          <div className="overflow-x-auto rounded-2xl border border-gray-100">
                            <table className="min-w-full">
                              <thead className="bg-gray-50">
                                <tr className="text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                                  <th className="px-4 py-3">{t({ tr: 'Tarih', en: 'Date' })}</th>
                                  <th className="px-4 py-3">{t({ tr: 'Seviye', en: 'Level' })}</th>
                                  <th className="px-4 py-3">{t({ tr: 'Toplam', en: 'Total' })}</th>
                                  <th className="px-4 py-3">Grammar</th>
                                  <th className="px-4 py-3">Listening</th>
                                  <th className="px-4 py-3">Writing</th>
                                  <th className="px-4 py-3">Speaking</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {detail.history.map((r) => (
                                  <tr key={r.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-700">{new Date(r.date).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-sm font-bold text-gray-900">{r.level}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700">{r.score}/100</td>
                                    <td className="px-4 py-3 text-sm text-gray-700">{r.grammarScore}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700">{r.listeningScore}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700">{r.writingScore}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700">{r.speakingScore}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-gray-700">{t({ tr: 'Bu öğrenci henüz sınav çözmemiş.', en: 'This student has not taken any exams yet.' })}</div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-extrabold text-gray-900">{t({ tr: 'Integrity Kayıtları', en: 'Integrity Logs' })}</h3>
                          <span className="text-xs text-gray-500">{t({ tr: 'Sınav sırasında oluşan şüpheli hareket kayıtları', en: 'Suspicious activity logs during exams' })}</span>
                        </div>

                        {integrity.loading ? (
                          <div className="text-gray-700">{t({ tr: 'Yükleniyor...', en: 'Loading...' })}</div>
                        ) : integrity.error ? (
                          <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">{integrity.error}</div>
                        ) : integrity.events?.length ? (
                          <div className="space-y-3">
                            {integrity.events.slice(0, 50).map((ev) => (
                              <div key={ev.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div className="inline-flex items-center gap-2">
                                    <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-800 text-xs font-extrabold">{ev.type}</span>
                                    <span className="text-xs text-gray-500">#{ev.id}</span>
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {new Date(ev.createdAt).toLocaleString()} • {t({ tr: 'Deneme', en: 'Attempt' })} #{ev.attemptId}
                                  </div>
                                </div>

                                {ev.details ? (
                                  <pre className="mt-3 text-xs bg-gray-50 border border-gray-100 rounded-xl p-3 overflow-x-auto">{JSON.stringify(ev.details, null, 2)}</pre>
                                ) : (
                                  <div className="mt-3 text-xs text-gray-500">{t({ tr: 'Detay yok', en: 'No details' })}</div>
                                )}
                              </div>
                            ))}

                            {integrity.events.length > 50 ? (
                              <div className="text-xs text-gray-500">
                                {t(
                                  {
                                    tr: 'Not: Görünüm ilk 50 kaydı gösteriyor. (Toplam: {n})',
                                    en: 'Note: This view shows the first 50 records. (Total: {n})'
                                  },
                                  { n: integrity.events.length }
                                )}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <div className="text-gray-700">{t({ tr: 'Kayıtlı şüpheli hareket bulunamadı.', en: 'No suspicious activity records found.' })}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
