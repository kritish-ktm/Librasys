import { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import './UserManagement.css';

// ─── Config ────────────────────────────────────────────────────────────────────
const API_BASE_URL = 'http://localhost:5000';

/**
 * Returns Axios config with the JWT token from localStorage.
 * Every protected API call must include this header so the backend
 * can verify the logged-in user's identity.
 */
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: { Authorization: `Bearer ${token}` }
  };
};

// ─── normalizeUser ─────────────────────────────────────────────────────────────
/**
 * Converts raw database row fields into the shape the UI expects.
 *
 * WHY THIS EXISTS:
 * MySQL column names are PascalCase (e.g. FullName, IsActive), but our
 * React components use camelCase. This function bridges that gap in one place
 * so the rest of the code stays clean and consistent.
 *
 * SPECIAL CASE — IsActive (BIT column):
 * MySQL BIT(1) fields are sent over JSON as a Buffer-like object:
 *   { type: 'Buffer', data: [1] }   →  active
 *   { type: 'Buffer', data: [0] }   →  inactive
 *
 * We CANNOT use Node's `Buffer.isBuffer()` here because this code runs in
 * the browser, where Buffer doesn't exist. Instead we check for the
 * object shape that JSON.stringify produces for a Buffer.
 */
const normalizeUser = (user) => {
  const activeValue = user.IsActive ?? user.isActive;

  let isActive;

  if (
    activeValue !== null &&
    typeof activeValue === 'object' &&
    Array.isArray(activeValue.data)
  ) {
    // MySQL BIT(1) arrives as { type: 'Buffer', data: [0|1] } after JSON serialisation
    isActive = activeValue.data[0] === 1;
  } else {
    // Fallback: value is already a number (0/1) or boolean
    isActive = Number(activeValue) === 1;
  }

  return {
    UserID:    user.UserID,
    fullName:  user.FullName,
    email:     user.Email,
    role:      user.Role,
    isActive,
    createdAt: user.DateRegistered
  };
};

// ─── Component ─────────────────────────────────────────────────────────────────
function UserManagement() {

  // ── Table / page state ──────────────────────────────────────────────────────
  const [users, setUsers]               = useState([]);        // all users from API
  const [search, setSearch]             = useState('');        // search input value
  const [roleFilter, setRoleFilter]     = useState('All');     // dropdown: All | Librarian | Member
  const [statusFilter, setStatusFilter] = useState('All');     // dropdown: All | Active | Inactive
  const [pageError, setPageError]       = useState('');        // banner error message
  const [loading, setLoading]           = useState(false);     // table loading spinner
  const [statusLoadingId, setStatusLoadingId] = useState(null);// tracks which row is toggling
  const [currentPage, setCurrentPage]   = useState(1);        // current pagination page

  const USERS_PER_PAGE = 10;

  // ── Modal state ─────────────────────────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false); // controls Add User modal
  const [editUser, setEditUser]         = useState(null);  // null = closed; object = editing that user

  // ── Add-user form state ─────────────────────────────────────────────────────
  const [newUser, setNewUser] = useState({
    fullName: '',
    email:    '',
    password: '',
    role:     'Member'
  });

  // ── Shared form feedback ────────────────────────────────────────────────────
  const [formError, setFormError]     = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // ── Fetch users on mount ────────────────────────────────────────────────────
  useEffect(() => {
    fetchUsers();
  }, []);

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /** Basic email format guard — prevents obviously bad addresses. */
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // ─── API Calls ─────────────────────────────────────────────────────────────

  /**
   * Loads all users from the backend.
   *
   * The `?t=` cache-buster timestamp forces the browser to skip its HTTP cache
   * and always fetch fresh data. Without it, the browser may return a 304 (Not
   * Modified) and show stale data after create/update/delete operations.
   */
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setPageError('');

      const res = await axios.get(
        `${API_BASE_URL}/api/users?t=${Date.now()}`,
        getAuthHeaders()
      );

      // Normalize every row before storing in state
      const normalised = res.data.map(normalizeUser);
      setUsers(normalised);

    } catch (err) {
      console.error('fetchUsers error:', err);
      // Show the server's error message if available, otherwise a generic one
      setPageError(err.response?.data?.error || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Add User ──────────────────────────────────────────────────────────────

  /** Resets the add-user form fields back to their default empty values. */
  const resetNewUser = () =>
    setNewUser({ fullName: '', email: '', password: '', role: 'Member' });

  /** Opens the Add User modal with a clean, empty form. */
  const openAddModal = () => {
    resetNewUser();
    setEditUser(null);
    setFormError('');
    setFormSuccess('');
    setShowAddModal(true);
  };

  /** Closes whichever modal is open and clears all form feedback. */
  const closeModal = () => {
    setShowAddModal(false);
    setEditUser(null);
    setFormError('');
    setFormSuccess('');
  };

  /**
   * Client-side validation for the Add User form.
   * Returns an error string if invalid, or '' if everything is fine.
   * Running this before the API call saves a round-trip for obvious mistakes.
   */
  const validateAddUser = () => {
    if (!newUser.fullName.trim())               return 'Full name is required.';
    if (newUser.fullName.trim().length < 2)     return 'Full name must be at least 2 characters.';
    if (!newUser.email.trim())                  return 'Email is required.';
    if (!isValidEmail(newUser.email.trim()))    return 'Please enter a valid email address.';
    if (!newUser.password)                      return 'Password is required.';
    if (newUser.password.length < 6)            return 'Password must be at least 6 characters.';
    if (!['Librarian', 'Member'].includes(newUser.role)) return 'Please select a valid role.';
    return '';
  };

  /** Submits the Add User form. Validates first, then POSTs to the API. */
  const handleAddUser = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const validationError = validateAddUser();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      await axios.post(
        `${API_BASE_URL}/api/users`,
        {
          fullName: newUser.fullName.trim(),
          email:    newUser.email.trim(),
          password: newUser.password,
          role:     newUser.role
        },
        getAuthHeaders()
      );

      setFormSuccess('User added successfully.');
      resetNewUser();
      await fetchUsers(); // refresh table so new user appears immediately
      setTimeout(() => closeModal(), 600); // brief delay so success message is visible

    } catch (err) {
      console.error('handleAddUser error:', err);
      setFormError(err.response?.data?.error || 'Failed to add user.');
    }
  };

  // ─── Edit User ─────────────────────────────────────────────────────────────

  /**
   * Populates the Edit modal with the selected user's current data.
   * We copy only the editable fields — password is not editable here.
   */
  const openEditModal = (user) => {
    setEditUser({
      UserID:   user.UserID,
      fullName: user.fullName,
      email:    user.email,
      role:     user.role
    });
    setShowAddModal(false); // make sure Add modal is closed
    setFormError('');
    setFormSuccess('');
  };

  /** Client-side validation for the Edit User form. */
  const validateEditUser = () => {
    if (!editUser.fullName.trim())              return 'Full name is required.';
    if (editUser.fullName.trim().length < 2)    return 'Full name must be at least 2 characters.';
    if (!editUser.email.trim())                 return 'Email is required.';
    if (!isValidEmail(editUser.email.trim()))   return 'Please enter a valid email address.';
    if (!['Librarian', 'Member'].includes(editUser.role)) return 'Please select a valid role.';
    return '';
  };

  /** Submits the Edit User form. PUTs updated fields to the API. */
  const handleEditUser = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const validationError = validateEditUser();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      await axios.put(
        `${API_BASE_URL}/api/users/${editUser.UserID}`,
        {
          fullName: editUser.fullName.trim(),
          email:    editUser.email.trim(),
          role:     editUser.role
        },
        getAuthHeaders()
      );

      setFormSuccess('User updated successfully.');
      await fetchUsers(); // refresh table to show updated name/email/role
      setTimeout(() => closeModal(), 600);

    } catch (err) {
      console.error('handleEditUser error:', err);
      setFormError(err.response?.data?.error || 'Failed to update user.');
    }
  };

  // ─── Toggle Active / Inactive ──────────────────────────────────────────────

  /**
   * Flips a user's active status between Active (1) and Inactive (0).
   *
   * OPTIMISTIC UPDATE: We update the row in local state immediately so the UI
   * feels instant, then refetch from the server to confirm the real DB value.
   * If the API call fails, the error banner appears and the next fetchUsers()
   * will restore the correct state.
   */
  const handleToggleStatus = async (user) => {
    const nextStatus = user.isActive ? 0 : 1; // flip the current value

    try {
      setPageError('');
      setStatusLoadingId(user.UserID); // show "Saving..." on this row's button

      await axios.put(
        `${API_BASE_URL}/api/users/${user.UserID}/status`,
        { isActive: nextStatus },
        getAuthHeaders()
      );

      // Optimistically update just this row so the UI doesn't flicker
      setUsers((prev) =>
        prev.map((u) =>
          u.UserID === user.UserID ? { ...u, isActive: nextStatus === 1 } : u
        )
      );

      // Then fetch the full list to stay in sync with the database
      await fetchUsers();

    } catch (err) {
      console.error('handleToggleStatus error:', err);
      setPageError(err.response?.data?.error || 'Failed to update user status.');
    } finally {
      setStatusLoadingId(null); // re-enable the button regardless of outcome
    }
  };

  // ─── Delete User ───────────────────────────────────────────────────────────

  /**
   * Permanently deletes a user after confirmation.
   * Uses a native confirm() dialog as a simple guard against accidental clicks.
   */
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      setPageError('');
      await axios.delete(`${API_BASE_URL}/api/users/${id}`, getAuthHeaders());
      await fetchUsers(); // remove the deleted row from the table
    } catch (err) {
      console.error('handleDelete error:', err);
      setPageError(err.response?.data?.error || 'Failed to delete user.');
    }
  };

  // ─── Search + Filter ───────────────────────────────────────────────────────

  /**
   * Derives the visible user list by applying search text, role, and status
   * filters on top of the full `users` array.
   * This runs on every render — no useEffect needed since it's pure computation.
   */
  const filteredUsers = users.filter((u) => {
    const keyword = search.toLowerCase().trim();

    const matchSearch =
      u.fullName?.toLowerCase().includes(keyword) ||
      u.email?.toLowerCase().includes(keyword) ||
      String(u.UserID).includes(keyword);

    const matchRole =
      roleFilter === 'All' || u.role === roleFilter;

    const matchStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Active'   &&  u.isActive) ||
      (statusFilter === 'Inactive' && !u.isActive);

    return matchSearch && matchRole && matchStatus;
  });

  // ─── Pagination ────────────────────────────────────────────────────────────

  // Total pages needed for the filtered result set
  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);

  // Slice out only the rows for the current page
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * USERS_PER_PAGE,
    currentPage * USERS_PER_PAGE
  );

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="um-layout">
      <Sidebar />

      <main className="um-main">

        {/* ── Page heading ──────────────────────────────────────────────────── */}
        <div className="um-page-header">
          <p className="um-breadcrumb">LIBRASYS USER ADMINISTRATION</p>
          <h1 className="um-page-title">User Management</h1>
          <p className="um-page-sub">
            Manage librarian and member accounts, roles, and account status.
          </p>
        </div>

        {/* ── Page-level error banner (API failures, status toggle errors, etc.) */}
        {pageError && (
          <div className="um-error-banner">{pageError}</div>
        )}

        {/* ── User table card ───────────────────────────────────────────────── */}
        <section className="um-table-card">

          {/* Topbar: title + search/filter toolbar */}
          <div className="um-table-topbar">
            <div>
              <p className="um-section-label">LIBRARY USERS</p>
              <h2 className="um-table-title">User List</h2>
              <p className="um-showing">
                Showing {filteredUsers.length} of {users.length} users
              </p>
            </div>

            <div className="um-toolbar">
              {/* Free-text search across name, email, and ID */}
              <input
                className="um-search"
                type="text"
                placeholder="Search name, email, or ID..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1); // reset to page 1 on every new search
                }}
              />

              {/* Filter by user role */}
              <select
                className="um-role-select"
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="All">All Roles</option>
                <option value="Librarian">Librarian</option>
                <option value="Member">Member</option>
              </select>

              {/* Filter by active / inactive status */}
              <select
                className="um-role-select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>

              <button className="um-add-btn" onClick={openAddModal}>
                + Add User
              </button>
            </div>
          </div>

          {/* Scrollable table wrapper — horizontal scroll on small screens */}
          <div className="um-table-wrap">
            <table className="um-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  /* Show a single spanning cell while the API call is in-flight */
                  <tr>
                    <td colSpan="7" className="um-empty">Loading users...</td>
                  </tr>
                ) : paginatedUsers.length === 0 ? (
                  /* No results after filtering */
                  <tr>
                    <td colSpan="7" className="um-empty">No users found.</td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => (
                    <tr key={user.UserID}>
                      <td className="um-td-id">#{user.UserID}</td>
                      <td className="um-td-name">{user.fullName}</td>
                      <td className="um-td-email">{user.email}</td>

                      {/* Colour-coded role badge */}
                      <td>
                        <span className={`um-role-badge ${user.role === 'Librarian' ? 'role-librarian' : 'role-member'}`}>
                          {user.role}
                        </span>
                      </td>

                      {/* Colour-coded active/inactive pill */}
                      <td>
                        <span className={`um-status-pill ${user.isActive ? 'pill-active' : 'pill-inactive'}`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Format the ISO date string into a locale-aware short date */}
                      <td className="um-td-date">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString()
                          : '—'}
                      </td>

                      {/* Row actions: toggle status, edit, delete */}
                      <td>
                        <div className="um-actions">
                          <button
                            className={`um-btn-action ${user.isActive ? 'btn-deactivate' : 'btn-activate'}`}
                            disabled={statusLoadingId === user.UserID}
                            onClick={() => handleToggleStatus(user)}
                          >
                            {statusLoadingId === user.UserID
                              ? 'Saving...'
                              : user.isActive
                                ? 'Deactivate'
                                : 'Activate'}
                          </button>

                          <button
                            className="um-btn-action btn-edit"
                            onClick={() => openEditModal(user)}
                          >
                            Edit
                          </button>

                          <button
                            className="um-btn-action btn-delete"
                            onClick={() => handleDelete(user.UserID)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination controls ──────────────────────────────────────────── */}
          <div className="um-pagination">
            <span className="um-pg-info">
              {/* Show 0 of 0 when there are no results */}
              Page {totalPages === 0 ? 0 : currentPage} of {totalPages}
            </span>

            <div className="um-pg-btns">
              {/* First page */}
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>«</button>
              {/* Previous page */}
              <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>‹</button>
              {/* Current page indicator */}
              <button className="active">{totalPages === 0 ? 0 : currentPage}</button>
              {/* Next page */}
              <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage((p) => p + 1)}>›</button>
              {/* Last page */}
              <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(totalPages)}>»</button>
            </div>
          </div>
        </section>

        {/* ── Add User Modal ────────────────────────────────────────────────── */}
        {showAddModal && (
          <div className="um-modal-overlay">
            <div className="um-modal">

              <div className="um-modal-header">
                <div>
                  <p className="um-panel-label">ADD USER</p>
                  <h2 className="um-panel-title">Create User</h2>
                </div>
                <button className="um-close-btn" onClick={closeModal}>×</button>
              </div>

              {/* Inline form feedback */}
              {formError   && <div className="um-panel-error">{formError}</div>}
              {formSuccess && <div className="um-panel-success">{formSuccess}</div>}

              <form onSubmit={handleAddUser}>
                <div className="um-form-row">
                  <div className="um-form-group">
                    <label>Full Name <span className="um-required">*</span></label>
                    <input
                      type="text"
                      value={newUser.fullName}
                      onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                      placeholder="e.g., John Smith"
                    />
                  </div>

                  <div className="um-form-group">
                    <label>Role <span className="um-required">*</span></label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    >
                      <option value="Member">Member</option>
                      <option value="Librarian">Librarian</option>
                    </select>
                  </div>
                </div>

                <div className="um-form-group">
                  <label>Email <span className="um-required">*</span></label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="e.g., user@email.com"
                  />
                </div>

                <div className="um-form-group">
                  <label>Password <span className="um-required">*</span></label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Minimum 6 characters"
                  />
                </div>

                <div className="um-form-actions">
                  <button type="button" className="um-cancel-btn" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="um-submit-btn">Add User</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Edit User Modal ───────────────────────────────────────────────── */}
        {editUser && (
          <div className="um-modal-overlay">
            <div className="um-modal">

              <div className="um-modal-header">
                <div>
                  <p className="um-panel-label">EDIT USER</p>
                  <h2 className="um-panel-title">Edit User</h2>
                </div>
                <button className="um-close-btn" onClick={closeModal}>×</button>
              </div>

              {/* Inline form feedback */}
              {formError   && <div className="um-panel-error">{formError}</div>}
              {formSuccess && <div className="um-panel-success">{formSuccess}</div>}

              <form onSubmit={handleEditUser}>
                <div className="um-form-row">
                  <div className="um-form-group">
                    <label>Full Name <span className="um-required">*</span></label>
                    <input
                      type="text"
                      value={editUser.fullName}
                      onChange={(e) => setEditUser({ ...editUser, fullName: e.target.value })}
                      placeholder="Full name"
                    />
                  </div>

                  <div className="um-form-group">
                    <label>Role <span className="um-required">*</span></label>
                    <select
                      value={editUser.role}
                      onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
                    >
                      <option value="Member">Member</option>
                      <option value="Librarian">Librarian</option>
                    </select>
                  </div>
                </div>

                <div className="um-form-group">
                  <label>Email <span className="um-required">*</span></label>
                  <input
                    type="email"
                    value={editUser.email}
                    onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                    placeholder="Email address"
                  />
                </div>

                <div className="um-form-actions">
                  <button type="button" className="um-cancel-btn" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="um-submit-btn">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default UserManagement;