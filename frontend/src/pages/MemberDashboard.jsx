import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import './MemberDashboard.css';

const API_BASE_URL = 'http://localhost:5000';

function MemberDashboard() {
  const [loans, setLoans] = useState([]);
  const [fines, setFines] = useState([]);
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const name = localStorage.getItem('name');

  useEffect(() => {
    axios.get(`${API_BASE_URL}/loans/my`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then((res) => setLoans(res.data))
    .catch((err) => console.error('Failed to load loans:', err));

    axios.get(`${API_BASE_URL}/api/fines/my`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then((res) => setFines(res.data))
    .catch((err) => console.error('Failed to load fines:', err));
  }, [token]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div className="dashboard-page">

      {/* TOP BAR */}
      <div className="dashboard-topbar">
        <div>
          <h1 className="dashboard-title">Member Dashboard</h1>
          {name && <p className="dashboard-welcome">Welcome, {name}</p>}
        </div>
        <div className="member-topbar-actions">
          <button
            className="member-browse-btn"
            onClick={() => navigate('/browse-categories')}
          >
            📚 Browse Books
          </button>
          <button onClick={handleLogout} className="dashboard-logout-btn">
            Logout
          </button>
        </div>
      </div>

      {/* LOANED BOOKS */}
      <div className="dashboard-section" style={{ marginBottom: '28px' }}>
        <h2 className="dashboard-section-title">📖 My Loaned Books</h2>
        <div className="dashboard-table-wrapper">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Book Title</th>
                <th>Loan Date</th>
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loans.length === 0 ? (
                <tr>
                  <td colSpan="4" className="dashboard-empty">
                    No loaned books found.
                  </td>
                </tr>
              ) : (
                loans.map((loan, i) => (
                  <tr key={i}>
                    <td>{loan.Title || loan.BookTitle}</td>
                    <td>{loan.LoanDate ? new Date(loan.LoanDate).toLocaleDateString() : ''}</td>
                    <td>{loan.DueDate ? new Date(loan.DueDate).toLocaleDateString() : ''}</td>
                    <td>
                      <span className={`member-status-badge ${loan.Status?.toLowerCase()}`}>
                        {loan.Status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FINES */}
      <div className="dashboard-section">
        <h2 className="dashboard-section-title">💰 My Fines</h2>
        <div className="dashboard-table-wrapper">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Book Title</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {fines.length === 0 ? (
                <tr>
                  <td colSpan="4" className="dashboard-empty">
                    No fines found.
                  </td>
                </tr>
              ) : (
                fines.map((fine, i) => (
                  <tr key={i}>
                    <td>{fine.Title || fine.BookTitle}</td>
                    <td>${fine.Amount}</td>
                    <td>
                      <span className={`member-status-badge ${fine.Status?.toLowerCase()}`}>
                        {fine.Status}
                      </span>
                    </td>
                    <td>{fine.FineDate ? new Date(fine.FineDate).toLocaleDateString() : ''}</td>
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

export default MemberDashboard;