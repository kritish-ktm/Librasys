import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleDollarSign,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldOff,
  Trash2,
} from "lucide-react";
import axios from "axios";
import LoadingOverlay from "../components/LoadingOverlay";
import Sidebar from "../components/Sidebar";
import "./LoanedBookManagement.css";
import "./FineManagement.css";

/*
  FINE MANAGEMENT FRONTEND PAGE
  -----------------------------
  This React page displays fines from the backend.
  It does not connect to XAMPP directly. It calls the Express backend API:
  http://localhost:5000/api/fines

  Backend then connects to XAMPP MySQL from backend/config/db.js.
*/
const API_BASE_URL = "http://localhost:5000";
const statusFilters = [
  { value: "all", label: "All" },
  { value: "unpaid", label: "Unpaid" },
  { value: "paid", label: "Paid" },
  { value: "waived", label: "Waived" },
];

const defaultManualFine = {
  UserID: "",
  BookID: "",
  Amount: "",
  Reason: "",
  Notes: "",
};

function FineManagement() {
  const [fines, setFines] = useState([]);
  const [fineOptions, setFineOptions] = useState({ users: [], books: [] });
  const [search, setSearch] = useState("");
  const [searchError, setSearchError] = useState("");
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualFine, setManualFine] = useState(defaultManualFine);
  const [editingFineId, setEditingFineId] = useState(null);
  const [manualFineError, setManualFineError] = useState("");
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("success");

  const isBusy = isLoading || isSaving;
  const token = localStorage.getItem("token");
  const authConfig = {
    headers: { Authorization: `Bearer ${token}` },
  };

  /*
    Loads fine data from backend.
    Backend returns joined data from:
    fine + loanedbook + user + book.
  */
  const fetchFines = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/fines`, authConfig);
      setFines(Array.isArray(res.data) ? res.data : []);
      setError("");
    } catch (err) {
      setError(
        err.response?.status === 401
          ? "Please log in as a librarian before opening Fine Management."
          : err.response?.data?.error || "Failed to load fine records."
      );
    } finally {
      setIsLoading(false);
    }
  };

  /*
    Loads dropdown data for manual rare/reference fines.
    Backend returns:
    - active member accounts from user
    - non-borrowable/reference books from book
  */
  const fetchFineOptions = async () => {
    setIsLoadingOptions(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/fines/options`, authConfig);
      setFineOptions({
        users: Array.isArray(res.data?.users) ? res.data.users : [],
        books: Array.isArray(res.data?.books) ? res.data.books : [],
      });
      setManualFineError("");
    } catch (err) {
      console.error("Unable to load manual fine options:", err);
      setManualFineError(err.response?.data?.error || "Unable to load members and rare/reference books.");
    } finally {
      setIsLoadingOptions(false);
    }
  };

  useEffect(() => {
    fetchFines();
    fetchFineOptions();
  }, []);

  /*
    Statistics cards at the top of the page.
    They are calculated from the fines array after the API data is loaded.
  */
  const stats = useMemo(() => {
    const paidFines = fines.filter((fine) => getFineStatus(fine) === "paid");
    const waivedFines = fines.filter((fine) => getFineStatus(fine) === "waived");
    const unpaidFines = fines.filter((fine) => getFineStatus(fine) === "unpaid");

    return {
      total: fines.length,
      outstanding: unpaidFines.reduce((sum, fine) => sum + getFineAmount(fine), 0),
      paid: paidFines.reduce((sum, fine) => sum + getFineAmount(fine), 0),
      waived: waivedFines.length,
    };
  }, [fines]);

  const visibleFines = useMemo(() => {
    const query = search.trim().toLowerCase();

    /*
      SEARCH BOX LOGIC
      ----------------
      The search input updates the `search` state.
      This filter checks each fine row and keeps it if the search text matches:
      - FineID
      - Member name
      - Book title
      - LoanID
      - UserID
      - Fine type and notes

      Status tabs also work here by checking statusFilter.
    */
    return fines.filter((fine) => {
      const status = getFineStatus(fine);
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      const matchesSearch = !query || [
        getFineId(fine),
        getMemberName(fine),
        getBookTitle(fine),
        fine.LoanID,
        fine.UserID,
        fine.FineType,
        fine.Notes,
      ].some((value) => String(value || "").toLowerCase().includes(query));

      return matchesStatus && matchesSearch;
    });
  }, [fines, search, statusFilter]);

  /*
    SEARCH VALIDATION
    -----------------
    This protects the Fine search box from very long text and unusual symbols.
    We allow normal values used by this page:
    - member names: Ramesh Oli
    - book titles: The Silent Patient
    - IDs: 15 or #15
    - common title punctuation: apostrophe, comma, dot, dash, colon
  */
  const handleSearchChange = (event) => {
    const value = event.target.value;
    const allowedSearchPattern = /^[a-zA-Z0-9\s#.,:'-]*$/;

    if (value.length > 80) {
      setSearchError("Search cannot be longer than 80 characters.");
      return;
    }

    if (!allowedSearchPattern.test(value)) {
      setSearchError("Use only letters, numbers, spaces, #, comma, dot, dash, colon, or apostrophe.");
      return;
    }

    setSearchError("");
    setSearch(value);
  };

  /*
    MANUAL FINE FORM VALIDATION
    ---------------------------
    Manual fines are only for in-library/reference item incidents.
    The backend also validates this, but frontend validation gives the librarian
    a clear message before the request is sent.
  */
  const validateManualFine = () => {
    const amount = Number(manualFine.Amount);

    if (!manualFine.UserID) return "Please select a member.";
    if (!manualFine.BookID) return "Please select a rare/reference book.";
    if (!Number.isFinite(amount) || amount <= 0 || amount > 9999.99) {
      return "Amount must be between $0.01 and $9,999.99.";
    }
    if (!manualFine.Reason.trim() || manualFine.Reason.trim().length < 3) {
      return "Reason must be at least 3 characters.";
    }
    if (manualFine.Reason.trim().length > 160) {
      return "Reason cannot be longer than 160 characters.";
    }
    if (manualFine.Notes.trim().length > 255) {
      return "Notes cannot be longer than 255 characters.";
    }

    return "";
  };

  const handleManualFineChange = (field, value) => {
    setManualFine((current) => ({ ...current, [field]: value }));
    setManualFineError("");
  };

  const handleToggleManualForm = async () => {
    const nextVisible = !showManualForm;
    setShowManualForm(nextVisible);
    setManualFineError("");
    setEditingFineId(null);
    setManualFine(defaultManualFine);

    /*
      Reload options when the form opens.
      This fixes the empty dropdown problem if the page opened before the
      backend /api/fines/options route was ready or after the backend restarted.
    */
    if (nextVisible) {
      await fetchFineOptions();
    }
  };

  const handleCancelManualForm = () => {
    setManualFine(defaultManualFine);
    setEditingFineId(null);
    setManualFineError("");
    setShowManualForm(false);
  };

  /*
    EDIT MANUAL FINE BUTTON
    -----------------------
    Manual fines can be edited because the librarian typed the amount/reason.
    Automatic overdue fines stay calculated from loanedbook, so their edit
    button is disabled.
  */
  const handleEditManualFine = async (fine) => {
    if (getFineType(fine) !== "manual") {
      setAlertType("error");
      setAlertMessage("Automatic overdue fines are calculated from loan records. Use Sync Fines instead.");
      return;
    }

    await fetchFineOptions();
    setEditingFineId(getFineId(fine));
    setManualFine({
      UserID: String(fine.UserID || fine.userId || ""),
      BookID: String(fine.BookID || fine.bookId || ""),
      Amount: String(getFineAmount(fine) || ""),
      Reason: fine.Reason || fine.reason || "",
      Notes: fine.Notes || fine.notes || "",
    });
    setManualFineError("");
    setShowManualForm(true);
  };

  /*
    ADD / EDIT MANUAL FINE CODE
    ---------------------------
    Add sends POST /api/fines.
    Edit sends PUT /api/fines/:id.
    Backend stores it as FineType = Manual.
  */
  const handleCreateManualFine = async (event) => {
    event.preventDefault();

    const validationMessage = validateManualFine();
    if (validationMessage) {
      setManualFineError(validationMessage);
      return;
    }

    setIsSaving(true);
    setAlertMessage("");

    try {
      const payload = {
        ...manualFine,
        Amount: Number(manualFine.Amount),
        Reason: manualFine.Reason.trim(),
        Notes: manualFine.Notes.trim(),
      };

      if (editingFineId) {
        await axios.put(`${API_BASE_URL}/api/fines/${editingFineId}`, payload, authConfig);
      } else {
        await axios.post(`${API_BASE_URL}/api/fines`, payload, authConfig);
      }

      setManualFine(defaultManualFine);
      setEditingFineId(null);
      setShowManualForm(false);
      await fetchFines();
      setAlertType("success");
      setAlertMessage(editingFineId ? "Manual fine updated successfully." : "Manual rare/reference fine added as unpaid.");
    } catch (err) {
      setAlertType("error");
      setAlertMessage(err.response?.data?.error || "Unable to save manual fine.");
    } finally {
      setIsSaving(false);
    }
  };

  /*
    EDIT / UPDATE CODE
    ------------------
    The Fine page does not edit amount manually because amount is calculated
    from overdue days. The edit action here updates the fine Status:
    Paid, Waived, or Unpaid.
  */
  const handleStatusChange = async (fine, status) => {
    const fineId = getFineId(fine);
    if (!fineId || getFineStatus(fine) === status) return;

    setIsSaving(true);
    setAlertMessage("");

    try {
      const endpoint = status === "paid" ? "paid" : status === "waived" ? "waived" : "unpaid";
      await axios.patch(`${API_BASE_URL}/api/fines/${fineId}/${endpoint}`, {}, authConfig);
      setFines((current) =>
        current.map((item) =>
          getFineId(item) === fineId
            ? { ...item, Status: toDisplayStatus(status), status: toDisplayStatus(status) }
            : item
        )
      );
      setAlertType("success");
      setAlertMessage(`Fine marked as ${status}.`);
    } catch (err) {
      setAlertType("error");
      setAlertMessage(err.response?.data?.error || "Unable to update this fine.");
    } finally {
      setIsSaving(false);
    }
  };

  /*
    ADD / SYNC CODE
    ---------------
    This button asks the backend to create/update fine rows from overdue loans.
    It is the automatic version of "Add Fine".
  */
  const handleSyncFines = async () => {
    setIsSaving(true);
    setAlertMessage("");

    try {
      await axios.post(`${API_BASE_URL}/api/fines/sync`, {}, authConfig);
      await fetchFines();
      setAlertType("success");
      setAlertMessage("Automatic fines synced from overdue loans.");
    } catch (err) {
      setAlertType("error");
      setAlertMessage(err.response?.data?.error || "Unable to sync automatic fines.");
    } finally {
      setIsSaving(false);
    }
  };

  /*
    DELETE CODE
    -----------
    Deletes the stored fine row only. It does not delete the loanedbook record,
    so teammates' loan data stays safe.
  */
  const handleDeleteFine = async (fine) => {
    const fineId = getFineId(fine);
    if (!fineId) return;

    const confirmed = window.confirm(`Delete fine #${fineId}?`);
    if (!confirmed) return;

    setIsSaving(true);
    setAlertMessage("");

    try {
      await axios.delete(`${API_BASE_URL}/api/fines/${fineId}`, authConfig);
      await fetchFines();
      setAlertType("success");
      setAlertMessage("Fine deleted successfully.");
    } catch (err) {
      setAlertType("error");
      setAlertMessage(err.response?.data?.error || "Unable to delete this fine.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="loan-page fine-page">
      <LoadingOverlay show={isBusy} message={isSaving ? "Updating fine..." : "Fetching fine records..."} subtext="Please wait..." />
      <Sidebar />

      <section className="loan-main">
        <section className="loan-stats" aria-label="Fine summary">
          <SummaryCard title="Total Fines" value={stats.total} detail="All fine records" icon={Receipt} tone="total" />
          <SummaryCard title="Outstanding" value={formatMoney(stats.outstanding)} detail="Amount still owed" icon={CircleDollarSign} tone="overdue" />
          <SummaryCard title="Paid Amount" value={formatMoney(stats.paid)} detail="Collected fines" icon={CheckCircle2} tone="active" />
          <SummaryCard title="Waived" value={stats.waived} detail="Forgiven records" icon={ShieldOff} tone="returned" />
        </section>

        {alertMessage && <div className={`loan-alert ${alertType}`}>{alertMessage}</div>}
        {error && <div className="loan-alert error">{error}</div>}

        <section className="loan-workspace">
          <div className="loan-grid">
            <section className="loan-panel loan-table-panel">
              <div className="loan-list-head">
                <div className="loan-section-heading">
                  <h2>Fine Records</h2>
                  <p>Review overdue-loan penalties and update paid or waived status.</p>
                </div>

                <div className="loan-list-actions fine-list-actions">
                  <button
                    type="button"
                    className="loan-add-button fine-secondary-button"
                    disabled={isBusy}
                    onClick={handleToggleManualForm}
                  >
                    <Plus size={17} />
                    Add Manual Fine
                  </button>

                  <button type="button" className="loan-add-button" disabled={isBusy} onClick={handleSyncFines}>
                    <RefreshCw size={17} />
                    Sync Fines
                  </button>

                  <div className="loan-search-box">
                    <input
                      value={search}
                      onChange={handleSearchChange}
                      placeholder="Search member, book, loan or fine ID..."
                      maxLength={80}
                      aria-invalid={Boolean(searchError)}
                      title="Search by member name, book title, loan ID, user ID, or fine ID"
                    />
                    <button type="button" aria-label="Search fines">
                      <Search size={17} />
                    </button>
                  </div>
                  {searchError && <small className="fine-search-error">{searchError}</small>}
                </div>
              </div>

              {showManualForm && (
                <form className="fine-manual-form" onSubmit={handleCreateManualFine}>
                  <div>
                    <label htmlFor="manual-fine-user">Member</label>
                    <select
                      id="manual-fine-user"
                      value={manualFine.UserID}
                      onChange={(event) => handleManualFineChange("UserID", event.target.value)}
                    >
                      <option value="">{isLoadingOptions ? "Loading members..." : "Select member"}</option>
                      {fineOptions.users.map((user) => (
                        <option key={user.UserID} value={user.UserID}>
                          {user.FullName} - {user.Email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="manual-fine-book">Rare/reference item</label>
                    <select
                      id="manual-fine-book"
                      value={manualFine.BookID}
                      onChange={(event) => handleManualFineChange("BookID", event.target.value)}
                    >
                      <option value="">{isLoadingOptions ? "Loading items..." : "Select item"}</option>
                      {fineOptions.books.map((book) => (
                        <option key={book.BookID} value={book.BookID}>
                          {book.Title} - {book.ISBN}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="manual-fine-amount">Amount</label>
                    <input
                      id="manual-fine-amount"
                      type="number"
                      min="0.01"
                      max="9999.99"
                      step="0.01"
                      value={manualFine.Amount}
                      onChange={(event) => handleManualFineChange("Amount", event.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label htmlFor="manual-fine-reason">Reason</label>
                    <input
                      id="manual-fine-reason"
                      value={manualFine.Reason}
                      onChange={(event) => handleManualFineChange("Reason", event.target.value)}
                      placeholder="Coffee spill, page damage, wear and tear..."
                      maxLength={160}
                    />
                  </div>

                  <div className="fine-form-wide">
                    <label htmlFor="manual-fine-notes">Notes</label>
                    <input
                      id="manual-fine-notes"
                      value={manualFine.Notes}
                      onChange={(event) => handleManualFineChange("Notes", event.target.value)}
                      placeholder="Optional internal note"
                      maxLength={255}
                    />
                  </div>

                  <div className="fine-form-actions">
                    <button type="submit" className="loan-add-button" disabled={isBusy}>
                      {editingFineId ? "Update Manual Fine" : "Save Manual Fine"}
                    </button>
                    <button
                      type="button"
                      className="loan-clear-button"
                      disabled={isBusy}
                      onClick={handleCancelManualForm}
                    >
                      Cancel
                    </button>
                  </div>

                  {manualFineError && <p className="fine-form-error">{manualFineError}</p>}
                </form>
              )}

              <div className="loan-tabs">
                {statusFilters.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    className={`${statusFilter === filter.value ? "active" : ""} ${filter.value}`}
                    onClick={() => setStatusFilter(filter.value)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <div className="loan-table-wrap">
                <table className="loan-table fine-table">
                  <thead>
                    <tr>
                      <th>FineID</th>
                      <th>Member</th>
                      <th>Book</th>
                      <th>LoanID</th>
                      <th>Issued</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleFines.length === 0 ? (
                      <tr>
                        <td className="loan-empty" colSpan="8">
                          {isLoading ? "Loading fine records..." : "No fines match the current filters."}
                        </td>
                      </tr>
                    ) : (
                      visibleFines.map((fine, index) => (
                        <tr key={getFineId(fine) || index}>
                          <td>#{getFineId(fine) || "-"}</td>
                          <td>
                            <div className="loan-member-cell">
                              <span className="loan-table-avatar">{getInitials(getMemberName(fine))}</span>
                              <span>
                                <strong>{getMemberName(fine)}</strong>
                                <small>UserID: {fine.UserID || fine.userId || "-"}</small>
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="loan-book-cell">
                              <span className="loan-book-cover">{getBookTitle(fine).slice(0, 1)}</span>
                              <span>
                                <strong>{getBookTitle(fine)}</strong>
                                <small>{fine.Reason || fine.reason || "Overdue loan fine"}</small>
                              </span>
                            </div>
                          </td>
                          <td>{fine.LoanID || fine.loanId ? `#${fine.LoanID || fine.loanId}` : "Manual"}</td>
                          <td>{formatDate(fine.FineDate || fine.IssuedDate || fine.CreatedAt || fine.date)}</td>
                          <td className="fine-amount">{formatMoney(getFineAmount(fine))}</td>
                          <td>{renderFineStatus(fine)}</td>
                          <td className="loan-row-actions fine-row-actions">
                            <button
                              type="button"
                              disabled={isBusy || getFineStatus(fine) === "paid"}
                              title="Mark fine paid"
                              aria-label="Mark fine paid"
                              onClick={() => handleStatusChange(fine, "paid")}
                            >
                              <CheckCircle2 size={16} />
                            </button>
                            <button
                              type="button"
                              className="waive"
                              disabled={isBusy || getFineStatus(fine) === "waived"}
                              title="Waive fine"
                              aria-label="Waive fine"
                              onClick={() => handleStatusChange(fine, "waived")}
                            >
                              <ShieldOff size={16} />
                            </button>
                            <button
                              type="button"
                              disabled={isBusy || getFineStatus(fine) === "unpaid"}
                              title="Mark fine unpaid"
                              aria-label="Mark fine unpaid"
                              onClick={() => handleStatusChange(fine, "unpaid")}
                            >
                              <RotateCcw size={16} />
                            </button>
                            <button
                              type="button"
                              disabled={isBusy || getFineType(fine) !== "manual"}
                              title={getFineType(fine) === "manual" ? "Edit manual fine" : "Automatic fines are edited by Sync Fines"}
                              aria-label="Edit manual fine"
                              onClick={() => handleEditManualFine(fine)}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              className="danger"
                              disabled={isBusy}
                              title="Delete fine"
                              aria-label="Delete fine"
                              onClick={() => handleDeleteFine(fine)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </section>
      </section>
    </div>
  );
}

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

function renderFineStatus(fine) {
  const status = getFineStatus(fine);
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={`loan-status ${status === "unpaid" ? "overdue" : status}`}>{label}</span>;
}

function getFineStatus(fine) {
  // Converts different possible backend status values into one frontend format.
  const raw = String(fine.Status || fine.status || fine.IsPaid || "").toLowerCase();
  if (raw === "1" || raw === "true" || raw === "paid") return "paid";
  if (raw === "waived") return "waived";
  return "unpaid";
}

function getFineType(fine) {
  return String(fine.FineType || fine.fineType || "overdue").toLowerCase();
}

function getFineId(fine) {
  // Supports both the new FineID name and older id/fineId names.
  return fine.FineID || fine.id || fine.fineId;
}

function getFineAmount(fine) {
  return Number(fine.Amount ?? fine.amount ?? 0);
}

function toDisplayStatus(status) {
  if (status === "paid") return "Paid";
  if (status === "waived") return "Waived";
  return "Unpaid";
}

function getMemberName(fine) {
  return fine.MemberName || fine.FullName || fine.member || fine.UserName || "Member record";
}

function getBookTitle(fine) {
  return fine.BookTitle || fine.Title || fine.book || fine.BookName || "Linked loan book";
}

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "Not recorded";
  return String(value).split("T")[0];
}

function getInitials(name) {
  return String(name || "LS")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default FineManagement;
