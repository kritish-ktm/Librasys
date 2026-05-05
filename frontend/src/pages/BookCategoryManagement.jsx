import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
} from "../services/bookCategoryService";

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
      const data = await getCategories();
      setCategories(data);
      setError("");
    } catch {
      setError("Failed to load categories. Make sure the backend is running.");
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

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
    if (!form.CategoryName.trim()) return "Category name is required.";
    if (form.CategoryName.trim().length > 100)
      return "Category name cannot be longer than 100 characters.";
    if (!form.DeweyCode.trim()) return "Dewey Code is required.";
    if (form.DeweyCode.trim().length > 10)
      return "Dewey Code cannot be longer than 10 characters.";
    if (form.Description && form.Description.length > 200)
      return "Description cannot be longer than 200 characters.";
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

    const categoryData = {
      CategoryName: form.CategoryName.trim(),
      Description: form.Description.trim() || null,
      DeweyCode: form.DeweyCode.trim(),
      IsActive: form.IsActive,
    };

    try {
      if (editingId) {
        await updateCategory(editingId, categoryData);
        setMessage("Category updated successfully.");
      } else {
        await addCategory(categoryData);
        setMessage("Category added successfully.");
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
      CategoryName: category.CategoryName ?? "",
      Description: category.Description ?? "",
      DeweyCode: category.DeweyCode ?? "",
      IsActive: Boolean(category.IsActive),
    });

    setMessage("");
    setError("");
  };

  const handleDelete = async (category) => {
    const confirmed = window.confirm(
      `Delete category "${category.CategoryName}"?\n\nNote: This will fail if any books are assigned to this category.`
    );
    if (!confirmed) return;

    try {
      await deleteCategory(category.CategoryID);
      setMessage("Category deleted successfully.");
      setError("");
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete category.");
      setMessage("");
    }
  };

  const handleToggleStatus = async (category) => {
    try {
      await toggleCategoryStatus(category.CategoryID, !category.IsActive);
      setMessage(`Category ${!category.IsActive ? "activated" : "deactivated"} successfully.`);
      setError("");
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update category status.");
      setMessage("");
    }
  };

  const filteredCategories = categories.filter(
    (cat) =>
      cat.CategoryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cat.DeweyCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cat.Description && cat.Description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (dateValue) => {
    if (!dateValue) return "N/A";
    return new Date(dateValue).toLocaleString();
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1>Book Category Management</h1>
          <p>
            Manage book categories using the Dewey Decimal Classification system. Categories organize
            books by subject.
          </p>
        </div>

        <button style={styles.backButton} onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </button>
      </div>

      <div style={styles.card}>
        <h2>{editingId ? "Edit Category" : "Add New Category"}</h2>

        {message && <p style={styles.success}>{message}</p>}
        {error && <p style={styles.error}>{error}</p>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Category Name *</label>
              <input
                name="CategoryName"
                placeholder="e.g., Computer Science"
                value={form.CategoryName}
                onChange={handleChange}
                maxLength="100"
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Dewey Decimal Code *</label>
              <input
                name="DeweyCode"
                placeholder="e.g., 005"
                value={form.DeweyCode}
                onChange={handleChange}
                maxLength="10"
                style={styles.input}
                required
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Description</label>
            <textarea
              name="Description"
              placeholder="Brief description of this category (optional)"
              value={form.Description}
              onChange={handleChange}
              maxLength="200"
              style={{ ...styles.input, minHeight: "80px", resize: "vertical" }}
              rows="3"
            />
            <small style={{ color: "#6b7280", fontSize: "12px" }}>
              {form.Description.length}/200 characters
            </small>
          </div>

          <label style={styles.checkboxRow}>
            <input
              type="checkbox"
              name="IsActive"
              checked={form.IsActive}
              onChange={handleChange}
            />
            <span>Active (category is available for use)</span>
          </label>

          <div style={styles.buttonRow}>
            <button type="submit" style={styles.primaryButton}>
              {editingId ? "Update Category" : "Add Category"}
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
        <div style={styles.tableHeader}>
          <h2>Category List ({filteredCategories.length})</h2>
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Category Name</th>
                <th style={styles.th}>Dewey Code</th>
                <th style={styles.th}>Description</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Last Updated</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredCategories.length > 0 ? (
                filteredCategories.map((category) => (
                  <tr key={category.CategoryID} style={styles.tr}>
                    <td style={styles.td}>{category.CategoryID}</td>
                    <td style={styles.td}>
                      <strong>{category.CategoryName}</strong>
                    </td>
                    <td style={styles.td}>
                      <code style={styles.code}>{category.DeweyCode}</code>
                    </td>
                    <td style={styles.td}>
                      {category.Description || <em style={{ color: "#9ca3af" }}>No description</em>}
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.badge,
                          ...(category.IsActive ? styles.badgeActive : styles.badgeInactive),
                        }}
                      >
                        {category.IsActive ? "✓ Active" : "○ Inactive"}
                      </span>
                    </td>
                    <td style={styles.td}>{formatDate(category.UpdatedAt)}</td>
                    <td style={styles.td}>
                      <div style={styles.actionButtons}>
                        <button
                          style={styles.editButton}
                          onClick={() => handleEdit(category)}
                          title="Edit category"
                        >
                          Edit
                        </button>
                        <button
                          style={
                            category.IsActive ? styles.deactivateButton : styles.activateButton
                          }
                          onClick={() => handleToggleStatus(category)}
                          title={category.IsActive ? "Deactivate" : "Activate"}
                        >
                          {category.IsActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          style={styles.deleteButton}
                          onClick={() => handleDelete(category)}
                          title="Delete category"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={styles.emptyCell} colSpan="7">
                    {searchTerm
                      ? `No categories found matching "${searchTerm}"`
                      : "No categories found. Add your first category above."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
    fontSize: "14px",
    fontWeight: "500",
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
    gap: "16px",
    maxWidth: "800px",
  },
  formRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#374151",
  },
  input: {
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "5px",
    fontSize: "14px",
    fontFamily: "inherit",
  },
  checkboxRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    cursor: "pointer",
  },
  buttonRow: {
    display: "flex",
    gap: "10px",
    marginTop: "8px",
  },
  primaryButton: {
    padding: "10px 20px",
    background: "#16a34a",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
  },
  cancelButton: {
    padding: "10px 20px",
    background: "#6b7280",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
  },
  success: {
    background: "#dcfce7",
    color: "#166534",
    padding: "12px",
    borderRadius: "5px",
    marginBottom: "12px",
  },
  error: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "12px",
    borderRadius: "5px",
    marginBottom: "12px",
  },
  tableHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  searchInput: {
    padding: "8px 12px",
    border: "1px solid #ccc",
    borderRadius: "5px",
    width: "300px",
    fontSize: "14px",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    background: "#4a90e2",
    color: "white",
    padding: "12px",
    textAlign: "left",
    fontSize: "14px",
    fontWeight: "500",
  },
  tr: {
    borderBottom: "1px solid #e5e7eb",
  },
  td: {
    padding: "12px",
    fontSize: "14px",
    verticalAlign: "middle",
  },
  code: {
    background: "#f3f4f6",
    padding: "2px 6px",
    borderRadius: "3px",
    fontSize: "13px",
    fontFamily: "monospace",
  },
  badge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "500",
  },
  badgeActive: {
    background: "#dcfce7",
    color: "#166534",
  },
  badgeInactive: {
    background: "#fee2e2",
    color: "#991b1b",
  },
  actionButtons: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
  },
  editButton: {
    padding: "6px 12px",
    background: "#f59e0b",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "13px",
  },
  activateButton: {
    padding: "6px 12px",
    background: "#16a34a",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "13px",
  },
  deactivateButton: {
    padding: "6px 12px",
    background: "#6b7280",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "13px",
  },
  deleteButton: {
    padding: "6px 12px",
    background: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "13px",
  },
  emptyCell: {
    padding: "32px",
    textAlign: "center",
    color: "#6b7280",
    fontSize: "14px",
  },
};

export default BookCategoryManagement;