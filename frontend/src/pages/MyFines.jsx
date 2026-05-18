import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./MyLoans.css";

const API_BASE_URL = "http://localhost:5000";
const filters = [
  { value: "all", label: "All" },
  { value: "paid", label: "Paid" },
  { value: "unpaid", label: "Unpaid" },
];

function MyFines() {
  const navigate = useNavigate();
  const [fines, setFines] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const token = localStorage.getItem("token");

  useEffect(() => {
    setLoading(true);
    axios.get(`${API_BASE_URL}/api/fines/my`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        setFines(Array.isArray(res.data) ? res.data : []);
        setError("");
      })
      .catch((err) => setError(err.response?.data?.error || "Unable to load your fines."))
      .finally(() => setLoading(false));
  }, [token]);

  const stats = useMemo(() => {
    const paid = fines.filter((fine) => String(fine.Status || "").toLowerCase() === "paid").length;
    const unpaid = fines.length - paid;
    const totalAmount = fines.reduce((sum, fine) => sum + Number(fine.Amount || 0), 0);
    return { total: fines.length, paid, unpaid, totalAmount };
  }, [fines]);

  const visibleFines = useMemo(() => {
    if (statusFilter === "paid") {
      return fines.filter((fine) => String(fine.Status || "").toLowerCase() === "paid");
    }

    if (statusFilter === "unpaid") {
      return fines.filter((fine) => String(fine.Status || "").toLowerCase() !== "paid");
    }

    return fines;
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
          <span>Amount</span>
          <strong>${stats.totalAmount.toFixed(2)}</strong>
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
                    {fine.Status || "Pending"}
                  </span>
                  <h3>{fine.Title || fine.BookTitle || "Fine record"}</h3>
                  <p>{fine.Reason || "Library fine"}</p>
                </div>

                <dl>
                  <div>
                    <dt>Amount</dt>
                    <dd>${Number(fine.Amount || 0).toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{fine.Status || "Pending"}</dd>
                  </div>
                  <div>
                    <dt>Date</dt>
                    <dd>{formatDate(fine.FineDate)}</dd>
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
  return String(fine.Status || "").toLowerCase() === "paid" ? "returned" : "overdue";
}

function formatDate(value) {
  if (!value) return "Not recorded";
  return String(value).split("T")[0];
}

export default MyFines;
