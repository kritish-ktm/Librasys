import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { getActiveCategories } from '../services/bookCategoryService';
import './MemberDashboard.css';

const API_BASE_URL = 'http://localhost:5000';
function MemberDashboard() {
  const [loans, setLoans] = useState([]);
  const [fines, setFines] = useState([]);
  const [categories, setCategories] = useState([]);
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

    getActiveCategories()
      .then((res) => setCategories(Array.isArray(res) ? res : []))
      .catch((err) => console.error('Failed to load categories:', err));
  }, [token]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const activeLoans = loans.filter((loan) => !loan.ReturnDate && loan.Status !== 'Returned').length;
  const unpaidFines = fines.filter((fine) => String(fine.Status || '').toLowerCase() !== 'paid').length;

  return (
    <div className="member-dashboard-page">
      <header className="member-dashboard-hero">
        <nav className="member-dashboard-nav" aria-label="Member navigation">
          <button className="member-logo" onClick={() => navigate('/')}>
            LibraSys
          </button>
          <div className="member-nav-actions">
            <button onClick={() => navigate('/browse-categories')}>Browse</button>
             <button onClick={() => navigate('/profile')}>
    My Profile
  </button>
            <button onClick={handleLogout}>Logout</button>
          </div>
        </nav>

        <div className="member-hero-content">
          <span className="member-kicker">Member dashboard</span>
          <h1>Welcome back{name ? `, ${name}` : ''}.</h1>
          <p>
            Continue browsing the collection, check your borrowed books, and keep track of any fines from one place.
          </p>

          <div className="member-hero-actions">
            <button className="member-primary-action" onClick={() => navigate('/browse-categories')}>
              Browse Books
            </button>
            <button className="member-secondary-action" onClick={() => navigate('/my-loans')}>
              My Loans
            </button>
            <button className="member-secondary-action" onClick={() => navigate('/my-fines')}>
              My Fines
            </button>
            <button
    className="member-secondary-action"
    onClick={() => navigate('/profile')}
  >
    My Profile
  </button>
          </div>
        </div>
      </header>

      <main className="member-dashboard-main">
        <section className="member-summary-grid" aria-label="Member summary">
          <button className="member-summary-card" onClick={() => navigate('/my-loans')}>
            <span>My Loans</span>
            <strong>{activeLoans}</strong>
            <em>Active borrowed books</em>
          </button>
          <button className="member-summary-card" onClick={() => navigate('/my-fines')}>
            <span>My Fines</span>
            <strong>{unpaidFines}</strong>
            <em>Unpaid or pending fines</em>
          </button>
          <button className="member-summary-card" onClick={() => navigate('/browse-categories')}>
            <span>Categories</span>
            <strong>{categories.length}</strong>
            <em>Available collections</em>
          </button>
        </section>

        <section className="member-category-section">
          <div className="member-section-heading">
            <span className="member-kicker">Organised discovery</span>
            <h2>Browse by Category</h2>
            <p>Pick a collection and continue into the catalogue.</p>
          </div>

          <div className="member-category-grid">
            {categories.slice(0, 6).map((category) => (
              <button
                key={category.CategoryID}
                className="member-category-card"
                style={getCategoryStyle(category)}
                onClick={() => navigate('/browse-categories')}
              >
                <span
                  className="member-category-image"
                  style={category.CategoryImage ? { backgroundImage: `url(${category.CategoryImage})` } : undefined}
                  aria-hidden="true"
                />
                <span className="member-category-copy">
                  <strong>{category.CategoryName}</strong>
                  <small>{category.Description || 'Explore this collection'}</small>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="member-recent-section">
          <div className="member-section-heading compact">
            <span className="member-kicker">Recent activity</span>
            <h2>Quick View</h2>
          </div>

          <div className="member-recent-grid">
            <article className="member-recent-card">
              <h3>Latest Loans</h3>
              {loans.slice(0, 3).length ? loans.slice(0, 3).map((loan, index) => (
                <p key={`${loan.LoanID || loan.BookID || index}-loan`}>
                  <strong>{loan.Title || loan.BookTitle}</strong>
                  <span>{loan.DueDate ? `Due ${new Date(loan.DueDate).toLocaleDateString()}` : 'No due date'}</span>
                </p>
              )) : <em>No loaned books yet.</em>}
            </article>

            <article className="member-recent-card">
              <h3>Latest Fines</h3>
              {fines.slice(0, 3).length ? fines.slice(0, 3).map((fine, index) => (
                <p key={`${fine.FineID || index}-fine`}>
                  <strong>{fine.Title || fine.BookTitle || 'Fine record'}</strong>
                  <span>${fine.Amount} · {fine.Status || 'Pending'}</span>
                </p>
              )) : <em>No fines right now.</em>}
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}

function getCategoryStyle(category) {
  const color = /^#[0-9a-fA-F]{6}$/.test(category?.CategoryColor || '')
    ? category.CategoryColor
    : '#e87924';

  return {
    '--member-category-color': color,
  };
}

export default MemberDashboard;
