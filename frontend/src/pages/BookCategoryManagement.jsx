import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getBooks,
  addBook,
  updateBook,
  deleteBook,
} from "../services/bookService";
import "./BookManagement.css";

const emptyBookForm = {
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
  const [form, setForm] = useState(emptyBookForm);
  const [editingId, setEditingId] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch books from backend and store them in React state.
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

  // Simple dashboard numbers for the Book component.
  const bookStats = useMemo(() => {
    const totalCopies = books.reduce(
      (total, book) => total + Number(book.AvailableCopies || 0),
      0
    );

    const borrowableBooks = books.filter((book) =>
      Boolean(book.IsBorrowable)
    ).length;

    return {
      totalBooks: books.length,
      totalCopies,
      borrowableBooks,
      lockedBooks: books.length - borrowableBooks,
    };
  }, [books]);

  // Search and filter happen on the frontend after books are listed.
  const visibleBooks = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    return books.filter((book) => {
      const bookText = `${book.BookID} ${book.Title} ${book.ISBN} ${book.CategoryID}`
        .toLowerCase();

      const matchesSearch = bookText.includes(searchText);

      const matchesFilter =
        statusFilter === "all" ||
        (statusFilter === "borrowable" && Boolean(book.IsBorrowable)) ||
        (statusFilter === "locked" && !Boolean(book.IsBorrowable));

      return matchesSearch && matchesFilter;
    });
  }, [books, search, statusFilter]);

  const isEditing = editingId !== null;

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

    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const resetForm = () => {
    setForm(emptyBookForm);
    setEditingId(null);
    setMessage("");
    setError("");
  };

  // Frontend validation gives quick feedback before calling the backend.
  const validateForm = () => {
    if (!form.Title.trim()) return "Book title is required.";
    if (!form.ISBN.trim()) return "ISBN is required.";

    if (form.ISBN.trim().length > 13) {
      return "ISBN cannot be longer than 13 characters.";
    }

    if (Number(form.AvailableCopies) < 0) {
      return "Available copies cannot be below 0.";
    }

    if (form.CategoryID !== "" && Number(form.CategoryID) < 0) {
      return "Category ID cannot be below 0.";
    }

    return "";
  };

  // Add and update use the same form, depending on whether editingId is set.
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
      if (isEditing) {
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

  // Loads a selected row into the form so it can be edited.
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

  // Confirms before deleting so users do not remove a book by accident.
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

  return (
    <main className="book-page">
      <section className="book-header">
        <div>
          <p className="book-label">LibraSys Book Module</p>
          <h1>Book Management</h1>
          <p>
            Add, update, delete, search, and filter book records from one
            organized page.
          </p>
        </div>

        <button
          type="button"
          className="book-button secondary"
          onClick={() => navigate("/dashboard")}
        >
          Back to Dashboard
        </button>
      </section>

      <section className="book-stats">
        <article>
          <span>Total Books</span>
          <strong>{bookStats.totalBooks}</strong>
        </article>

        <article>
          <span>Total Copies</span>
          <strong>{bookStats.totalCopies}</strong>
        </article>

        <article>
          <span>Borrowable</span>
          <strong>{bookStats.borrowableBooks}</strong>
        </article>

        <article>
          <span>Locked</span>
          <strong>{bookStats.lockedBooks}</strong>
        </article>
      </section>

      <section className="book-content">
        <aside className="book-card book-form-card">
          <div className="book-section-heading">
            <p>{isEditing ? "Edit Record" : "New Record"}</p>
            <h2>{isEditing ? "Update Book" : "Add Book"}</h2>
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
                placeholder="Optional"
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

            <label className="book-checkbox">
              <input
                type="checkbox"
                name="IsBorrowable"
                checked={form.IsBorrowable}
                onChange={handleChange}
              />
              <span>Book is borrowable</span>
            </label>

            <div className="book-form-actions">
              <button
                type="submit"
                className="book-button primary"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : isEditing ? "Save Changes" : "Add Book"}
              </button>

              {isEditing && (
                <button
                  type="button"
                  className="book-button light"
                  onClick={resetForm}
                  disabled={isSaving}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </aside>

        <section className="book-card book-table-card">
          <div className="book-table-top">
            <div className="book-section-heading">
              <p>Book Records</p>
              <h2>Book List</h2>
            </div>

            <div className="book-tools">
              <input
                className="book-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by title, ISBN, ID, or category..."
              />

              <div className="book-filter">
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

          <div className="book-table-info">
            <span>
              Showing {visibleBooks.length} of {books.length} books
            </span>
            {isLoading && <span>Loading records...</span>}
          </div>

          <div className="book-table-wrapper">
            <table className="book-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>ISBN</th>
                  <th>Category</th>
                  <th>Publication</th>
                  <th>Copies</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {visibleBooks.length > 0 ? (
                  visibleBooks.map((book) => (
                    <tr key={book.BookID}>
                      <td>#{book.BookID}</td>
                      <td className="book-title-cell">{book.Title}</td>
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
                      <td className="book-row-buttons">
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

export default BookManagement;
