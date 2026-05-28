import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  CheckCircle2,
  Filter,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import LoadingOverlay from "../components/LoadingOverlay";
import Sidebar from "../components/Sidebar";
import "./UserManagement.css";

// ── Constants ────────────────────────────────────────────────────────────────
const API_BASE_URL = "http://localhost:5000";
const USERS_PER_PAGE_OPTIONS = [5, 10, 20];
const ALERT_DURATION_MS = 3000;   // How long the alert stays visible
const ALERT_FADE_MS = 260;        // Fade-out animation duration
const MIN_LOADER_MS = 650;        // Prevents loader from flashing too briefly

// Blank form used when opening create/edit modals
const initialForm = {
  fullName: "",
  email: "",
  password: "",
  role: "Member",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Reads the JWT from localStorage and returns the Authorization header. */
function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    headers: { Authorization: `Bearer ${token}` },
  };
}

/**
 * Normalises a raw API user object into a consistent shape.
 * Handles the MySQL Buffer format returned for boolean columns.
 */
function normalizeUser(user) {
  const activeValue = user.IsActive ?? user.isActive;
  let isActive = false;

  if (activeValue && typeof activeValue === "object" && Array.isArray(activeValue.data)) {
    // MySQL returns TINYINT(1) as a Buffer – check the first byte
    isActive = activeValue.data[0] === 1;
  } else {
    isActive = activeValue === true || activeValue === 1 || activeValue === "1";
  }

  return {
    UserID: user.UserID,
    fullName: user.FullName ?? user.fullName ?? "",
    email: user.Email ?? user.email ?? "",
    role: user.Role ?? user.role ?? "Member",
    isActive,
    createdAt: user.DateRegistered ?? user.createdAt ?? "",
  };
}

// ── Main Component ────────────────────────────────────────────────────────────
function UserManagement() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [users, setUsers] = useState([]);             // Full user list from the API
  const [search, setSearch] = useState("");           // Search input value
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);             // Rows per page
  const [error, setError] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("success");
  const [showAlert, setShowAlert] = useState(false);
  const [isAlertLeaving, setIsAlertLeaving] = useState(false); // Triggers fade-out CSS class
  const [isLoading, setIsLoading] = useState(false);           // Initial/refresh fetches
  const [isSaving, setIsSaving] = useState(false);             // Create/edit/delete actions
  const [isLoadingOverlayVisible, setIsLoadingOverlayVisible] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Fetching users...");
  const [loadingSubtext, setLoadingSubtext] = useState("Please wait...");
  const [isCreateOpen, setIsCreateOpen] = useState(false);     // Create modal visibility
  const [editUser, setEditUser] = useState(null);              // User being edited (null = closed)
  const [confirmAction, setConfirmAction] = useState(null);    // Pending status/delete confirmation
  const [form, setForm] = useState(initialForm);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const alertTimerRef = useRef(null);       // Auto-dismiss timer for alerts
  const alertFadeTimerRef = useRef(null);   // Secondary timer that clears after fade
  const loaderTimerRef = useRef(null);      // Ensures loader shows for MIN_LOADER_MS
  const loaderStartedAtRef = useRef(0);     // Timestamp when loader was shown

  // Disables interactive elements while any async operation is in progress
  const isBusy = isLoading || isSaving || isLoadingOverlayVisible;

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchUsers();

    // Clean up all pending timers on unmount
    return () => {
      clearTimeout(alertTimerRef.current);
      clearTimeout(alertFadeTimerRef.current);
      clearTimeout(loaderTimerRef.current);
    };
  }, []);

  // ── Derived Data ───────────────────────────────────────────────────────────

  /** Aggregated counts shown in the summary cards. */
  const summary = useMemo(() => {
    const active = users.filter((user) => user.isActive).length;
    const librarians = users.filter((user) => user.role === "Librarian").length;

    return {
      total: users.length,
      active,
      inactive: users.length - active,
      librarians,
    };
  }, [users]);

  /** Users that match the current search text, role, and status filters. */
  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !keyword ||
        String(user.UserID).includes(keyword) ||
        user.fullName.toLowerCase().includes(keyword) ||
        user.email.toLowerCase().includes(keyword);

      const matchesRole = roleFilter === "all" || user.role.toLowerCase() === roleFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && user.isActive) ||
        (statusFilter === "inactive" && !user.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / limit));
  const visibleUsers = filteredUsers.slice((page - 1) * limit, page * limit);
  const firstRecord = filteredUsers.length ? (page - 1) * limit + 1 : 0;
  const lastRecord = Math.min(page * limit, filteredUsers.length);

  // Clamp current page when filters reduce the total page count
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  // ── Alert Helpers ──────────────────────────────────────────────────────────

  /** Shows a dismissible alert banner, replacing any currently visible one. */
  const showFeedback = (text, type = "success") => {
    clearTimeout(alertTimerRef.current);
    clearTimeout(alertFadeTimerRef.current);
    setAlertMessage(text);
    setAlertType(type);
    setIsAlertLeaving(false);
    setShowAlert(true);

    // Begin fade-out after the display duration, then fully hide
    alertTimerRef.current = setTimeout(() => {
      setIsAlertLeaving(true);
      alertFadeTimerRef.current = setTimeout(() => {
        setShowAlert(false);
        setAlertMessage("");
        if (type === "error") setError("");
        setIsAlertLeaving(false);
      }, ALERT_FADE_MS);
    }, ALERT_DURATION_MS);
  };

  const showError = (text) => {
    setError(text);
    showFeedback(text, "error");
  };

  // ── Loader Helpers ─────────────────────────────────────────────────────────

  /** Shows the full-screen overlay loader with a custom message. */
  const showLoader = (message, subtext = "Please wait...") => {
    clearTimeout(loaderTimerRef.current);
    loaderStartedAtRef.current = Date.now();
    setLoadingMessage(message);
    setLoadingSubtext(subtext);
    setIsLoadingOverlayVisible(true);
  };

  /** Hides the loader, but never before MIN_LOADER_MS to avoid a flash. */
  const hideLoader = () => {
    const elapsed = Date.now() - loaderStartedAtRef.current;
    const remaining = Math.max(MIN_LOADER_MS - elapsed, 0);
    clearTimeout(loaderTimerRef.current);
    loaderTimerRef.current = setTimeout(() => {
      setIsLoadingOverlayVisible(false);
    }, remaining);
  };

  // ── API Calls ──────────────────────────────────────────────────────────────

  /** Fetches the full user list from the API and updates state. */
  const fetchUsers = async (message = "Fetching users...") => {
    showLoader(message);
    setIsLoading(true);

    try {
      const response = await axios.get(`${API_BASE_URL}/api/users`, {
        ...getAuthHeaders(),
        params: { t: Date.now() }, // Cache-busting timestamp
      });
      setUsers(Array.isArray(response.data) ? response.data.map(normalizeUser) : []);
      setError("");
    } catch (err) {
      showError(err.response?.data?.error || "Failed to load users.");
    } finally {
      setIsLoading(false);
      hideLoader();
    }
  };

  // ── Filter Actions ─────────────────────────────────────────────────────────

  /** Resets all filters and search to their default values. */
  const resetFilters = () => {
    setSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
    setPage(1);
  };

  // ── Modal Controls ─────────────────────────────────────────────────────────

  const openCreateModal = () => {
    setForm(initialForm);
    setError("");
    setIsCreateOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateOpen(false);
    setForm(initialForm);
    setError("");
  };

  /** Pre-fills the edit form with the selected user's current data. */
  const openEditModal = (user) => {
    setEditUser(user);
    setForm({
      fullName: user.fullName,
      email: user.email,
      password: "",   // Password is not pre-filled for security
      role: user.role,
    });
    setError("");
  };

  const closeEditModal = () => {
    setEditUser(null);
    setForm(initialForm);
    setError("");
  };

  // ── Event Handlers ─────────────────────────────────────────────────────────

  /** Generic filter change handler — also resets to page 1. */
  const handleFilterChange = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  /** Returns a validation error string, or an empty string if the form is valid. */
  const validateForm = (mode) => {
    if (!form.fullName.trim()) return "Full name is required.";
    if (form.fullName.trim().length < 2) return "Full name must be at least 2 characters.";
    if (!form.email.trim()) return "Email is required.";
    if (!isValidEmail(form.email.trim())) return "Please enter a valid email address.";
    if (mode === "create" && !form.password) return "Password is required.";
    if (mode === "create" && form.password.length < 6) return "Password must be at least 6 characters.";
    if (!["Librarian", "Member"].includes(form.role)) return "Role is required.";
    return "";
  };

  /** Submits the create-user form and refreshes the list on success. */
  const handleCreateUser = async (event) => {
    event.preventDefault();
    setError("");

    const validationMessage = validateForm("create");
    if (validationMessage) {
      showError(validationMessage);
      return;
    }

    showLoader("Creating user...");
    setIsSaving(true);

    try {
      await axios.post(
        `${API_BASE_URL}/api/users`,
        {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
        },
        getAuthHeaders()
      );

      showFeedback("User added successfully.");
      closeCreateModal();
      await fetchUsers("Refreshing user list...");
    } catch (err) {
      showError(err.response?.data?.error || "Failed to add user.");
    } finally {
      setIsSaving(false);
      hideLoader();
    }
  };

  /** Submits the edit-user form and refreshes the list on success. */
  const handleEditUser = async (event) => {
    event.preventDefault();
    if (!editUser) return;
    setError("");

    const validationMessage = validateForm("edit");
    if (validationMessage) {
      showError(validationMessage);
      return;
    }

    showLoader("Saving user changes...");
    setIsSaving(true);

    try {
      await axios.put(
        `${API_BASE_URL}/api/users/${editUser.UserID}`,
        {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          role: form.role,
        },
        getAuthHeaders()
      );

      showFeedback("User updated successfully.");
      closeEditModal();
      await fetchUsers("Refreshing user list...");
    } catch (err) {
      showError(err.response?.data?.error || "Failed to update user.");
    } finally {
      setIsSaving(false);
      hideLoader();
    }
  };

  /** Toggles a user's active/inactive status. */
  const handleStatusChange = async (user) => {
    const nextStatus = user.isActive ? 0 : 1;
    setError("");
    showLoader(user.isActive ? "Deactivating user..." : "Activating user...");
    setIsSaving(true);

    try {
      await axios.put(
        `${API_BASE_URL}/api/users/${user.UserID}/status`,
        { isActive: nextStatus },
        getAuthHeaders()
      );

      showFeedback(nextStatus === 1 ? "User activated successfully." : "User deactivated successfully.");
      setConfirmAction(null);
      await fetchUsers("Refreshing user list...");
    } catch (err) {
      showError(err.response?.data?.error || "Failed to update user status.");
    } finally {
      setIsSaving(false);
      hideLoader();
    }
  };

  /** Permanently deletes a user account. */
  const handleDeleteUser = async (user) => {
    setError("");
    showLoader("Deleting user...");
    setIsSaving(true);

    try {
      await axios.delete(`${API_BASE_URL}/api/users/${user.UserID}`, getAuthHeaders());
      showFeedback("User deleted successfully.");
      setConfirmAction(null);
      await fetchUsers("Refreshing user list...");
    } catch (err) {
      showError(err.response?.data?.error || "Failed to delete user.");
    } finally {
      setIsSaving(false);
      hideLoader();
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="um-page">
      <LoadingOverlay show={isBusy} message={loadingMessage} subtext={loadingSubtext} />
      <Sidebar />

      <section className="um-main">
        {/* Summary cards */}
        <section className="um-stats" aria-label="User summary">
          <SummaryCard title="Total Users" value={summary.total} detail="All registered accounts" icon={Users} tone="total" />
          <SummaryCard title="Active Users" value={summary.active} detail="Can access LibraSys" icon={CheckCircle2} tone="active" />
          <SummaryCard title="Inactive Users" value={summary.inactive} detail="Access currently blocked" icon={UserRound} tone="inactive" />
          <SummaryCard title="Librarians" value={summary.librarians} detail="Staff administrator roles" icon={ShieldCheck} tone="librarian" />
        </section>

        {/* Feedback alert — shown after create/edit/delete/status actions */}
        {showAlert && (
          <div className={`um-alert ${alertType} ${isAlertLeaving ? "is-hiding" : ""}`}>
            {alertMessage}
          </div>
        )}

        <section className="um-workspace">
          <div className="um-grid">
            <section className="um-panel um-table-panel">

              {/* Header: title + search + add button */}
              <div className="um-list-head">
                <div className="um-section-heading">
                  <h2>User Management</h2>
                  <p>View, filter and manage librarian and member accounts.</p>
                </div>

                <div className="um-list-actions">
                  <button type="button" className="um-add-button" disabled={isBusy} onClick={openCreateModal}>
                    <Plus size={18} />
                    Add New User
                  </button>

                  <div className="um-search-box">
                    <input
                      value={search}
                      disabled={isBusy}
                      onChange={handleFilterChange(setSearch)}
                      placeholder="Search by user ID, full name, or email..."
                    />
                    <button type="button" aria-label="Search users" disabled={isBusy}>
                      <Search size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Dropdown filters + clear/apply buttons */}
              <div className="um-filter-row">
                <select value={roleFilter} onChange={handleFilterChange(setRoleFilter)} disabled={isBusy}>
                  <option value="all">All Roles</option>
                  <option value="librarian">Librarian</option>
                  <option value="member">Member</option>
                </select>

                <select value={statusFilter} onChange={handleFilterChange(setStatusFilter)} disabled={isBusy}>
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>

                <button type="button" className="um-secondary" disabled={isBusy} onClick={resetFilters}>
                  Clear
                </button>

                <button type="button" className="um-filter-button" disabled={isBusy} onClick={() => setPage(1)}>
                  <Filter size={16} />
                  Filter
                </button>
              </div>

              {/* Quick-filter tabs (All / Active / Inactive) */}
              <div className="um-tabs">
                {["all", "active", "inactive"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={isBusy}
                    className={statusFilter === status ? `active ${status}` : status}
                    onClick={() => {
                      setStatusFilter(status);
                      setPage(1);
                    }}
                  >
                    {formatStatusLabel(status)}
                    <span>{countForStatus(status, summary)}</span>
                  </button>
                ))}
              </div>

              {/* Users table */}
              <div className="um-table-wrap">
                <table className="um-table">
                  <thead>
                    <tr>
                      <th>User ID</th>
                      <th>Full Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Registered</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan="7" className="um-empty">
                          Loading users...
                        </td>
                      </tr>
                    ) : visibleUsers.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="um-empty">
                          No user records match the current search or filter.
                        </td>
                      </tr>
                    ) : (
                      visibleUsers.map((user) => (
                        <tr key={user.UserID}>
                          <td>#{user.UserID}</td>
                          <td>
                            <div className="um-user-cell">
                              <span className="um-table-avatar">{getInitials(user.fullName)}</span>
                              <strong>{user.fullName}</strong>
                            </div>
                          </td>
                          <td>
                            <small>{user.email}</small>
                          </td>
                          <td>{renderRole(user.role)}</td>
                          <td>{renderStatus(user.isActive)}</td>
                          <td>{formatDate(user.createdAt)}</td>
                          <td className="um-row-actions">
                            {/* Toggle active/inactive */}
                            <button
                              type="button"
                              disabled={isBusy}
                              aria-label={user.isActive ? "Deactivate user" : "Activate user"}
                              title={user.isActive ? "Deactivate user" : "Activate user"}
                              onClick={() => setConfirmAction({ type: "status", user })}
                            >
                              <CheckCircle2 size={16} />
                            </button>

                            {/* Edit user details */}
                            <button
                              type="button"
                              disabled={isBusy}
                              aria-label="Edit user"
                              title="Edit user"
                              onClick={() => openEditModal(user)}
                            >
                              <Pencil size={16} />
                            </button>

                            {/* Delete user (requires confirmation) */}
                            <button
                              type="button"
                              className="danger"
                              disabled={isBusy}
                              aria-label="Delete user"
                              title="Delete user"
                              onClick={() => setConfirmAction({ type: "delete", user })}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div className="um-pagination">
                <span>
                  Showing {firstRecord} to {lastRecord} of {filteredUsers.length} users
                </span>

                <div className="um-page-buttons">
                  <button type="button" disabled={isBusy || page <= 1} onClick={() => setPage(1)}>
                    &laquo;
                  </button>
                  <button type="button" disabled={isBusy || page <= 1} onClick={() => setPage((current) => current - 1)}>
                    &lsaquo;
                  </button>
                  <strong>{page}</strong>
                  <button type="button" disabled={isBusy || page >= totalPages} onClick={() => setPage((current) => current + 1)}>
                    &rsaquo;
                  </button>
                  <button type="button" disabled={isBusy || page >= totalPages} onClick={() => setPage(totalPages)}>
                    &raquo;
                  </button>
                </div>

                <select
                  value={limit}
                  disabled={isBusy}
                  onChange={(event) => {
                    setLimit(Number(event.target.value));
                    setPage(1);
                  }}
                >
                  {USERS_PER_PAGE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option} / page
                    </option>
                  ))}
                </select>
              </div>
            </section>
          </div>
        </section>
      </section>

      {/* Create user modal */}
      {isCreateOpen && (
        <UserFormModal
          title="Create User"
          description="Add a new librarian or member account."
          submitLabel={isSaving ? "Creating..." : "Add User"}
          form={form}
          setForm={setForm}
          error={error}
          isBusy={isBusy}
          mode="create"
          onClose={closeCreateModal}
          onSubmit={handleCreateUser}
        />
      )}

      {/* Edit user modal — only mounted when a user is selected */}
      {editUser && (
        <UserFormModal
          title="Edit User"
          description={`Update account details for #${editUser.UserID}.`}
          submitLabel={isSaving ? "Saving..." : "Save Changes"}
          form={form}
          setForm={setForm}
          error={error}
          isBusy={isBusy}
          mode="edit"
          onClose={closeEditModal}
          onSubmit={handleEditUser}
        />
      )}

      {/* Confirmation modal for delete and status-toggle actions */}
      {confirmAction && (
        <ConfirmModal
          action={confirmAction}
          isBusy={isBusy}
          isSaving={isSaving}
          error={error}
          onClose={() => setConfirmAction(null)}
          onConfirm={() =>
            confirmAction.type === "delete"
              ? handleDeleteUser(confirmAction.user)
              : handleStatusChange(confirmAction.user)
          }
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** Stat card shown in the summary strip at the top of the page. */
function SummaryCard({ title, value, detail, icon: Icon, tone }) {
  return (
    <article className={`um-stat-card ${tone}`}>
      <span className="um-stat-icon">
        <Icon size={32} strokeWidth={2.1} />
      </span>
      <span>
        <small>{title}</small>
        <strong>{value}</strong>
        <em>{detail}</em>
      </span>
    </article>
  );
}

/** Shared modal form used for both creating and editing users. */
function UserFormModal({ title, description, submitLabel, form, setForm, error, isBusy, mode, onClose, onSubmit }) {
  return (
    <div className="um-modal-backdrop" role="presentation">
      <section className="um-modal" role="dialog" aria-modal="true" aria-labelledby="user-form-title">
        <div className="um-modal-head">
          <div className="um-section-heading">
            <h2 id="user-form-title">{title}</h2>
            <p>{description}</p>
          </div>

          <button type="button" className="um-modal-close" disabled={isBusy} aria-label="Close user form" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {error && <div className="um-alert error">{error}</div>}

        <form className="um-form" onSubmit={onSubmit}>
          <div className="um-modal-grid">
            <label>
              <span className="um-field-label">Full Name</span>
              <input
                value={form.fullName}
                disabled={isBusy}
                onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                placeholder="e.g., John Smith"
              />
            </label>

            <label>
              <span className="um-field-label">Role</span>
              <select
                value={form.role}
                disabled={isBusy}
                onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
              >
                <option value="Member">Member</option>
                <option value="Librarian">Librarian</option>
              </select>
            </label>
          </div>

          <label>
            <span className="um-field-label">Email</span>
            <input
              type="email"
              value={form.email}
              disabled={isBusy}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="user@email.com"
            />
          </label>

          {/* Password field only shown in create mode */}
          {mode === "create" && (
            <label>
              <span className="um-field-label">Password</span>
              <input
                type="password"
                value={form.password}
                disabled={isBusy}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="Minimum 6 characters"
              />
            </label>
          )}

          <div className="um-modal-actions">
            <button type="button" className="um-modal-cancel" disabled={isBusy} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="um-primary" disabled={isBusy}>
              {submitLabel}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

/** Confirmation dialog for destructive or irreversible actions (delete / status change). */
function ConfirmModal({ action, isBusy, isSaving, error, onClose, onConfirm }) {
  const isDelete = action.type === "delete";
  const user = action.user;
  const title = isDelete ? "Delete User" : user.isActive ? "Deactivate User" : "Activate User";
  const message = isDelete
    ? "This permanently removes the selected user account."
    : user.isActive
      ? "This blocks the user from accessing LibraSys."
      : "This restores account access for the user.";

  return (
    <div className="um-modal-backdrop" role="presentation">
      <section className="um-modal um-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-user-title">
        <div className="um-modal-head">
          <div className="um-section-heading">
            <h2 id="confirm-user-title">{title}</h2>
            <p>Confirm before changing this account.</p>
          </div>

          <button type="button" className="um-modal-close" disabled={isBusy} aria-label="Close confirmation" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {error && <div className="um-alert error">{error}</div>}

        <div className={isDelete ? "um-warning danger" : "um-warning"}>
          <strong>
            {title} #{user.UserID}?
          </strong>
          <span>{user.fullName} - {message}</span>
        </div>

        <div className="um-modal-actions">
          <button type="button" className="um-modal-cancel" disabled={isBusy} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={isDelete ? "um-primary danger" : "um-primary"} disabled={isBusy} onClick={onConfirm}>
            {isSaving ? "Working..." : title}
          </button>
        </div>
      </section>
    </div>
  );
}

// ── Pure Utility Functions ────────────────────────────────────────────────────

/** Renders a colour-coded role badge. */
function renderRole(role) {
  return <span className={`um-role ${role === "Librarian" ? "librarian" : "member"}`}>{role}</span>;
}

/** Renders a colour-coded active/inactive status badge. */
function renderStatus(isActive) {
  return <span className={`um-status ${isActive ? "active" : "inactive"}`}>{isActive ? "Active" : "Inactive"}</span>;
}

/** Returns the record count that belongs to a given tab status. */
function countForStatus(status, summary) {
  if (status === "all") return summary.total;
  return status === "active" ? summary.active : summary.inactive;
}

/** Capitalises the first letter of a status string for display. */
function formatStatusLabel(status) {
  if (status === "all") return "All";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/** Strips the time portion from an ISO date string, returning YYYY-MM-DD. */
function formatDate(value) {
  if (!value) return "-";
  return String(value).split("T")[0];
}

/** Basic email format check using a standard regex pattern. */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Derives up to two initials from a full name for the avatar placeholder. */
function getInitials(name) {
  return String(name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default UserManagement;
