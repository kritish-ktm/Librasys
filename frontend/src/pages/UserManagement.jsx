import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const fetchUsers = () => {
    axios.get('/api/users', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setUsers(res.data));
  };

  useEffect(() => { fetchUsers(); }, []);

  const toggleStatus = async (id, current) => {
    await axios.put(`/api/users/${id}/status`,
      { isActive: current ? 0 : 1 },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    fetchUsers();
  };

  const filtered = users.filter(u =>
    u.FullName.toLowerCase().includes(search.toLowerCase()) ||
    u.Email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>User Management</h2>
        <button onClick={() => navigate('/dashboard')}
          style={{ padding: '8px 16px', background: '#4a90e2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Back to Dashboard
        </button>
      </div>
      <input placeholder="Search by name or email..." value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ padding: '10px', width: '300px', margin: '1rem 0', border: '1px solid #ccc', borderRadius: '4px' }} />
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#4a90e2', color: 'white' }}>
            <th style={th}>ID</th>
            <th style={th}>Name</th>
            <th style={th}>Email</th>
            <th style={th}>Role</th>
            <th style={th}>Status</th>
            <th style={th}>Registered</th>
            <th style={th}>Action</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(u => (
            <tr key={u.UserID} style={{ borderBottom: '1px solid #eee' }}>
              <td style={td}>{u.UserID}</td>
              <td style={td}>{u.FullName}</td>
              <td style={td}>{u.Email}</td>
              <td style={td}>{u.Role}</td>
              <td style={td}>{u.IsActive ? '✅ Active' : '❌ Inactive'}</td>
              <td style={td}>{u.DateRegistered}</td>
              <td style={td}>
                <button onClick={() => toggleStatus(u.UserID, u.IsActive)}
                  style={{ padding: '5px 10px', background: u.IsActive ? '#e74c3c' : '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  {u.IsActive ? 'Deactivate' : 'Activate'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th = { padding: '10px', textAlign: 'left' };
const td = { padding: '10px' };

export default UserManagement;
