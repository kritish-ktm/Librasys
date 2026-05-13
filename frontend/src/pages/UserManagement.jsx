import { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import './Dashboard.css';
import './MemberDashboard.css';

const API_BASE_URL = 'http://localhost:5000';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState({ UserID: '', fullName: '', email: '', role: 'Member' });
  const [newUser, setNewUser] = useState({ fullName: '', email: '', password: '', role: 'Member' });
  const [addError, setAddError] = useState('');
  const [editError, setEditError] = useState('');
  const [pageError, setPageError] = useState('');

  const token = localStorage.getItem('token');

  const authHeader = {
    headers: { Authorization: `Bearer ${token}` }
  };

  const fetchUsers = async () => {
    try {
      setPageError('');

      const res = await axios.get(
        `${API_BASE_URL}/api/users?t=${Date.now()}`,
        authHeader
      );

      setUsers(res.data);
    } catch (err) {
      console.error('Failed to load users:', err.response?.data || err.message);
      setPageError(err.response?.data?.error || 'Failed to load users.');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleStatus = async (id, currentStatus) => {
    try {
      setPageError('');

      const newStatus = Number(currentStatus) === 1 ? 0 : 1;

      await axios.put(
        `${API_BASE_URL}/api/users/${id}/status`,
        { isActive: newStatus },
        authHeader
      );

      setUsers(prev =>
        prev.map(u =>
          u.UserID === id ? { ...u, IsActive: newStatus } : u
        )
      );

      await fetchUsers();
    } catch (err) {
      console.error('Failed to update status:', err.response?.data || err.message);
      setPageError(err.response?.data?.error || 'Failed to update user status.');
      alert(err.response?.data?.error || 'Failed to update user status.');
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      setPageError('');

      await axios.delete(
        `${API_BASE_URL}/api/users/${id}`,
        authHeader
      );

      setUsers(prev => prev.filter(u => u.UserID !== id));
    } catch (err) {
      console.error('Failed to delete user:', err.response?.data || err.message);
      setPageError(err.response?.data?.error || 'Failed to delete user.');
    }
  };

  const addUser = async () => {
    setAddError('');

    if (!newUser.fullName.trim()) {
      setAddError('Full name is required.');
      return;
    }

    if (!newUser.email.trim() || !newUser.email.includes('@')) {
      setAddError('A valid email is required.');
      return;
    }

    if (!newUser.password || newUser.password.length < 6) {
      setAddError('Password must be at least 6 characters.');
      return;
    }

    try {
      await axios.post(
        `${API_BASE_URL}/api/auth/register`,
        newUser,
        authHeader
      );

      setShowAddModal(false);
      setNewUser({ fullName: '', email: '', password: '', role: 'Member' });
      await fetchUsers();
    } catch (err) {
      console.error('Failed to add user:', err.response?.data || err.message);
      setAddError(err.response?.data?.error || 'Failed to add user.');
    }
  };

  const openEditModal = (u) => {
    setEditUser({
      UserID: u.UserID,
      fullName: u.FullName,
      email: u.Email,
      role: u.Role
    });

    setEditError('');
    setShowEditModal(true);
  };

  const saveEdit = async () => {
    setEditError('');

    if (!editUser.fullName.trim()) {
      setEditError('Full name is required.');
      return;
    }

    if (!editUser.email.trim() || !editUser.email.includes('@')) {
      setEditError('A valid email is required.');
      return;
    }

    try {
      await axios.put(
        `${API_BASE_URL}/api/users/${editUser.UserID}`,
        {
          fullName: editUser.fullName,
          email: editUser.email,
          role: editUser.role
        },
        authHeader
      );

      setShowEditModal(false);

      setUsers(prev =>
        prev.map(u =>
          u.UserID === editUser.UserID
            ? {
                ...u,
                FullName: editUser.fullName,
                Email: editUser.email,
                Role: editUser.role
              }
            : u
        )
      );

      await fetchUsers();
    } catch (err) {
      console.error('Failed to update user:', err.response?.data || err.message);
      setEditError(err.response?.data?.error || 'Failed to update user.');
    }
  };

  const filtered = users.filter(u => {
    const fullName = u.FullName || '';
    const email = u.Email || '';

    const matchesSearch =
      fullName.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === 'All' || u.Role === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="dashboard-page module-dashboard-page">

      <div className="dashboard-topbar module-topbar">
        <div>
          <h1 className="dashboard-title">User Management</h1>
          <p className="dashboard-welcome">Manage all registered users</p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="member-browse-btn" onClick={() => setShowAddModal(true)}>
            + Add User
          </button>
        </div>
      </div>

      <div className="dashboard-section">

        {pageError && (
          <p style={{ color: '#e74c3c', marginBottom: '16px' }}>
            {pageError}
          </p>
        )}

        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <input
            className="dashboard-search"
            style={{ margin: 0 }}
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <select
            className="dashboard-search"
            style={{ maxWidth: '200px', margin: 0 }}
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
          >
            <option value="All">All Roles</option>
            <option value="Member">Member</option>
            <option value="Librarian">Librarian</option>
          </select>
        </div>

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
                  <td colSpan="7" className="dashboard-empty">
                    No users found.
                  </td>
                </tr>
              ) : (
                filtered.map(u => {
                  const isActive = Number(u.IsActive) === 1;

                  return (
                    <tr key={u.UserID}>
                      <td>{u.UserID}</td>
                      <td>{u.FullName}</td>
                      <td>{u.Email}</td>
                      <td>{u.Role}</td>
                      <td>{isActive ? 'Active' : 'Inactive'}</td>
                      <td>{u.DateRegistered ? new Date(u.DateRegistered).toLocaleDateString() : ''}</td>

                      <td style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => toggleStatus(u.UserID, u.IsActive)}
                          className={`dashboard-status-btn ${isActive ? 'deactivate' : 'activate'}`}
                        >
                          {isActive ? 'Deactivate' : 'Activate'}
                        </button>

                        <button
                          onClick={() => openEditModal(u)}
                          className="dashboard-status-btn activate"
                          style={{ background: '#556046' }}
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => deleteUser(u.UserID)}
                          className="dashboard-status-btn deactivate"
                          style={{ background: '#374151' }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            background: '#f3eee8', borderRadius: '20px',
            padding: '32px', width: '400px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{ color: '#556046', marginBottom: '20px' }}>Add New User</h2>

            {addError && <p style={{ color: '#e74c3c', marginBottom: '12px' }}>{addError}</p>}

            <input
              className="dashboard-search"
              style={{ maxWidth: '100%', marginBottom: '12px' }}
              placeholder="Full Name"
              value={newUser.fullName}
              onChange={e => setNewUser({ ...newUser, fullName: e.target.value })}
            />

            <input
              className="dashboard-search"
              style={{ maxWidth: '100%', marginBottom: '12px' }}
              placeholder="Email"
              value={newUser.email}
              onChange={e => setNewUser({ ...newUser, email: e.target.value })}
            />

            <input
              className="dashboard-search"
              style={{ maxWidth: '100%', marginBottom: '12px' }}
              placeholder="Password (min 6 characters)"
              type="password"
              value={newUser.password}
              onChange={e => setNewUser({ ...newUser, password: e.target.value })}
            />

            <select
              className="dashboard-search"
              style={{ maxWidth: '100%', marginBottom: '20px' }}
              value={newUser.role}
              onChange={e => setNewUser({ ...newUser, role: e.target.value })}
            >
              <option value="Member">Member</option>
              <option value="Librarian">Librarian</option>
            </select>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="member-browse-btn"
                style={{ flex: 1, padding: '14px' }}
                onClick={addUser}
              >
                Add User
              </button>

              <button
                className="dashboard-logout-btn"
                style={{ flex: 1, padding: '14px' }}
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            background: '#f3eee8', borderRadius: '20px',
            padding: '32px', width: '400px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{ color: '#556046', marginBottom: '20px' }}>Edit User</h2>

            {editError && <p style={{ color: '#e74c3c', marginBottom: '12px' }}>{editError}</p>}

            <input
              className="dashboard-search"
              style={{ maxWidth: '100%', marginBottom: '12px' }}
              placeholder="Full Name"
              value={editUser.fullName}
              onChange={e => setEditUser({ ...editUser, fullName: e.target.value })}
            />

            <input
              className="dashboard-search"
              style={{ maxWidth: '100%', marginBottom: '12px' }}
              placeholder="Email"
              value={editUser.email}
              onChange={e => setEditUser({ ...editUser, email: e.target.value })}
            />

            <select
              className="dashboard-search"
              style={{ maxWidth: '100%', marginBottom: '20px' }}
              value={editUser.role}
              onChange={e => setEditUser({ ...editUser, role: e.target.value })}
            >
              <option value="Member">Member</option>
              <option value="Librarian">Librarian</option>
            </select>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="member-browse-btn"
                style={{ flex: 1, padding: '14px' }}
                onClick={saveEdit}
              >
                Save Changes
              </button>

              <button
                className="dashboard-logout-btn"
                style={{ flex: 1, padding: '14px' }}
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      </main>
    </div>
  );
}

export default UserManagement;
