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
        const activeCategories = Array.isArray(categoryData)
          ? categoryData
          : [];

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

  const selectedCategory =
    categories.find((category) => category.CategoryID === selectedCategoryId) ||
    visibleCategories[0] ||
    null;

  const selectedBooks = useMemo(() => {
    if (!selectedCategory) return [];

    return books.filter(
      (book) => Number(book.CategoryID) === Number(selectedCategory.CategoryID)
    );
  }, [books, selectedCategory]);

  const goBack = () => {
    if (role === "Librarian") {
      navigate("/dashboard");
    } else if (role === "Member") {
      navigate("/profile");
    } else {
      navigate("/");
    }
  };

  return (
    <main className="customer-category-page">
      <section className="customer-category-hero">
        <div className="customer-category-actions">
          <button type="button" onClick={goBack}>
            <i className="bi bi-arrow-left"></i>
            Back
          </button>

          {role === "Librarian" && (
            <button type="button" onClick={() => navigate("/categories")}>
              <i className="bi bi-sliders"></i>
              Manage Categories
            </button>
          )}
        </div>

        <p className="customer-kicker">LibraSys Catalogue</p>

        <h1>Browse Book Categories</h1>

        <p>
          Search active library categories by subject, Dewey code, or description,
          then open a collection to see books filed under it.
        </p>
      </section>

      <section className="customer-category-toolbar" aria-label="Category search">
        <label>
          <span>Search Catalogue</span>

          <i className="bi bi-search"></i>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search category, Dewey code, or description"
          />
        </label>
      </section>

      {error && (
        <div className="customer-category-message error">
          {error}
        </div>
      )}

      {loading ? (
        <section className="customer-category-message">
          Loading collections...
        </section>
      ) : (
        <section className="customer-category-layout">
          <aside
            className="customer-category-list"
            aria-label="Active book categories"
          >
            <div className="customer-section-title">
              <p>Active Collections</p>

              <h2>
                <i className="bi bi-collection"></i>
                {visibleCategories.length} Categories
              </h2>
            </div>

            {visibleCategories.length === 0 ? (
              <div className="customer-empty">
                No active categories match your search.
              </div>
            ) : (
              visibleCategories.map((category) => (
                <button
                  type="button"
                  key={category.CategoryID}
                  className={
                    Number(selectedCategory?.CategoryID) ===
                    Number(category.CategoryID)
                      ? "customer-category-item active"
                      : "customer-category-item"
                  }
                  onClick={() => setSelectedCategoryId(category.CategoryID)}
                >
                  <span className="customer-dewey">
                    {category.DeweyCode}
                  </span>

                  <span>
                    <strong>{category.CategoryName}</strong>
                    <small>{getDeweyGroup(category.DeweyCode)}</small>
                  </span>

                  <em>
                    <i className="bi bi-journal-bookmark"></i>
                    {category.BookCount || 0}
                  </em>
                </button>
              ))
            )}
          </aside>

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
                        "Explore books in this collection."}
                    </p>
                  </div>

                  <code>
                    <i className="bi bi-bookmark"></i>
                    {selectedCategory.DeweyCode}
                  </code>
                </div>

                <div className="customer-book-panel">
                  <div className="customer-section-title">
                    <p>Books In This Category</p>

                    <h3>
                      <i className="bi bi-book"></i>
                      {selectedBooks.length} Book
                      {selectedBooks.length === 1 ? "" : "s"}
                    </h3>
                  </div>

                  {selectedBooks.length === 0 ? (
                    <div className="customer-empty">
                      No books are currently assigned to this category.
                    </div>
                  ) : (
                    <div className="customer-book-list">
                      {selectedBooks.map((book) => (
                        <article
                          key={book.BookID}
                          className="customer-book-row"
                        >
                          <div>
                            <h4>{book.Title}</h4>

                            <p>
                              <i className="bi bi-upc-scan"></i>
                              ISBN {book.ISBN}
                            </p>
                          </div>

                          <span>
                            <i className="bi bi-layers"></i>
                            {Number(book.AvailableCopies || 0)} copies
                          </span>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="customer-empty">
                Select a category to view its books.
              </div>
            )}
          </section>
        </section>
      )}
    </main>
  );
}

export default CustomerBookCategories;