import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Filter,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  addLoan,
  deleteLoan,
  getLoanById,
  getLoans,
  returnLoan,
  searchLoanBooks,
  searchLoanUsers,
  updateLoan,
} from "../services/loanedBookService";
import LoadingOverlay from "../components/LoadingOverlay";
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

const emptyEditForm = {
  BorrowDate: "",
  DueDate: "",
  ReturnDate: "",
  Status: "active",
};

const ALERT_DURATION_MS = 3000;
const ALERT_FADE_MS = 260;
const MIN_LOADER_MS = 650;

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
  const [editLoan, setEditLoan] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [editSelectedUser, setEditSelectedUser] = useState(null);
  const [editSelectedBook, setEditSelectedBook] = useState(null);
  const [editUserQuery, setEditUserQuery] = useState("");
  const [editBookQuery, setEditBookQuery] = useState("");
  const [editUserResults, setEditUserResults] = useState([]);
  const [editBookResults, setEditBookResults] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [borrowedFrom, setBorrowedFrom] = useState("");
  const [borrowedTo, setBorrowedTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [error, setError] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("success");
  const [showAlert, setShowAlert] = useState(false);
  const [isAlertLeaving, setIsAlertLeaving] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingOverlayVisible, setIsLoadingOverlayVisible] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Fetching loan records...");
  const [loadingSubtext, setLoadingSubtext] = useState("Please wait...");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [loadingEditUsers, setLoadingEditUsers] = useState(false);
  const [loadingEditBooks, setLoadingEditBooks] = useState(false);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const dueDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return date.toISOString().split("T")[0];
  }, []);
  const alertTimerRef = useRef(null);
  const alertFadeTimerRef = useRef(null);
  const loaderTimerRef = useRef(null);
  const loaderStartedAtRef = useRef(0);
  const isBusy = isLoading || isSaving || isLoadingOverlayVisible;

  useEffect(() => {
    return () => {
      clearTimeout(alertTimerRef.current);
      clearTimeout(alertFadeTimerRef.current);
      clearTimeout(loaderTimerRef.current);
    };
  }, []);

  const showFeedback = (text, type = "success") => {
    clearTimeout(alertTimerRef.current);
    clearTimeout(alertFadeTimerRef.current);
    setAlertMessage(text);
    setAlertType(type);
    setIsAlertLeaving(false);
    setShowAlert(true);

    alertTimerRef.current = setTimeout(() => {
      setIsAlertLeaving(true);
      alertFadeTimerRef.current = setTimeout(() => {
        setShowAlert(false);
        setAlertMessage("");
        if (type === "error") setError("");
        setIsAlertLeaving(false);
      }, ALERT_FADE_MS);
    }, ALERT_DURATION_MS);
  };

  const showError = (text) => {
    setError(text);
    showFeedback(text, "error");
  };

  const showLoader = (message, subtext = "Please wait...") => {
    clearTimeout(loaderTimerRef.current);
    loaderStartedAtRef.current = Date.now();
    setLoadingMessage(message);
    setLoadingSubtext(subtext);
    setIsLoadingOverlayVisible(true);
  };

  const hideLoader = () => {
    const elapsed = Date.now() - loaderStartedAtRef.current;
    const remaining = Math.max(MIN_LOADER_MS - elapsed, 0);
    clearTimeout(loaderTimerRef.current);
    loaderTimerRef.current = setTimeout(() => {
      setIsLoadingOverlayVisible(false);
    }, remaining);
  };

  // ===== LOAD LOAN TABLE =====
  const fetchLoans = async (message = "Fetching loan records...") => {
    showLoader(message);
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
      showError(err.response?.data?.error || "Failed to load loan records.");
    } finally {
      setIsLoading(false);
      hideLoader();
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

  // ===== EDIT MODAL MEMBER SEARCH =====
  useEffect(() => {
    const query = editUserQuery.trim();
    if (!isEditOpen || query.length < 2 || query === editSelectedUser?.FullName) {
      setEditUserResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingEditUsers(true);
      try {
        const data = await searchLoanUsers(query);
        setEditUserResults(Array.isArray(data) ? data : []);
      } catch {
        setEditUserResults([]);
      } finally {
        setLoadingEditUsers(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [editUserQuery, editSelectedUser, isEditOpen]);

  // ===== EDIT MODAL BOOK SEARCH =====
  useEffect(() => {
    const query = editBookQuery.trim();
    if (!isEditOpen || query.length < 2 || query === editSelectedBook?.Title) {
      setEditBookResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingEditBooks(true);
      try {
        const data = await searchLoanBooks(query);
        setEditBookResults(Array.isArray(data) ? data : []);
      } catch {
        setEditBookResults([]);
      } finally {
        setLoadingEditBooks(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [editBookQuery, editSelectedBook, isEditOpen]);

  const canCreateLoan =
    selectedUser &&
    selectedBook &&
    Number(selectedBook.AvailableCopies || 0) > 0 &&
    !isBusy;

  const resetForm = () => {
    setSelectedUser(null);
    setSelectedBook(null);
    setUserQuery("");
    setBookQuery("");
    setUserResults([]);
    setBookResults([]);
  };

  const resetEditForm = () => {
    setEditLoan(null);
    setEditForm(emptyEditForm);
    setEditSelectedUser(null);
    setEditSelectedBook(null);
    setEditUserQuery("");
    setEditBookQuery("");
    setEditUserResults([]);
    setEditBookResults([]);
    setIsEditOpen(false);
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
    setError("");

    if (!selectedUser) {
      showError("Search and select a member before creating a loan.");
      return;
    }

    if (!selectedBook) {
      showError("Search and select a book before creating a loan.");
      return;
    }

    if (Number(selectedBook.AvailableCopies || 0) < 1) {
      showError("This book is currently unavailable.");
      return;
    }

    showLoader("Creating new loan...");
    setIsSaving(true);

    try {
      await addLoan({
        UserID: Number(selectedUser.UserID),
        BookID: Number(selectedBook.BookID),
      });

      showFeedback("Loan created successfully.");
      resetForm();
      setIsCreateOpen(false);
      await fetchLoans();
    } catch (err) {
      showError(err.response?.data?.error || "Failed to create loan.");
    } finally {
      setIsSaving(false);
      hideLoader();
    }
  };

  // ===== OPEN EDIT MODAL =====
  const openEditModal = async (loan) => {
    showLoader("Loading loan details...");
    setIsLoading(true);

    try {
      const latestLoan = await getLoanById(loan.LoanID);
      const loanDetails = latestLoan || loan;

      const user = {
        UserID: loanDetails.UserID,
        FullName: loanDetails.BorrowerName,
        Email: loanDetails.BorrowerEmail,
        Role: "Member",
        IsActive: 1,
      };
      const book = {
        BookID: loanDetails.BookID,
        Title: loanDetails.BookTitle,
        ISBN: loanDetails.ISBN,
        AvailableCopies: 1,
        IsBorrowable: 1,
      };

      setError("");
      setEditLoan(loanDetails);
      setEditSelectedUser(user);
      setEditSelectedBook(book);
      setEditUserQuery(user.FullName);
      setEditBookQuery(book.Title);
      setEditForm({
        BorrowDate: formatDateForDisplay(loanDetails.BorrowDate),
        DueDate: formatDateForDisplay(loanDetails.DueDate),
        ReturnDate: loanDetails.ReturnDate ? formatDateForDisplay(loanDetails.ReturnDate) : "",
        Status: loanDetails.ReturnDate ? "returned" : loanDetails.IsOverdue ? "overdue" : "active",
      });
      setEditUserResults([]);
      setEditBookResults([]);
      setIsEditOpen(true);
    } catch (err) {
      showError(err.response?.data?.error || "Failed to load loan details.");
    } finally {
      setIsLoading(false);
      hideLoader();
    }
  };

  // ===== SAVE EDIT MODAL =====
  const handleEditSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const validationMessage = validateEditForm({
      editLoan,
      editForm,
      editSelectedUser,
      editSelectedBook,
    });

    if (validationMessage) {
      showError(validationMessage);
      return;
    }

    const returnDate =
      editForm.Status === "returned"
        ? editForm.ReturnDate || today
        : null;

    showLoader("Saving changes...");
    setIsSaving(true);

    try {
      await updateLoan(editLoan.LoanID, {
        UserID: Number(editSelectedUser.UserID),
        BookID: Number(editSelectedBook.BookID),
        BorrowDate: editForm.BorrowDate,
        DueDate: editForm.DueDate,
        ReturnDate: returnDate,
      });
      showFeedback("Loan updated successfully.");
      resetEditForm();
      await fetchLoans();
    } catch (err) {
      showError(err.response?.data?.error || "Failed to update loan.");
    } finally {
      setIsSaving(false);
      hideLoader();
    }
  };

  // ===== CONFIRM ACTIONS =====
  const handleConfirmAction = async () => {
    if (!confirmAction?.loan) return;

    const loan = confirmAction.loan;
    setError("");
    showLoader(confirmAction.type === "return" ? "Processing return..." : "Deleting loan record...");
    setIsSaving(true);

    try {
      if (confirmAction.type === "return") {
        await returnLoan(loan.LoanID);
        showFeedback("Loan returned successfully.");
      }

      if (confirmAction.type === "delete") {
        if (!loan.ReturnDate) {
          showError("Active loans cannot be deleted. Return the book first.");
          return;
        }

        await deleteLoan(loan.LoanID);
        showFeedback("Loan deleted successfully.");
      }

      setConfirmAction(null);
      await fetchLoans();
    } catch (err) {
      showError(err.response?.data?.error || "Action failed.");
    } finally {
      setIsSaving(false);
      hideLoader();
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
      <LoadingOverlay show={isBusy} message={loadingMessage} subtext={loadingSubtext} />
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

        {showAlert && (
          <div className={`loan-alert ${alertType} ${isAlertLeaving ? "is-hiding" : ""}`}>
            {alertMessage}
          </div>
        )}

        <section className="loan-workspace">
          <div className="loan-grid">
            {/* ===== LOAN TABLE ===== */}
            <section className="loan-panel loan-table-panel">
              <div className="loan-list-head">
                <div className="loan-section-heading">
                  <h2>Loaned Books</h2>
                  <p>View, filter and manage all loan transactions.</p>
                </div>

                <div className="loan-list-actions">
                  <button
                    type="button"
                    className="loan-add-button"
                    disabled={isBusy}
                    onClick={() => {
                      setError("");
                      setIsCreateOpen(true);
                    }}
                  >
                    <Plus size={18} />
                    Add New Loan
                  </button>

                  <div className="loan-search-box">
                    <input
                      value={search}
                      disabled={isBusy}
                      onChange={handleFilterChange(setSearch)}
                      placeholder="Search by loan ID, member, book, ISBN..."
                    />
                    <button type="button" aria-label="Search loans" disabled={isBusy}>
                      <Search size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* ===== TABLE FILTERS ===== */}
              <div className="loan-filter-row">
                <select value={statusFilter} onChange={handleFilterChange(setStatusFilter)} disabled={isBusy}>
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
                    disabled={isBusy}
                    onChange={handleFilterChange(setBorrowedFrom)}
                    aria-label="Borrowed from"
                  />
                </label>

                <label className="loan-date-filter">
                  <span>Borrowed To</span>
                  <input
                    type="date"
                    value={borrowedTo}
                    disabled={isBusy}
                    onChange={handleFilterChange(setBorrowedTo)}
                    aria-label="Borrowed to"
                  />
                </label>

                <button type="button" className="loan-secondary" disabled={isBusy} onClick={resetFilters}>
                  Clear
                </button>

                <button type="button" className="loan-filter-button" disabled={isBusy} onClick={() => setPage(1)}>
                  <Filter size={16} />
                  Filter
                </button>
              </div>

              {/* ===== STATUS FILTER BUTTONS ===== */}
              <div className="loan-tabs">
                {statusFilters.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    disabled={isBusy}
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
                            <button type="button" aria-label="Edit loan" title="Edit loan" disabled={isBusy} onClick={() => openEditModal(loan)}>
                              <Pencil size={14} />
                            </button>
                            {!loan.ReturnDate && (
                              <button
                                type="button"
                                aria-label="Return loan"
                                title="Return loan"
                                disabled={isBusy}
                                onClick={() => setConfirmAction({ type: "return", loan })}
                              >
                                <RotateCcw size={14} />
                              </button>
                            )}
                            <button
                              type="button"
                              className="danger"
                              aria-label="Delete loan"
                              title="Delete loan"
                              disabled={isBusy}
                              onClick={() => setConfirmAction({ type: "delete", loan })}
                            >
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
                  <button type="button" disabled={isBusy || page <= 1} onClick={() => setPage(1)}>
                    &laquo;
                  </button>
                  <button type="button" disabled={isBusy || page <= 1} onClick={() => setPage((current) => current - 1)}>
                    &lsaquo;
                  </button>
                  <strong>{pagination.page}</strong>
                  <button
                    type="button"
                    disabled={isBusy || page >= pagination.totalPages}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    &rsaquo;
                  </button>
                  <button
                    type="button"
                    disabled={isBusy || page >= pagination.totalPages}
                    onClick={() => setPage(pagination.totalPages)}
                  >
                    &raquo;
                  </button>
                </div>

                <select value={limit} disabled={isBusy} onChange={(event) => {
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

      {isCreateOpen && (
        <div className="loan-modal-backdrop" role="presentation">
          <section className="loan-modal" role="dialog" aria-modal="true" aria-labelledby="create-loan-title">
            <div className="loan-modal-head">
              <div className="loan-section-heading">
                <h2 id="create-loan-title">Create New Loan</h2>
                <p>Search and select member & book to create a new loan.</p>
              </div>

              <button
                type="button"
                className="loan-modal-close"
                disabled={isBusy}
                aria-label="Close create loan form"
                onClick={() => {
                  resetForm();
                  setIsCreateOpen(false);
                }}
              >
                <X size={18} />
              </button>
            </div>

            {error && <div className="loan-alert error">{error}</div>}

            <form className="loan-form" onSubmit={handleCreateLoan}>
              <SearchSelector
                label="1. Search Member"
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
                label="2. Search Book"
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
          </section>
        </div>
      )}

      {isEditOpen && editLoan && (
        <div className="loan-modal-backdrop" role="presentation">
          <section className="loan-modal loan-edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-loan-title">
            <div className="loan-modal-head">
              <div className="loan-section-heading">
                <h2 id="edit-loan-title">Edit / Correct Loan Record</h2>
                <p>Correct the selected loan while keeping the original LoanID unchanged.</p>
              </div>

              <button
                type="button"
                className="loan-modal-close"
                disabled={isBusy}
                aria-label="Close edit loan form"
                onClick={resetEditForm}
              >
                <X size={18} />
              </button>
            </div>

            {error && <div className="loan-alert error">{error}</div>}

            <form className="loan-form" onSubmit={handleEditSubmit}>
              <div className="loan-modal-grid">
                <label>
                  <span className="loan-field-label">LoanID</span>
                  <input value={`#${editLoan.LoanID}`} readOnly />
                </label>

                <label>
                  <span className="loan-field-label">Status</span>
                  <select
                    value={editForm.Status}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        Status: event.target.value,
                        ReturnDate: event.target.value === "returned" ? current.ReturnDate || today : "",
                      }))
                    }
                  >
                    <option value="active">Active</option>
                    <option value="overdue">Overdue</option>
                    <option value="returned">Returned</option>
                  </select>
                </label>
              </div>

              {editLoan.ReturnDate ? (
                <ReadOnlySelectionCard label="Member" type="user" item={editSelectedUser} />
              ) : (
                <SearchSelector
                  label="Member"
                  query={editUserQuery}
                  setQuery={setEditUserQuery}
                  placeholder="Search member by name, email, or member ID"
                  results={editUserResults}
                  loading={loadingEditUsers}
                  selected={editSelectedUser}
                  onSelect={(user) => {
                    setEditSelectedUser(user);
                    setEditUserQuery(user.FullName);
                    setEditUserResults([]);
                  }}
                  onRemove={() => {
                    setEditSelectedUser(null);
                    setEditUserQuery("");
                  }}
                  type="user"
                />
              )}

              {editLoan.ReturnDate ? (
                <ReadOnlySelectionCard label="Book" type="book" item={editSelectedBook} />
              ) : (
                <SearchSelector
                  label="Book"
                  query={editBookQuery}
                  setQuery={setEditBookQuery}
                  placeholder="Search book by title, ISBN, or book ID"
                  results={editBookResults}
                  loading={loadingEditBooks}
                  selected={editSelectedBook}
                  onSelect={(book) => {
                    setEditSelectedBook(book);
                    setEditBookQuery(book.Title);
                    setEditBookResults([]);
                  }}
                  onRemove={() => {
                    setEditSelectedBook(null);
                    setEditBookQuery("");
                  }}
                  type="book"
                />
              )}

              <div className="loan-modal-grid">
                <label>
                  <span className="loan-field-label">Borrow Date</span>
                  <span className="loan-input-icon">
                    <CalendarDays size={16} />
                    <input
                      type="date"
                      value={editForm.BorrowDate}
                      onChange={(event) => setEditForm((current) => ({ ...current, BorrowDate: event.target.value }))}
                    />
                  </span>
                </label>

                <label>
                  <span className="loan-field-label">Due Date</span>
                  <span className="loan-input-icon">
                    <CalendarDays size={16} />
                    <input
                      type="date"
                      value={editForm.DueDate}
                      onChange={(event) => setEditForm((current) => ({ ...current, DueDate: event.target.value }))}
                    />
                  </span>
                </label>

                <label>
                  <span className="loan-field-label">Return Date</span>
                  <span className="loan-input-icon">
                    <CalendarDays size={16} />
                    <input
                      type="date"
                      value={editForm.ReturnDate}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          ReturnDate: event.target.value,
                          Status: event.target.value ? "returned" : current.Status,
                        }))
                      }
                    />
                  </span>
                </label>
              </div>

              <div className="loan-modal-actions">
                <button type="button" className="loan-modal-cancel" onClick={resetEditForm}>
                  Cancel
                </button>
                <button type="submit" className="loan-primary" disabled={isBusy}>
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {confirmAction && (
        <div className="loan-modal-backdrop" role="presentation">
          <section className="loan-modal loan-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-loan-title">
            <div className="loan-modal-head">
              <div className="loan-section-heading">
                <h2 id="confirm-loan-title">
                  {confirmAction.type === "return" ? "Confirm Return" : "Delete Loan Record"}
                </h2>
                <p>
                  {confirmAction.type === "return"
                    ? "Confirm before marking this book as returned."
                    : "This action permanently removes the selected loan record."}
                </p>
              </div>

              <button
                type="button"
                className="loan-modal-close"
                disabled={isBusy}
                aria-label="Close confirmation"
                onClick={() => setConfirmAction(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className={confirmAction.type === "delete" ? "loan-warning danger" : "loan-warning"}>
              {confirmAction.type === "delete" && !confirmAction.loan.ReturnDate ? (
                <>
                  <strong>Active loans cannot be deleted.</strong>
                  <span>Return this book first, then delete the record if it was entered incorrectly.</span>
                </>
              ) : confirmAction.type === "delete" ? (
                <>
                  <strong>Delete loan #{confirmAction.loan.LoanID}?</strong>
                  <span>This cannot be undone after the record is removed.</span>
                </>
              ) : (
                <>
                  <strong>Return {confirmAction.loan.BookTitle}?</strong>
                  <span>This will set the return date and add the copy back to available stock.</span>
                </>
              )}
            </div>

            <div className="loan-modal-actions">
              <button type="button" className="loan-modal-cancel" disabled={isBusy} onClick={() => setConfirmAction(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={confirmAction.type === "delete" ? "loan-primary danger" : "loan-primary"}
                disabled={isBusy || (confirmAction.type === "delete" && !confirmAction.loan.ReturnDate)}
                onClick={handleConfirmAction}
              >
                {isSaving ? "Working..." : confirmAction.type === "return" ? "Confirm Return" : "Delete Record"}
              </button>
            </div>
          </section>
        </div>
      )}
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

function ReadOnlySelectionCard({ label, type, item }) {
  return (
    <div className="loan-lookup">
      <span className="loan-readonly-label">{label}</span>
      <div className="loan-selected-card compact">
        {type === "user" ? <UserResult user={item} /> : <BookResult book={item} selected />}
      </div>
    </div>
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

function validateEditForm({ editLoan, editForm, editSelectedUser, editSelectedBook }) {
  if (!editLoan) return "Loan record is missing.";
  if (!editSelectedUser?.UserID) return "Selected member must exist.";
  if (!isTruthy(editSelectedUser.IsActive)) return "Selected member must be active.";
  if (!editSelectedBook?.BookID) return "Selected book must exist.";
  if (!isTruthy(editSelectedBook.IsBorrowable)) return "Selected book must be borrowable.";

  const memberChanged = Number(editSelectedUser.UserID) !== Number(editLoan.UserID);
  const bookChanged = Number(editSelectedBook.BookID) !== Number(editLoan.BookID);

  if (editLoan.ReturnDate && (memberChanged || bookChanged)) {
    return "Member and book can only be changed for active loans.";
  }

  if (editLoan.ReturnDate && editForm.Status !== "returned") {
    return "Returned loans cannot be reopened from this edit form.";
  }

  if (bookChanged && Number(editSelectedBook.AvailableCopies || 0) < 1) {
    return "Selected book has no available copies.";
  }

  if (!editForm.BorrowDate) return "Borrow date is required.";
  if (!editForm.DueDate) return "Due date is required.";

  if (editForm.DueDate < editForm.BorrowDate) {
    return "Due Date must not be earlier than Borrow Date.";
  }

  if (editForm.ReturnDate && editForm.ReturnDate < editForm.BorrowDate) {
    return "Return Date must be empty or not earlier than Borrow Date.";
  }

  return "";
}

function isTruthy(value) {
  return value === true || value === 1 || value === "1";
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
