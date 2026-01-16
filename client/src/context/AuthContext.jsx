import { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext();

// NOTE: You can override this in production with VITE_API_URL
const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:3000';

function applySession(token, userData) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(userData));
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  delete axios.defaults.headers.common['Authorization'];
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } catch {
        clearSession();
      }
    }

    setLoading(false);
  }, []);

  const login = async (email, password, role = null) => {
    try {
      let response;

      // Demo mode: prefer login (server seeds demo users). If login fails for any reason,
      // fall back to register.
      if (role) {
        const demoEmail = `${String(role).toLowerCase()}@demo.com`;
        const demoPassword = 'demo123';
        try {
          response = await axios.post(`${API_URL}/auth/login`, {
            email: demoEmail,
            password: demoPassword
          });
        } catch {
          // Fallback: register and then login
          await axios.post(`${API_URL}/auth/register`, {
            email: demoEmail,
            password: demoPassword,
            role
          });
          response = await axios.post(`${API_URL}/auth/login`, {
            email: demoEmail,
            password: demoPassword
          });
        }
      } else {
        // Normal login
        response = await axios.post(`${API_URL}/auth/login`, {
          email,
          password
        });
      }

      const { token, user: userData } = response.data;

      applySession(token, userData);
      setUser(userData);

      return { success: true, user: userData };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed'
      };
    }
  };

  const register = async ({ email, password, role = 'STUDENT' }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        email,
        password,
        role
      });

      const { token, user: userData } = response.data;

      applySession(token, userData);
      setUser(userData);

      return { success: true, user: userData };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Register failed'
      };
    }
  };

  const logout = () => {
    clearSession();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
