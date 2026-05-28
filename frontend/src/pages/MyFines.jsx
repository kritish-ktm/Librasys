import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./MyLoans.css";

const API_BASE_URL = "http://localhost:5000";
const DAILY_FINE_RATE = 1;
const filters = [
  { value: "all", label: "All" },
  { value: "unpaid", label: "Unpaid" },
  { value: "paid", label: "Paid" },
  { value: "waived", label: "Waived" },
];

function MyFines() {
  const navigate = useNavigate();
  const [fines, setFines] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const token = localStorage.getItem("token");

  useEffect(() => {
    const loadFines = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/api/fines/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const fineRows = Array.isArray(res.data) ? res.data : [];

        if (fineRows.length) {
          setFines(fineRows);
          setError("");
          return;
        }

        const loanRes = await axios.get(`${API_BASE_URL}/loans/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFines(calculateFinesFromLoans(Array.isArray(loanRes.data) ? loanRes.data : []));
        setError("");
      } catch (err) {
        setError(err.response?.data?.error || "Unable to load your fines.");
      } finally {
        setLoading(false);
      }
    };

    loadFines();
  }, [token]);

  const stats = useMemo(() => {
    const paid = fines.filter((fine) => getRawFineStatus(fine) === "paid").length;
    const unpaid = fines.filter((fine) => getRawFineStatus(fine) === "unpaid").length;
    const outstandingAmount = fines
      .filter((fine) => getRawFineStatus(fine) === "unpaid")
      .reduce((sum, fine) => sum + Number(fine.Amount || 0), 0);

    return { total: fines.length, paid, unpaid, outstandingAmount };
  }, [fines]);

  const visibleFines = useMemo(() => {
    if (statusFilter === "all") {
      return fines;
    }

    return fines.filter((fine) => getRawFineStatus(fine) === statusFilter);
  }, [fines, statusFilter]);

  return (
    <main className="my-loans-page">
      <section className="my-loans-header">
        <div>
          <p className="my-loans-kicker">Member Fines</p>
          <h1>My Fines</h1>
          <p>View your paid and unpaid library fines.</p>
        </div>

        <div className="my-loans-actions">
          <button type="button" onClick={() => navigate("/MemberDashboard")}>
            Dashboard
          </button>
          <button type="button" onClick={() => navigate("/my-loans")}>
            My Loans
          </button>
        </div>
      </section>

      <section className="my-loans-stats" aria-label="My fine summary">
        <article>
          <span>Total</span>
          <strong>{stats.total}</strong>
        </article>
        <article>
          <span>Unpaid</span>
          <strong>{stats.unpaid}</strong>
        </article>
        <article>
          <span>Paid</span>
          <strong>{stats.paid}</strong>
        </article>
        <article>
          <span>Owed</span>
          <strong>${stats.outstandingAmount.toFixed(2)}</strong>
        </article>
      </section>

      <section className="my-loans-panel">
        <div className="my-loans-toolbar">
          <div>
            <p className="my-loans-kicker">Fine History</p>
            <h2>{visibleFines.length} Records</h2>
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

        {error && <div className="my-loans-alert error">{error}</div>}

        {loading ? (
          <div className="my-loans-empty">Loading your fines...</div>
        ) : visibleFines.length === 0 ? (
          <div className="my-loans-empty">No fines match this filter.</div>
        ) : (
          <div className="my-loans-list">
            {visibleFines.map((fine, index) => (
              <article key={fine.FineID || index} className="my-loan-card fine-card">
                <div>
                  <span className={`my-loan-status ${getFineStatus(fine)}`}>
                    {getFineLabel(fine)}
                  </span>
                  <h3>{fine.Title || fine.BookTitle || "Linked loan book"}</h3>
                  <p>{fine.Reason || `Fine for loan #${fine.LoanID || "not recorded"}`}</p>
                </div>

                <dl>
                  <div>
                    <dt>Amount</dt>
                    <dd>${Number(fine.Amount || 0).toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{getFineLabel(fine)}</dd>
                  </div>
                  <div>
                    <dt>Issued</dt>
                    <dd>{formatDate(fine.FineDate || fine.IssuedDate || fine.CreatedAt)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function getFineStatus(fine) {
  const status = getRawFineStatus(fine);
  if (status === "paid") return "returned";
  if (status === "waived") return "waived";
  return "overdue";
}

function getRawFineStatus(fine) {
  const raw = String(fine.Status || fine.status || fine.IsPaid || "").toLowerCase();
  if (raw === "1" || raw === "true" || raw === "paid") return "paid";
  if (raw === "waived") return "waived";
  return "unpaid";
}

function getFineLabel(fine) {
  const status = getRawFineStatus(fine);
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function calculateFinesFromLoans(loans) {
  const today = new Date();

  return loans
    .filter((loan) => !loan.ReturnDate && (loan.IsOverdue || isPastDue(loan.DueDate, today)))
    .map((loan) => {
      const daysOverdue = Math.max(getDaysOverdue(loan.DueDate, today), 1);

      return {
        FineID: `calculated-${loan.LoanID}`,
        LoanID: loan.LoanID,
        BookTitle: loan.BookTitle || loan.Title,
        Title: loan.Title || loan.BookTitle,
        Amount: daysOverdue * DAILY_FINE_RATE,
        Status: "Unpaid",
        FineDate: loan.DueDate,
        Reason: `Calculated from ${daysOverdue} overdue day(s)`,
        IsCalculated: true,
      };
    });
}

function isPastDue(value, today) {
  if (!value) return false;
  const dueDate = new Date(value);
  return dueDate < today;
}

function getDaysOverdue(value, today) {
  if (!value) return 0;
  const dueDate = new Date(value);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((today - dueDate) / msPerDay);
}

function formatDate(value) {
  if (!value) return "Not recorded";
  return String(value).split("T")[0];
}

export default MyFines;
