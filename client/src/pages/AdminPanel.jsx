import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../context/I18nContext.jsx';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:3000';

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
      <div className="mt-2 text-3xl font-extrabold text-gray-900">{value ?? 0}</div>
      {hint ? <div className="mt-1 text-xs text-gray-500">{hint}</div> : null}
    </div>
  );
}

function Pill({ children }) {
  return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">{children}</span>;
}

export default function AdminPanel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

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
      alert(t({ tr: 'Admin verileri alınamadı.', en: 'Could not fetch admin data.' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id) => {
    if (!confirm(t({ tr: 'Bu kullanıcıyı silmek istiyor musun?', en: 'Do you want to delete this user?' }))) return;
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
      alert(e.response?.data?.error || t({ tr: 'Silme işlemi başarısız.', en: 'Delete failed.' }));
    }
  };

  const stats = data?.stats || {};
  const users = data?.users || [];

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      const okQuery = !q || String(u.email || '').toLowerCase().includes(q) || String(u.id ?? '').includes(q);
      const okRole = roleFilter === 'ALL' || u.role === roleFilter;
      return okQuery && okRole;
    });
  }, [users, query, roleFilter]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Top Bar */}
        <div className="sticky top-4 z-40">
          <div className="rounded-3xl bg-white/80 backdrop-blur border border-white/40 shadow-xl px-5 py-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gray-900 text-white flex items-center justify-center text-xl shadow-sm">🛡️</div>
                <div>
                  <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">{t({ tr: 'Admin Paneli', en: 'Admin Panel' })}</h1>
                  <p className="text-sm text-gray-600">{t({ tr: 'Kullanıcı yönetimi ve genel istatistikler', en: 'User management and overall statistics' })}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <LanguageSwitcher className="sm:mr-2" />
                  <span className="text-sm text-gray-600 truncate max-w-[240px]">{user?.email}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" onClick={load} title={t({ tr: 'Verileri yenile', en: 'Refresh data' })}>
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

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title={t({ tr: 'Kullanıcılar', en: 'Users' })} value={stats.totalUsers} hint={t({ tr: 'Toplam', en: 'Total' })} />
          <StatCard title={t({ tr: 'Öğrenciler', en: 'Students' })} value={stats.students} />
          <StatCard title={t({ tr: 'Öğretmenler', en: 'Teachers' })} value={stats.teachers} />
          <StatCard title={t({ tr: 'Adminler', en: 'Admins' })} value={stats.admins} />
          <StatCard title={t({ tr: 'Toplam Sınav', en: 'Total Exams' })} value={stats.totalExams} />
        </div>

        {/* Users table */}
        <div className="mt-6 rounded-3xl bg-white/85 backdrop-blur border border-white/40 shadow-xl overflow-hidden">
          <div className="p-5 border-b border-white/40 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-gray-900">{t({ tr: 'Kullanıcılar', en: 'Users' })}</h2>
              <p className="text-sm text-gray-600">{t({ tr: 'Email/ID araması yap ve role göre filtrele.', en: 'Search by email/ID and filter by role.' })}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t({ tr: 'Ara: email veya ID', en: 'Search: email or ID' })}
                className="w-full sm:w-72 px-4 py-2 rounded-xl bg-white/70 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
              />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full sm:w-44 px-4 py-2 rounded-xl bg-white/70 border border-gray-200"
              >
                <option value="ALL">{t({ tr: 'Hepsi', en: 'All' })}</option>
                <option value="STUDENT">STUDENT</option>
                <option value="TEACHER">TEACHER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-gray-700">{t({ tr: 'Yükleniyor...', en: 'Loading...' })}</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-10 text-center text-gray-700">{t({ tr: 'Eşleşen kullanıcı bulunamadı.', en: 'No matching users found.' })}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">{t({ tr: 'Rol', en: 'Role' })}</th>
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">{t({ tr: 'İşlemler', en: 'Actions' })}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/40">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-white/50 transition">
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">{u.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap"><Pill>{u.role}</Pill></td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-800">{u.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {u.id === user?.id ? (
                          <span className="text-sm text-gray-500">{t({ tr: '(sen)', en: '(you)' })}</span>
                        ) : (
                          <Button variant="danger" onClick={() => handleDelete(u.id)}>
                            {t({ tr: 'Sil', en: 'Delete' })}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Demo accounts */}
        <div className="mt-6 rounded-3xl bg-white/85 backdrop-blur border border-white/40 shadow-xl p-6">
          <h2 className="font-extrabold text-gray-900 mb-2">{t({ tr: 'Demo hesaplar', en: 'Demo accounts' })}</h2>
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
