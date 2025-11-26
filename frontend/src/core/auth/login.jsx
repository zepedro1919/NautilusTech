import { useState } from 'react';
import logo from '/nautilus_tech_logo.png';
import api from '../api';
import './login.css';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedModule, setSelectedModule] = useState('HR');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Replace URL with your deployed backend URL later
      const res = await api.post('/api/login', {
        username,
        password,
        module: selectedModule
      });
      
      if (res.data.success) {
        onLogin(res.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao conectar ao servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <img src={logo} alt="Nautilus Tech Logo" />
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Módulo</label>
            <select 
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="module-select"
            >
              <option value="HR">NAUTILUS HR</option>
              <option value="SALES" disabled>NAUTILUS SALES (em breve)</option>
              <option value="PRODUCTION" disabled>NAUTILUS PRODUCTION (em breve)</option>
            </select>
          </div>
          <div className="form-group">
            <label>Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required 
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading && <span className="button-spinner"></span>}
            {loading ? 'A entrar...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;