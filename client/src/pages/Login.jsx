import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../context/I18nContext.jsx';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';

const DEMO_PASSWORD = 'demo123';

function routeForRole(role) {
  if (role === 'ADMIN') return '/admin';
  if (role === 'TEACHER') return '/teacher';
  return '/dashboard';
}

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState('student@demo.com');
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    navigate(routeForRole(result.user.role));
  };

  const quickDemo = async (role) => {
    setError('');
    setLoading(true);
    const demoEmail = role === 'STUDENT' ? 'student@demo.com' : role === 'TEACHER' ? 'teacher@demo.com' : 'admin@demo.com';
    const result = await login(demoEmail, DEMO_PASSWORD);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    navigate(routeForRole(result.user.role));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-slate-900 flex items-center justify-center px-4 relative">
      {/* Top-right language switcher (FR17) */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitcher className="bg-white/90 backdrop-blur px-3 py-2 rounded-xl shadow-md" />
      </div>
      <div className="w-full max-w-md bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8">
        <div className="mb-6">
          <div className="text-center mt-3">
            <h1 className="text-2xl font-extrabold text-gray-900">{t({ tr: 'İngilizce Değerlendirme', en: 'English Assessment' })}</h1>
            <p className="text-gray-600 mt-2">{t({ tr: 'Teacher / Admin / Student giriş', en: 'Teacher / Admin / Student login' })}</p>
          </div>
        </div>

        {error ? (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">{error}</div>
        ) : null}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="student@demo.com"
              required
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700">{t({ tr: 'Şifre', en: 'Password' })}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="demo123"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? t({ tr: 'Giriş yapılıyor...', en: 'Logging in...' }) : t({ tr: 'Giriş Yap', en: 'Login' })}
          </button>
        </form>

        <div className="mt-4 text-sm text-gray-600 text-center">
          {t({ tr: 'Hesabın yok mu?', en: "Don't have an account?" })}{' '}
          <Link className="text-indigo-700 font-semibold hover:underline" to="/signup">
            {t({ tr: 'Kayıt ol', en: 'Sign up' })}
          </Link>
        </div>

        <div className="my-6 border-t border-gray-200" />

        <div className="space-y-3">
          <p className="text-sm text-gray-700 font-semibold">{t({ tr: 'Demo Hızlı Giriş', en: 'Demo Quick Login' })}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => quickDemo('STUDENT')}
              disabled={loading}
              className="py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 font-semibold"
            >
              🎓 {t({ tr: 'Öğrenci', en: 'Student' })}
            </button>
            <button
              onClick={() => quickDemo('TEACHER')}
              disabled={loading}
              className="py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 font-semibold"
            >
              🧑‍🏫 {t({ tr: 'Öğretmen', en: 'Teacher' })}
            </button>
            <button
              onClick={() => quickDemo('ADMIN')}
              disabled={loading}
              className="py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 font-semibold"
            >
              🛡️ {t({ tr: 'Admin', en: 'Admin' })}
            </button>
          </div>
          <div className="text-xs text-gray-500 leading-5">
            <div><b>Student:</b> student@demo.com / demo123</div>
            <div><b>Teacher:</b> teacher@demo.com / demo123</div>
            <div><b>Admin:</b> admin@demo.com / demo123</div>
          </div>
        </div>
      </div>
    </div>
  );
}
