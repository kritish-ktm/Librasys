import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

const API_BASE_URL = "http://localhost:5000";

const navItems = [
  {
    label: "Users",
    path: "/users",
    icon: "bi-people-fill",
  },
  {
    label: "Books",
    path: "/books",
    icon: "bi-book-fill",
  },
  {
    label: "Book Categories",
    path: "/categories",
    icon: "bi-folder-fill",
  },
  {
    label: "Loaned Books",
    path: "/loans",
    icon: "bi-list-check",
  },
  {
    label: "Fines",
    path: "/fines",
    icon: "bi-currency-dollar",
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
            Dashboard
          </h1>

          {name && (
            <p className="dashboard-welcome">
              Hii, {name} Have a nice day!
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
              <i className={`bi ${item.icon} dashboard-nav-icon-svg`}></i>
            </span>

            <span className="dashboard-nav-label">
              {item.label}
            </span>
          </button>
        ))}

      </div>

      

      

    </div>
  );
}

export default Dashboard;