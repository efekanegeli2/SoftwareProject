import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    // Burada normalde backend'e istek atılır.
    // Şimdilik direkt dashboard'a atalım ki çalıştığını gör.
    localStorage.setItem('token', 'fake-token'); 
    navigate('/dashboard');
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f3f4f6' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '300px' }}>
        <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '20px' }}>Giriş Yap</h2>
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input 
            type="email" 
            placeholder="Email Adresin" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}
            required
          />
          <input 
            type="password" 
            placeholder="Şifren" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}
            required
          />
          <button 
            type="submit" 
            style={{ padding: '10px', backgroundColor: '#4F46E5', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Giriş Yap
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;