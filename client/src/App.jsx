import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';         
import Dashboard from './pages/Dashboard'; 
import Profile from './pages/Profile';     
import Exam from './pages/Exam';           

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/exam" element={<Exam />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;