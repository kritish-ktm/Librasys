import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCategories,
  getCategoryById,
  addCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
} from "../services/bookCategoryService";
import heroImage from "../assets/hero.png";
import "./BookCategoryManagement.css";

const emptyForm = {
  CategoryName: "",
  Description: "",
  DeweyCode: "",
  IsActive: true,
};

function BookCategoryManagement() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("CategoryName");
  const [sortDirection, setSortDirection] = useState("asc");
  const [findId, setFindId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchCategories = async () => {
    setIsLoading(true);

    try {
      const data = await getCategories({
        search,
        status: statusFilter,
        sortBy: sortKey,
        sortDirection,
      });
      setCategories(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load categories. Make sure you are logged in as a librarian.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [search, statusFilter, sortKey, sortDirection]);

  const stats = useMemo(() => {
    const activeCount = categories.filter((category) => Boolean(category.IsActive)).length;
    const assignedBooks = categories.reduce(
      (sum, category) => sum + Number(category.BookCount || 0),
      0
    );

    return {
      total: categories.length,
      activeCount,
      inactiveCount: categories.length - activeCount,
      assignedBooks,
    };
  }, [categories]);

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

  const validateForm = () => {
    if (!form.CategoryName.trim()) return "Category name is required.";
    if (form.CategoryName.trim().length > 100) {
      return "Category name cannot be longer than 100 characters.";
    }

    if (!form.DeweyCode.trim()) return "Dewey Code is required.";
    if (form.DeweyCode.trim().length > 10) {
      return "Dewey Code cannot be longer than 10 characters.";
    }

    if (form.Description.trim().length > 200) {
      return "Description cannot be longer than 200 characters.";
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

    const categoryData = {
      CategoryName: form.CategoryName.trim(),
      Description: form.Description.trim() || null,
      DeweyCode: form.DeweyCode.trim(),
      IsActive: form.IsActive,
    };

    setIsSaving(true);

    try {
      if (editingId) {
        await updateCategory(editingId, categoryData);
        setMessage("Category updated successfully.");
      } else {
        await addCategory(categoryData);
        setMessage("Category added successfully.");
      }

      setForm(emptyForm);
      setEditingId(null);
      await fetchCategories();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save category.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (category) => {
    setEditingId(category.CategoryID);
    setForm({
      CategoryName: category.CategoryName ?? "",
      Description: category.Description ?? "",
      DeweyCode: category.DeweyCode ?? "",
      IsActive: Boolean(category.IsActive),
    });
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFindById = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!findId || Number(findId) <= 0) {
      setError("Enter a valid Category ID to find.");
      return;
    }

    setIsLoading(true);

    try {
      const category = await getCategoryById(findId);
      setCategories([category]);
      setStatusFilter("all");
      setSearch("");
      setMessage(`Found category #${category.CategoryID}: ${category.CategoryName}.`);
    } catch (err) {
      setError(err.response?.data?.error || "Category not found.");
      setMessage("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (category) => {
    const bookCount = Number(category.BookCount || 0);

    if (bookCount > 0) {
      setError(
        `"${category.CategoryName}" has ${bookCount} assigned book(s). Deactivate it instead, or move those books first.`
      );
      setMessage("");
      return;
    }

    const confirmed = window.confirm(`Delete category "${category.CategoryName}"?`);
    if (!confirmed) return;

    try {
      await deleteCategory(category.CategoryID);
      setMessage("Category deleted successfully.");
      setError("");
      await fetchCategories();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete category.");
      setMessage("");
    }
  };

  const handleToggleStatus = async (category) => {
    const nextStatus = !Boolean(category.IsActive);

    try {
      await toggleCategoryStatus(category.CategoryID, nextStatus);
      setMessage(`Category ${nextStatus ? "reactivated" : "deactivated"} successfully.`);
      setError("");
      await fetchCategories();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update category status.");
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

  const formatDate = (dateValue) => {
    if (!dateValue) return "Not set";
    return new Date(dateValue).toLocaleDateString();
  };

  return (
    <main className="book-page">
      <section className="book-hero">
        <div>
          <p className="book-kicker">LibraSys Classification Console</p>
          <h1>Book Category Management</h1>
          <p className="book-hero-text">
            Maintain Dewey codes, category descriptions, catalogue visibility, and safe deletion
            rules for librarian workflows and customer browsing.
          </p>
        </div>

        <div className="category-hero-art" aria-hidden="true">
          <img src={heroImage} alt="" />
          <div className="category-book-stack">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>

        <button
          type="button"
          className="book-glass-button"
          onClick={() => navigate("/dashboard")}
        >
          Back to Dashboard
        </button>
      </section>

      <section className="book-stats">
        <article>
          <span><i className="bi bi-collection"></i>Total Categories</span>
          <strong>{stats.total}</strong>
          <p>Matching current filters</p>
        </article>

        <article>
          <span><i className="bi bi-eye"></i>Visible To Customers</span>
          <strong>{stats.activeCount}</strong>
          <p>{stats.inactiveCount} inactive categories hidden</p>
        </article>

        <article>
          <span><i className="bi bi-journal-bookmark"></i>Assigned Books</span>
          <strong>{stats.assignedBooks}</strong>
          <p>Used for delete protection</p>
        </article>
      </section>

      <section className="book-layout">
        <aside className="book-panel book-form-panel">
          <div className="book-section-title">
            <p>{editingId ? "Update Category" : "Create Category"}</p>
            <h2>{editingId ? "Edit Category" : "Add New Category"}</h2>
          </div>

          {message && <div className="book-alert success">{message}</div>}
          {error && <div className="book-alert error">{error}</div>}

          <form className="book-form" onSubmit={handleSubmit}>
            <div className="book-field full">
              <label htmlFor="CategoryName">Category Name</label>
              <input
                id="CategoryName"
                name="CategoryName"
                value={form.CategoryName}
                onChange={handleChange}
                placeholder="Example: Computer Science"
                maxLength="100"
              />
            </div>

            <div className="book-field full">
              <label htmlFor="DeweyCode">Dewey Code</label>
              <input
                id="DeweyCode"
                name="DeweyCode"
                value={form.DeweyCode}
                onChange={handleChange}
                placeholder="Example: 005"
                maxLength="10"
                className="book-mono"
              />
            </div>

            <div className="book-field full">
              <label htmlFor="Description">Description</label>
              <textarea
                id="Description"
                name="Description"
                value={form.Description}
                onChange={handleChange}
                placeholder="Short category description"
                maxLength="200"
              />
              <small>{form.Description.length}/200 characters</small>
            </div>

            <label className="book-toggle-row">
              <input
                type="checkbox"
                name="IsActive"
                checked={form.IsActive}
                onChange={handleChange}
              />
              <span className="book-toggle"></span>
              <span><i className="bi bi-globe2"></i> Show category to customers</span>
            </label>

            <div className="book-actions">
              <button
                type="submit"
                className="book-glass-button primary"
                disabled={isSaving}
              >
                <i className={editingId ? "bi bi-check2-square" : "bi bi-plus-lg"}></i>
                {isSaving
                  ? "Saving..."
                  : editingId
                    ? "Update Category"
                    : "Add Category"}
              </button>

              {editingId && (
                <button
                  type="button"
                  className="book-glass-button muted"
                  onClick={resetForm}
                  disabled={isSaving}
                >
                  <i className="bi bi-x-lg"></i>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </aside>

        <section className="book-panel book-table-panel">
          <div className="book-table-header">
            <div className="book-section-title">
              <p>Catalogue Structure</p>
              <h2>Category List</h2>
            </div>

            <div className="book-table-tools">
              <input
                className="book-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, Dewey code, description..."
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
                  className={statusFilter === "active" ? "active" : ""}
                  onClick={() => setStatusFilter("active")}
                >
                  Active
                </button>
                <button
                  type="button"
                  className={statusFilter === "inactive" ? "active" : ""}
                  onClick={() => setStatusFilter("inactive")}
                >
                  Inactive
                </button>
              </div>

              <form className="category-find-form" onSubmit={handleFindById}>
                <label htmlFor="FindCategoryID">Find</label>
                <input
                  id="FindCategoryID"
                  type="number"
                  min="1"
                  value={findId}
                  onChange={(event) => setFindId(event.target.value)}
                  placeholder="Category ID"
                />
                <button type="submit">
                  <i className="bi bi-search"></i>
                  Find
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFindId("");
                    fetchCategories();
                  }}
                >
                  <i className="bi bi-list-ul"></i>
                  List
                </button>
              </form>
            </div>
          </div>

          <div className="book-table-meta">
            <span>Showing {categories.length} categories</span>
            {isLoading && <span>Refreshing records...</span>}
          </div>

          <div className="book-table-wrap">
            <table className="book-table">
              <colgroup>
                <col className="category-col-id" />
                <col className="category-col-name" />
                <col className="category-col-dewey" />
                <col className="category-col-description" />
                <col className="category-col-books" />
                <col className="category-col-status" />
                <col className="category-col-updated" />
                <col className="category-col-actions" />
              </colgroup>
              <thead>
                <tr>
                  <th onClick={() => handleSort("CategoryID")}>ID{sortLabel("CategoryID")}</th>
                  <th onClick={() => handleSort("CategoryName")}>
                    Category{sortLabel("CategoryName")}
                  </th>
                  <th onClick={() => handleSort("DeweyCode")}>
                    Dewey{sortLabel("DeweyCode")}
                  </th>
                  <th>Description</th>
                  <th onClick={() => handleSort("BookCount")}>Books{sortLabel("BookCount")}</th>
                  <th onClick={() => handleSort("IsActive")}>Status{sortLabel("IsActive")}</th>
                  <th onClick={() => handleSort("UpdatedAt")}>Updated{sortLabel("UpdatedAt")}</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {categories.length > 0 ? (
                  categories.map((category) => (
                    <tr key={category.CategoryID}>
                      <td className="book-id">#{category.CategoryID}</td>
                      <td className="book-title">{category.CategoryName}</td>
                      <td className="book-mono"><i className="bi bi-bookmark"></i>{category.DeweyCode}</td>
                      <td>{category.Description || "No description"}</td>
                      <td>{category.BookCount || 0}</td>
                      <td>
                        <span
                          className={
                            category.IsActive
                              ? "book-status available"
                              : "book-status locked"
                          }
                        >
                          <span></span>
                          {category.IsActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>{formatDate(category.UpdatedAt)}</td>
                      <td className="book-row-actions category-row-actions">
                        <button type="button" onClick={() => handleEdit(category)}>
                          <i className="bi bi-pencil-square"></i>
                          Edit
                        </button>
                        <button type="button" onClick={() => handleToggleStatus(category)}>
                          <i className={category.IsActive ? "bi bi-eye-slash" : "bi bi-eye"}></i>
                          {category.IsActive ? "Deactivate" : "Reactivate"}
                        </button>
                        <button type="button" onClick={() => handleDelete(category)}>
                          <i className="bi bi-trash3"></i>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="book-empty" colSpan="8">
                      No categories match the current search or filter.
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

export default BookCategoryManagement;
