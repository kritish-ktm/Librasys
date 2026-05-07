import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyLoans, returnMyLoan } from "../services/loanedBookService";
import "./MyLoans.css";

const filters = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "overdue", label: "Overdue" },
  { value: "returned", label: "Returned" },
];

function MyLoans() {
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [returningId, setReturningId] = useState(null);

  const loadLoans = async () => {
    setLoading(true);

    try {
      const data = await getMyLoans();
      setLoans(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Unable to load your loans.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLoans();
  }, []);

  const stats = useMemo(() => {
    const active = loans.filter((loan) => !loan.ReturnDate && !loan.IsOverdue).length;
    const overdue = loans.filter((loan) => !loan.ReturnDate && Boolean(loan.IsOverdue)).length;
    const returned = loans.filter((loan) => Boolean(loan.ReturnDate)).length;
    return { total: loans.length, active, overdue, returned };
  }, [loans]);

  const visibleLoans = useMemo(() => {
    if (statusFilter === "active") {
      return loans.filter((loan) => !loan.ReturnDate && !loan.IsOverdue);
    }

    if (statusFilter === "overdue") {
      return loans.filter((loan) => !loan.ReturnDate && Boolean(loan.IsOverdue));
    }

    if (statusFilter === "returned") {
      return loans.filter((loan) => Boolean(loan.ReturnDate));
    }

    return loans;
  }, [loans, statusFilter]);

  const handleReturn = async (loan) => {
    const confirmed = window.confirm(`Return "${loan.BookTitle}"?`);
    if (!confirmed) return;

    setReturningId(loan.LoanID);
    setMessage("");
    setError("");

    try {
      await returnMyLoan(loan.LoanID);
      setMessage("Book returned successfully.");
      await loadLoans();
    } catch (err) {
      setError(err.response?.data?.error || "Unable to return this book.");
    } finally {
      setReturningId(null);
    }
  };

  return (
    <main className="my-loans-page">
      <section className="my-loans-header">
        <div>
          <p className="my-loans-kicker">Member Borrowing</p>
          <h1>My Loans</h1>
          <p>View your active, returned, and overdue library loans.</p>
        </div>

        <div className="my-loans-actions">
          <button type="button" onClick={() => navigate("/browse-categories")}>
            Browse Books
          </button>
          <button type="button" onClick={() => navigate("/profile")}>
            Profile
          </button>
        </div>
      </section>

      <section className="my-loans-stats" aria-label="My loan summary">
        <article>
          <span>Total</span>
          <strong>{stats.total}</strong>
        </article>
        <article>
          <span>Active</span>
          <strong>{stats.active}</strong>
        </article>
        <article>
          <span>Overdue</span>
          <strong>{stats.overdue}</strong>
        </article>
        <article>
          <span>Returned</span>
          <strong>{stats.returned}</strong>
        </article>
      </section>

      <section className="my-loans-panel">
        <div className="my-loans-toolbar">
          <div>
            <p className="my-loans-kicker">Loan History</p>
            <h2>{visibleLoans.length} Records</h2>
          </div>

          <div className="my-loans-tabs">
            {filters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                className={statusFilter === filter.value ? "active" : ""}
                onClick={() => setStatusFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {message && <div className="my-loans-alert success">{message}</div>}
        {error && <div className="my-loans-alert error">{error}</div>}

        {loading ? (
          <div className="my-loans-empty">Loading your loans...</div>
        ) : visibleLoans.length === 0 ? (
          <div className="my-loans-empty">No loans match this filter.</div>
        ) : (
          <div className="my-loans-list">
            {visibleLoans.map((loan) => (
              <article key={loan.LoanID} className="my-loan-card">
                <div>
                  <span className={`my-loan-status ${getStatus(loan)}`}>
                    {getStatusLabel(loan)}
                  </span>
                  <h3>{loan.BookTitle}</h3>
                  <p>ISBN {loan.ISBN}</p>
                </div>

                <dl>
                  <div>
                    <dt>Borrowed</dt>
                    <dd>{formatDate(loan.BorrowDate)}</dd>
                  </div>
                  <div>
                    <dt>Due</dt>
                    <dd>{formatDate(loan.DueDate)}</dd>
                  </div>
                  <div>
                    <dt>Returned</dt>
                    <dd>{formatDate(loan.ReturnDate)}</dd>
                  </div>
                </dl>

                {!loan.ReturnDate && (
                  <button
                    type="button"
                    className="my-loans-return"
                    disabled={returningId === loan.LoanID}
                    onClick={() => handleReturn(loan)}
                  >
                    {returningId === loan.LoanID ? "Returning..." : "Return"}
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function getStatus(loan) {
  if (loan.ReturnDate) return "returned";
  if (loan.IsOverdue) return "overdue";
  return "active";
}

function getStatusLabel(loan) {
  if (loan.ReturnDate) return "Returned";
  if (loan.IsOverdue) return "Overdue";
  return "Active";
}

function formatDate(value) {
  if (!value) return "Not returned";
  return String(value).split("T")[0];
}

export default MyLoans;
