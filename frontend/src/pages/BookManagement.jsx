import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getBooks,
  addBook,
  updateBook,
  deleteBook,
} from "../services/bookService";
import "./BookManagement.css";

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

  const [books, setBooks] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("Title");
  const [sortDirection, setSortDirection] = useState("asc");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  /* Loads Book records from the existing backend API. */
  const fetchBooks = async () => {
    setIsLoading(true);

    try {
      const data = await getBooks();
      setBooks(Array.isArray(data) ? data : data.data || []);
      setError("");
    } catch {
      setError("Failed to load books. Make sure the backend is running.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  /* Dashboard summary values. */
  const stats = useMemo(() => {
    const totalCopies = books.reduce(
      (sum, book) => sum + Number(book.AvailableCopies || 0),
      0
    );

    const borrowableCount = books.filter((book) =>
      Boolean(book.IsBorrowable)
    ).length;

    return {
      totalTitles: books.length,
      totalCopies,
      borrowableCount,
      lockedCount: books.length - borrowableCount,
    };
  }, [books]);

  /* Search, status filter, and table sorting. */
  const displayedBooks = useMemo(() => {
    const searchValue = search.toLowerCase().trim();

    const filtered = books.filter((book) => {
      const matchesSearch = `${book.BookID} ${book.Title} ${book.ISBN} ${book.CategoryID}`
        .toLowerCase()
        .includes(searchValue);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "borrowable" && Boolean(book.IsBorrowable)) ||
        (statusFilter === "locked" && !Boolean(book.IsBorrowable));

      return matchesSearch && matchesStatus;
    });

    return [...filtered].sort((a, b) => {
      const firstValue = getSortValue(a, sortKey);
      const secondValue = getSortValue(b, sortKey);

      if (firstValue > secondValue) return sortDirection === "asc" ? 1 : -1;
      if (firstValue < secondValue) return sortDirection === "asc" ? -1 : 1;
      return 0;
    });
  }, [books, search, statusFilter, sortKey, sortDirection]);

  const formatDateForInput = (dateValue) => {
    if (!dateValue) return "";
    return String(dateValue).split("T")[0];
  };

  const formatDateForDisplay = (dateValue) => {
    if (!dateValue) return "Not set";
    return String(dateValue).split("T")[0];
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setMessage("");
    setError("");
  };

  /* Keeps validation aligned with the Book table requirements. */
  const validateForm = () => {
    if (!form.Title.trim()) return "Book title is required.";
    if (!form.ISBN.trim()) return "ISBN is required.";
    if (form.ISBN.trim().length > 13) {
      return "ISBN cannot be longer than 13 characters.";
    }

    if (form.CategoryID !== "" && Number(form.CategoryID) < 0) {
      return "Category ID cannot be below 0.";
    }

    if (Number(form.AvailableCopies) < 0) {
      return "Available copies cannot be below 0.";
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

    const bookData = {
      CategoryID: form.CategoryID === "" ? null : Number(form.CategoryID),
      Title: form.Title.trim(),
      ISBN: form.ISBN.trim(),
      PublicationDate: form.PublicationDate || null,
      AvailableCopies: Number(form.AvailableCopies),
      IsBorrowable: form.IsBorrowable,
    };

    setIsSaving(true);

    try {
      if (editingId) {
        await updateBook(editingId, bookData);
        setMessage("Book updated successfully.");
      } else {
        await addBook(bookData);
        setMessage("Book added successfully.");
      }

      resetForm();
      await fetchBooks();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save book.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (book) => {
    setEditingId(book.BookID);

    setForm({
      CategoryID: book.CategoryID ?? "",
      Title: book.Title ?? "",
      ISBN: book.ISBN ?? "",
      PublicationDate: formatDateForInput(book.PublicationDate),
      AvailableCopies: book.AvailableCopies ?? 0,
      IsBorrowable: Boolean(book.IsBorrowable),
    });

    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (book) => {
    const confirmed = window.confirm(`Delete "${book.Title}"?`);
    if (!confirmed) return;

    try {
      await deleteBook(book.BookID);
      setMessage("Book deleted successfully.");
      setError("");
      await fetchBooks();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete book.");
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
    <main className="book-page">
      <section className="book-hero">
        <div>
          <p className="book-kicker">LibraSys Inventory Console</p>
          <h1>Book Management</h1>
          <p className="book-hero-text">
            Control book records, ISBN data, inventory quantity, publication
            dates, and borrowing availability from one focused dashboard.
          </p>
        </div>

        <button
          type="button"
          className="book-back-button"
          onClick={() => navigate("/dashboard")}
        >
          Back to Dashboard
        </button>
      </section>

      <section className="book-stats">
        <article>
          <span>Total Titles</span>
          <strong>{stats.totalTitles}</strong>
          <p>Registered book records</p>
        </article>

        <article>
          <span>Total Copies</span>
          <strong>{stats.totalCopies}</strong>
          <p>Available inventory units</p>
        </article>

        <article>
          <span>Borrowable</span>
          <strong>{stats.borrowableCount}</strong>
          <p>{stats.lockedCount} currently locked</p>
        </article>
      </section>

      <section className="book-layout">
        <aside className="book-panel book-form-panel">
          <div className="book-section-title">
            <p>{editingId ? "Update Record" : "Create Record"}</p>
            <h2>{editingId ? "Edit Book" : "Add New Book"}</h2>
          </div>

          {message && <div className="book-alert success">{message}</div>}
          {error && <div className="book-alert error">{error}</div>}

          <form className="book-form" onSubmit={handleSubmit}>
            <div className="book-field full">
              <label htmlFor="Title">Book Title</label>
              <input
                id="Title"
                name="Title"
                value={form.Title}
                onChange={handleChange}
                placeholder="Enter book title"
              />
            </div>

            <div className="book-field">
              <label htmlFor="ISBN">ISBN</label>
              <input
                id="ISBN"
                name="ISBN"
                value={form.ISBN}
                onChange={handleChange}
                placeholder="13 character ISBN"
                maxLength="13"
              />
            </div>

            <div className="book-field">
              <label htmlFor="CategoryID">Category ID</label>
              <input
                id="CategoryID"
                name="CategoryID"
                type="number"
                value={form.CategoryID}
                onChange={handleChange}
                placeholder="Example: 1"
                min="0"
              />
            </div>

            <div className="book-field">
              <label htmlFor="PublicationDate">Publication Date</label>
              <input
                id="PublicationDate"
                name="PublicationDate"
                type="date"
                value={form.PublicationDate}
                onChange={handleChange}
              />
            </div>

            <div className="book-field">
              <label htmlFor="AvailableCopies">Available Copies</label>
              <input
                id="AvailableCopies"
                name="AvailableCopies"
                type="number"
                value={form.AvailableCopies}
                onChange={handleChange}
                min="0"
              />
            </div>

            <label className="book-toggle-row">
              <input
                type="checkbox"
                name="IsBorrowable"
                checked={form.IsBorrowable}
                onChange={handleChange}
              />
              <span className="book-toggle"></span>
              <span>Book is borrowable</span>
            </label>

            <div className="book-actions">
              <button
                type="submit"
                className="book-primary-button"
                disabled={isSaving}
              >
                {isSaving
                  ? "Saving..."
                  : editingId
                    ? "Update Book"
                    : "Add Book"}
              </button>

              {editingId && (
                <button
                  type="button"
                  className="book-ghost-button"
                  onClick={resetForm}
                  disabled={isSaving}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </aside>

        <section className="book-panel book-table-panel">
          <div className="book-table-header">
            <div className="book-section-title">
              <p>Library Records</p>
              <h2>Book List</h2>
            </div>

            <div className="book-table-tools">
              <input
                className="book-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title, ISBN, ID, category..."
              />

              <div className="book-filter-tabs">
                <button
                  type="button"
                  className={statusFilter === "all" ? "active" : ""}
                  onClick={() => setStatusFilter("all")}
                >
                  All
                </button>
                <button
                  type="button"
                  className={statusFilter === "borrowable" ? "active" : ""}
                  onClick={() => setStatusFilter("borrowable")}
                >
                  Borrowable
                </button>
                <button
                  type="button"
                  className={statusFilter === "locked" ? "active" : ""}
                  onClick={() => setStatusFilter("locked")}
                >
                  Locked
                </button>
              </div>
            </div>
          </div>

          <div className="book-table-meta">
            <span>
              Showing {displayedBooks.length} of {books.length} books
            </span>
            {isLoading && <span>Refreshing records...</span>}
          </div>

          <div className="book-table-wrap">
            <table className="book-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort("BookID")}>ID{sortLabel("BookID")}</th>
                  <th onClick={() => handleSort("Title")}>Title{sortLabel("Title")}</th>
                  <th onClick={() => handleSort("ISBN")}>ISBN{sortLabel("ISBN")}</th>
                  <th onClick={() => handleSort("CategoryID")}>
                    Category{sortLabel("CategoryID")}
                  </th>
                  <th onClick={() => handleSort("PublicationDate")}>
                    Publication{sortLabel("PublicationDate")}
                  </th>
                  <th onClick={() => handleSort("AvailableCopies")}>
                    Copies{sortLabel("AvailableCopies")}
                  </th>
                  <th onClick={() => handleSort("IsBorrowable")}>
                    Status{sortLabel("IsBorrowable")}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {displayedBooks.length > 0 ? (
                  displayedBooks.map((book) => (
                    <tr key={book.BookID}>
                      <td className="book-id">#{book.BookID}</td>
                      <td className="book-title">{book.Title}</td>
                      <td>{book.ISBN}</td>
                      <td>{book.CategoryID || "Not assigned"}</td>
                      <td>{formatDateForDisplay(book.PublicationDate)}</td>
                      <td>{book.AvailableCopies}</td>
                      <td>
                        <span
                          className={
                            book.IsBorrowable
                              ? "book-status available"
                              : "book-status locked"
                          }
                        >
                          {book.IsBorrowable ? "Borrowable" : "Locked"}
                        </span>
                      </td>
                      <td className="book-row-actions">
                        <button type="button" onClick={() => handleEdit(book)}>
                          Edit
                        </button>
                        <button type="button" onClick={() => handleDelete(book)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="book-empty" colSpan="8">
                      No books match the current search or filter.
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

/* Converts table values into comparable values for sorting. */
function getSortValue(book, key) {
  if (key === "Title" || key === "ISBN") {
    return String(book[key] || "").toLowerCase();
  }

  if (key === "PublicationDate") {
    return book.PublicationDate ? new Date(book.PublicationDate).getTime() : 0;
  }

  if (key === "IsBorrowable") {
    return Boolean(book.IsBorrowable) ? 1 : 0;
  }

  return Number(book[key] || 0);
}

export default BookManagement;
