import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Profile() {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/dashboard/profile');
      if (!res.ok) throw new Error('Failed to fetch data');
      const data = await res.json();
      setProfileData(data);
      setLoading(false);
    } catch (err) {
      setError("Error loading profile. Is the server running?");
      setLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-white">Loading Profile...</div>;
  if (error) return <div className="p-10 text-center text-red-500">{error}</div>;

  // Son sınavdaki CEFR seviyesini bul
  const currentLevel = profileData.history.length > 0 ? profileData.history[0].level : "N/A";

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#111827', color: 'white', padding: '40px 20px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* Header & CEFR Badge */}
        <div style={{ backgroundColor: '#1f2937', padding: '40px', borderRadius: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', border: '1px solid #374151' }}>
          <div>
            <h1 style={{ fontSize: '2.2rem', margin: 0, fontWeight: 'bold' }}>Welcome, {profileData.user.name || "Student"} 👋</h1>
            <p style={{ color: '#9ca3af', marginTop: '10px' }}>English Proficiency Dashboard</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.9rem', color: '#9ca3af', marginBottom: '5px' }}>Current Level</div>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: getLevelColor(currentLevel), textShadow: '0 0 10px rgba(0,0,0,0.5)' }}>
              {currentLevel}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div style={{marginBottom: '40px', textAlign: 'right'}}>
             <button 
              onClick={() => navigate('/exam')}
              style={{ padding: '15px 30px', backgroundColor: '#4F46E5', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', boxShadow: '0 4px 15px rgba(79, 70, 229, 0.4)' }}
            >
              🚀 Start New AI Assessment
            </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
          <StatCard title="Total Exams" value={profileData.stats.totalExams} color="#3b82f6" />
          <StatCard title="Avg. Score" value={profileData.stats.averageScore} color="#10b981" />
          <StatCard title="Last Activity" value={profileData.stats.lastExamDate ? new Date(profileData.stats.lastExamDate).toLocaleDateString() : "-"} color="#f59e0b" />
        </div>

        {/* History Table */}
        <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', borderBottom: '1px solid #374151', paddingBottom: '10px' }}>Assessment History</h2>
        
        {profileData.history.length === 0 ? (
          <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>No exams taken yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#1f2937', borderRadius: '10px', overflow: 'hidden' }}>
              <thead>
                <tr style={{ backgroundColor: '#374151', textAlign: 'left', color: '#d1d5db' }}>
                  <th style={{ padding: '15px' }}>Date</th>
                  <th style={{ padding: '15px' }}>Level</th>
                  <th style={{ padding: '15px' }}>Total Score</th>
                  <th style={{ padding: '15px' }}>Grammar</th>
                  <th style={{ padding: '15px' }}>Writing</th>
                  <th style={{ padding: '15px' }}>Speaking</th>
                  <th style={{ padding: '15px' }}>Listening</th>
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
  if (level.includes('C2') || level.includes('C1')) return '#A78BFA'; // Mor (Advanced)
  if (level.includes('B2') || level.includes('B1')) return '#34D399'; // Yeşil (Intermediate)
  return '#60A5FA'; // Mavi (Basic)
}

export default Profile;