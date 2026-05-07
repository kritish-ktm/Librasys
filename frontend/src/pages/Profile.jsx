import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import './MemberDashboard.css';

function Profile() {
  const [profile, setProfile] = useState({});
  const [form, setForm] = useState({ fullName: '', email: '' });
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    axios.get('/api/users/profile', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setProfile(res.data);
      setForm({ fullName: res.data.FullName, email: res.data.Email });
    });
  }, []);

  const handleUpdate = async () => {
    try {
      await axios.put('/api/users/profile', form, {
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
    <div className="dashboard-page">

      {/* TOP BAR */}
      <div className="dashboard-topbar">
        <div>
          <h1 className="dashboard-title">My Profile</h1>
          <p className="dashboard-welcome">
            <b>Role:</b> {profile.Role} &nbsp;|&nbsp;
            <b>Registered:</b> {profile.DateRegistered ? new Date(profile.DateRegistered).toLocaleDateString() : ''}
          </p>
        </div>
        <div className="member-topbar-actions">
          <button
            className="member-browse-btn"
            onClick={() => navigate('/MemberDashboard')}
          >
            ← Back to Dashboard
          </button>
          <button className="dashboard-logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* PROFILE FORM */}
      <div className="dashboard-section" style={{ maxWidth: '500px', margin: '0 auto' }}>
        <h2 className="dashboard-section-title">Edit Profile</h2>

        <input
          className="dashboard-search"
          style={{ maxWidth: '100%', marginBottom: '16px' }}
          placeholder="Full Name"
          value={form.fullName}
          onChange={e => setForm({ ...form, fullName: e.target.value })}
        />

        <input
          className="dashboard-search"
          style={{ maxWidth: '100%', marginBottom: '16px' }}
          placeholder="Email"
          value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })}
        />

        {message && (
          <p style={{ color: '#27ae60', fontWeight: '600', marginBottom: '12px' }}>
            {message}
          </p>
        )}

        <button
          className="member-browse-btn"
          style={{ width: '100%', padding: '14px', marginBottom: '12px' }}
          onClick={handleUpdate}
        >
          Update Profile
        </button>

        {profile.Role === 'Member' && (
          <button
            className="member-browse-btn"
            style={{ width: '100%', padding: '14px', marginBottom: '12px' }}
            onClick={() => navigate('/my-loans')}
          >
            My Loans
          </button>
        )}

        {profile.Role === 'Member' && (
          <button
            className="member-browse-btn"
            style={{ width: '100%', padding: '14px', marginBottom: '12px' }}
            onClick={() => navigate('/browse-categories')}
          >
            Browse Books
          </button>
        )}

        <button
          className="dashboard-logout-btn"
          style={{ width: '100%', padding: '14px' }}
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>

    </div>
  );
}

export default Profile;
