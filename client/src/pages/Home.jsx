import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../context/I18nContext.jsx';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';

function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();

  // If user is already logged in, redirect to their dashboard
  if (user) {
    const roleHome = (role) => {
      if (role === 'ADMIN') return '/admin';
      if (role === 'TEACHER') return '/teacher';
      return '/dashboard';
    };
    navigate(roleHome(user.role), { replace: true });
    return null;
  }

  const handleDemoLogin = async (role) => {
    const emails = {
      STUDENT: 'student@demo.com',
      TEACHER: 'teacher@demo.com',
      ADMIN: 'admin@demo.com'
    };
    const password = 'demo123';

    const response = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: emails[role],
        password: password,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.reload(); // Reload to trigger auth context update
    }
  };

  const features = [
    {
      icon: '🎯',
      title: t({ tr: 'CEFR Seviye Belirleme', en: 'CEFR Level Assessment' }),
      desc: t({ tr: 'A1\'den C2\'ye kadar uluslararası standartlarda seviye tespiti', en: 'International CEFR standard level detection from A1 to C2' })
    },
    {
      icon: '🤖',
      title: t({ tr: 'AI Destekli Değerlendirme', en: 'AI-Assisted Evaluation' }),
      desc: t({ tr: 'Yapay zeka ile otomatik skorlama ve detaylı geri bildirim', en: 'Automatic scoring and detailed feedback with AI' })
    },
    {
      icon: '📝',
      title: t({ tr: '4 Bölümlü Sınav', en: '4-Part Exam' }),
      desc: t({ tr: 'Grammar, Listening, Writing ve Speaking bölümleri', en: 'Grammar, Listening, Writing and Speaking sections' })
    },
    {
      icon: '📊',
      title: t({ tr: 'Detaylı Raporlar', en: 'Detailed Reports' }),
      desc: t({ tr: 'PDF ve CSV formatında indirilebilir performans raporları', en: 'Downloadable performance reports in PDF and CSV format' })
    }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#ff2d95] via-[#5b2cff] to-[#00d4ff]">
      {/* Background Effects */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1100px_circle_at_20%_0%,rgba(255,45,149,0.24),transparent_60%),radial-gradient(900px_circle_at_80%_30%,rgba(0,212,255,0.20),transparent_55%),radial-gradient(800px_circle_at_50%_100%,rgba(255,214,10,0.14),transparent_55%)]" />
      <div className="pointer-events-none absolute -top-44 -left-44 h-96 w-96 rounded-full bg-gradient-to-br from-pink-300/45 via-fuchsia-200/25 to-cyan-200/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-52 -right-52 h-96 w-96 rounded-full bg-gradient-to-tr from-amber-200/45 via-rose-200/25 to-indigo-200/25 blur-3xl" />

      {/* Navigation */}
      <nav className="relative z-10 bg-white/70 backdrop-blur px-6 py-4 flex justify-between items-center border-b border-gray-100 shadow-sm">
        <h2 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
          {t({ tr: 'İngilizce Değerlendirme', en: 'English Assessment' })}
        </h2>
        <div className="flex items-center gap-3">
          <LanguageSwitcher className="mr-1" />
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 rounded-full bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700 font-semibold hover:from-indigo-100 hover:to-violet-100 transition shadow-sm border border-indigo-100"
          >
            {t({ tr: 'Giriş Yap', en: 'Login' })}
          </button>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" />
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 border border-indigo-100 mb-6">
            ✨ {t({ tr: 'Yapay zeka destekli • CEFR', en: 'AI-assisted • CEFR' })}
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold mb-6 tracking-tight bg-gradient-to-r from-indigo-700 via-violet-700 to-fuchsia-700 bg-clip-text text-transparent">
            {t({ tr: 'İngilizce Seviyenizi', en: 'Measure Your' })}<br />
            {t({ tr: 'Keşfedin', en: 'English Level' })}
          </h1>

          <p className="text-gray-600 text-xl mb-10 leading-relaxed max-w-3xl mx-auto">
            {t({
              tr: 'Uluslararası standartlarda İngilizce seviye değerlendirmesi yapın. Grammar, Listening, Writing ve Speaking bölümlerinden oluşan kapsamlı sınavımızla CEFR seviyenizi belirleyin.',
              en: 'Take an internationally standardized English level assessment. Determine your CEFR level with our comprehensive exam consisting of Grammar, Listening, Writing and Speaking sections.'
            })}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-lg hover:from-indigo-700 hover:to-violet-700 shadow-lg shadow-indigo-200/40 transition ring-1 ring-white/40"
            >
              🚀 {t({ tr: 'Şimdi Başla', en: 'Get Started' })}
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="px-8 py-4 rounded-xl bg-white/80 backdrop-blur border border-gray-200 text-gray-800 font-bold text-lg hover:border-indigo-200 hover:bg-gradient-to-r hover:from-white hover:to-indigo-50 shadow-sm transition"
            >
              📝 {t({ tr: 'Kayıt Ol', en: 'Sign Up' })}
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {features.map((feature, index) => (
            <div key={index} className="bg-white/70 backdrop-blur rounded-xl p-6 shadow-lg shadow-indigo-200/25 border border-indigo-100/70">
              <div className="text-3xl mb-4">{feature.icon}</div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Demo Section */}
        <div className="bg-white/70 backdrop-blur rounded-3xl border border-indigo-100/70 p-8 sm:p-10 shadow-lg shadow-indigo-200/25">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold mb-4 bg-gradient-to-r from-indigo-700 to-violet-700 bg-clip-text text-transparent">
              {t({ tr: 'Demo Hesaplarla Dene', en: 'Try with Demo Accounts' })}
            </h2>
            <p className="text-gray-600 text-lg">
              {t({ tr: 'Sistemimizi keşfetmek için hazır demo hesaplarımızı kullanın', en: 'Use our ready-made demo accounts to explore the system' })}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => handleDemoLogin('STUDENT')}
              className="group bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white p-6 rounded-xl font-bold text-lg transition shadow-lg shadow-green-200/40"
            >
              <div className="text-2xl mb-2">🎓</div>
              {t({ tr: 'Öğrenci Girişi', en: 'Student Login' })}
              <div className="text-sm opacity-90 mt-1 font-normal">
                student@demo.com
              </div>
            </button>

            <button
              onClick={() => handleDemoLogin('TEACHER')}
              className="group bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white p-6 rounded-xl font-bold text-lg transition shadow-lg shadow-blue-200/40"
            >
              <div className="text-2xl mb-2">👨‍🏫</div>
              {t({ tr: 'Öğretmen Girişi', en: 'Teacher Login' })}
              <div className="text-sm opacity-90 mt-1 font-normal">
                teacher@demo.com
              </div>
            </button>

            <button
              onClick={() => handleDemoLogin('ADMIN')}
              className="group bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white p-6 rounded-xl font-bold text-lg transition shadow-lg shadow-purple-200/40"
            >
              <div className="text-2xl mb-2">⚙️</div>
              {t({ tr: 'Admin Girişi', en: 'Admin Login' })}
              <div className="text-sm opacity-90 mt-1 font-normal">
                admin@demo.com
              </div>
            </button>
          </div>

          <div className="text-center mt-6 text-gray-500 text-sm">
            {t({ tr: 'Tüm demo hesapların şifresi: demo123', en: 'Password for all demo accounts: demo123' })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;



