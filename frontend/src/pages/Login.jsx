import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.role);
      localStorage.setItem('name', res.data.name);
      if (res.data.role === 'Librarian') navigate('/dashboard');
      else navigate('/profile');
    } catch (err) {
      setError('Invalid email or password');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>LibraSys Login</h2>
        {error && <p style={styles.error}>{error}</p>}
        <input style={styles.input} placeholder="Email"
          onChange={e => setForm({ ...form, email: e.target.value })} />
        <input style={styles.input} placeholder="Password" type="password"
          onChange={e => setForm({ ...form, password: e.target.value })} />
        <button style={styles.btn} onClick={handleSubmit}>Login</button>
        <p>No account? <Link to="/register">Register</Link></p>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' },
  card: { background: 'white', padding: '2rem', borderRadius: '8px', width: '350px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' },
  input: { display: 'block', width: '100%', padding: '10px', margin: '10px 0', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' },
  btn: { width: '100%', padding: '10px', background: '#4a90e2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  error: { color: 'red' }
};

export default Login;