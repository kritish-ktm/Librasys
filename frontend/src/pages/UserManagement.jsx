import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const fetchUsers = () => {
    axios.get('http://localhost:5000/api/users', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setUsers(res.data));
  };

  useEffect(() => { fetchUsers(); }, []);

  const toggleStatus = async (id, current) => {
    await axios.put(`http://localhost:5000/api/users/${id}/status`,
      { isActive: current ? 0 : 1 },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setUsers(prev => prev.map(u =>
      u.UserID === id ? { ...u, IsActive: current ? 0 : 1 } : u
    ));
  };

  const filtered = users.filter(u =>
    u.FullName.toLowerCase().includes(search.toLowerCase()) ||
    u.Email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="dashboard-page">

      {/* TOP BAR */}
      <div className="dashboard-topbar">
        <div>
          <h1 className="dashboard-title">User Management</h1>
          <p className="dashboard-welcome">Manage all registered users</p>
        </div>
        <button className="dashboard-logout-btn" onClick={() => navigate('/dashboard')}>
          ← Back to Dashboard
        </button>
      </div>

      {/* TABLE SECTION */}
      <div className="dashboard-section">
        <input
          className="dashboard-search"
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className="dashboard-table-wrapper">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Registered</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="dashboard-empty">No users found.</td>
                </tr>
              ) : (
                filtered.map(u => (
                  <tr key={u.UserID}>
                    <td>{u.UserID}</td>
                    <td>{u.FullName}</td>
                    <td>{u.Email}</td>
                    <td>{u.Role}</td>
                    <td>{u.IsActive ? 'Active' : 'Inactive'}</td>
                    <td>{u.DateRegistered ? new Date(u.DateRegistered).toLocaleDateString() : ''}</td>
                    <td>
                      <button
                        onClick={() => toggleStatus(u.UserID, u.IsActive)}
                        className={`dashboard-status-btn ${u.IsActive ? 'deactivate' : 'activate'}`}
                      >
                        {u.IsActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

export default UserManagement;