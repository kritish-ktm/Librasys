import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';

function Login() {

  // Form state holds email and password inputs
  const [form, setForm] = useState({
    email: '',
    password: ''
  });

  // Error state holds the message shown to the user on failed login
  const [error, setError] = useState('');

  // useNavigate allows programmatic redirection after login
  const navigate = useNavigate();

  // ─── Client-Side Validation ───────────────────────────────────────────────
  // Runs before hitting the API to catch obvious errors early,
  // saving unnecessary network requests.
  const validate = () => {

    // Check that neither field is left empty
    if (!form.email.trim() || !form.password.trim()) {
      setError('Email and password are required.');
      return false;
    }

    // Basic email format check (must contain @ and a domain)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setError('Please enter a valid email address.');
      return false;
    }

    // Enforce a minimum password length
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return false;
    }

    return true; // All checks passed
  };

  // ─── Form Submit Handler ──────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default browser form submission

    setError(''); // Clear any previous error before a new attempt

    // Run validation first — abort if it fails
    if (!validate()) return;

    try {
      // Send login credentials to the backend
      const res = await axios.post(
        'http://localhost:5000/api/auth/login',
        form
      );

      // Persist auth data in localStorage so other pages can access it
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.role);
      localStorage.setItem('name', res.data.name);

      // Redirect based on the user's role returned from the server
      if (res.data.role === 'Librarian') {
        navigate('/dashboard');  // Librarians go to the admin dashboard
      } else {
        navigate('/profile');    // Regular users go to their profile
      }

    } catch (err) {
      console.error('Login error:', err);

      // Show the server's error message if available,
      // otherwise fall back to a generic message
      setError(
        err.response?.data?.error || 'Login failed. Please try again.'
      );
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="login-page">
      <div className="login-card">

        <h1 className="login-title">LibraSys</h1>
        <p className="login-subtitle">Library Management System</p>

        {/* Show error message only when there is one */}
        {error && (
          <p className="login-error">{error}</p>
        )}

        {/* Email input — updates form.email on every keystroke */}
        <input
          className="login-input"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) =>
            setForm({ ...form, email: e.target.value })
          }
        />

        {/* Password input — type="password" masks the characters */}
        <input
          className="login-input"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) =>
            setForm({ ...form, password: e.target.value })
          }
        />

        {/* Login button triggers handleSubmit on click */}
        <button
          className="login-button"
          onClick={handleSubmit}
        >
          Login
        </button>

        {/* Link to registration page for users without an account */}
        <p className="login-register-text">
          No account?{' '}
          <Link to="/register" className="login-register-link">
            Register
          </Link>
        </p>

      </div>
    </div>
  );
}

export default Login;