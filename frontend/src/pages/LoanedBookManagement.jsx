import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  addLoan,
  deleteLoan,
  getLoans,
  returnLoan,
  searchLoanBooks,
  searchLoanUsers,
  updateLoan,
} from "../services/loanedBookService";
import Sidebar from "../components/Sidebar";
import "./LoanedBookManagement.css";

const statusFilters = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "overdue", label: "Overdue" },
  { value: "returned", label: "Returned" },
];

const emptyPagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
};

const emptySummary = {
  total: 0,
  active: 0,
  overdue: 0,
  returned: 0,
};

function LoanedBookManagement() {
  const [loans, setLoans] = useState([]);
  const [summary, setSummary] = useState(emptySummary);
  const [pagination, setPagination] = useState(emptyPagination);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [userQuery, setUserQuery] = useState("");
  const [bookQuery, setBookQuery] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [bookResults, setBookResults] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [borrowedFrom, setBorrowedFrom] = useState("");
  const [borrowedTo, setBorrowedTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingBooks, setLoadingBooks] = useState(false);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const dueDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return date.toISOString().split("T")[0];
  }, []);

  // ===== LOAD LOAN TABLE =====
  const fetchLoans = async () => {
    setIsLoading(true);

    try {
      const result = await getLoans({
        search,
        status: statusFilter,
        borrowedFrom,
        borrowedTo,
        page,
        limit,
      });

      if (Array.isArray(result)) {
        setLoans(result);
        setSummary({
          total: result.length,
          active: result.filter((loan) => !loan.ReturnDate && !loan.IsOverdue).length,
          overdue: result.filter((loan) => !loan.ReturnDate && Boolean(loan.IsOverdue)).length,
          returned: result.filter((loan) => Boolean(loan.ReturnDate)).length,
        });
        setPagination({ ...emptyPagination, total: result.length, limit });
      } else {
        setLoans(Array.isArray(result.data) ? result.data : []);
        setSummary(result.summary || emptySummary);
        setPagination(result.pagination || emptyPagination);
      }

      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load loan records.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, [search, statusFilter, borrowedFrom, borrowedTo, page, limit]);

  // ===== SEARCH MEMBER BOX =====
  useEffect(() => {
    const query = userQuery.trim();
    if (query.length < 2) {
      setUserResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingUsers(true);
      try {
        const data = await searchLoanUsers(query);
        setUserResults(Array.isArray(data) ? data : []);
      } catch {
        setUserResults([]);
      } finally {
        setLoadingUsers(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [userQuery]);

  // ===== SEARCH BOOK BOX =====
  useEffect(() => {
    const query = bookQuery.trim();
    if (query.length < 2) {
      setBookResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingBooks(true);
      try {
        const data = await searchLoanBooks(query);
        setBookResults(Array.isArray(data) ? data : []);
      } catch {
        setBookResults([]);
      } finally {
        setLoadingBooks(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [bookQuery]);

  const canCreateLoan =
    selectedUser &&
    selectedBook &&
    Number(selectedBook.AvailableCopies || 0) > 0 &&
    !isSaving;

  const resetForm = () => {
    setSelectedUser(null);
    setSelectedBook(null);
    setUserQuery("");
    setBookQuery("");
    setUserResults([]);
    setBookResults([]);
  };

  // ===== CLEAR TABLE FILTERS =====
  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setBorrowedFrom("");
    setBorrowedTo("");
    setPage(1);
  };

  // ===== CREATE LOAN =====
  const handleCreateLoan = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!selectedUser) {
      setError("Search and select a member before creating a loan.");
      return;
    }

    if (!selectedBook) {
      setError("Search and select a book before creating a loan.");
      return;
    }

    if (Number(selectedBook.AvailableCopies || 0) < 1) {
      setError("This book is currently unavailable.");
      return;
    }

    setIsSaving(true);

    try {
      await addLoan({
        UserID: Number(selectedUser.UserID),
        BookID: Number(selectedBook.BookID),
      });

      setMessage("Loan created successfully with a 14-day due date.");
      resetForm();
      await fetchLoans();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create loan.");
    } finally {
      setIsSaving(false);
    }
  };

  // ===== RETURN BOOK =====
  const handleReturn = async (loan) => {
    const confirmed = window.confirm(`Mark "${loan.BookTitle}" as returned?`);
    if (!confirmed) return;

    try {
      await returnLoan(loan.LoanID);
      setMessage("Book returned and available copies updated.");
      setError("");
      await fetchLoans();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to return book.");
      setMessage("");
    }
  };

  // ===== EDIT LOAN =====
  const handleEdit = async (loan) => {
    const borrowDate = window.prompt(
      "Borrow date (YYYY-MM-DD)",
      formatDateForDisplay(loan.BorrowDate)
    );
    if (borrowDate === null) return;

    const dueDate = window.prompt(
      "Due date (YYYY-MM-DD)",
      formatDateForDisplay(loan.DueDate)
    );
    if (dueDate === null) return;

    const returnDate = window.prompt(
      "Returned date (YYYY-MM-DD). Leave empty if not returned.",
      loan.ReturnDate ? formatDateForDisplay(loan.ReturnDate) : ""
    );
    if (returnDate === null) return;

    try {
      await updateLoan(loan.LoanID, {
        UserID: loan.UserID,
        BookID: loan.BookID,
        BorrowDate: borrowDate,
        DueDate: dueDate,
        ReturnDate: returnDate.trim() || null,
      });
      setMessage("Loan updated successfully.");
      setError("");
      await fetchLoans();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update loan.");
      setMessage("");
    }
  };

  // ===== DELETE LOAN =====
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

  // ===== FILTER CHANGE =====
  const handleFilterChange = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  const countForStatus = (status) => {
    if (status === "all") return summary.total;
    return summary[status] || 0;
  };

  return (
    <div className="loan-page">
      <Sidebar />

      <section className="loan-main">
        {/* ===== SUMMARY CARDS ===== */}
        <section className="loan-stats" aria-label="Loan summary">
          <SummaryCard
            title="Total Loans"
            value={summary.total}
            detail="All matching records"
            icon={ClipboardList}
            tone="total"
          />
          <SummaryCard
            title="Active Loans"
            value={summary.active}
            detail="Currently borrowed"
            icon={Clock3}
            tone="active"
          />
          <SummaryCard
            title="Overdue Loans"
            value={summary.overdue}
            detail="Require attention"
            icon={AlertCircle}
            tone="overdue"
          />
          <SummaryCard
            title="Returned Loans"
            value={summary.returned}
            detail="Successfully returned"
            icon={CheckCircle2}
            tone="returned"
          />
        </section>

        <section className="loan-workspace">
          <div className="loan-grid">
            {/* ===== BORROW BOOK FORM ===== */}
            <aside className="loan-panel loan-create-panel">
              <div className="loan-section-heading">
                <h2>Create New Loan</h2>
                <p>Search and select member & book to create a new loan.</p>
              </div>

              {message && <div className="loan-alert success">{message}</div>}
              {error && <div className="loan-alert error">{error}</div>}

              <form className="loan-form" onSubmit={handleCreateLoan}>
                <SearchSelector
                  label="Search Member"
                  query={userQuery}
                  setQuery={setUserQuery}
                  placeholder="Search by name, email or member ID..."
                  results={userResults}
                  loading={loadingUsers}
                  selected={selectedUser}
                  onSelect={(user) => {
                    setSelectedUser(user);
                    setUserQuery(user.FullName);
                    setUserResults([]);
                  }}
                  onRemove={() => {
                    setSelectedUser(null);
                    setUserQuery("");
                  }}
                  type="user"
                />

                <SearchSelector
                  label="Search Book"
                  query={bookQuery}
                  setQuery={setBookQuery}
                  placeholder="Search by title, author, ISBN or book ID..."
                  results={bookResults}
                  loading={loadingBooks}
                  selected={selectedBook}
                  onSelect={(book) => {
                    setSelectedBook(book);
                    setBookQuery(book.Title);
                    setBookResults([]);
                  }}
                  onRemove={() => {
                    setSelectedBook(null);
                    setBookQuery("");
                  }}
                  type="book"
                />

                {selectedBook && Number(selectedBook.AvailableCopies || 0) < 1 && (
                  <div className="loan-alert error">This book is currently unavailable.</div>
                )}

                <div className="loan-date-grid">
                  <label>
                    <span className="loan-field-label">Borrow Date</span>
                    <span className="loan-input-icon">
                      <CalendarDays size={16} />
                      <input type="date" value={today} readOnly />
                    </span>
                  </label>
                  <label>
                    <span className="loan-field-label">
                      Due Date <small>(14 days from borrow date)</small>
                    </span>
                    <span className="loan-input-icon">
                      <CalendarDays size={16} />
                      <input type="date" value={dueDate} readOnly />
                    </span>
                  </label>
                </div>

                <button type="submit" className="loan-primary" disabled={!canCreateLoan}>
                  <CalendarDays size={16} />
                  {isSaving ? "Creating..." : "Create Loan"}
                </button>
              </form>
            </aside>

            {/* ===== LOAN TABLE ===== */}
            <section className="loan-panel loan-table-panel">
              <div className="loan-table-head">
                <div className="loan-section-heading">
                  <h2>LoanedBook Table</h2>
                  <p>View, filter and manage all loan transactions.</p>
                </div>

                <div className="loan-search-box">
                  <input
                    value={search}
                    onChange={handleFilterChange(setSearch)}
                    placeholder="Search by loan ID, member, book, ISBN..."
                  />
                  <button type="button" aria-label="Search loans">
                    Search
                  </button>
                </div>
              </div>

              {/* ===== TABLE FILTERS ===== */}
              <div className="loan-filter-row">
                <select value={statusFilter} onChange={handleFilterChange(setStatusFilter)}>
                  {statusFilters.map((filter) => (
                    <option key={filter.value} value={filter.value}>
                      {filter.label === "All" ? "All Status" : filter.label}
                    </option>
                  ))}
                </select>

                <label className="loan-date-filter">
                  <span>Borrowed From</span>
                  <input
                    type="date"
                    value={borrowedFrom}
                    onChange={handleFilterChange(setBorrowedFrom)}
                    aria-label="Borrowed from"
                  />
                </label>

                <label className="loan-date-filter">
                  <span>Borrowed To</span>
                  <input
                    type="date"
                    value={borrowedTo}
                    onChange={handleFilterChange(setBorrowedTo)}
                    aria-label="Borrowed to"
                  />
                </label>

                <button type="button" className="loan-secondary" onClick={resetFilters}>
                  Clear
                </button>
              </div>

              {/* ===== STATUS FILTER BUTTONS ===== */}
              <div className="loan-tabs">
                {statusFilters.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    className={statusFilter === filter.value ? `active ${filter.value}` : filter.value}
                    onClick={() => {
                      setStatusFilter(filter.value);
                      setPage(1);
                    }}
                  >
                    {filter.label} ({countForStatus(filter.value)})
                  </button>
                ))}
              </div>

              {/* ===== TABLE RECORDS ===== */}
              <div className="loan-table-wrap">
                <table className="loan-table">
                  <thead>
                    <tr>
                      <th>Loan ID</th>
                      <th>Member</th>
                      <th>Book</th>
                      <th>Borrowed Date</th>
                      <th>Due Date</th>
                      <th>Returned Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loans.length > 0 ? (
                      loans.map((loan, index) => (
                        <tr key={loan.LoanID} className={loan.IsOverdue && !loan.ReturnDate ? "is-overdue" : ""}>
                          <td>#{(pagination.page - 1) * pagination.limit + index + 1}</td>
                          <td>
                            <span className="loan-member-cell">
                              <span className="loan-table-avatar">{getInitials(loan.BorrowerName)}</span>
                              <span>
                                <strong>{loan.BorrowerName}</strong>
                                <small>{loan.BorrowerEmail}</small>
                              </span>
                            </span>
                          </td>
                          <td>
                            <span className="loan-book-cell">
                              <span className="loan-book-cover">{String(loan.BookTitle || "B").slice(0, 1)}</span>
                              <span>
                                <strong>{loan.BookTitle}</strong>
                                <small>{loan.ISBN}</small>
                              </span>
                            </span>
                          </td>
                          <td>{formatDateForDisplay(loan.BorrowDate)}</td>
                          <td>{formatDateForDisplay(loan.DueDate)}</td>
                          <td>{loan.ReturnDate ? formatDateForDisplay(loan.ReturnDate) : "-"}</td>
                          <td>{renderStatus(loan)}</td>
                          <td className="loan-row-actions">
                            <button type="button" aria-label="Edit loan" title="Edit loan" onClick={() => handleEdit(loan)}>
                              <Pencil size={14} />
                            </button>
                            {!loan.ReturnDate && (
                              <button type="button" aria-label="Return loan" title="Return loan" onClick={() => handleReturn(loan)}>
                                <RotateCcw size={14} />
                              </button>
                            )}
                            <button type="button" className="danger" aria-label="Delete loan" title="Delete loan" onClick={() => handleDelete(loan)}>
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="loan-empty" colSpan="8">
                          {isLoading ? "Loading loan records..." : "No loan records match the current search or filter."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* ===== PAGINATION ===== */}
              <div className="loan-pagination">
                <span>
                  Showing {loans.length ? (pagination.page - 1) * pagination.limit + 1 : 0}
                  {" to "}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} records
                </span>

                <div className="loan-page-buttons">
                  <button type="button" disabled={page <= 1} onClick={() => setPage(1)}>
                    &laquo;
                  </button>
                  <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
                    &lsaquo;
                  </button>
                  <strong>{pagination.page}</strong>
                  <button
                    type="button"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    &rsaquo;
                  </button>
                  <button
                    type="button"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage(pagination.totalPages)}
                  >
                    &raquo;
                  </button>
                </div>

                <select value={limit} onChange={(event) => {
                  setLimit(Number(event.target.value));
                  setPage(1);
                }}>
                  <option value="5">5 / page</option>
                  <option value="10">10 / page</option>
                  <option value="20">20 / page</option>
                </select>
              </div>
            </section>
          </div>
        </section>
      </section>
    </div>
  );
}

// ===== SUMMARY CARD COMPONENT =====
function SummaryCard({ title, value, detail, icon: Icon, tone }) {
  return (
    <article className={`loan-stat-card ${tone}`}>
      <span className="loan-stat-icon">
        <Icon size={32} strokeWidth={2.1} />
      </span>
      <span>
        <small>{title}</small>
        <strong>{value}</strong>
        <em>{detail}</em>
      </span>
    </article>
  );
}

// ===== SEARCH RESULT COMPONENT =====
function SearchSelector({
  label,
  query,
  setQuery,
  placeholder,
  results,
  loading,
  selected,
  onSelect,
  onRemove,
  type,
}) {
  return (
    <div className="loan-lookup">
      <label>
        {label}
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
        />
        <Search size={16} />
      </label>

      {!selected && query.trim().length > 1 && (
        <div className="loan-results">
          {loading ? (
            <div className="loan-result muted">Searching...</div>
          ) : results.length ? (
            results.map((item) => (
              <button
                type="button"
                className="loan-result"
                key={type === "user" ? item.UserID : item.BookID}
                onMouseDown={(event) => {
                  event.preventDefault();
                  onSelect(item);
                }}
                onClick={() => onSelect(item)}
              >
                {type === "user" ? <UserResult user={item} /> : <BookResult book={item} />}
              </button>
            ))
          ) : (
            <div className="loan-result muted">No matches found.</div>
          )}
        </div>
      )}

      {selected && (
        <div className="loan-selected-card">
          {type === "user" ? <UserResult user={selected} selected /> : <BookResult book={selected} selected />}
          <button type="button" onClick={onRemove}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

// ===== MEMBER RESULT CARD =====
function UserResult({ user }) {
  return (
    <>
      <span className="loan-avatar">{getInitials(user.FullName)}</span>
      <span>
        <strong>{user.FullName}</strong>
        <small>{user.Email} | UserID: {user.UserID}</small>
      </span>
      <em>Member</em>
    </>
  );
}

// ===== BOOK RESULT CARD =====
function BookResult({ book, selected }) {
  return (
    <>
      <span className="loan-book-thumb">{String(book.Title || "B").slice(0, 1)}</span>
      <span>
        <strong>{book.Title}</strong>
        <small>
          ISBN: {book.ISBN} | Available: {Number(book.AvailableCopies || 0)} copies
        </small>
      </span>
      {selected && <em>{Number(book.AvailableCopies || 0)}</em>}
    </>
  );
}

// ===== STATUS BADGE =====
function renderStatus(loan) {
  if (loan.ReturnDate) return <span className="loan-status returned">Returned</span>;
  if (loan.IsOverdue) return <span className="loan-status overdue">Overdue</span>;
  return <span className="loan-status active">Active</span>;
}

function formatDateForDisplay(value) {
  if (!value) return "-";
  return String(value).split("T")[0];
}

function getInitials(name) {
  return String(name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default LoanedBookManagement;
