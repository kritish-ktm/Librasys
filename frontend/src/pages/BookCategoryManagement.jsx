import { useEffect, useState } from "react";
import { ArrowUpDown, Eye, Pencil, Power, Trash2 } from "lucide-react";
import {
  getCategories,
  getMostBorrowedBooks,
  getCategoryBooks,
  addCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
} from "../services/bookCategoryService";
import Sidebar from "../components/Sidebar";
import "./BookCategoryManagement.css";

const LOADING_DELAY_MS = 3500;
const LOADING_SWITCH_MS = 2000;
const deweyPattern = /^\d{3}(?:\.\d{1,3})?$/;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function BookCategoryManagement() {
  const emptyForm = {
    CategoryName: "",
    Description: "",
    DeweyCode: "",
    IsActive: true,
  };

  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [displayedCategories, setDisplayedCategories] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [loadingOverlay, setLoadingOverlay] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({ key: "CategoryName", direction: "asc" });
  const [bookviewMode, setBookviewMode] = useState("all");
  const [detailCategory, setDetailCategory] = useState(null);
  const [detailBooks, setDetailBooks] = useState([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const showLoadingOverlay = (title, detail) => {
    setLoadingOverlay({ title, detail, phase: "large" });

    return setTimeout(() => {
      setLoadingOverlay({ title, detail, phase: "small" });
    }, LOADING_SWITCH_MS);
  };

  const fetchCategories = async (showDelay = true) => {
    setIsFetching(true);
    const overlayTimer = showDelay
      ? showLoadingOverlay("Fetching", "Fetching information from database")
      : null;

    try {
      const [res] = await Promise.all([
        getCategories(),
        showDelay ? wait(LOADING_DELAY_MS) : Promise.resolve(),
      ]);
      setCategories(Array.isArray(res) ? res : res.data || []);
    } catch (err) {
      setError("Failed to load categories.");
    } finally {
      if (overlayTimer) clearTimeout(overlayTimer);
      if (showDelay) setLoadingOverlay(null);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

useEffect(() => {
  const trimmedSearchTerm = searchTerm.trim().toLowerCase();

  if (trimmedSearchTerm) {
    setIsSearching(true);
  } else {
    setIsSearching(false);
  }

  const timer = setTimeout(async () => {

    // ⭐ MOST BORROWED MODE (NEW FEATURE)
    if (bookviewMode === "mostBorrowed") {
      try {
        const res = await getMostBorrowedBooks();

        const data = Array.isArray(res) ? res : res.data || [];

        const mapped = data.map((b) => ({
          CategoryID: b.BookID,
          CategoryName: b.Title,
          DeweyCode: "-",
          Description: "Most borrowed book",
          BookCount: b.BorrowCount,
          IsActive: 1,
          CreatedAt: null,
          UpdatedAt: null,
        }));

        setDisplayedCategories(mapped);
        setPage(1);
        setIsSearching(false);
        return;
      } catch (err) {
        setError("Failed to load most borrowed books.");
        return;
      }
    }

    // ⭐ NORMAL CATEGORY MODE
    const filtered = categories
      .filter((cat) => {
        const matchesSearch =
          !trimmedSearchTerm ||
          cat.CategoryName?.toLowerCase().includes(trimmedSearchTerm) ||
          cat.DeweyCode?.toLowerCase().includes(trimmedSearchTerm) ||
          cat.Description?.toLowerCase().includes(trimmedSearchTerm);

        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "active" && Number(cat.IsActive) === 1) ||
          (statusFilter === "inactive" && Number(cat.IsActive) !== 1);

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => compareCategories(a, b, sortConfig));

    setDisplayedCategories(filtered);
    setPage(1);
    setIsSearching(false);
  }, trimmedSearchTerm ? 1000 : 0);

  return () => clearTimeout(timer);
}, [categories, searchTerm, statusFilter, sortConfig, bookviewMode]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setMessage("");
    setError("");
  };

  const openCreateForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const closeForm = () => {
    if (isSaving) return;
    resetForm();
    setIsFormOpen(false);
  };

  const validateForm = () => {
    if (!form.CategoryName.trim()) return "Category name is required.";
    if (form.CategoryName.trim().length > 100) return "Category name is too long.";
    if (!form.DeweyCode.trim()) return "Dewey Code is required.";
    if (form.DeweyCode.trim().length > 10) return "Dewey Code is too long.";
    if (!deweyPattern.test(form.DeweyCode.trim())) return "Dewey Code must look like 500 or 500.1.";
    if (!form.Description.trim()) return "Description is required.";
    if (form.Description.trim().length > 200) return "Description cannot be more than 200 characters.";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    const overlayTimer = showLoadingOverlay(
      editingId ? "Updating" : "Adding",
      editingId ? "Updating database" : "Adding data to database"
    );

    try {
      if (editingId) {
        await Promise.all([updateCategory(editingId, form), wait(LOADING_DELAY_MS)]);
        resetForm();
        setMessage("Category updated successfully!");
      } else {
        await Promise.all([addCategory(form), wait(LOADING_DELAY_MS)]);
        resetForm();
        setMessage("Category added successfully!");
      }
      setIsFormOpen(false);
      await fetchCategories(false);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save category.");
    } finally {
      clearTimeout(overlayTimer);
      setLoadingOverlay(null);
      setIsSaving(false);
    }
  };

  const handleEdit = (category) => {
    setEditingId(category.CategoryID);
    setForm({
      CategoryName: category.CategoryName,
      Description: category.Description || "",
      DeweyCode: category.DeweyCode,
      IsActive: category.IsActive,
    });
    setMessage("");
    setError("");
    setIsFormOpen(true);
  };

  const handleToggleStatus = async (category) => {
    setBusyAction(`status-${category.CategoryID}`);
    const overlayTimer = showLoadingOverlay("Changing Status", "Updating database");

    try {
      await Promise.all([
        toggleCategoryStatus(category.CategoryID, !category.IsActive),
        wait(LOADING_DELAY_MS),
      ]);
      setMessage(`Category ${!category.IsActive ? "activated" : "deactivated"} successfully.`);
      await fetchCategories(false);
    } catch (err) {
      setError("Failed to change status.");
    } finally {
      clearTimeout(overlayTimer);
      setLoadingOverlay(null);
      setBusyAction("");
    }
  };

  const handleDelete = async (category) => {
    if (!window.confirm(`Delete category "${category.CategoryName}"?`)) return;
    setBusyAction(`delete-${category.CategoryID}`);
    const overlayTimer = showLoadingOverlay("Deleting", "Removing data from database");

    try {
      await Promise.all([deleteCategory(category.CategoryID), wait(LOADING_DELAY_MS)]);
      setMessage("Category deleted successfully.");
      await fetchCategories(false);
    } catch (err) {
      setError("Cannot delete: Books are assigned to this category.");
    } finally {
      clearTimeout(overlayTimer);
      setLoadingOverlay(null);
      setBusyAction("");
    }
  };

  const handleSort = (key) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const openCategoryDetails = async (category) => {
    setDetailCategory(category);
    setDetailBooks([]);
    setIsLoadingDetails(true);

    try {
      const books = await getCategoryBooks(category.CategoryID);
      setDetailBooks(Array.isArray(books) ? books : []);
    } catch (err) {
      setError("Failed to load books for this category.");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const closeCategoryDetails = () => {
    setDetailCategory(null);
    setDetailBooks([]);
    setIsLoadingDetails(false);
  };

  const totalBooks = categories.reduce((sum, category) => sum + Number(category.BookCount || 0), 0);
  const activeCategories = categories.filter((category) => Number(category.IsActive) === 1).length;
  const inactiveCategories = categories.length - activeCategories;
  const totalPages = Math.max(1, Math.ceil(displayedCategories.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedCategories = displayedCategories.slice(startIndex, startIndex + pageSize);
  const firstRecord = displayedCategories.length ? startIndex + 1 : 0;
  const lastRecord = Math.min(startIndex + pageSize, displayedCategories.length);

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="book-page category-page">
      {/* Header */}
      <div className="book-hero">
        <div>
          <p className="book-kicker">LIBRARY ADMINISTRATION</p>
          <h1>Book Category Management</h1>
          <p className="book-hero-text">
            Create, edit, and manage book categories
          </p>
        </div>
      </div>

      {message && <div className="book-alert success">{message}</div>}
      {error && <div className="book-alert error">{error}</div>}

      <section className="category-stats" aria-label="Category summary">
        <article className="category-stat-card">
          <span className="category-stat-icon">C</span>
          <span>
            <small>Total Categories</small>
            <strong>{categories.length}</strong>
            <em>All category records</em>
          </span>
        </article>
        <article className="category-stat-card">
          <span className="category-stat-icon active">A</span>
          <span>
            <small>Active Categories</small>
            <strong>{activeCategories}</strong>
            <em>Visible to students</em>
          </span>
        </article>
        <article className="category-stat-card">
          <span className="category-stat-icon muted">I</span>
          <span>
            <small>Inactive Categories</small>
            <strong>{inactiveCategories}</strong>
            <em>Hidden from students</em>
          </span>
        </article>
        <article className="category-stat-card">
          <span className="category-stat-icon books">B</span>
          <span>
            <small>Assigned Books</small>
            <strong>{totalBooks}</strong>
            <em>Books linked to categories</em>
          </span>
        </article>
      </section>

      <div className="book-content-grid">
        <div className="book-table-panel">
          <div className="book-table-header">
            <div>
              <h2>Book Categories</h2>
              <p>View, search and manage all category records ({displayedCategories.length}).</p>
            </div>

            <div className="book-table-tools">
              <button type="button" className="book-primary-button" onClick={openCreateForm} disabled={isFetching || isSaving}>
                + Add New Category
              </button>

              <input
                type="text"
                placeholder={isSearching ? "Searching..." : "Search categories..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="book-search"
                disabled={isFetching}
              />
            </div>
          </div>

          <div className="category-filter-tabs" aria-label="Filter categories by status">
            {["all", "active", "inactive", "mostBorrowed"].map((status) => (
              <button
                key={status}
                type="button"
                className={statusFilter === status ? "active" : ""}
                onClick={() => {
                  setStatusFilter(status);
                  setPage(1);
                }}
              >
                {status === "all" ? "All" : status[0].toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          <div className="book-table-wrap">
            <table className="book-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>
                    <button type="button" className="sort-header" onClick={() => handleSort("CategoryName")}>
                      Category Name <ArrowUpDown size={13} />
                    </button>
                  </th>
                  <th>
                    <button type="button" className="sort-header" onClick={() => handleSort("DeweyCode")}>
                      Dewey Code <ArrowUpDown size={13} />
                    </button>
                  </th>
                  <th>Description</th>
                  <th>
                    <button type="button" className="sort-header" onClick={() => handleSort("BookCount")}>
                      Book Count <ArrowUpDown size={13} />
                    </button>
                  </th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>
                    <button type="button" className="sort-header" onClick={() => handleSort("UpdatedAt")}>
                      Updated <ArrowUpDown size={13} />
                    </button>
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isFetching && displayedCategories.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="book-empty">
                      <span className="book-inline-loading">
                        <span className="book-spinner" />
                        Fetching information<span className="book-loading-dots" />
                      </span>
                    </td>
                  </tr>
                ) : paginatedCategories.length > 0 ? (
                  paginatedCategories.map((cat) => (
                    <tr key={cat.CategoryID}>
                      <td className="book-id">{cat.CategoryID}</td>
                      <td className="book-title">{cat.CategoryName}</td>
                      <td><code>{cat.DeweyCode}</code></td>
                      <td>{cat.Description || <em>No description</em>}</td>
                      <td>
                        <span className="book-count-badge">
                          {Number(cat.BookCount || 0)}
                        </span>
                      </td>
                      <td>
                        <span className={`book-status ${cat.IsActive ? "available" : "locked"}`}>
                          <span className="book-status-dot" />
                          {cat.IsActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>{formatDate(cat.CreatedAt)}</td>
                      <td>{formatDate(cat.UpdatedAt)}</td>
                      <td className="book-row-actions">
                        <button
                          type="button"
                          aria-label="View category details"
                          title="View category details"
                          onClick={() => openCategoryDetails(cat)}
                          disabled={Boolean(busyAction)}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          aria-label="Edit category"
                          title="Edit category"
                          onClick={() => handleEdit(cat)}
                          disabled={Boolean(busyAction)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          aria-label={cat.IsActive ? "Deactivate category" : "Activate category"}
                          title={cat.IsActive ? "Deactivate category" : "Activate category"}
                          className={cat.IsActive ? "switch-off" : "switch-on"}
                          onClick={() => handleToggleStatus(cat)}
                          disabled={Boolean(busyAction)}
                        >
                          <Power size={15} />
                        </button>
                        <button
                          type="button"
                          aria-label="Delete category"
                          title="Delete category"
                          onClick={() => handleDelete(cat)}
                          disabled={Boolean(busyAction)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="book-empty">
                      {searchTerm ? "No categories found." : "No categories added yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="book-pagination">
            <span>
              Showing {firstRecord} to {lastRecord} of {displayedCategories.length} records
            </span>

            <div className="book-page-buttons" aria-label="Category pagination">
              <button type="button" disabled={safePage <= 1} onClick={() => setPage(1)}>
                &laquo;
              </button>
              <button type="button" disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                &lsaquo;
              </button>
              <strong>{safePage}</strong>
              <button type="button" disabled={safePage >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
                &rsaquo;
              </button>
              <button type="button" disabled={safePage >= totalPages} onClick={() => setPage(totalPages)}>
                &raquo;
              </button>
            </div>

            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              aria-label="Rows per page"
            >
              <option value="5">5 / page</option>
              <option value="10">10 / page</option>
              <option value="20">20 / page</option>
            </select>
          </div>
        </div>
      </div>

      {isFormOpen && (
        <div className="book-modal-backdrop" role="presentation" onMouseDown={closeForm}>
          <div
            className="book-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-form-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="book-section-title">
              <p>{editingId ? "EDIT CATEGORY" : "ADD NEW CATEGORY"}</p>
              <h2 id="category-form-title">{editingId ? "Update Category" : "Create New Category"}</h2>
            </div>

            {error && <div className="book-modal-alert error">{error}</div>}

            <form onSubmit={handleSubmit} className="book-form">
              <div className="book-field">
                <label>Category Name *</label>
                <input
                  name="CategoryName"
                  placeholder="e.g., Science Fiction"
                  value={form.CategoryName}
                  onChange={handleChange}
                  required
                  autoFocus
                  disabled={isSaving}
                />
              </div>

              <div className="book-field">
                <label>Dewey Code *</label>
                <input
                  name="DeweyCode"
                  placeholder="e.g., 500"
                  value={form.DeweyCode}
                  onChange={handleChange}
                  required
                  pattern="\d{3}(\.\d{1,3})?"
                  title="Use a Dewey code like 500 or 500.1"
                  disabled={isSaving}
                />
              </div>

              <div className="book-field full">
                <label>Description *</label>
                <textarea
                  name="Description"
                  placeholder="Short description of this category..."
                  value={form.Description}
                  onChange={handleChange}
                  maxLength="200"
                  rows="4"
                  required
                  disabled={isSaving}
                />
                <small className="book-field-hint">
                  {form.Description.trim().length}/200 characters
                </small>
              </div>

              <label className="book-toggle-row">
                <input
                  type="checkbox"
                  name="IsActive"
                  checked={form.IsActive}
                  onChange={handleChange}
                  disabled={isSaving}
                />
                <span>Active (Visible to students)</span>
              </label>

              <div className="book-actions">
                <button type="submit" className="book-primary-button" disabled={isSaving}>
                  {editingId ? "Update Category" : "Add Category"}
                </button>
                <button type="button" onClick={closeForm} className="book-ghost-button" disabled={isSaving}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailCategory && (
        <div className="book-modal-backdrop" role="presentation" onMouseDown={closeCategoryDetails}>
          <div
            className="book-modal category-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-detail-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="book-section-title">
              <p>CATEGORY DETAILS</p>
              <h2 id="category-detail-title">{detailCategory.CategoryName}</h2>
            </div>

            <dl className="category-detail-grid">
              <div>
                <dt>Dewey Code</dt>
                <dd>{detailCategory.DeweyCode}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{detailCategory.IsActive ? "Active" : "Inactive"}</dd>
              </div>
              <div>
                <dt>Book Count</dt>
                <dd>{Number(detailCategory.BookCount || 0)}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDate(detailCategory.CreatedAt)}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{formatDate(detailCategory.UpdatedAt)}</dd>
              </div>
              <div className="full">
                <dt>Description</dt>
                <dd>{detailCategory.Description}</dd>
              </div>
            </dl>

            <h3 className="category-books-title">Assigned Books</h3>
            <div className="category-books-list">
              {isLoadingDetails ? (
                <div className="book-empty">Loading books...</div>
              ) : detailBooks.length ? (
                detailBooks.map((book) => (
                  <article key={book.BookID} className="category-book-item">
                    <strong>{book.Title}</strong>
                    <span>ISBN: {book.ISBN}</span>
                    <span>Available: {Number(book.AvailableCopies || 0)}</span>
                    <em>{book.IsBorrowable ? "Borrowable" : "Reference only"}</em>
                  </article>
                ))
              ) : (
                <div className="book-empty">No books assigned to this category.</div>
              )}
            </div>

            <div className="book-actions">
              <button type="button" className="book-ghost-button" onClick={closeCategoryDetails}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {loadingOverlay && (
        <div className="book-page-loading" role="status" aria-live="polite">
          <div className="book-page-loading-panel">
            <span className="book-page-spinner" />
            {loadingOverlay.phase === "large" ? (
              <strong>{loadingOverlay.title}</strong>
            ) : (
              <span className="book-page-loading-detail">
                {loadingOverlay.detail}
                <span className="book-runner-dots" />
              </span>
            )}
          </div>
        </div>
      )}
      </main>
    </div>
  );
}


function compareCategories(a, b, sortConfig) {
  const direction = sortConfig.direction === "desc" ? -1 : 1;
  const key = sortConfig.key;

  if (key === "BookCount") {
    return (Number(a.BookCount || 0) - Number(b.BookCount || 0)) * direction;
  }

  if (key === "UpdatedAt") {
    return (new Date(a.UpdatedAt || 0) - new Date(b.UpdatedAt || 0)) * direction;
  }

  return String(a[key] || "").localeCompare(String(b[key] || ""), undefined, {
    numeric: true,
    sensitivity: "base",
  }) * direction;
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "N/A";
}

export default BookCategoryManagement;
