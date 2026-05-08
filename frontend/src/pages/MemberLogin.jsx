import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';

function Login() {
  const [form, setForm] = useState({
    email: '',
    password: ''
  });

  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await axios.post(
        'http://localhost:5000/api/auth/login',
        form
      );

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.role);
      localStorage.setItem('name', res.data.name);

      if (res.data.role === 'Librarian') {
        navigate('/dashboard');
      } else {
        navigate('/profile');
      }

    } catch (err) {
      console.error('Login error:', err);

      setError(
        err.response?.data?.message || 'Login failed'
      );
    }
  };

  return (
    <div className="login-page">

      <div className="login-card">

        <button
          className="login-back-button"
          onClick={() => navigate('/')}
          type="button"
        >
          ← Back
        </button>

        <h1 className="login-title">
          LibraSys
        </h1>

        <p className="login-subtitle">
          Library Management System
        </p>

        {error && (
          <p className="login-error">
            {error}
          </p>
        )}

        <input
          className="login-input"
          placeholder="Email"
          value={form.email}
          onChange={(e) =>
            setForm({
              ...form,
              email: e.target.value
            })
          }
        />

        <input
          className="login-input"
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(e) =>
            setForm({
              ...form,
              password: e.target.value
            })
          }
        />

        <button
          className="login-button"
          onClick={handleSubmit}
        >
          Login
        </button>

        <p className="login-register-text">
          No account?{' '}

          <Link
            to="/register"
            className="login-register-link"
          >
            Register
          </Link>
        </p>

      </div>

    </div>
  );
}

export default Login;