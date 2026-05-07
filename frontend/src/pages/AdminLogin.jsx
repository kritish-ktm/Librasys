import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';

function AdminLogin() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', form);

      if (res.data.role !== 'Librarian') {
        setError('Access denied. This login is for admins only.');
        return;
      }

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.role);
      localStorage.setItem('name', res.data.name);

      navigate('/dashboard');

    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">LibraSys</h1>
        <p className="login-subtitle">Admin Login</p>

        {error && <p className="login-error">{error}</p>}

        <input
          className="login-input"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <input
          className="login-input"
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        <button className="login-button" onClick={handleSubmit}>
          Login
        </button>

        <p className="login-register-text">
          Are you a member?{' '}
          <Link to="/member-login" className="login-register-link">
            Member Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default AdminLogin;