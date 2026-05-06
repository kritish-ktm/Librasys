import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "http://localhost:5000";

const navItems = [
  { label: "Users", path: "/users", color: "#4a90e2", icon: "👤" },
  { label: "Books", path: "/books", color: "#27ae60", icon: "📚" },
  { label: "Book Categories", path: "/categories", color: "#8e44ad", icon: "🗂️" },
  { label: "Loaned Books", path: "/loans", color: "#e67e22", icon: "📖" },
  { label: "Fines", path: "/fines", color: "#e74c3c", icon: "💰" },
];

function Dashboard() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const name = localStorage.getItem("name");

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setUsers(res.data))
      .catch((err) => {
        console.error("Failed to load users:", err);
      });
  }, [token]);

  const toggleStatus = async (id, current) => {
    try {
      await axios.put(
        `${API_BASE_URL}/api/users/${id}/status`,
        { isActive: current ? 0 : 1 },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setUsers(
        users.map((user) =>
          user.UserID === id
            ? { ...user, IsActive: current ? 0 : 1 }
            : user
        )
      );
    } catch (err) {
      console.error("Failed to update user status:", err);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const filtered = users.filter((user) => {
    const fullName = user.FullName || "";
    const email = user.Email || "";

    return (
      fullName.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <div>
          <h2 style={styles.title}>📘 LibraSys Dashboard</h2>
          {name && (
            <p style={styles.welcomeText}>Welcome, {name}</p>
          )}
        </div>

        <button onClick={handleLogout} style={styles.logoutBtn}>
          Logout
        </button>
      </div>

      <div style={styles.navGrid}>
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{ ...styles.navCard, background: item.color }}
          >
            <span style={styles.navIcon}>{item.icon}</span>
            <span style={styles.navLabel}>{item.label}</span>
          </button>
        ))}
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>User Overview</h3>

        <input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.search}
        />

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeaderRow}>
                <th style={th}>ID</th>
                <th style={th}>Name</th>
                <th style={th}>Email</th>
                <th style={th}>Role</th>
                <th style={th}>Status</th>
                <th style={th}>Registered</th>
                <th style={th}>Action</th>
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" style={styles.emptyMessage}>
                    No users found.
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.UserID} style={styles.tableRow}>
                    <td style={td}>{user.UserID}</td>
                    <td style={td}>{user.FullName}</td>
                    <td style={td}>{user.Email}</td>
                    <td style={td}>{user.Role}</td>
                    <td style={td}>
                      {user.IsActive ? "Active" : "Inactive"}
                    </td>
                    <td style={td}>
                      {user.DateRegistered
                        ? new Date(user.DateRegistered).toLocaleDateString()
                        : ""}
                    </td>
                    <td style={td}>
                      <button
                        onClick={() =>
                          toggleStatus(user.UserID, user.IsActive)
                        }
                        style={{
                          ...styles.statusBtn,
                          background: user.IsActive ? "#e74c3c" : "#2ecc71",
                        }}
                      >
                        {user.IsActive ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))
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
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
    background: "white",
    padding: "1rem 1.5rem",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  title: {
    margin: 0,
  },
  welcomeText: {
    margin: "4px 0 0",
    color: "#555",
    fontSize: "14px",
  },
  logoutBtn: {
    padding: "8px 18px",
    background: "#e74c3c",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  navGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "12px",
    marginBottom: "1.5rem",
  },
  navCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    padding: "20px 12px",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    color: "white",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    transition: "opacity 0.2s",
  },
  navIcon: {
    fontSize: "28px",
  },
  navLabel: {
    fontSize: "14px",
    fontWeight: "bold",
  },
  section: {
    background: "white",
    borderRadius: "8px",
    padding: "1.5rem",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  sectionTitle: {
    marginBottom: "12px",
  },
  search: {
    padding: "10px",
    width: "300px",
    marginBottom: "1rem",
    border: "1px solid #ccc",
    borderRadius: "5px",
    fontSize: "14px",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  tableHeaderRow: {
    background: "#4a90e2",
    color: "white",
  },
  tableRow: {
    borderBottom: "1px solid #eee",
  },
  emptyMessage: {
    padding: "20px",
    textAlign: "center",
    color: "#888",
  },
  statusBtn: {
    padding: "5px 10px",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
};

const th = {
  padding: "12px",
  textAlign: "left",
  fontWeight: "600",
};

const td = {
  padding: "10px",
};

export default Dashboard;