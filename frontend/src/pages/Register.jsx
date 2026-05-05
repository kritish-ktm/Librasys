import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

function Register() {
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async () => {
    try {
      await axios.post('/api/auth/register', form);
      setMessage('Registered! Redirecting to login...');
      setTimeout(() => navigate('/'), 2000);
    } catch {
      setMessage('Email already exists');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>Create Account</h2>
        {message && <p>{message}</p>}
        <input style={styles.input} placeholder="Full Name"
          onChange={e => setForm({ ...form, fullName: e.target.value })} />
        <input style={styles.input} placeholder="Email"
          onChange={e => setForm({ ...form, email: e.target.value })} />
        <input style={styles.input} placeholder="Password" type="password"
          onChange={e => setForm({ ...form, password: e.target.value })} />
        <button style={styles.btn} onClick={handleSubmit}>Register</button>
        <p>Already have an account? <Link to="/">Login</Link></p>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' },
  card: { background: 'white', padding: '2rem', borderRadius: '8px', width: '350px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' },
  input: { display: 'block', width: '100%', padding: '10px', margin: '10px 0', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' },
  btn: { width: '100%', padding: '10px', background: '#4a90e2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }
};

export default Register;
