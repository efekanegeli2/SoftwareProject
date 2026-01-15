import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Login() {
  const [isLogin, setIsLogin] = useState(true); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('STUDENT');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(''); // Başarı mesajı için
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const API_URL = 'http://localhost:3000/auth'; 

    try {
      if (isLogin) {
        // --- GİRİŞ YAPMA KISMI ---
        const response = await axios.post(`${API_URL}/login`, { email, password });
        
        // Token varsa kaydet ve yönlendir
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('userRole', response.data.user.role);
          navigate('/dashboard'); 
        }
      } else {
        // --- KAYIT OLMA KISMI ---
        await axios.post(`${API_URL}/register`, { email, password, role });
        
        // Kayıt başarılıysa:
        setIsLogin(true); // Giriş ekranına çevir
        setSuccess('Kayıt başarılı! Lütfen oluşturduğun bilgilerle giriş yap.');
        // Formu temizle
        setEmail('');
        setPassword('');
      }

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Bir hata oluştu.');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f2f5' }}>
      <div style={{ background: 'white', padding: '2rem', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '350px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#333' }}>
          {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
        </h2>

        {/* Hata Mesajı (Kırmızı) */}
        {error && <div style={{ color: 'red', marginBottom: '1rem', padding: '10px', background: '#ffe6e6', borderRadius: '5px', fontSize: '0.9rem' }}>{error}</div>}
        
        {/* Başarı Mesajı (Yeşil) */}
        {success && <div style={{ color: 'green', marginBottom: '1rem', padding: '10px', background: '#e6ffe6', borderRadius: '5px', fontSize: '0.9rem' }}>{success}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="email" placeholder="Email Adresi" value={email} onChange={(e) => setEmail(e.target.value)} required
            style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
          />
          <input
            type="password" placeholder="Şifre" value={password} onChange={(e) => setPassword(e.target.value)} required
            style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
          />
          {!isLogin && (
            <select value={role} onChange={(e) => setRole(e.target.value)} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}>
              <option value="STUDENT">Öğrenci</option>
              <option value="TEACHER">Öğretmen</option>
            </select>
          )}
          <button type="submit" style={{ padding: '10px', borderRadius: '5px', border: 'none', backgroundColor: '#4F46E5', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
            {isLogin ? 'Giriş Yap' : 'Hesap Oluştur'}
          </button>
        </form>

        <p style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.9rem', color: '#666' }}>
          {isLogin ? "Hesabın yok mu?" : "Zaten hesabın var mı?"} <br />
          <span onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }} style={{ color: '#4F46E5', cursor: 'pointer', fontWeight: 'bold' }}>
            {isLogin ? "Hemen Kayıt Ol" : "Giriş Yap"}
          </span>
        </p>
      </div>
    </div>
  );
}

export default Login;