import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    // Giriş yapılmamışsa at
    const token = localStorage.getItem('token');
    if (!token) navigate('/');
    
    // Kullanıcı adını (mailini) al
    // (Gerçek projede backend'den ad soyad çekeriz, şimdilik maili gösterelim)
    // Kayıt olurken localStorage'a email kaydetmediysek boş kalabilir, sorun yok.
    setUserName('Öğrenci'); 
  }, [navigate]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      
      {/* --- NAVBAR --- */}
      <nav style={{ 
        backgroundColor: '#fff', 
        padding: '1rem 2rem', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
      }}>
        <h2 style={{ color: '#4F46E5', margin: 0 }}>English Assessment</h2>
        
        {/* Sağ Üst Profil Butonu */}
        <div 
          onClick={() => navigate('/profile')} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            cursor: 'pointer', 
            padding: '8px 15px', 
            borderRadius: '20px', 
            backgroundColor: '#e0e7ff',
            color: '#3730a3',
            fontWeight: 'bold'
          }}
        >
          <span>👤 Profilim</span>
        </div>
      </nav>

      {/* --- ANA İÇERİK --- */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '80vh',
        textAlign: 'center',
        padding: '20px'
      }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#1f2937' }}>
          Hazır mısın?
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#6b7280', marginBottom: '3rem', maxWidth: '600px' }}>
          İngilizce seviyeni ölçmek için yapay zeka destekli sınavımıza katıl. 
          Okuma, yazma ve çoktan seçmeli sorular seni bekliyor.
        </p>

        <button 
          onClick={() => navigate('/exam')}
          style={{ 
            padding: '20px 40px', 
            fontSize: '1.5rem', 
            fontWeight: 'bold', 
            color: 'white', 
            backgroundColor: '#4F46E5', 
            border: 'none', 
            borderRadius: '12px', 
            cursor: 'pointer',
            boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.4)',
            transition: 'transform 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          🚀 Sınavı Başlat
        </button>
      </div>

    </div>
  );
}

export default Dashboard;