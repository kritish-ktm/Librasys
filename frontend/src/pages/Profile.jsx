import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Profile.css';

function Profile() {
  const [profile, setProfile] = useState({});
  const [form, setForm] = useState({
    fullName: '',
    email: ''
  });

  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get('/api/users/profile', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setProfile(res.data);

      setForm({
        fullName: res.data.FullName || '',
        email: res.data.Email || ''
      });

    } catch (err) {
      console.error(err);
      setMessage('Failed to load profile');
    }
  };

  const handleUpdate = async () => {
    try {
      await axios.put('/api/users/profile', form, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setProfile({
        ...profile,
        FullName: form.fullName,
        Email: form.email
      });

      setMessage('Profile updated successfully');

    } catch (err) {
      console.error(err);
      setMessage('Failed to update profile');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div className="profile-page">

      {/* HERO SECTION */}

      <section className="profile-hero">

        <div className="profile-hero-content">

          <span className="profile-kicker">
            Library Member Portal
          </span>

          <h1>
            My Profile
          </h1>

          <p>
            Manage your account details, update your information,
            and access your library activities in one place.
          </p>

        </div>

      </section>

      {/* MAIN CONTENT */}

      <main className="profile-main">

        <div className="profile-card">

          {/* TOP SECTION */}

          <div className="profile-top">

            <div className="profile-user">

              <div className="profile-avatar">
                {profile.FullName
                  ? profile.FullName.charAt(0).toUpperCase()
                  : 'U'}
              </div>

              <div>

                <h2>
                  {profile.FullName}
                </h2>

                <p>
                  {profile.Email}
                </p>

                <div className="profile-tags">

                  <span className="profile-tag">
                    {profile.Role}
                  </span>

                  <span className="profile-tag">
                    Joined: {
                      profile.DateRegistered
                        ? new Date(
                            profile.DateRegistered
                          ).toLocaleDateString()
                        : 'N/A'
                    }
                  </span>

                </div>

              </div>

            </div>

            <div className="profile-top-actions">

              <button
                className="profile-btn-outline"
                onClick={() => navigate('/MemberDashboard')}
              >
                Dashboard
              </button>

              <button
                className="profile-btn-danger"
                onClick={handleLogout}
              >
                Logout
              </button>

            </div>

          </div>

          {/* SUCCESS MESSAGE */}

          {message && (
            <div className="profile-message">
              {message}
            </div>
          )}

          {/* FORM */}

          <div className="profile-form">

            <div className="profile-field">

              <label>
                Full Name
              </label>

              <input
                type="text"
                placeholder="Enter full name"
                value={form.fullName}
                onChange={(e) =>
                  setForm({
                    ...form,
                    fullName: e.target.value
                  })
                }
              />

            </div>

            <div className="profile-field">

              <label>
                Email Address
              </label>

              <input
                type="email"
                placeholder="Enter email address"
                value={form.email}
                onChange={(e) =>
                  setForm({
                    ...form,
                    email: e.target.value
                  })
                }
              />

            </div>

            <div className="profile-field full-width">

              <button
                className="profile-btn"
                onClick={handleUpdate}
              >
                Save Changes
              </button>

            </div>

          </div>

          {/* QUICK LINKS */}

          <div className="profile-links">

            {profile.Role === 'Member' && (
              <div
                className="profile-link-card"
                onClick={() => navigate('/my-loans')}
                style={{ cursor: 'pointer' }}
              >
                <strong>
                  My Loans
                </strong>

                <p>
                  View all borrowed books, due dates,
                  and return history.
                </p>
              </div>
            )}

            {profile.Role === 'Member' && (
              <div
                className="profile-link-card"
                onClick={() => navigate('/browse-categories')}
                style={{ cursor: 'pointer' }}
              >
                <strong>
                  Browse Books
                </strong>

                <p>
                  Explore available categories and
                  discover books in the library.
                </p>
              </div>
            )}

            <div
              className="profile-link-card"
              onClick={() => navigate('/MemberDashboard')}
              style={{ cursor: 'pointer' }}
            >
              <strong>
                Dashboard
              </strong>

              <p>
                Return to the main dashboard and
                access your library overview.
              </p>
            </div>

          </div>

        </div>

      </main>

    </div>
  );
}

export default Profile;