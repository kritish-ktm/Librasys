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

/*
  SYSTEM SETUP: Default Book Form Values

  This object stores the default empty values for the book form.
  It is used when adding a new book, resetting the form, or cancelling an edit.
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

  This decides how many book records appear on one page.
  It helps keep the table cleaner instead of showing all books at once.
*/
const booksPerPage = 8;

function BookManagement() {
  const navigate = useNavigate();

  /*
    SYSTEM FUNCTION: Main Book State

    books stores all book records loaded from the backend/database.
    form stores the current input values in the add/edit form.
    editingId stores the BookID of the book currently being edited.

    If editingId is null, the form is being used for Add Book.
    If editingId has a value, the form is being used for Edit Book.
  */
  const [books, setBooks] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  /*
    SYSTEM FUNCTION: Loading and UI State

    isFormOpen controls whether the add/edit form is visible.
    loadingScreen controls the first loading overlay when the page opens.
    dataLoading controls the loading overlay while book data is being fetched.
  */
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loadingScreen, setLoadingScreen] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  /*
    SYSTEM FUNCTION: Search Books, Filter Books, Sort Books, Pagination

    search stores the text typed into the search box.
    categoryFilter stores the selected category filter.
    statusFilter stores whether the user wants all, borrowable, or reference books.
    sortKey stores which column is being sorted.
    sortDirection stores ascending or descending order.
    currentPage stores which table page the user is currently viewing.
  */
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("BookID");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);

  /*
    SYSTEM FUNCTION: Success and Error Messages

    message displays successful actions, such as add, update, delete, or export.
    error displays validation errors or backend/database problems.
  */
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  /*
    SYSTEM FUNCTION: Role-Based Access

    The logged-in user role is read from localStorage.
    Librarian/admin users can add, edit, and delete books.
    Other users can view/search/filter the catalogue but should not manage records.
  */
  const userRole = localStorage.getItem("role") || "";
  const isLibrarian =
    userRole.toLowerCase() === "librarian" ||
    userRole.toLowerCase() === "admin";

  /*
    SYSTEM FUNCTION: Loading Screen

    This creates a short loading overlay when the page first opens.
    It matches the shared admin loading style used in the project.
  */
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingScreen(false);
    }, 750);

    return () => clearTimeout(timer);
  }, []);

  /*
    SYSTEM FUNCTION: View Books on Page Load

    This runs once when Book Management opens.
    It calls loadBooks(), which gets book records from the backend.
  */
  useEffect(() => {
    loadBooks();
  }, []);

  /*
    SYSTEM FUNCTION: View Books

    This function loads all book records from the backend.

    This is what makes the book table display database records.
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

    This clears the form and closes it.
    It is used after Add Book, Edit Book, or when the user cancels the form.
  */
  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setIsFormOpen(false);
  };

  /*
    SYSTEM FUNCTION: Form Input Handling

    This updates the form state whenever the user types into an input
    or changes the IsBorrowable checkbox.

    The input name, such as Title or ISBN, matches the property inside form.
    This lets one function handle all form fields.
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

    This checks the book form before sending data to the backend.

    It prevents common bad inputs:
    missing title
    missing ISBN
    ISBN with invalid length
    missing category
    negative available copies

    This is frontend validation. Backend validation is still important,
    because frontend validation can be bypassed.
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

    This function runs when the book form is submitted.

    It handles two system functions:
    Add Book
    Edit Book

    If editingId is null:
    the user is adding a new book, so addBook() is called.

    If editingId has a BookID:
    the user is editing an existing book, so updateBook() is called.

    After success, the form resets and loadBooks() refreshes the table.
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

      Form input values normally come as strings.
      CategoryID and AvailableCopies are converted into numbers before
      being sent to the backend.
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

    This opens the form in Add Book mode.

    It clears old messages/errors, removes any editing ID,
    resets the form to empty values, and opens the form panel.
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

    This opens the form in Edit Book mode.

    When the user clicks the edit icon:
    the selected book's data is copied into the form
    editingId is set to the selected BookID
    the same form is opened, but now it updates instead of adding

    The actual update happens later in handleSubmit().
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

    This deletes a selected book record.

    First it shows a confirmation popup to avoid accidental deletion.
    If confirmed, deleteBook(bookId) sends the BookID to the backend.
    The backend deletes the matching book record from the book table.
    After deletion, loadBooks() refreshes the table.
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

    This sorts the table when the user clicks a column heading.

    If the same column is clicked again, the sort direction switches
    between ascending and descending.
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
    SYSTEM FUNCTION: Clear Search and Filters

    This clears the search box, category filter, and status filter.
    It also returns the user to page 1.
  */
  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setCurrentPage(1);
  };

  /*
    SYSTEM FUNCTION: Category Filter Options

    This builds the category dropdown from the loaded book records.
    Duplicate CategoryID values are removed so each category appears once.
  */
  const categoryOptions = useMemo(() => {
    const categories = books
      .map((book) => book.CategoryID)
      .filter((category) => category !== null && category !== undefined);

    return [...new Set(categories)].sort((a, b) => Number(a) - Number(b));
  }, [books]);

  /*
    SYSTEM FUNCTION: Search Books, Filter Books, and Sort Books

    This creates the final list of books shown in the table.

    Search Books:
    checks BookID, Title, ISBN, CategoryID, PublicationDate,
    AvailableCopies, and status text.

    Filter Books:
    filters by CategoryID and borrowable/reference status.

    Sort Books:
    sorts the filtered result using the selected column and direction.

    This is frontend-only. It does not change the database.
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

    When the user changes search or filter values, the table returns to page 1.
    This avoids staying on a later page that may no longer have results.
  */
  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, statusFilter]);

  /*
    SYSTEM FUNCTION: Pagination

    These calculations decide which records appear on the current page.

    totalPages calculates the number of pages.
    safePage prevents invalid page numbers.
    firstRecord and lastRecord show the visible range.
    paginatedBooks contains only the books for the current page.
  */
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

  /*
    SYSTEM FUNCTION: Dashboard Statistics

    These values are calculated from the loaded book records.
    They are shown in the stat cards above the table.
  */
  const totalBooks = books.length;
  const totalCopies = books.reduce((sum, book) => {
    return sum + Number(book.AvailableCopies || 0);
  }, 0);
  const borrowableBooks = books.filter((book) => Boolean(book.IsBorrowable)).length;
  const referenceBooks = books.filter((book) => !Boolean(book.IsBorrowable)).length;

  /*
    SYSTEM FUNCTION: Export CSV

    This exports the currently filtered book list as a CSV file.

    If the user searches or filters first, only those matching records
    are included in the export.

    This is a frontend feature. It creates a downloadable file in the browser
    and does not change the database.
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

/*
  SYSTEM FUNCTION: Dashboard Stat Card

  This reusable component displays one statistic card.
  It is used for total books, total copies, borrowable books, and reference books.
*/
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

/*
  SYSTEM FUNCTION: Status Filter Count

  This counts how many books belong to each status tab.
  It is used for the All, Borrowable, and Reference filter buttons.
*/
function countForStatus(status, books) {
  if (status === "all") return books.length;
  if (status === "borrowable") {
    return books.filter((book) => Boolean(book.IsBorrowable)).length;
  }
  return books.filter((book) => !Boolean(book.IsBorrowable)).length;
}

/*
  SYSTEM FUNCTION: Status Label Formatting

  This converts internal status values into readable labels.
  Example: "reference" becomes "Reference".
*/
function formatStatusLabel(status) {
  if (status === "all") return "All";
  if (status === "reference") return "Reference";
  return "Borrowable";
}

export default BookManagement;