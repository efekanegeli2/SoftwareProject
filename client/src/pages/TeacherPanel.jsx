import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:3000';

export default function TeacherPanel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [modal, setModal] = useState({ open: false, student: null });
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/dashboard/teacher`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setStudents(res.data || []);
    } catch (e) {
      console.error(e);
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        logout();
        navigate('/login');
        return;
      }
      alert('Teacher listesi alınamadı. Server çalışıyor mu?');
    } finally {
      setLoading(false);
    }
  };

  const openDetails = async (student) => {
    setModal({ open: true, student });
    setDetail(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/dashboard/teacher/student/${student.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setDetail(res.data);
    } catch (e) {
      console.error(e);
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        logout();
        navigate('/login');
        return;
      }
      alert('Öğrenci detayları alınamadı.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">Teacher Panel</h1>
              <p className="text-sm text-gray-600">Öğrencilerin son sonuçlarını görüntüle</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button onClick={loadStudents} className="px-4 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 font-semibold">
                Yenile
              </button>
              <button onClick={logout} className="px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-black font-semibold">
                Çıkış
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow overflow-hidden">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{s.totalExams ? `${s.averageScore}/100` : '-'}</td>
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
        </div>
      </div>

      {/* Modal */}
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
