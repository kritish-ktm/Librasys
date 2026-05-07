import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

const API_BASE_URL = "http://localhost:5000";

const navItems = [
  {
    label: "Users",
    path: "/users",
    icon: "👤",
  },
  {
    label: "Books",
    path: "/books",
    icon: "📚",
  },
  {
    label: "Book Categories",
    path: "/categories",
    icon: "🗂️",
  },
  {
    label: "Loaned Books",
    path: "/loans",
    icon: "📖",
  },
  {
    label: "Fines",
    path: "/fines",
    icon: "💰",
  },
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
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
        {
          isActive: current ? 0 : 1,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setUsers(
        users.map((user) =>
          user.UserID === id
            ? {
                ...user,
                IsActive: current ? 0 : 1,
              }
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
    <div className="dashboard-page">

      {/* TOP BAR */}
      <div className="dashboard-topbar">

        <div>
          <h1 className="dashboard-title">
            LibraSys Dashboard
          </h1>

          {name && (
            <p className="dashboard-welcome">
              Welcome, {name}
            </p>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="dashboard-logout-btn"
        >
          Logout
        </button>

      </div>

      {/* NAVIGATION */}
      <div className="dashboard-nav-grid">

        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="dashboard-nav-card"
          >
            <span className="dashboard-nav-icon">
              {item.icon}
            </span>

            <span className="dashboard-nav-label">
              {item.label}
            </span>
          </button>
        ))}

      </div>

      {/* USER SECTION */}
      <div className="dashboard-section">

        <h2 className="dashboard-section-title">
          User Overview
        </h2>

        <input
          className="dashboard-search"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="dashboard-table-wrapper">

          <table className="dashboard-table">

            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Registered</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>

              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="dashboard-empty">
                    No users found.
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.UserID}>

                    <td>{user.UserID}</td>

                    <td>{user.FullName}</td>

                    <td>{user.Email}</td>

                    <td>{user.Role}</td>

                    <td>
                      {user.IsActive
                        ? "Active"
                        : "Inactive"}
                    </td>

                    <td>
                      {user.DateRegistered
                        ? new Date(
                            user.DateRegistered
                          ).toLocaleDateString()
                        : ""}
                    </td>

                    <td>
                      <button
                        onClick={() =>
                          toggleStatus(
                            user.UserID,
                            user.IsActive
                          )
                        }
                        className={
                          user.IsActive
                            ? "dashboard-status-btn deactivate"
                            : "dashboard-status-btn activate"
                        }
                      >
                        {user.IsActive
                          ? "Deactivate"
                          : "Activate"}
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

export default Dashboard;