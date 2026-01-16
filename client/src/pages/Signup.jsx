import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function routeForRole(role) {
  if (role === 'ADMIN') return '/admin';
  if (role === 'TEACHER') return '/teacher';
  return '/dashboard';
}

export default function Signup() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState('STUDENT');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = useMemo(() => {
    return (
      email.trim().length > 3 &&
      password.length >= 6 &&
      password === password2 &&
      (role === 'STUDENT' || role === 'TEACHER')
    );
  }, [email, password, password2, role]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!canSubmit) {
      setError('Bilgileri kontrol et. Şifreler aynı olmalı ve en az 6 karakter olmalı.');
      return;
    }

    setLoading(true);
    const result = await register({ email, password, role });
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    navigate(routeForRole(result.user.role));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-extrabold text-gray-900">Hesap Oluştur</h1>
          <p className="text-gray-600 mt-2">Yeni hesap ile giriş yap</p>
        </div>

        {error ? (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">{error}</div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="ornek@mail.com"
              required
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700">Rol</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="STUDENT">🎓 Student</option>
              <option value="TEACHER">🧑‍🏫 Teacher</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">Demo proje olduğu için Teacher rolü de seçilebilir.</p>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700">Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="En az 6 karakter"
              required
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700">Şifre (Tekrar)</label>
            <input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Şifreyi tekrar yaz"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
          </button>
        </form>

        <div className="mt-6 text-sm text-gray-600 text-center">
          Zaten hesabın var mı?{' '}
          <Link className="text-indigo-700 font-semibold hover:underline" to="/login">
            Giriş yap
          </Link>
        </div>
      </div>
    </div>
  );
}
