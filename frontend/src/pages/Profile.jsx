import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Profile() {
  const [profile, setProfile] = useState({});
  const [form, setForm] = useState({ fullName: '', email: '' });
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    axios.get('http://localhost:5000/api/users/profile', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setProfile(res.data);
      setForm({ fullName: res.data.FullName, email: res.data.Email });
    });
  }, []);

  const handleUpdate = async () => {
    try {
      await axios.put('http://localhost:5000/api/users/profile', form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Profile updated successfully!');
    } catch {
      setMessage('Update failed');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>My Profile</h2>
        <p><b>Role:</b> {profile.Role}</p>
        <p><b>Registered:</b> {profile.DateRegistered}</p>
        <input style={styles.input} value={form.fullName}
          onChange={e => setForm({ ...form, fullName: e.target.value })} />
        <input style={styles.input} value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })} />
        {message && <p style={{ color: 'green' }}>{message}</p>}
        <button style={styles.btn} onClick={handleUpdate}>Update Profile</button>
        <button style={{ ...styles.btn, background: '#e74c3c', marginTop: '10px' }} onClick={handleLogout}>Logout</button>
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

export default Profile;