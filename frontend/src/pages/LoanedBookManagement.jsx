import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addLoan,
  deleteLoan,
  getLoanOptions,
  getLoans,
  returnLoan,
  updateLoan,
} from "../services/loanedBookService";
import "./LoanedBookManagement.css";

const emptyForm = {
  UserID: "",
  BookID: "",
  BorrowDate: "",
  DueDate: "",
  ReturnDate: "",
};

const statusFilters = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "overdue", label: "Overdue" },
  { value: "returned", label: "Returned" },
];

function LoanedBookManagement() {
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [users, setUsers] = useState([]);
  const [books, setBooks] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("LoanID");
  const [sortDirection, setSortDirection] = useState("desc");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchLoans = async () => {
    setIsLoading(true);

    try {
      const data = await getLoans({ search, status: statusFilter });
      setLoans(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load loan records.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const data = await getLoanOptions();
      setUsers(data.users || []);
      setBooks(data.books || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load users and books.");
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchLoans();
  }, [search, statusFilter]);

  const stats = useMemo(() => {
    const active = loans.filter((loan) => !loan.ReturnDate && !loan.IsOverdue).length;
    const overdue = loans.filter((loan) => Boolean(loan.IsOverdue)).length;
    const returned = loans.filter((loan) => Boolean(loan.ReturnDate)).length;

    return { total: loans.length, active, overdue, returned };
  }, [loans]);

  const displayedLoans = useMemo(() => {
    return [...loans].sort((a, b) => {
      const firstValue = getSortValue(a, sortKey);
      const secondValue = getSortValue(b, sortKey);

      if (firstValue > secondValue) return sortDirection === "asc" ? 1 : -1;
      if (firstValue < secondValue) return sortDirection === "asc" ? -1 : 1;
      return 0;
    });
  }, [loans, sortKey, sortDirection]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setMessage("");
    setError("");
  };

  /* Form validation mirrors the LoanedBook table and 14-day loan policy. */
  const validateForm = () => {
    if (!form.UserID) return "Please select the borrowing user.";
    if (!form.BookID) return "Please select the borrowed book.";

    if (editingId) {
      if (!form.BorrowDate) return "Borrow date is required.";
      if (!form.DueDate) return "Due date is required.";

      if (new Date(form.DueDate) < new Date(form.BorrowDate)) {
        return "Due date cannot be before borrow date.";
      }

      if (form.ReturnDate && new Date(form.ReturnDate) < new Date(form.BorrowDate)) {
        return "Return date cannot be before borrow date.";
      }
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);

    try {
      if (editingId) {
        await updateLoan(editingId, {
          UserID: Number(form.UserID),
          BookID: Number(form.BookID),
          BorrowDate: form.BorrowDate,
          DueDate: form.DueDate,
          ReturnDate: form.ReturnDate || null,
        });
        setMessage("Loan record updated successfully.");
      } else {
        await addLoan({
          UserID: Number(form.UserID),
          BookID: Number(form.BookID),
        });
        setMessage("Loan created successfully with a 14-day due date.");
      }

      resetForm();
      await fetchLoans();
      await fetchOptions();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save loan record.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (loan) => {
    setEditingId(loan.LoanID);
    setForm({
      UserID: loan.UserID || "",
      BookID: loan.BookID || "",
      BorrowDate: formatDateForInput(loan.BorrowDate),
      DueDate: formatDateForInput(loan.DueDate),
      ReturnDate: formatDateForInput(loan.ReturnDate),
    });
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleReturn = async (loan) => {
    const confirmed = window.confirm(`Mark "${loan.BookTitle}" as returned?`);
    if (!confirmed) return;

    try {
      await returnLoan(loan.LoanID);
      setMessage("Book returned and available copies updated.");
      setError("");
      await fetchLoans();
      await fetchOptions();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to return book.");
      setMessage("");
    }
  };

  const handleDelete = async (loan) => {
    const confirmed = window.confirm(`Delete loan #${loan.LoanID}?`);
    if (!confirmed) return;

    try {
      await deleteLoan(loan.LoanID);
      setMessage("Loan deleted successfully.");
      setError("");
      await fetchLoans();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete loan.");
      setMessage("");
    }
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  };

  const sortLabel = (key) => {
    if (sortKey !== key) return "";
    return sortDirection === "asc" ? " ↑" : " ↓";
  };

  return (
    <main className="loan-page">
      <section className="loan-header">
        <div>
          <p className="loan-kicker">Arun Shrestha Component</p>
          <h1>Loaned Book Management</h1>
          <p>
            Manage borrowing transactions, returns, due dates, and overdue loan
            records using the LoanedBook table.
          </p>
        </div>

        <button type="button" className="loan-secondary" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </button>
      </section>

      <section className="loan-stats" aria-label="Loan summary">
        <article>
          <span>Total Loans</span>
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

      <section className="loan-grid">
        <aside className="loan-panel">
          <div className="loan-section-heading">
            <p>{editingId ? "Edit Transaction" : "Create Transaction"}</p>
            <h2>{editingId ? `Loan #${editingId}` : "Borrow Book"}</h2>
          </div>

          {message && <div className="loan-alert success">{message}</div>}
          {error && <div className="loan-alert error">{error}</div>}

          <form className="loan-form" onSubmit={handleSubmit}>
            <label>
              User
              <select name="UserID" value={form.UserID} onChange={handleChange}>
                <option value="">Select active user</option>
                {users.map((user) => (
                  <option key={user.UserID} value={user.UserID}>
                    {user.FullName} ({user.Email})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Book
              <select name="BookID" value={form.BookID} onChange={handleChange}>
                <option value="">Select available book</option>
                {books.map((book) => (
                  <option key={book.BookID} value={book.BookID}>
                    {book.Title} - {book.AvailableCopies} available
                  </option>
                ))}
                {editingId && form.BookID && !books.some((book) => String(book.BookID) === String(form.BookID)) && (
                  <option value={form.BookID}>Current selected book</option>
                )}
              </select>
            </label>

            {editingId && (
              <>
                <label>
                  Borrow Date
                  <input
                    type="date"
                    name="BorrowDate"
                    value={form.BorrowDate}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  Due Date
                  <input type="date" name="DueDate" value={form.DueDate} onChange={handleChange} />
                </label>

                <label>
                  Return Date
                  <input
                    type="date"
                    name="ReturnDate"
                    value={form.ReturnDate}
                    onChange={handleChange}
                  />
                </label>
              </>
            )}

            {!editingId && (
              <p className="loan-help">
                Borrow date is set to today and due date is calculated automatically after 14 days.
              </p>
            )}

            <div className="loan-actions">
              <button type="submit" className="loan-primary" disabled={isSaving}>
                {isSaving ? "Saving..." : editingId ? "Update Loan" : "Add Loan"}
              </button>

              {editingId && (
                <button type="button" className="loan-secondary" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </aside>

        <section className="loan-panel">
          <div className="loan-table-head">
            <div className="loan-section-heading">
              <p>Find, Filter, List</p>
              <h2>LoanedBook Table</h2>
            </div>

            <div className="loan-tools">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search borrower, email, title, ISBN, loan ID..."
              />

              <div className="loan-tabs">
                {statusFilters.map((filter) => (
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
          </div>

          <div className="loan-table-meta">
            <span>
              Showing {displayedLoans.length} of {loans.length} records
            </span>
            {isLoading && <span>Refreshing...</span>}
          </div>

          <div className="loan-table-wrap">
            <table className="loan-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort("LoanID")}>Loan{sortLabel("LoanID")}</th>
                  <th onClick={() => handleSort("BorrowerName")}>Borrower{sortLabel("BorrowerName")}</th>
                  <th onClick={() => handleSort("BookTitle")}>Book{sortLabel("BookTitle")}</th>
                  <th onClick={() => handleSort("BorrowDate")}>Borrowed{sortLabel("BorrowDate")}</th>
                  <th onClick={() => handleSort("DueDate")}>Due{sortLabel("DueDate")}</th>
                  <th onClick={() => handleSort("ReturnDate")}>Returned{sortLabel("ReturnDate")}</th>
                  <th onClick={() => handleSort("IsOverdue")}>Status{sortLabel("IsOverdue")}</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {displayedLoans.length > 0 ? (
                  displayedLoans.map((loan) => (
                    <tr key={loan.LoanID}>
                      <td>#{loan.LoanID}</td>
                      <td>
                        <strong>{loan.BorrowerName}</strong>
                        <span>{loan.BorrowerEmail}</span>
                      </td>
                      <td>
                        <strong>{loan.BookTitle}</strong>
                        <span>{loan.ISBN}</span>
                      </td>
                      <td>{formatDateForDisplay(loan.BorrowDate)}</td>
                      <td>{formatDateForDisplay(loan.DueDate)}</td>
                      <td>{formatDateForDisplay(loan.ReturnDate)}</td>
                      <td>{renderStatus(loan)}</td>
                      <td className="loan-row-actions">
                        {!loan.ReturnDate && (
                          <button type="button" onClick={() => handleReturn(loan)}>
                            Return
                          </button>
                        )}
                        <button type="button" onClick={() => handleEdit(loan)}>
                          Edit
                        </button>
                        <button type="button" onClick={() => handleDelete(loan)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="loan-empty" colSpan="8">
                      No loan records match the current search or filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}

function renderStatus(loan) {
  if (loan.ReturnDate) return <span className="loan-status returned">Returned</span>;
  if (loan.IsOverdue) return <span className="loan-status overdue">Overdue</span>;
  return <span className="loan-status active">Active</span>;
}

function formatDateForInput(value) {
  if (!value) return "";
  return String(value).split("T")[0];
}

function formatDateForDisplay(value) {
  if (!value) return "Not returned";
  return String(value).split("T")[0];
}

function getSortValue(loan, key) {
  if (["BorrowerName", "BookTitle", "ISBN"].includes(key)) {
    return String(loan[key] || "").toLowerCase();
  }

  if (["BorrowDate", "DueDate", "ReturnDate"].includes(key)) {
    return loan[key] ? new Date(loan[key]).getTime() : 0;
  }

  if (key === "IsOverdue") {
    return loan.ReturnDate ? 0 : Number(loan.IsOverdue || 0);
  }

  return Number(loan[key] || 0);
}

export default LoanedBookManagement;
