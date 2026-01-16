import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:3000';

function authHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function TeacherPanel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('students'); // students | questions

  // Students
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [students, setStudents] = useState([]);
  const [modal, setModal] = useState({ open: false, student: null });
  const [detail, setDetail] = useState(null);

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

  useEffect(() => {
    loadStudents();
    loadQuestions();
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
      alert('Teacher listesi alınamadı. Server çalışıyor mu?');
    } finally {
      setLoadingStudents(false);
    }
  };

  const openDetails = async (student) => {
    setModal({ open: true, student });
    setDetail(null);
    try {
      const res = await axios.get(`${API_URL}/api/dashboard/teacher/student/${student.id}`, {
        headers: authHeader()
      });
      setDetail(res.data);
    } catch (e) {
      console.error(e);
      if (handleAuthError(e)) return;
      alert('Öğrenci detayları alınamadı.');
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
      setQError(e?.response?.data?.error || 'Soru listesi alınamadı.');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const createQuestion = async (e) => {
    e.preventDefault();
    setQError('');

    if (!canCreateQuestion) {
      setQError('Soru metni ve en az 2 seçenek doldurulmalı. Doğru seçenek boş olamaz.');
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
      setQError(e2?.response?.data?.error || 'Soru eklenemedi.');
    } finally {
      setQSubmitting(false);
    }
  };

  const deleteQuestion = async (id) => {
    if (deletingId) return;
    const ok = window.confirm('Bu soruyu silmek istediğine emin misin?');
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
      setQError(e?.response?.data?.error || 'Soru silinemedi.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">Teacher Panel</h1>
              <p className="text-sm text-gray-600">Öğrencileri görüntüle ve soru bankasına soru ekle</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-gray-600">{user?.email}</span>

              <div className="flex items-center bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setTab('students')}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                    tab === 'students' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Öğrenciler
                </button>
                <button
                  onClick={() => setTab('questions')}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                    tab === 'questions' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Soru Bankası
                </button>
              </div>

              {tab === 'students' ? (
                <button
                  onClick={loadStudents}
                  className="px-4 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 font-semibold"
                >
                  Yenile
                </button>
              ) : (
                <button
                  onClick={loadQuestions}
                  className="px-4 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 font-semibold"
                >
                  Yenile
                </button>
              )}

              <button onClick={logout} className="px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-black font-semibold">
                Çıkış
              </button>
            </div>
          </div>
        </div>

        {tab === 'students' ? (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            {loadingStudents ? (
              <div className="p-10 text-center text-gray-600">Yükleniyor...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Student</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Total Exams</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Avg</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Latest</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {students.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                          Henüz öğrenci bulunamadı.
                        </td>
                      </tr>
                    ) : (
                      students.map((s) => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-semibold text-gray-900">{s.email}</div>
                            <div className="text-xs text-gray-500">ID: {s.id}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{s.totalExams}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {s.totalExams ? `${s.averageScore}/100` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {s.latest ? (
                              <span>
                                <b>{s.latest.level}</b> • {s.latest.score}/100
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => openDetails(s)}
                              className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
                            >
                              Detay
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-lg font-extrabold text-gray-900 mb-1">Yeni Grammar (MCQ) Sorusu</h2>
              <p className="text-sm text-gray-600 mb-6">Eklediğin sorular sınav oluşturma sırasında otomatik havuza dahil olur.</p>

              {qError ? (
                <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">{qError}</div>
              ) : null}

              <form onSubmit={createQuestion} className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Soru Metni</label>
                  <textarea
                    value={qText}
                    onChange={(e) => setQText(e.target.value)}
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Örn: I ___ to school every day."
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Zorluk (CEFR)</label>
                  <select
                    value={qDifficulty}
                    onChange={(e) => setQDifficulty(e.target.value)}
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                      <label className="text-sm font-semibold text-gray-700">Seçenek {idx + 1}</label>
                      <input
                        value={opt}
                        onChange={(e) =>
                          setQOptions((prev) => {
                            const next = [...prev];
                            next[idx] = e.target.value;
                            return next;
                          })
                        }
                        className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder={`Option ${idx + 1}`}
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Doğru Seçenek</label>
                  <select
                    value={qCorrectIndex}
                    onChange={(e) => setQCorrectIndex(Number(e.target.value))}
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {qOptions.map((o, idx) => (
                      <option key={idx} value={idx}>
                        {`Seçenek ${idx + 1}${o.trim() ? `: ${o.trim()}` : ''}`}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={qSubmitting || !canCreateQuestion}
                  className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {qSubmitting ? 'Ekleniyor...' : 'Soru Ekle'}
                </button>
              </form>
            </div>

            <div className="bg-white rounded-2xl shadow p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900">Son Eklenen Sorular</h2>
                  <p className="text-sm text-gray-600">(En son 50)</p>
                </div>
                <button
                  onClick={loadQuestions}
                  className="px-4 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 font-semibold"
                >
                  Yenile
                </button>
              </div>

              {loadingQuestions ? (
                <div className="p-6 text-gray-600">Yükleniyor...</div>
              ) : mcqQuestions.length === 0 ? (
                <div className="p-6 text-gray-600">Henüz soru yok.</div>
              ) : (
                <div className="space-y-4">
                  {mcqQuestions.map((q) => (
                    <div key={q.id} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs text-gray-500">#{q.id}</div>
                        <div className="flex items-center gap-2">
                          <div className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg">{q.difficulty || '-'}</div>
                          <button
                            onClick={() => deleteQuestion(q.id)}
                            disabled={deletingId === q.id}
                            className="text-xs font-bold px-3 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                            title="Soruyu sil"
                          >
                            {deletingId === q.id ? 'Siliniyor...' : 'Sil'}
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 font-semibold text-gray-900">{q.text}</div>
                      <ul className="mt-2 space-y-1 text-sm text-gray-700">
                        {(q.options || []).map((opt) => (
                          <li key={opt} className={opt === q.correct ? 'font-bold text-green-700' : ''}>
                            • {opt}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal (Student Details) */}
      {modal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <div className="text-lg font-extrabold text-gray-900">{modal.student?.email}</div>
                <div className="text-sm text-gray-600">Exam history</div>
              </div>
              <button
                onClick={() => {
                  setModal({ open: false, student: null });
                  setDetail(null);
                }}
                className="text-2xl leading-none text-gray-500 hover:text-gray-800"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {!detail ? (
                <div className="text-gray-600">Yükleniyor...</div>
              ) : detail.history?.length ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Level</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Total</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Grammar</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Listening</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Writing</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Speaking</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {detail.history.map((r) => (
                        <tr key={r.id}>
                          <td className="px-4 py-3 text-sm text-gray-700">{new Date(r.date).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">{r.level}</td>
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
                <div className="text-gray-600">Bu öğrenci henüz sınav çözmemiş.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
