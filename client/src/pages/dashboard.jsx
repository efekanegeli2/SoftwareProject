import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../context/I18nContext.jsx';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';

function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useI18n();

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#ff2d95] via-[#5b2cff] to-[#00d4ff]">
      {/* more eye-catching backdrop (keeps layout; only changes background colors) */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1100px_circle_at_20%_0%,rgba(255,45,149,0.24),transparent_60%),radial-gradient(900px_circle_at_80%_30%,rgba(0,212,255,0.20),transparent_55%),radial-gradient(800px_circle_at_50%_100%,rgba(255,214,10,0.14),transparent_55%)]" />
      {/* global soft color glows (keeps layout, improves vibe) */}
      <div className="pointer-events-none absolute -top-44 -left-44 h-96 w-96 rounded-full bg-gradient-to-br from-pink-300/45 via-fuchsia-200/25 to-cyan-200/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-52 -right-52 h-96 w-96 rounded-full bg-gradient-to-tr from-amber-200/45 via-rose-200/25 to-indigo-200/25 blur-3xl" />
      {/* Navbar */}
      <nav className="relative z-10 bg-white/70 backdrop-blur px-6 py-4 flex justify-between items-center border-b border-gray-100 shadow-sm">
        <h2 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
          {t({ tr: 'İngilizce Değerlendirme', en: 'English Assessment' })}
        </h2>
        <div className="flex items-center gap-3">
          <LanguageSwitcher className="mr-1" />
          <span className="text-sm text-gray-700 hidden sm:block px-3 py-1 rounded-full bg-white/70 border border-gray-200 shadow-sm">
            {user?.email}
          </span>
          <button
            onClick={() => navigate('/profile')}
            className="px-4 py-2 rounded-full bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700 font-semibold hover:from-indigo-100 hover:to-violet-100 transition shadow-sm border border-indigo-100"
          >
            👤 {t({ tr: 'Profil', en: 'Profile' })}
          </button>
          <button
            onClick={logout}
            className="px-4 py-2 rounded-full bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 font-semibold hover:from-gray-200 hover:to-gray-100 transition shadow-sm border border-gray-200"
          >
            {t({ tr: 'Çıkış', en: 'Logout' })}
          </button>
        </div>

        {/* subtle gradient underline */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" />
      </nav>

      {/* Hero */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-16 text-center">
        <div className="relative overflow-hidden rounded-3xl border border-indigo-100/70 bg-white/70 backdrop-blur p-10 sm:p-14 shadow-lg shadow-indigo-200/25 ring-1 ring-indigo-200/40">
          {/* soft background glows (non-intrusive) */}
          <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-indigo-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 right-[-40px] h-72 w-72 rounded-full bg-violet-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-[-60px] h-72 w-72 rounded-full bg-sky-200/30 blur-3xl" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 border border-indigo-100 mb-6">
              ✨ {t({ tr: 'Yapay zeka destekli • CEFR', en: 'AI-assisted • CEFR' })}
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 tracking-tight bg-gradient-to-r from-indigo-700 via-violet-700 to-fuchsia-700 bg-clip-text text-transparent">
              {t({ tr: 'Hazır mısın?', en: 'Ready?' })}
            </h1>
            <p className="text-gray-600 text-lg mb-10 leading-relaxed">
              {t({
                tr: 'İngilizce seviyeni ölçmek için yapay zeka destekli sınavımıza katıl. Grammar, Writing, Speaking ve Listening bölümleri seni bekliyor.',
                en: 'Join our AI-assisted exam to measure your English level. Grammar, Writing, Speaking, and Listening sections are waiting for you.'
              })}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/exam')}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-lg hover:from-indigo-700 hover:to-violet-700 shadow-lg shadow-indigo-200/40 transition ring-1 ring-white/40"
              >
                🚀 {t({ tr: 'Sınavı Başlat', en: 'Start Exam' })}
              </button>
              <button
                onClick={() => navigate('/profile')}
                className="px-8 py-4 rounded-xl bg-white/80 backdrop-blur border border-gray-200 text-gray-800 font-bold text-lg hover:border-indigo-200 hover:bg-gradient-to-r hover:from-white hover:to-indigo-50 shadow-sm transition"
              >
                📊 {t({ tr: 'Sonuçlarım', en: 'My Results' })}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
