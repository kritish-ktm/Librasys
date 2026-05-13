import { useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  ClipboardList,
  FolderOpen,
  Home,
  LogOut,
  Receipt,
  UsersRound,
} from "lucide-react";
import "../styles/dashboard.css";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: Home },
  { label: "Users", path: "/users", icon: UsersRound },
  { label: "Books", path: "/books", icon: BookOpen },
  { label: "Categories", path: "/categories", icon: FolderOpen },
  { label: "Loaned Books", path: "/loans", icon: ClipboardList },
  { label: "Fines", path: "/fines", icon: Receipt },
];

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const name = localStorage.getItem("name") || "Arun Shrestha";

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <aside className="app-sidebar">
      <button type="button" className="app-brand" onClick={() => navigate("/dashboard")}>
        <BookOpen size={36} />
        <span>
          <strong>LibraSys</strong>
          <small>Library Management</small>
        </span>
      </button>

      <nav className="app-nav" aria-label="Main navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.path}
              type="button"
              className={isActive ? "active" : ""}
              onClick={() => navigate(item.path)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="app-sidebar-user">
        <span>{getInitials(name)}</span>
        <div>
          <strong>{name}</strong>
          <small>Librarian</small>
        </div>
      </div>

      <button type="button" className="app-logout" onClick={handleLogout}>
        <LogOut size={18} />
        <span>Logout</span>
      </button>
    </aside>
  );
}

function getInitials(name) {
  return String(name || "LS")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default Sidebar;
