import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getActiveCategories } from "../services/bookCategoryService";
import { getBooks } from "../services/bookService";
import "./CustomerBookCategories.css";

const DEWEY_GROUPS = {
  "0": "General Works",
  "1": "Philosophy",
  "2": "Religion",
  "3": "Social Sciences",
  "4": "Language",
  "5": "Natural Science",
  "6": "Technology",
  "7": "Arts",
  "8": "Literature",
  "9": "History",
};

function getDeweyGroup(code) {
  return DEWEY_GROUPS[String(code || "0")[0]] || DEWEY_GROUPS["0"];
}

function CustomerBookCategories() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");

  const [categories, setCategories] = useState([]);
  const [books, setBooks] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getActiveCategories(), getBooks()])
      .then(([categoryData, bookData]) => {
        const activeCategories = Array.isArray(categoryData) ? categoryData : [];
        setCategories(activeCategories);
        setBooks(Array.isArray(bookData) ? bookData : bookData?.data || []);
        setSelectedCategoryId(activeCategories[0]?.CategoryID ?? null);
      })
      .catch(() => {
        setError("Unable to load the library catalogue right now.");
      })
      .finally(() => setLoading(false));
  }, []);

  const visibleCategories = useMemo(() => {
    const query = search.trim().toLowerCase();
    return categories.filter((category) =>
      `${category.CategoryName} ${category.DeweyCode} ${category.Description || ""}`
        .toLowerCase()
        .includes(query)
    );
  }, [categories, search]);

  const selectedCategory = categories.find(
    (category) => category.CategoryID === selectedCategoryId
  ) || visibleCategories[0] || null;

  const selectedBooks = useMemo(() => {
    if (!selectedCategory) return [];
    return books.filter(
      (book) => Number(book.CategoryID) === Number(selectedCategory.CategoryID)
    );
  }, [books, selectedCategory]);

  const goBack = () => {
    if (role === "Librarian") navigate("/dashboard");
    else if (role === "Member") navigate("/profile");
    else navigate("/");
  };

  return (
    <div className="customer-category-page">
      {/* Hero Header */}
      <div className="customer-category-hero">
        <div className="customer-category-actions">
          <button onClick={goBack}>
            <i className="bi bi-arrow-left"></i> Back
          </button>

          {role === "Librarian" && (
            <button onClick={() => navigate("/categories")}>
              <i className="bi bi-gear"></i> Manage Categories
            </button>
          )}
        </div>

        <p className="customer-kicker">LIBRASYS CATALOGUE</p>
        <h1>Browse by Category</h1>
        <p>Discover books by subject and Dewey classification</p>
      </div>

      {/* Search Bar */}
      <div className="customer-category-toolbar">
        <div className="search-container">
          <i className="bi bi-search"></i>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories, Dewey code, or description..."
          />
        </div>
      </div>

      {error && <div className="customer-alert error">{error}</div>}

      {loading ? (
        <div className="customer-alert">Loading collections...</div>
      ) : (
        <div className="customer-category-layout">
          {/* Left Sidebar - Categories */}
          <aside className="customer-category-list">
            <div className="customer-section-title">
              <h2>Active Categories ({visibleCategories.length})</h2>
            </div>

            {visibleCategories.length === 0 ? (
              <div className="customer-empty">No categories found.</div>
            ) : (
              visibleCategories.map((category) => (
                <button
                  key={category.CategoryID}
                  className={`customer-category-item ${
                    selectedCategoryId === category.CategoryID ? "active" : ""
                  }`}
                  onClick={() => setSelectedCategoryId(category.CategoryID)}
                >
                  <span className="customer-dewey">{category.DeweyCode}</span>
                  <div>
                    <strong>{category.CategoryName}</strong>
                    <small>{getDeweyGroup(category.DeweyCode)}</small>
                  </div>
                  <span className="customer-book-count">
                    <i className="bi bi-journal-text"></i>
                    {category.BookCount || 0}
                  </span>
                </button>
              ))
            )}
          </aside>

          {/* Right Side - Category Details + Books */}
          <section className="customer-category-detail">
            {selectedCategory ? (
              <>
                <div className="customer-detail-header">
                  <div>
                    <p className="customer-kicker">
                      {getDeweyGroup(selectedCategory.DeweyCode)}
                    </p>
                    <h2>{selectedCategory.CategoryName}</h2>
                    <p>
                      {selectedCategory.Description ||
                        "No description available for this category."}
                    </p>
                  </div>
                  <code className="dewey-code">
                    <i className="bi bi-bookmark-fill"></i> {selectedCategory.DeweyCode}
                  </code>
                </div>

                <div className="customer-book-panel">
                  <div className="customer-section-title">
                    <h3>
                      <i className="bi bi-book"></i> Books in this Category ({selectedBooks.length})
                    </h3>
                  </div>

                  {selectedBooks.length === 0 ? (
                    <div className="customer-empty">
                      No books available in this category yet.
                    </div>
                  ) : (
                    <div className="customer-book-list">
                      {selectedBooks.map((book) => (
                        <article
                          key={book.BookID}
                          className="customer-book-row"
                          onClick={() => navigate(`/book/${book.BookID}`)}
                        >
                          <div>
                            <h4>{book.Title}</h4>
                            <p>
                              <i className="bi bi-upc-scan"></i> ISBN {book.ISBN}
                            </p>
                          </div>
                          <span>
                            <i className="bi bi-layers"></i>
                            {book.AvailableCopies || 0} copies
                          </span>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="customer-empty">Select a category to view books.</div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default CustomerBookCategories;