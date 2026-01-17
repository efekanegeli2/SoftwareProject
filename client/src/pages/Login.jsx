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

  const handleDemoLogin = async (role) => {
    const emails = {
      STUDENT: 'student@demo.com',
      TEACHER: 'teacher@demo.com',
      ADMIN: 'admin@demo.com'
    };
    setEmail(emails[role]);
    setPassword(DEMO_PASSWORD);
    setError('');

    const result = await login(emails[role], DEMO_PASSWORD);
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

        <div className="mt-6">
          <div className="text-center mb-3">
            <span className="text-sm text-gray-500">{t({ tr: 'Demo hesaplarla dene:', en: 'Try with demo accounts:' })}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('STUDENT')}
              className="py-2 px-3 text-xs bg-green-50 text-green-700 rounded-lg border border-green-200 hover:bg-green-100 font-medium transition"
            >
              🎓 {t({ tr: 'Öğrenci', en: 'Student' })}
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('TEACHER')}
              className="py-2 px-3 text-xs bg-blue-50 text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-100 font-medium transition"
            >
              👨‍🏫 {t({ tr: 'Öğretmen', en: 'Teacher' })}
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('ADMIN')}
              className="py-2 px-3 text-xs bg-purple-50 text-purple-700 rounded-lg border border-purple-200 hover:bg-purple-100 font-medium transition"
            >
              ⚙️ {t({ tr: 'Admin', en: 'Admin' })}
            </button>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600 text-center">
          {t({ tr: 'Hesabın yok mu?', en: "Don't have an account?" })}{' '}
          <Link className="text-indigo-700 font-semibold hover:underline" to="/signup">
            {t({ tr: 'Kayıt ol', en: 'Sign up' })}
          </Link>
        </div>
      </div>
    </div>
  );
}
