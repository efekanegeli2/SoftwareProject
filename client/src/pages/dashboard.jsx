import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../context/I18nContext.jsx';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';

function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white px-6 py-4 flex justify-between items-center shadow-sm">
        <h2 className="text-indigo-600 font-bold text-lg">{t({ tr: 'İngilizce Değerlendirme', en: 'English Assessment' })}</h2>
        <div className="flex items-center gap-3">
          <LanguageSwitcher className="mr-1" />
          <span className="text-sm text-gray-600 hidden sm:block">{user?.email}</span>
          <button
            onClick={() => navigate('/profile')}
            className="px-4 py-2 rounded-full bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100"
          >
            👤 {t({ tr: 'Profil', en: 'Profile' })}
          </button>
          <button
            onClick={logout}
            className="px-4 py-2 rounded-full bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200"
          >
            {t({ tr: 'Çıkış', en: 'Logout' })}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">{t({ tr: 'Hazır mısın?', en: 'Ready?' })}</h1>
        <p className="text-gray-600 text-lg mb-10">
          {t({
            tr: 'İngilizce seviyeni ölçmek için yapay zeka destekli sınavımıza katıl. Grammar, Writing, Speaking ve Listening bölümleri seni bekliyor.',
            en: 'Join our AI-assisted exam to measure your English level. Grammar, Writing, Speaking, and Listening sections are waiting for you.'
          })}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/exam')}
            className="px-8 py-4 rounded-xl bg-indigo-600 text-white font-bold text-lg hover:bg-indigo-700 shadow"
          >
            🚀 {t({ tr: 'Sınavı Başlat', en: 'Start Exam' })}
          </button>
          <button
            onClick={() => navigate('/profile')}
            className="px-8 py-4 rounded-xl bg-white border border-gray-200 text-gray-800 font-bold text-lg hover:bg-gray-50"
          >
            📊 {t({ tr: 'Sonuçlarım', en: 'My Results' })}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
