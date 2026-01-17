import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../context/I18nContext.jsx';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:3000';

function Profile() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { t } = useI18n();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const downloadReport = async (format) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/reports/student?format=${format}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.status === 401 || res.status === 403) {
        logout();
        navigate('/login');
        return;
      }

      if (!res.ok) throw new Error('Download failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = format === 'csv' ? 'csv' : 'pdf';
      a.download = `student_report_${new Date().toISOString().slice(0, 10)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1500);
    } catch (e) {
      alert(t({ tr: 'Rapor indirilemedi.', en: 'Report download failed.' }));
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/dashboard/profile`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      // If user is not logged in / token expired, redirect to login.
      if (res.status === 401 || res.status === 403) {
        logout();
        navigate('/login');
        return;
      }

      if (!res.ok) throw new Error('Failed to fetch data');
      const data = await res.json();
      setProfileData(data);
      setLoading(false);
    } catch (err) {
      setError(t({
        tr: 'Profil yüklenemedi. (Backend kapalı olabilir ya da giriş yapılmamış olabilir.)',
        en: 'Profile could not be loaded. (Backend may be down or you may not be logged in.)'
      }));
      setLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-white">{t({ tr: 'Profil yükleniyor...', en: 'Loading profile...' })}</div>;
  if (error) return <div className="p-10 text-center text-red-500">{error}</div>;

  const currentLevel = profileData.history.length > 0 ? profileData.history[0].level : t({ tr: 'YOK', en: 'N/A' });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#111827', color: 'white', padding: '40px 20px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ backgroundColor: '#1f2937', padding: '40px', borderRadius: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', border: '1px solid #374151' }}>
          <div>
            <h1 style={{ fontSize: '2.2rem', margin: 0, fontWeight: 'bold' }}>
              {t({ tr: 'Hoş geldin, {name} 👋', en: 'Welcome, {name} 👋' }, { name: profileData.user.name || t({ tr: 'Öğrenci', en: 'Student' }) })}
            </h1>
            <p style={{ color: '#9ca3af', marginTop: '10px' }}>{t({ tr: 'İngilizce Yeterlilik Paneli', en: 'English Proficiency Dashboard' })}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
              <LanguageSwitcher />
            </div>
            <div style={{ fontSize: '0.9rem', color: '#9ca3af', marginBottom: '5px' }}>{t({ tr: 'Mevcut Seviye', en: 'Current Level' })}</div>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: getLevelColor(currentLevel), textShadow: '0 0 10px rgba(0,0,0,0.5)' }}>
              {currentLevel}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ padding: '10px 16px', backgroundColor: '#374151', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ⬅️ {t({ tr: 'Ana Sayfa', en: 'Dashboard' })}
          </button>
          <button
            onClick={logout}
            style={{ padding: '10px 16px', backgroundColor: '#111827', color: 'white', border: '1px solid #374151', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {t({ tr: 'Çıkış', en: 'Logout' })}
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/exam')}
            style={{ padding: '15px 30px', backgroundColor: '#4F46E5', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', boxShadow: '0 4px 15px rgba(79, 70, 229, 0.4)' }}
          >
            🚀 {t({ tr: 'Yeni Yapay Zeka Sınavı Başlat', en: 'Start New AI Assessment' })}
          </button>

          <button
            onClick={() => downloadReport('pdf')}
            style={{ padding: '15px 18px', backgroundColor: '#1f2937', color: 'white', border: '1px solid #374151', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}
            title={t({ tr: 'PDF olarak indir', en: 'Download as PDF' })}
          >
            📄 PDF
          </button>
          <button
            onClick={() => downloadReport('csv')}
            style={{ padding: '15px 18px', backgroundColor: '#1f2937', color: 'white', border: '1px solid #374151', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}
            title={t({ tr: 'CSV olarak indir', en: 'Download as CSV' })}
          >
            🧾 CSV
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
          <StatCard title={t({ tr: 'Toplam Sınav', en: 'Total Exams' })} value={profileData.stats.totalExams} color="#3b82f6" />
          <StatCard title={t({ tr: 'Ortalama Puan', en: 'Avg. Score' })} value={profileData.stats.averageScore} color="#10b981" />
          <StatCard title={t({ tr: 'Son Aktivite', en: 'Last Activity' })} value={profileData.stats.lastExamDate ? new Date(profileData.stats.lastExamDate).toLocaleDateString() : "-"} color="#f59e0b" />
        </div>

        {/* History Table */}
        <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', borderBottom: '1px solid #374151', paddingBottom: '10px' }}>{t({ tr: 'Sınav Geçmişi', en: 'Assessment History' })}</h2>
        
        {profileData.history.length === 0 ? (
          <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>{t({ tr: 'Henüz sınav çözmedin.', en: 'No exams taken yet.' })}</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#1f2937', borderRadius: '10px', overflow: 'hidden' }}>
              <thead>
                <tr style={{ backgroundColor: '#374151', textAlign: 'left', color: '#d1d5db' }}>
                  <th style={{ padding: '15px' }}>{t({ tr: 'Tarih', en: 'Date' })}</th>
                  <th style={{ padding: '15px' }}>{t({ tr: 'Seviye', en: 'Level' })}</th>
                  <th style={{ padding: '15px' }}>{t({ tr: 'Toplam Puan', en: 'Total Score' })}</th>
                  <th style={{ padding: '15px' }}>{t({ tr: 'Grammar', en: 'Grammar' })}</th>
                  <th style={{ padding: '15px' }}>{t({ tr: 'Writing', en: 'Writing' })}</th>
                  <th style={{ padding: '15px' }}>{t({ tr: 'Speaking', en: 'Speaking' })}</th>
                  <th style={{ padding: '15px' }}>{t({ tr: 'Listening', en: 'Listening' })}</th>
                </tr>
              </thead>
              <tbody>
                {profileData.history.map((exam) => (
                  <tr key={exam.id} style={{ borderBottom: '1px solid #374151' }}>
                    <td style={{ padding: '15px', color: '#9ca3af' }}>{new Date(exam.date).toLocaleDateString()}</td>
                    <td style={{ padding: '15px', fontWeight: 'bold', color: getLevelColor(exam.level) }}>{exam.level}</td>
                    <td style={{ padding: '15px', fontWeight: 'bold', color: 'white' }}>{exam.score}</td>
                    <td style={{ padding: '15px' }}>{exam.grammarScore}</td>
                    <td style={{ padding: '15px' }}>{exam.writingScore}</td>
                    <td style={{ padding: '15px' }}>{exam.speakingScore}</td>
                    <td style={{ padding: '15px' }}>{exam.listeningScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, color }) {
  return (
    <div style={{ backgroundColor: '#1f2937', padding: '25px', borderRadius: '15px', textAlign: 'center', borderTop: `4px solid ${color}` }}>
      <h3 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px' }}>{title}</h3>
      <p style={{ margin: 0, fontSize: '2.5rem', fontWeight: 'bold', color: 'white' }}>{value}</p>
    </div>
  );
}

function getLevelColor(level) {
  if (!level) return 'white';
  if (level.includes('C2') || level.includes('C1')) return '#A78BFA'; 
  if (level.includes('B2') || level.includes('B1')) return '#34D399'; 
  return '#60A5FA'; 
}

export default Profile;