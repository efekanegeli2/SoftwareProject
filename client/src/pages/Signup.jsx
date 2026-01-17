import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../context/I18nContext.jsx';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';

function routeForRole(role) {
  if (role === 'ADMIN') return '/admin';
  if (role === 'TEACHER') return '/teacher';
  return '/dashboard';
}

export default function Signup() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { t } = useI18n();

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
      setError(t({
        tr: 'Bilgileri kontrol et. Şifreler aynı olmalı ve en az 6 karakter olmalı.',
        en: 'Please check the form. Passwords must match and be at least 6 characters.'
      }));
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-slate-900 flex items-center justify-center px-4 relative">
      {/* Top-right language switcher (FR17) */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitcher className="bg-white/90 backdrop-blur px-3 py-2 rounded-xl shadow-md" />
      </div>
      <div className="w-full max-w-md bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8">
        <div className="mb-6">
          <div className="text-center mt-3">
            <h1 className="text-2xl font-extrabold text-gray-900">{t({ tr: 'Hesap Oluştur', en: 'Create Account' })}</h1>
            <p className="text-gray-600 mt-2">{t({ tr: 'Yeni hesap ile giriş yap', en: 'Sign in with a new account' })}</p>
          </div>
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
            <label className="text-sm font-semibold text-gray-700">{t({ tr: 'Rol', en: 'Role' })}</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="STUDENT">🎓 {t({ tr: 'Öğrenci', en: 'Student' })}</option>
              <option value="TEACHER">🧑‍🏫 {t({ tr: 'Öğretmen', en: 'Teacher' })}</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">{t({ tr: 'Demo proje olduğu için Teacher rolü de seçilebilir.', en: 'Since this is a demo project, you can also choose the Teacher role.' })}</p>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700">{t({ tr: 'Şifre', en: 'Password' })}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={t({ tr: 'En az 6 karakter', en: 'At least 6 characters' })}
              required
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700">{t({ tr: 'Şifre (Tekrar)', en: 'Password (Confirm)' })}</label>
            <input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={t({ tr: 'Şifreyi tekrar yaz', en: 'Re-enter password' })}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? t({ tr: 'Kayıt yapılıyor...', en: 'Creating account...' }) : t({ tr: 'Kayıt Ol', en: 'Sign up' })}
          </button>
        </form>

        <div className="mt-6 text-sm text-gray-600 text-center">
          {t({ tr: 'Zaten hesabın var mı?', en: 'Already have an account?' })}{' '}
          <Link className="text-indigo-700 font-semibold hover:underline" to="/login">
            {t({ tr: 'Giriş yap', en: 'Login' })}
          </Link>
        </div>
      </div>
    </div>
  );
}
