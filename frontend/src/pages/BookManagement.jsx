import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getBooks,
  addBook,
  updateBook,
  deleteBook,
} from "../services/bookService";

function BookManagement() {
  const navigate = useNavigate();

  const emptyForm = {
    CategoryID: "",
    Title: "",
    ISBN: "",
    PublicationDate: "",
    AvailableCopies: 1,
    IsBorrowable: true,
  };

  const [books, setBooks] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchBooks = async () => {
    try {
      const data = await getBooks();
      setBooks(data);
      setError("");
    } catch {
      setError("Failed to load books. Make sure the backend is running.");
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const formatDateForInput = (dateValue) => {
    if (!dateValue) return "";
    return String(dateValue).split("T")[0];
  };

  const formatDateForDisplay = (dateValue) => {
    if (!dateValue) return "Not set";
    return String(dateValue).split("T")[0];
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const validateForm = () => {
    if (!form.Title.trim()) return "Book title is required.";
    if (!form.ISBN.trim()) return "ISBN is required.";
    if (form.ISBN.trim().length > 13) return "ISBN cannot be longer than 13 characters.";
    if (Number(form.AvailableCopies) < 0) return "Available copies cannot be below 0.";
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

    const bookData = {
      CategoryID: form.CategoryID === "" ? null : Number(form.CategoryID),
      Title: form.Title.trim(),
      ISBN: form.ISBN.trim(),
      PublicationDate: form.PublicationDate || null,
      AvailableCopies: Number(form.AvailableCopies),
      IsBorrowable: form.IsBorrowable,
    };

    try {
      if (editingId) {
        await updateBook(editingId, bookData);
        setMessage("Book updated successfully.");
      } else {
        await addBook(bookData);
        setMessage("Book added successfully.");
      }

      resetForm();
      fetchBooks();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save book.");
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
  };

  const handleDelete = async (book) => {
    const confirmed = window.confirm(`Delete "${book.Title}"?`);
    if (!confirmed) return;

    try {
      await deleteBook(book.BookID);
      setMessage("Book deleted successfully.");
      setError("");
      fetchBooks();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete book.");
      setMessage("");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1>Book Management</h1>
          <p>Manage book records, ISBN, stock, publication date, and borrowable status.</p>
        </div>

        <button style={styles.backButton} onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </button>
      </div>

      <div style={styles.card}>
        <h2>{editingId ? "Edit Book" : "Add Book"}</h2>

        {message && <p style={styles.success}>{message}</p>}
        {error && <p style={styles.error}>{error}</p>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            name="Title"
            placeholder="Book title"
            value={form.Title}
            onChange={handleChange}
            style={styles.input}
          />

          <input
            name="ISBN"
            placeholder="ISBN"
            value={form.ISBN}
            onChange={handleChange}
            maxLength="13"
            style={styles.input}
          />

          <input
            name="CategoryID"
            type="number"
            placeholder="Category ID"
            value={form.CategoryID}
            onChange={handleChange}
            style={styles.input}
          />

          <input
            name="PublicationDate"
            type="date"
            value={form.PublicationDate}
            onChange={handleChange}
            style={styles.input}
          />

          <input
            name="AvailableCopies"
            type="number"
            placeholder="Available copies"
            value={form.AvailableCopies}
            onChange={handleChange}
            min="0"
            style={styles.input}
          />

          <label style={styles.checkboxRow}>
            <input
              type="checkbox"
              name="IsBorrowable"
              checked={form.IsBorrowable}
              onChange={handleChange}
            />
            Borrowable
          </label>

          <div style={styles.buttonRow}>
            <button type="submit" style={styles.primaryButton}>
              {editingId ? "Update Book" : "Add Book"}
            </button>

            {editingId && (
              <button type="button" onClick={resetForm} style={styles.cancelButton}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div style={styles.card}>
        <h2>Book List</h2>

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>ID</th>
              <th style={styles.th}>Title</th>
              <th style={styles.th}>ISBN</th>
              <th style={styles.th}>Category ID</th>
              <th style={styles.th}>Publication Date</th>
              <th style={styles.th}>Copies</th>
              <th style={styles.th}>Borrowable</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {books.length > 0 ? (
              books.map((book) => (
                <tr key={book.BookID}>
                  <td style={styles.td}>{book.BookID}</td>
                  <td style={styles.td}>{book.Title}</td>
                  <td style={styles.td}>{book.ISBN}</td>
                  <td style={styles.td}>{book.CategoryID || "Not assigned"}</td>
                  <td style={styles.td}>{formatDateForDisplay(book.PublicationDate)}</td>
                  <td style={styles.td}>{book.AvailableCopies}</td>
                  <td style={styles.td}>{book.IsBorrowable ? "Yes" : "No"}</td>
                  <td style={styles.td}>
                    <button style={styles.editButton} onClick={() => handleEdit(book)}>
                      Edit
                    </button>
                    <button style={styles.deleteButton} onClick={() => handleDelete(book)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td style={styles.emptyCell} colSpan="8">
                  No books found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  page: {
    padding: "2rem",
    background: "#f5f7fb",
    minHeight: "100vh",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
  },
  backButton: {
    padding: "10px 16px",
    background: "#4a90e2",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  card: {
    background: "white",
    padding: "1.5rem",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
    marginBottom: "1.5rem",
  },
  form: {
    display: "grid",
    gap: "12px",
    maxWidth: "500px",
  },
  input: {
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "5px",
  },
  checkboxRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  buttonRow: {
    display: "flex",
    gap: "10px",
  },
  primaryButton: {
    padding: "10px 16px",
    background: "#16a34a",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  cancelButton: {
    padding: "10px 16px",
    background: "#6b7280",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  success: {
    background: "#dcfce7",
    color: "#166534",
    padding: "10px",
    borderRadius: "5px",
  },
  error: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "10px",
    borderRadius: "5px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    background: "#4a90e2",
    color: "white",
    padding: "10px",
    textAlign: "left",
  },
  td: {
    padding: "10px",
    borderBottom: "1px solid #ddd",
  },
  editButton: {
    padding: "7px 12px",
    background: "#f59e0b",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    marginRight: "8px",
  },
  deleteButton: {
    padding: "7px 12px",
    background: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  emptyCell: {
    padding: "16px",
    textAlign: "center",
    color: "#6b7280",
  },
};

export default BookManagement;