import { useNavigate } from 'react-router-dom';

function Profile() {
  const navigate = useNavigate();

  // Örnek Veriler (Backend bağlayınca burası gerçek veri olacak)
  const pastExams = [
    { id: 1, date: '10.01.2024', score: 85, level: 'B2 - Upper Intermediate' },
    { id: 2, date: '05.01.2024', score: 60, level: 'B1 - Intermediate' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    navigate('/');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '2rem' }}>
      
      {/* Geri Dön Butonu */}
      <button onClick={() => navigate('/dashboard')} style={{ marginBottom: '20px', cursor: 'pointer', border: 'none', background: 'transparent', color: '#666' }}>
        ← Dashboard'a Dön
      </button>

      <div style={{ maxWidth: '800px', margin: '0 auto', background: 'white', padding: '2rem', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Profilim</h1>
            <p style={{ color: '#666', marginTop: '5px' }}>Sınav geçmişin ve hesap detayların</p>
          </div>
          <button 
            onClick={handleLogout}
            style={{ padding: '8px 16px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Çıkış Yap
          </button>
        </div>

        <h3>Geçmiş Sınavlarım</h3>
        
        {pastExams.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6', textAlign: 'left' }}>
                <th style={{ padding: '12px', borderRadius: '8px 0 0 8px' }}>Tarih</th>
                <th style={{ padding: '12px' }}>Puan</th>
                <th style={{ padding: '12px', borderRadius: '0 8px 8px 0' }}>Seviye</th>
              </tr>
            </thead>
            <tbody>
              {pastExams.map((exam) => (
                <tr key={exam.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>{exam.date}</td>
                  <td style={{ padding: '12px', fontWeight: 'bold', color: '#4F46E5' }}>{exam.score}</td>
                  <td style={{ padding: '12px' }}>{exam.level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Henüz hiç sınav çözmedin.</p>
        )}
      </div>
    </div>
  );
}

export default Profile;