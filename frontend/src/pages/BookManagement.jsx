import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getBooks,
  addBook,
  updateBook,
  deleteBook,
} from "../services/bookService";
import "./BookManagement.css";

// Empty form used for adding a new book.
const emptyForm = {
  CategoryID: "",
  Title: "",
  ISBN: "",
  PublicationDate: "",
  AvailableCopies: 1,
  IsBorrowable: true,
};

function BookManagement() {
  const navigate = useNavigate();

  // Main data states.
  const [books, setBooks] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  // UI states.
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loadingScreen, setLoadingScreen] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  // Search, filter, sorting and pagination states.
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("BookID");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);

  // Message states.
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const booksPerPage = 8;

  // Role is used so librarian/admin can manage books,
  // while standard users can only browse.
  const userRole = localStorage.getItem("role") || "";
  const isLibrarian =
    userRole.toLowerCase() === "librarian" ||
    userRole.toLowerCase() === "admin";

  // Small opening animation when the page loads.
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingScreen(false);
    }, 750);

    return () => clearTimeout(timer);
  }, []);

  // Load books when component opens.
  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      setDataLoading(true);
      setError("");

      const response = await getBooks();

      // Supports both response.data and direct array return,
      // depending on how your bookService.js is written.
      const bookData = Array.isArray(response) ? response : response.data;

      setBooks(bookData || []);
    } catch (err) {
      console.error("Error loading books:", err);
      setError("Could not load book records. Please check the backend server.");
    } finally {
      setDataLoading(false);
    }
  };

  // Reset form back to default values.
  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setIsFormOpen(false);
  };

  // Handle normal input changes.
  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Frontend validation before sending data to backend.
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

  // Add or update book.
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

  // Open form for adding a new book.
  const handleAddClick = () => {
    setMessage("");
    setError("");
    setEditingId(null);
    setForm(emptyForm);
    setIsFormOpen(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Open form for editing a selected book.
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

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Delete selected book.
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

  // Sort table columns.
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

  // Get unique category IDs from available books.
  const categoryOptions = useMemo(() => {
    const categories = books
      .map((book) => book.CategoryID)
      .filter((category) => category !== null && category !== undefined);

    return [...new Set(categories)].sort((a, b) => Number(a) - Number(b));
  }, [books]);

  // Filter and sort books.
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

  // Reset to first page when filters change.
  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, statusFilter]);

  const totalPages = Math.ceil(filteredBooks.length / booksPerPage);

  const paginatedBooks = filteredBooks.slice(
    (currentPage - 1) * booksPerPage,
    currentPage * booksPerPage
  );

  // Dashboard stats.
  const totalBooks = books.length;

  const totalCopies = books.reduce((sum, book) => {
    return sum + Number(book.AvailableCopies || 0);
  }, 0);

  const borrowableBooks = books.filter((book) =>
    Boolean(book.IsBorrowable)
  ).length;

  const referenceBooks = books.filter(
    (book) => !Boolean(book.IsBorrowable)
  ).length;

  // CSV export function.
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

  if (loadingScreen) {
    return (
      <div className="book-loading-screen">
        <div className="book-loader-card">
          <div className="book-flip-icon">📖</div>
          <h2>Opening Book Catalogue</h2>
          <p>Preparing library records...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="book-management-page">
      <section className="book-hero">
        <div>
          <p className="book-eyebrow">LibraSys Catalogue Module</p>
          <h1>Book Management</h1>
          <p className="book-hero-text">
            Manage library catalogue records, availability, searching, filtering
            and exports from one clean workspace.
          </p>
        </div>

        <div className="book-hero-actions">
          <button
            className="secondary-action-btn"
            onClick={() => navigate("/dashboard")}
          >
            ← Dashboard
          </button>

          {isLibrarian && (
            <button className="primary-action-btn" onClick={handleAddClick}>
              + Add Book
            </button>
          )}

          <button className="secondary-action-btn" onClick={handleExportBooks}>
            Export CSV
          </button>
        </div>
      </section>

      {message && <div className="book-alert success-alert">{message}</div>}
      {error && <div className="book-alert error-alert">{error}</div>}

      <section className="book-stats-grid">
        <article className="book-stat-card">
          <span>Total Titles</span>
          <strong>{totalBooks}</strong>
          <p>All book records currently stored.</p>
        </article>

        <article className="book-stat-card">
          <span>Total Copies</span>
          <strong>{totalCopies}</strong>
          <p>Combined copies across the catalogue.</p>
        </article>

        <article className="book-stat-card">
          <span>Borrowable</span>
          <strong>{borrowableBooks}</strong>
          <p>Books available for normal lending.</p>
        </article>

        <article className="book-stat-card">
          <span>Reference</span>
          <strong>{referenceBooks}</strong>
          <p>Books marked as non-borrowable.</p>
        </article>
      </section>

      {isFormOpen && isLibrarian && (
        <section className="book-form-panel">
          <div className="book-section-heading">
            <div>
              <p className="book-eyebrow">Catalogue Form</p>
              <h2>{editingId ? "Edit Book Record" : "Add New Book"}</h2>
            </div>

            <button className="ghost-btn" onClick={resetForm}>
              Close
            </button>
          </div>

          <form className="book-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="Title">Book Title</label>
              <input
                id="Title"
                name="Title"
                type="text"
                value={form.Title}
                onChange={handleChange}
                placeholder="Enter book title"
              />
            </div>

            <div className="form-group">
              <label htmlFor="ISBN">ISBN</label>
              <input
                id="ISBN"
                name="ISBN"
                type="text"
                value={form.ISBN}
                onChange={handleChange}
                placeholder="Enter ISBN"
              />
            </div>

            <div className="form-group">
              <label htmlFor="CategoryID">Category ID</label>
              <input
                id="CategoryID"
                name="CategoryID"
                type="number"
                value={form.CategoryID}
                onChange={handleChange}
                placeholder="Example: 800"
              />
            </div>

            <div className="form-group">
              <label htmlFor="PublicationDate">Publication Date</label>
              <input
                id="PublicationDate"
                name="PublicationDate"
                type="date"
                value={form.PublicationDate}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="AvailableCopies">Available Copies</label>
              <input
                id="AvailableCopies"
                name="AvailableCopies"
                type="number"
                min="0"
                value={form.AvailableCopies}
                onChange={handleChange}
              />
            </div>

            <div className="checkbox-group">
              <input
                id="IsBorrowable"
                name="IsBorrowable"
                type="checkbox"
                checked={form.IsBorrowable}
                onChange={handleChange}
              />
              <label htmlFor="IsBorrowable">Book is borrowable</label>
            </div>

            <div className="form-actions">
              <button type="button" className="ghost-btn" onClick={resetForm}>
                Cancel
              </button>

              <button type="submit" className="primary-action-btn">
                {editingId ? "Update Book" : "Save Book"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="book-catalogue-panel">
        <div className="book-section-heading">
          <div>
            <p className="book-eyebrow">Catalogue Records</p>
            <h2>Book Catalogue</h2>
          </div>

          <p className="book-count-text">
            Showing {paginatedBooks.length} of {filteredBooks.length} records
          </p>
        </div>

        <div className="book-toolbar">
          <div className="search-box">
            <label htmlFor="book-search">Search Books</label>
            <input
              id="book-search"
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title, ISBN, ID or category"
            />
          </div>

          <div className="filter-box">
            <label htmlFor="category-filter">Category</label>
            <select
              id="category-filter"
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
          </div>

          <div className="filter-box">
            <label htmlFor="status-filter">Status</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All Status</option>
              <option value="borrowable">Borrowable</option>
              <option value="reference">Reference Only</option>
            </select>
          </div>
        </div>

        {dataLoading ? (
          <div className="table-empty-state">
            <div className="mini-loader">📚</div>
            <h3>Loading books...</h3>
            <p>The catalogue is being fetched from the backend.</p>
          </div>
        ) : (
          <>
            <div className="book-table-wrapper">
              <table className="book-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort("BookID")}>ID</th>
                    <th onClick={() => handleSort("Title")}>Title</th>
                    <th onClick={() => handleSort("ISBN")}>ISBN</th>
                    <th onClick={() => handleSort("CategoryID")}>Category</th>
                    <th onClick={() => handleSort("PublicationDate")}>
                      Published
                    </th>
                    <th onClick={() => handleSort("AvailableCopies")}>
                      Copies
                    </th>
                    <th>Status</th>
                    {isLibrarian && <th>Actions</th>}
                  </tr>
                </thead>

                <tbody>
                  {paginatedBooks.length > 0 ? (
                    paginatedBooks.map((book) => (
                      <tr key={book.BookID}>
                        <td>{book.BookID}</td>
                        <td className="book-title-cell">{book.Title}</td>
                        <td>{book.ISBN}</td>
                        <td>Category {book.CategoryID}</td>
                        <td>
                          {book.PublicationDate
                            ? String(book.PublicationDate).substring(0, 10)
                            : "Not set"}
                        </td>
                        <td>{book.AvailableCopies}</td>
                        <td>
                          <span
                            className={
                              book.IsBorrowable
                                ? "status-badge borrowable"
                                : "status-badge reference"
                            }
                          >
                            {book.IsBorrowable ? "Borrowable" : "Reference"}
                          </span>
                        </td>

                        {isLibrarian && (
                          <td>
                            <div className="table-actions">
                              <button
                                className="edit-btn"
                                onClick={() => handleEdit(book)}
                              >
                                Edit
                              </button>

                              <button
                                className="delete-btn"
                                onClick={() => handleDelete(book.BookID)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={isLibrarian ? "8" : "7"}
                        className="empty-table-message"
                      >
                        No book records match your search or filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pagination-bar">
              <button
                className="pagination-btn"
                disabled={currentPage === 1}
                onClick={() =>
                  setCurrentPage((previousPage) => previousPage - 1)
                }
              >
                Previous
              </button>

              <span>
                Page {totalPages === 0 ? 1 : currentPage} of{" "}
                {totalPages === 0 ? 1 : totalPages}
              </span>

              <button
                className="pagination-btn"
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() =>
                  setCurrentPage((previousPage) => previousPage + 1)
                }
              >
                Next
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

export default BookManagement;