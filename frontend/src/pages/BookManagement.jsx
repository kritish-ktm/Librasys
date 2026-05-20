import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookCheck,
  BookOpen,
  Download,
  FileText,
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

// Default form values used when adding a new book or resetting the form.
const emptyForm = {
  CategoryID: "",
  Title: "",
  ISBN: "",
  PublicationDate: "",
  AvailableCopies: 1,
  IsBorrowable: true,
};

const booksPerPage = 8;

function BookManagement() {
  const navigate = useNavigate();

  // Main book data and form states.
  const [books, setBooks] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  // UI and loading states.
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loadingScreen, setLoadingScreen] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  // States used for searching, filtering, sorting, and pagination.
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("BookID");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);

  // Message states used to give feedback after actions.
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const userRole = localStorage.getItem("role") || "";
  const isLibrarian =
    userRole.toLowerCase() === "librarian" ||
    userRole.toLowerCase() === "admin";

  // Loading uses the same overlay style as the other admin pages.
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingScreen(false);
    }, 750);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    loadBooks();
  }, []);

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

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Basic frontend validation before sending data to the backend.
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

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!validateForm()) {
      return;
    }

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

  const handleAddClick = () => {
    setMessage("");
    setError("");
    setEditingId(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };

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

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setCurrentPage(1);
  };

  const categoryOptions = useMemo(() => {
    const categories = books
      .map((book) => book.CategoryID)
      .filter((category) => category !== null && category !== undefined);

    return [...new Set(categories)].sort((a, b) => Number(a) - Number(b));
  }, [books]);

  // Applies search, category filter, status filter, and sorting.
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

  // Pagination calculations for the filtered result list.
  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / booksPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const firstRecord = filteredBooks.length
    ? (safePage - 1) * booksPerPage + 1
    : 0;
  const lastRecord = Math.min(safePage * booksPerPage, filteredBooks.length);

  const paginatedBooks = filteredBooks.slice(
    (safePage - 1) * booksPerPage,
    safePage * booksPerPage
  );

  const totalBooks = books.length;
  const totalCopies = books.reduce((sum, book) => {
    return sum + Number(book.AvailableCopies || 0);
  }, 0);
  const borrowableBooks = books.filter((book) => Boolean(book.IsBorrowable)).length;
  const referenceBooks = books.filter((book) => !Boolean(book.IsBorrowable)).length;

  // Exports the current filtered book list as a CSV file.
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
      <LoadingOverlay
        show={loadingScreen || dataLoading}
        message={loadingScreen ? "Opening Book Management..." : "Fetching books..."}
        subtext="Please wait..."
      />

      <Sidebar />

      <main className="book-management-page">
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

        {message && <div className="book-alert success">{message}</div>}
        {error && <div className="book-alert error">{error}</div>}

        <section className="book-stats-grid" aria-label="Book summary">
          <StatCard
            title="Total Titles"
            value={totalBooks}
            detail="All book records"
            icon={BookOpen}
            tone="total"
          />
          <StatCard
            title="Total Copies"
            value={totalCopies}
            detail="Copies in catalogue"
            icon={BookCheck}
            tone="copies"
          />
          <StatCard
            title="Borrowable"
            value={borrowableBooks}
            detail="Available for lending"
            icon={BookOpen}
            tone="borrowable"
          />
          <StatCard
            title="Reference"
            value={referenceBooks}
            detail="In-library only"
            icon={FileText}
            tone="reference"
          />
        </section>

        {isFormOpen && isLibrarian && (
          <section className="book-form-panel">
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

        <section className="book-table-panel">
          <div className="book-table-header">
            <div>
              <h2>Book Catalogue</h2>
              <p>
                View, search and manage all book records ({filteredBooks.length}).
              </p>
            </div>

            <div className="book-table-tools">
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

          <div className="book-toolbar">
            <div className="book-search-box">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by title, ISBN, ID or category..."
              />
              <button type="button" aria-label="Search books">
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

          <div className="book-filter-tabs" aria-label="Filter books by status">
            {["all", "borrowable", "reference"].map((status) => (
              <button
                key={status}
                type="button"
                className={statusFilter === status ? "active" : ""}
                onClick={() => {
                  setStatusFilter(status);
                  setCurrentPage(1);
                }}
              >
                {formatStatusLabel(status)}
                <span>{countForStatus(status, books)}</span>
              </button>
            ))}
          </div>

          <div className="book-table-wrap">
            <table className="book-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort("BookID")}>ID</th>
                  <th onClick={() => handleSort("Title")}>Title</th>
                  <th onClick={() => handleSort("ISBN")}>ISBN</th>
                  <th onClick={() => handleSort("CategoryID")}>Category</th>
                  <th onClick={() => handleSort("PublicationDate")}>Published</th>
                  <th onClick={() => handleSort("AvailableCopies")}>Copies</th>
                  <th>Status</th>
                  {isLibrarian && <th>Actions</th>}
                </tr>
              </thead>

              <tbody>
                {paginatedBooks.length > 0 ? (
                  paginatedBooks.map((book) => (
                    <tr key={book.BookID}>
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

function StatCard({ title, value, detail, icon: Icon, tone }) {
  return (
    <article className={`book-stat-card ${tone}`}>
      <span className="book-stat-icon">
        <Icon size={30} strokeWidth={2.1} />
      </span>
      <span>
        <small>{title}</small>
        <strong>{value}</strong>
        <em>{detail}</em>
      </span>
    </article>
  );
}

function countForStatus(status, books) {
  if (status === "all") return books.length;
  if (status === "borrowable") {
    return books.filter((book) => Boolean(book.IsBorrowable)).length;
  }
  return books.filter((book) => !Boolean(book.IsBorrowable)).length;
}

function formatStatusLabel(status) {
  if (status === "all") return "All";
  if (status === "reference") return "Reference";
  return "Borrowable";
}

export default BookManagement;