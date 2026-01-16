import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:3000';

function Pill({ children }) {
  return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">{children}</span>;
}

export default function AdminPanel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/dashboard/admin`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setData(res.data);
    } catch (e) {
      console.error(e);
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        logout();
        navigate('/login');
        return;
      }
      alert('Admin verileri alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Bu kullanıcıyı silmek istiyor musun?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/dashboard/admin/user/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      await load();
    } catch (e) {
      console.error(e);
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        logout();
        navigate('/login');
        return;
      }
      alert(e.response?.data?.error || 'Silme işlemi başarısız.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  const stats = data?.stats || {};
  const users = data?.users || [];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">Admin Panel</h1>
              <p className="text-sm text-gray-600">Kullanıcılar ve genel istatistikler</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button onClick={load} className="px-4 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 font-semibold">Yenile</button>
              <button onClick={logout} className="px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-black font-semibold">Çıkış</button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Stat title="Users" value={stats.totalUsers} />
          <Stat title="Students" value={stats.students} />
          <Stat title="Teachers" value={stats.teachers} />
          <Stat title="Admins" value={stats.admins} />
          <Stat title="Total Exams" value={stats.totalExams} />
        </div>

        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">{u.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><Pill>{u.role}</Pill></td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">{u.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {u.id === user?.id ? (
                        <span className="text-sm text-gray-500">(sen)</span>
                      ) : (
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700"
                        >
                          Sil
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-2xl shadow p-6">
          <h2 className="font-extrabold text-gray-900 mb-2">Demo hesaplar</h2>
          <div className="text-sm text-gray-700 leading-6">
            <div><b>Student:</b> student@demo.com / demo123</div>
            <div><b>Teacher:</b> teacher@demo.com / demo123</div>
            <div><b>Admin:</b> admin@demo.com / demo123</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ title, value }) {
  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <div className="text-xs font-bold uppercase text-gray-500">{title}</div>
      <div className="text-3xl font-extrabold text-gray-900 mt-2">{value ?? 0}</div>
    </div>
  );
}
