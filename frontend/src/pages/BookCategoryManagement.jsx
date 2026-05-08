import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
} from "../services/bookCategoryService";
import "./BookCategoryManagement.css";

function BookCategoryManagement() {
  const navigate = useNavigate();

  const emptyForm = {
    CategoryName: "",
    Description: "",
    DeweyCode: "",
    IsActive: true,
  };

  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchCategories = async () => {
    try {
      const res = await getCategories();
      setCategories(Array.isArray(res) ? res : res.data || []);
    } catch (err) {
      setError("Failed to load categories.");
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
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
    if (form.CategoryName.trim().length > 100) return "Category name is too long.";
    if (!form.DeweyCode.trim()) return "Dewey Code is required.";
    if (form.DeweyCode.trim().length > 10) return "Dewey Code is too long.";
    if (form.Description && form.Description.length > 200) return "Description is too long.";
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

    try {
      if (editingId) {
        await updateCategory(editingId, form);
        setMessage("Category updated successfully!");
      } else {
        await addCategory(form);
        setMessage("Category added successfully!");
      }
      resetForm();
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save category.");
    }
  };

  const handleEdit = (category) => {
    setEditingId(category.CategoryID);
    setForm({
      CategoryName: category.CategoryName,
      Description: category.Description || "",
      DeweyCode: category.DeweyCode,
      IsActive: category.IsActive,
    });
  };

  const handleToggleStatus = async (category) => {
    try {
      await toggleCategoryStatus(category.CategoryID, !category.IsActive);
      setMessage(`Category ${!category.IsActive ? "activated" : "deactivated"} successfully.`);
      fetchCategories();
    } catch (err) {
      setError("Failed to change status.");
    }
  };

  const handleDelete = async (category) => {
    if (!window.confirm(`Delete category "${category.CategoryName}"?`)) return;
    try {
      await deleteCategory(category.CategoryID);
      setMessage("Category deleted successfully.");
      fetchCategories();
    } catch (err) {
      setError("Cannot delete: Books are assigned to this category.");
    }
  };

  const filteredCategories = categories.filter((cat) =>
    cat.CategoryName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.DeweyCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="book-page">
      {/* Header */}
      <div className="book-hero">
        <div>
          <p className="book-kicker">LIBRARY ADMINISTRATION</p>
          <h1>Book Category Management</h1>
          <p className="book-hero-text">
            Create, edit, and manage book categories
          </p>
        </div>
        <button className="book-back-button" onClick={() => navigate("/dashboard")}>
          ← Back to Dashboard
        </button>
      </div>

      {message && <div className="book-alert success">{message}</div>}
      {error && <div className="book-alert error">{error}</div>}

      <div className="book-content-grid">
        {/* Left Side - Table */}
        <div className="book-table-panel">
          <div className="book-table-header">
            <h2>All Categories ({filteredCategories.length})</h2>
            <input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="book-search"
            />
          </div>

          <div className="book-table-wrap">
            <table className="book-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Category Name</th>
                  <th>Dewey Code</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.length > 0 ? (
                  filteredCategories.map((cat) => (
                    <tr key={cat.CategoryID}>
                      <td className="book-id">{cat.CategoryID}</td>
                      <td className="book-title">{cat.CategoryName}</td>
                      <td><code>{cat.DeweyCode}</code></td>
                      <td>{cat.Description || <em>No description</em>}</td>
                      <td>
                        <span className={`book-status ${cat.IsActive ? "available" : "locked"}`}>
                          {cat.IsActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>{cat.UpdatedAt ? new Date(cat.UpdatedAt).toLocaleString() : "N/A"}</td>
                      <td className="book-row-actions">
                        <button onClick={() => handleEdit(cat)}>Edit</button>
                        <button onClick={() => handleToggleStatus(cat)}>
                          {cat.IsActive ? "Deactivate" : "Activate"}
                        </button>
                        <button onClick={() => handleDelete(cat)}>Delete</button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="book-empty">
                      {searchTerm ? "No categories found." : "No categories added yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side - Add/Edit Form */}
        <div className="book-form-panel">
          <div className="book-panel">
            <div className="book-section-title">
              <p>{editingId ? "EDIT CATEGORY" : "ADD NEW CATEGORY"}</p>
              <h2>{editingId ? "Update Category" : "Create New Category"}</h2>
            </div>

            <form onSubmit={handleSubmit} className="book-form">
              <div className="book-field">
                <label>Category Name *</label>
                <input
                  name="CategoryName"
                  placeholder="e.g., Science Fiction"
                  value={form.CategoryName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="book-field">
                <label>Dewey Code *</label>
                <input
                  name="DeweyCode"
                  placeholder="e.g., 500"
                  value={form.DeweyCode}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="book-field full">
                <label>Description</label>
                <textarea
                  name="Description"
                  placeholder="Short description of this category..."
                  value={form.Description}
                  onChange={handleChange}
                  rows="4"
                />
              </div>

              <div className="book-toggle-row">
                <input
                  type="checkbox"
                  name="IsActive"
                  checked={form.IsActive}
                  onChange={handleChange}
                />
                <span>Active (Visible to students)</span>
              </div>

              <div className="book-actions">
                <button type="submit" className="book-primary-button">
                  {editingId ? "Update Category" : "Add Category"}
                </button>
                {editingId && (
                  <button type="button" onClick={resetForm} className="book-ghost-button">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookCategoryManagement;