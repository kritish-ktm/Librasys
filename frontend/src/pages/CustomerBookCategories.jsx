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
    else if (role === "Member") navigate("/MemberDashboard");
    else navigate("/");
  };

 return (
  <div className="customer-catalog-page">
    <main className="customer-catalog-main">

      {/* HERO */}
      <div className="book-hero">
        <div>
          <p className="book-kicker">LIBRASYS CATALOGUE</p>
          <h1>Browse Book Categories</h1>
          <p className="book-hero-text">
            Explore books by Dewey classification and subject areas
          </p>
        </div>

        <div className="customer-category-actions">
          <button onClick={goBack} className="book-ghost-button">
            ← Back
          </button>

          {role === "Librarian" && (
            <button
              onClick={() => navigate("/categories")}
              className="book-primary-button"
            >
              Manage Categories
            </button>
          )}
        </div>
      </div>

      {/* STATS */}
      <section className="category-stats">
        <article className="category-stat-card">
          <span>
            <small>Total Categories</small>
            <strong>{categories.length}</strong>
            <em>Available collections</em>
          </span>
        </article>

        <article className="category-stat-card">
          <span>
            <small>Total Books</small>
            <strong>{books.length}</strong>
            <em>Books in catalogue</em>
          </span>
        </article>

        <article className="category-stat-card">
          <span>
            <small>Visible Categories</small>
            <strong>{visibleCategories.length}</strong>
            <em>Filtered results</em>
          </span>
        </article>
      </section>

      {/* SEARCH */}
      <div className="book-table-panel">
        <div className="book-table-header">
          <div>
            <h2>Library Categories</h2>
            <p>Browse and explore available categories</p>
          </div>

          <div className="book-table-tools">
            <input
              type="text"
              className="book-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories..."
            />
          </div>
        </div>

        {/* MAIN LAYOUT */}
        <div className="customer-category-layout">

          {/* LEFT */}
          <aside className="customer-category-list">
            {visibleCategories.map((category) => (
              <button
                key={category.CategoryID}
                className={`customer-category-item ${
                  selectedCategoryId === category.CategoryID ? "active" : ""
                }`}
                style={getCategoryStyle(category)}
                onClick={() => setSelectedCategoryId(category.CategoryID)}
              >
                <div>
                  <span className="customer-category-title">
                    <strong>{category.CategoryName}</strong>
                  </span>
                  <small>{getDeweyGroup(category.DeweyCode)}</small>
                </div>

                <span className="book-count-badge">
                  {category.BookCount || 0}
                </span>
              </button>
            ))}
          </aside>

          {/* RIGHT */}
          <section className="customer-category-detail" style={selectedCategory ? getCategoryStyle(selectedCategory) : undefined}>
            {selectedCategory ? (
              <>
                <div className="customer-detail-header">
                  <div>
                    <p className="book-kicker">
                      {getDeweyGroup(selectedCategory.DeweyCode)}
                    </p>

                    <h2>
                      {selectedCategory.CategoryName}
                    </h2>

                    <p>
                      {selectedCategory.Description ||
                        "No description available"}
                    </p>
                  </div>

                  <code className="dewey-code">
                    {selectedCategory.DeweyCode}
                  </code>
                </div>

                <div className="book-table-wrap">
                  <table className="book-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>ISBN</th>
                        <th>Copies</th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedBooks.length > 0 ? (
                        selectedBooks.map((book) => (
                          <tr
                            key={book.BookID}
                            onClick={() => navigate(`/book/${book.BookID}`)}
                            style={{ cursor: "pointer" }}
                          >
                            <td>{book.Title}</td>
                            <td>{book.ISBN}</td>
                            <td>{book.AvailableCopies || 0}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="3" className="book-empty">
                            No books available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="book-empty">
                Select a category
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  </div>
);
}

function getCategoryStyle(category) {
  const color = /^#[0-9a-fA-F]{6}$/.test(category?.CategoryColor || "")
    ? category.CategoryColor
    : "#d97706";

  return {
    "--category-color": color,
    "--category-soft": hexToRgba(color, 0.12),
    "--category-border": hexToRgba(color, 0.36),
  };
}

function hexToRgba(hex, alpha) {
  const value = hex.replace("#", "");
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export default CustomerBookCategories;
