import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
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
    <div className="member-dashboard-page">

      {/* TOP BAR */}
      <div className="dashboard-topbar">
        <div>
          <h1 className="dashboard-title">Member Dashboard</h1>
          {name && <p className="dashboard-welcome">Welcome back, {name}!</p>}
        </div>
        <div className="member-topbar-actions">
          <button
            className="member-browse-btn"
            onClick={() => navigate('/browse-categories')}
          >
            <i className="bi bi-book me-2"></i>
            Browse Books
          </button>
          <button onClick={handleLogout} className="dashboard-logout-btn">
            <i className="bi bi-box-arrow-right me-2"></i>
            Logout
          </button>
        </div>
      </div>

      {/* LOANED BOOKS SECTION */}
      <div className="dashboard-section">
        <h2 className="dashboard-section-title">
          <i className="bi bi-book me-3"></i>
          My Loaned Books
        </h2>
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
                    You have no loaned books at the moment.
                  </td>
                </tr>
              ) : (
                loans.map((loan, i) => (
                  <tr key={i}>
                    <td>{loan.Title || loan.BookTitle}</td>
                    <td>{loan.LoanDate ? new Date(loan.LoanDate).toLocaleDateString() : ''}</td>
                    <td>{loan.DueDate ? new Date(loan.DueDate).toLocaleDateString() : ''}</td>
                    <td>
                      <span className={`member-status-badge ${loan.Status?.toLowerCase() || 'active'}`}>
                        {loan.Status || 'Active'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FINES SECTION */}
      <div className="dashboard-section">
        <h2 className="dashboard-section-title">
          <i className="bi bi-currency-dollar me-3"></i>
          My Fines
        </h2>
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
                    You currently have no fines.
                  </td>
                </tr>
              ) : (
                fines.map((fine, i) => (
                  <tr key={i}>
                    <td>{fine.Title || fine.BookTitle}</td>
                    <td className="fine-amount">${fine.Amount}</td>
                    <td>
                      <span className={`member-status-badge ${fine.Status?.toLowerCase() || 'pending'}`}>
                        {fine.Status || 'Pending'}
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