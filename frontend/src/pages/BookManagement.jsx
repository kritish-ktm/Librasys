/*
  SYSTEM SETUP: Imports
*/
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  getBooks,
  addBook,
  updateBook,
  deleteBook,
} from "../services/bookService";
import LoadingOverlay from "../components/LoadingOverlay";
import Sidebar from "../components/Sidebar";
import "./BookManagement.css";

/*
  SYSTEM SETUP: Default Book Form Values
*/
const emptyForm = {
  CategoryID: "",
  Title: "",
  ISBN: "",
  PublicationDate: "",
  AvailableCopies: 1,
  IsBorrowable: true,
};

/*
  SYSTEM SETUP: Pagination Limit
*/
const booksPerPage = 8;

function BookManagement() {
  const navigate = useNavigate();

  /*
    SYSTEM FUNCTION: Main Book State
  */
  const [books, setBooks] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  /*
    SYSTEM FUNCTION: Loading and UI State
  */
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loadingScreen, setLoadingScreen] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  /*
    SYSTEM FUNCTION: Search Books, Filter Books, Sort Books, Pagination
  */
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("BookID");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);

  /*
    SYSTEM FUNCTION: Success and Error Messages
  */
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  /*
    SYSTEM FUNCTION: Role-Based Access
  */
  const userRole = localStorage.getItem("role") || "";
  const isLibrarian =
    userRole.toLowerCase() === "librarian" ||
    userRole.toLowerCase() === "admin";

  /*
    SYSTEM FUNCTION: Loading Screen
  */
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingScreen(false);
    }, 750);

    return () => clearTimeout(timer);
  }, []);

  /*
    SYSTEM FUNCTION: View Books on Page Load
  */
  useEffect(() => {
    loadBooks();
  }, []);

  /*
    SYSTEM FUNCTION: View Books
  */
  const loadBooks = async () => {
    try {
      setDataLoading(true);
      setError("");

      const response = await getBooks();
      const bookData = Array.isArray(response) ? response : response.data;

      setBooks(bookData || []);
    } catch (err) {
      console.error("Error loading books:", err);
      setError("Could not load book records. Please check the backend server.");
    } finally {
      setDataLoading(false);
    }
  };

  /*
    SYSTEM FUNCTION: Reset Book Form
  */
  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setIsFormOpen(false);
  };

  /*
    SYSTEM FUNCTION: Form Input Handling
  */
  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  /*
    SYSTEM FUNCTION: Validation
  */
  const validateForm = () => {
    if (!form.Title.trim()) {
      setError("Book title is required.");
      return false;
    }

    if (!form.ISBN.trim()) {
      setError("ISBN is required.");
      return false;
    }

    if (form.ISBN.trim().length < 10 || form.ISBN.trim().length > 13) {
      setError("ISBN must be between 10 and 13 characters.");
      return false;
    }

    if (!form.CategoryID) {
      setError("Category ID is required.");
      return false;
    }

    if (Number(form.AvailableCopies) < 0) {
      setError("Available copies cannot be negative.");
      return false;
    }

    return true;
  };

  /*
    SYSTEM FUNCTION: Add Book and Edit Book
  */
  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!validateForm()) {
      return;
    }

    /*
      SYSTEM FUNCTION: Prepare Book Data
    */
    const bookPayload = {
      ...form,
      CategoryID: Number(form.CategoryID),
      AvailableCopies: Number(form.AvailableCopies),
      IsBorrowable: Boolean(form.IsBorrowable),
    };

    try {
      if (editingId) {
        await updateBook(editingId, bookPayload);
        setMessage("Book record updated successfully.");
      } else {
        await addBook(bookPayload);
        setMessage("Book record added successfully.");
      }

      resetForm();
      loadBooks();
    } catch (err) {
      console.error("Error saving book:", err);

      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Could not save the book record.");
      }
    }
  };

  /*
    SYSTEM FUNCTION: Add Book
  */
  const handleAddClick = () => {
    setMessage("");
    setError("");
    setEditingId(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  /*
    SYSTEM FUNCTION: Edit Book
  */
  const handleEdit = (book) => {
    setMessage("");
    setError("");
    setEditingId(book.BookID);

    setForm({
      CategoryID: book.CategoryID || "",
      Title: book.Title || "",
      ISBN: book.ISBN || "",
      PublicationDate: book.PublicationDate
        ? String(book.PublicationDate).substring(0, 10)
        : "",
      AvailableCopies:
        book.AvailableCopies === 0 ? 0 : book.AvailableCopies || 1,
      IsBorrowable: Boolean(book.IsBorrowable),
    });

    setIsFormOpen(true);
  };

  /*
    SYSTEM FUNCTION: Delete Book
  */
  const handleDelete = async (bookId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this book record?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      setMessage("");
      setError("");

      await deleteBook(bookId);

      setMessage("Book record deleted successfully.");
      loadBooks();
    } catch (err) {
      console.error("Error deleting book:", err);
      setError("Could not delete the book record.");
    }
  };

  /*
    SYSTEM FUNCTION: Sort Books
  */
  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection((previousDirection) =>
        previousDirection === "asc" ? "desc" : "asc"
      );
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  /*
    SYSTEM FUNCTION: Sort Indicator Icon
  */
  const getSortIcon = (key) => {
    if (sortKey !== key) return <ArrowUpDown size={12} className="book-sort-icon inactive" />;
    return sortDirection === "asc"
      ? <ArrowUp size={12} className="book-sort-icon active" />
      : <ArrowDown size={12} className="book-sort-icon active" />;
  };

  /*
    SYSTEM FUNCTION: Clear Search and Filters
  */
  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setCurrentPage(1);
  };

  /*
    SYSTEM FUNCTION: Category Filter Options
  */
  const categoryOptions = useMemo(() => {
    const categories = books
      .map((book) => book.CategoryID)
      .filter((category) => category !== null && category !== undefined);

    return [...new Set(categories)].sort((a, b) => Number(a) - Number(b));
  }, [books]);

  /*
    SYSTEM FUNCTION: Search Books, Filter Books, and Sort Books
  */
  const filteredBooks = useMemo(() => {
    const searchValue = search.toLowerCase().trim();

    let result = books.filter((book) => {
      const combinedBookText = `
        ${book.BookID}
        ${book.Title}
        ${book.ISBN}
        ${book.CategoryID}
        ${book.PublicationDate}
        ${book.AvailableCopies}
        ${book.IsBorrowable ? "Borrowable" : "Reference"}
      `.toLowerCase();

      const matchesSearch = combinedBookText.includes(searchValue);

      const matchesCategory =
        categoryFilter === "all" ||
        String(book.CategoryID) === String(categoryFilter);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "borrowable" && Boolean(book.IsBorrowable)) ||
        (statusFilter === "reference" && !Boolean(book.IsBorrowable));

      return matchesSearch && matchesCategory && matchesStatus;
    });

    result = [...result].sort((a, b) => {
      const firstValue = a[sortKey];
      const secondValue = b[sortKey];

      if (firstValue === null || firstValue === undefined) return 1;
      if (secondValue === null || secondValue === undefined) return -1;

      if (typeof firstValue === "number" && typeof secondValue === "number") {
        return sortDirection === "asc"
          ? firstValue - secondValue
          : secondValue - firstValue;
      }

      return sortDirection === "asc"
        ? String(firstValue).localeCompare(String(secondValue))
        : String(secondValue).localeCompare(String(firstValue));
    });

    return result;
  }, [books, search, categoryFilter, statusFilter, sortKey, sortDirection]);

  /*
    SYSTEM FUNCTION: Pagination Reset
  */
  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, statusFilter]);

  /*
    SYSTEM FUNCTION: Pagination
  */
  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / booksPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const firstRecord = filteredBooks.length ? (safePage - 1) * booksPerPage + 1 : 0;
  const lastRecord = Math.min(safePage * booksPerPage, filteredBooks.length);

  const paginatedBooks = filteredBooks.slice(
    (safePage - 1) * booksPerPage,
    safePage * booksPerPage
  );

  /*
    SYSTEM FUNCTION: Dashboard Statistics
  */
  const totalBooks = books.length;
  const totalCopies = books.reduce((sum, book) => {
    return sum + Number(book.AvailableCopies || 0);
  }, 0);
  const borrowableBooks = books.filter((book) => Boolean(book.IsBorrowable)).length;
  const referenceBooks = books.filter((book) => !Boolean(book.IsBorrowable)).length;

  /*
    SYSTEM FUNCTION: Export CSV
  */
  const handleExportBooks = () => {
    setMessage("");
    setError("");

    if (!filteredBooks.length) {
      setError("No book records available to export.");
      return;
    }

    const headers = [
      "BookID",
      "CategoryID",
      "Title",
      "ISBN",
      "PublicationDate",
      "AvailableCopies",
      "IsBorrowable",
    ];

    const rows = filteredBooks.map((book) => [
      book.BookID,
      book.CategoryID,
      book.Title,
      book.ISBN,
      book.PublicationDate
        ? String(book.PublicationDate).substring(0, 10)
        : "",
      book.AvailableCopies,
      book.IsBorrowable ? "Yes" : "No",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.setAttribute("download", "librasys-books.csv");

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    setMessage("Book records exported successfully.");
  };

  return (
    <div className="book-management-shell">
      {/* SYSTEM UI: Loading Overlay */}
      <LoadingOverlay
        show={loadingScreen || dataLoading}
        message={loadingScreen ? "Opening Book Management..." : "Fetching books..."}
        subtext="Please wait..."
      />

      {/* SYSTEM UI: Sidebar */}
      <Sidebar />

      <main className="book-management-page">
        {/* SYSTEM UI: Page Header */}
        <section className="book-hero">
          <div>
            <p className="book-kicker">LIBRARY ADMINISTRATION</p>
            <h1>Book Management</h1>
            <p className="book-hero-text">
              Manage library catalogue records, availability, searching,
              filtering and exports.
            </p>
          </div>

          <button
            type="button"
            className="book-ghost-button"
            onClick={() => navigate("/dashboard")}
          >
            Dashboard
          </button>
        </section>

        {/* SYSTEM UI: Success and Error Messages */}
        {message && <div className="book-alert success">{message}</div>}
        {error && <div className="book-alert error">{error}</div>}

        {/* SYSTEM UI: Summary Strip */}
        <section className="book-summary-strip" aria-label="Book summary">
          <div className="book-summary-item">
            <span>Total Titles</span>
            <strong>{totalBooks}</strong>
          </div>
          <div className="book-summary-item">
            <span>Total Copies</span>
            <strong>{totalCopies}</strong>
          </div>
          <div className="book-summary-item">
            <span>Borrowable</span>
            <strong>{borrowableBooks}</strong>
          </div>
          <div className="book-summary-item">
            <span>Reference</span>
            <strong>{referenceBooks}</strong>
          </div>
        </section>

        {/* SYSTEM UI: Add/Edit Book Form */}
        {isFormOpen && isLibrarian && (
          <section className="book-form-panel book-form-enter">
            <div className="book-panel-header">
              <div>
                <p className="book-kicker">CATALOGUE FORM</p>
                <h2>{editingId ? "Edit Book Record" : "Add New Book"}</h2>
                <span>
                  {editingId
                    ? "Update the selected catalogue record."
                    : "Create a new catalogue record."}
                </span>
              </div>

              <button type="button" className="book-ghost-button" onClick={resetForm}>
                Close
              </button>
            </div>

            <form className="book-form" onSubmit={handleSubmit}>
              <label className="book-field">
                <span>Book Title</span>
                <input
                  name="Title"
                  type="text"
                  value={form.Title}
                  onChange={handleChange}
                  placeholder="Enter book title"
                />
              </label>

              <label className="book-field">
                <span>ISBN</span>
                <input
                  name="ISBN"
                  type="text"
                  value={form.ISBN}
                  onChange={handleChange}
                  placeholder="Enter ISBN"
                />
              </label>

              <label className="book-field">
                <span>Category ID</span>
                <input
                  name="CategoryID"
                  type="number"
                  value={form.CategoryID}
                  onChange={handleChange}
                  placeholder="Example: 800"
                />
              </label>

              <label className="book-field">
                <span>Publication Date</span>
                <input
                  name="PublicationDate"
                  type="date"
                  value={form.PublicationDate}
                  onChange={handleChange}
                />
              </label>

              <label className="book-field">
                <span>Available Copies</span>
                <input
                  name="AvailableCopies"
                  type="number"
                  min="0"
                  value={form.AvailableCopies}
                  onChange={handleChange}
                />
              </label>

              <label className="book-toggle-row">
                <input
                  name="IsBorrowable"
                  type="checkbox"
                  checked={form.IsBorrowable}
                  onChange={handleChange}
                />
                <span>Book is borrowable</span>
              </label>

              <div className="book-form-actions">
                <button type="button" className="book-ghost-button" onClick={resetForm}>
                  Cancel
                </button>

                <button type="submit" className="book-primary-button">
                  {editingId ? "Update Book" : "Save Book"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* SYSTEM UI: Book Catalogue Panel */}
        <section className="book-catalogue-panel">
          <div className="book-catalogue-header">
            <div>
              <h2>Book Catalogue</h2>
              <p>
                Manage, search, filter, and export book records.
              </p>
            </div>

            <div className="book-catalogue-actions">
              {isLibrarian && (
                <button
                  type="button"
                  className="book-primary-button"
                  onClick={handleAddClick}
                >
                  <Plus size={17} />
                  Add Book
                </button>
              )}

              <button
                type="button"
                className="book-ghost-button"
                onClick={handleExportBooks}
              >
                <Download size={17} />
                Export CSV
              </button>
            </div>
          </div>

          {/* SYSTEM UI: Search and Filter Toolbar */}
          <div className="book-toolbar">
            <div className="book-search-box">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by title, ISBN, ID or category..."
              />
              <button
                type="button"
                aria-label="Search books"
              >
                <Search size={17} />
              </button>
            </div>

            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="all">All Categories</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  Category {category}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All Status</option>
              <option value="borrowable">Borrowable</option>
              <option value="reference">Reference Only</option>
            </select>

            <button type="button" className="book-secondary-button" onClick={clearFilters}>
              Clear
            </button>
          </div>

          {/* SYSTEM UI: Book Table */}
          <div className="book-table-wrapper">
            <table className="book-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort("BookID")}>
                    <span className="book-th-inner">ID {getSortIcon("BookID")}</span>
                  </th>
                  <th onClick={() => handleSort("Title")}>
                    <span className="book-th-inner">Title {getSortIcon("Title")}</span>
                  </th>
                  <th onClick={() => handleSort("ISBN")}>
                    <span className="book-th-inner">ISBN {getSortIcon("ISBN")}</span>
                  </th>
                  <th onClick={() => handleSort("CategoryID")}>
                    <span className="book-th-inner">Category {getSortIcon("CategoryID")}</span>
                  </th>
                  <th onClick={() => handleSort("PublicationDate")}>
                    <span className="book-th-inner">Published {getSortIcon("PublicationDate")}</span>
                  </th>
                  <th onClick={() => handleSort("AvailableCopies")}>
                    <span className="book-th-inner">Copies {getSortIcon("AvailableCopies")}</span>
                  </th>
                  <th>Status</th>
                  {isLibrarian && <th>Actions</th>}
                </tr>
              </thead>

              <tbody>
                {paginatedBooks.length > 0 ? (
                  paginatedBooks.map((book, index) => (
                    <tr key={book.BookID} className={index % 2 === 0 ? "book-row-even" : "book-row-odd"}>
                      <td className="book-id">#{book.BookID}</td>
                      <td className="book-title-cell">{book.Title}</td>
                      <td>{book.ISBN}</td>
                      <td>Category {book.CategoryID}</td>
                      <td>
                        {book.PublicationDate
                          ? String(book.PublicationDate).substring(0, 10)
                          : "Not set"}
                      </td>
                      <td>
                        <span className="book-count-badge">
                          {book.AvailableCopies}
                        </span>
                      </td>
                      <td>
                        <span
                          className={
                            book.IsBorrowable
                              ? "book-status borrowable"
                              : "book-status reference"
                          }
                        >
                          {book.IsBorrowable ? "Borrowable" : "Reference"}
                        </span>
                      </td>

                      {isLibrarian && (
                        <td className="book-row-actions">
                          <button
                            type="button"
                            aria-label="Edit book"
                            title="Edit book"
                            onClick={() => handleEdit(book)}
                          >
                            <Pencil size={15} />
                          </button>

                          <button
                            type="button"
                            className="danger"
                            aria-label="Delete book"
                            title="Delete book"
                            onClick={() => handleDelete(book.BookID)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={isLibrarian ? "8" : "7"}
                      className="book-empty"
                    >
                      No book records match your search or filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* SYSTEM UI: Pagination */}
          <div className="book-pagination">
            <span>
              Showing {firstRecord} to {lastRecord} of {filteredBooks.length} records
            </span>

            <div className="book-page-buttons" aria-label="Book pagination">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage(1)}
              >
                &laquo;
              </button>
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() =>
                  setCurrentPage((previousPage) => Math.max(1, previousPage - 1))
                }
              >
                &lsaquo;
              </button>
              <strong>{safePage}</strong>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() =>
                  setCurrentPage((previousPage) =>
                    Math.min(totalPages, previousPage + 1)
                  )
                }
              >
                &rsaquo;
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
              >
                &raquo;
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default BookManagement;