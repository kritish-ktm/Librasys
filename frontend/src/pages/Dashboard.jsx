import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Folder,
  Users,
  ClipboardList,
  ReceiptText,
  LayoutDashboard,
  ArrowRight,
  Plus,
  AlertCircle,
  CheckCircle2,
  Activity,
  ShieldCheck,
  SearchCheck,
  Database,
  LogOut,
} from "lucide-react";
import "./Dashboard.css";

const API_BASE = "http://localhost:5000";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Users", path: "/users", icon: Users },
  { label: "Books", path: "/books", icon: BookOpen },
  { label: "Categories", path: "/categories", icon: Folder },
  { label: "Loaned Books", path: "/loaned-books", icon: ClipboardList },
  { label: "Fines", path: "/fines", icon: ReceiptText },
];

const QUICK_ACTIONS = [
  { label: "Add Book", path: "/books", icon: Plus },
  { label: "Create Category", path: "/categories", icon: Folder },
  { label: "Manage Users", path: "/users", icon: Users },
  { label: "Review Loans", path: "/loaned-books", icon: ClipboardList },
];

function getArrayCount(data) {
  if (Array.isArray(data)) return data.length;
  if (Array.isArray(data?.data)) return data.data.length;
  if (Array.isArray(data?.users)) return data.users.length;
  if (Array.isArray(data?.books)) return data.books.length;
  if (Array.isArray(data?.categories)) return data.categories.length;
  if (Array.isArray(data?.loans)) return data.loans.length;
  if (Array.isArray(data?.fines)) return data.fines.length;
  return 0;
}

function Dashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    users: 0,
    books: 0,
    categories: 0,
    loans: 0,
    fines: 0,
  });

  const [loading, setLoading] = useState(true);
  const adminName = localStorage.getItem("fullName") || "Admin Librarian";

  useEffect(() => {
    async function loadDashboardData() {
      const token = localStorage.getItem("token");

      const requestOptions = {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      };

      const endpoints = {
        users: `${API_BASE}/api/users`,
        books: `${API_BASE}/books`,
        categories: `${API_BASE}/categories`,
        loans: `${API_BASE}/loans`,
        fines: `${API_BASE}/fines`,
      };

      try {
        const results = await Promise.allSettled(
          Object.entries(endpoints).map(async ([key, url]) => {
            const response = await fetch(url, requestOptions);
            if (!response.ok) return [key, 0];

            const data = await response.json();
            return [key, getArrayCount(data)];
          })
        );

        const nextStats = {
          users: 0,
          books: 0,
          categories: 0,
          loans: 0,
          fines: 0,
        };

        results.forEach((result) => {
          if (result.status === "fulfilled") {
            const [key, value] = result.value;
            nextStats[key] = value;
          }
        });

        setStats(nextStats);
      } catch (error) {
        console.error("Dashboard data failed to load:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const priorityItems = useMemo(() => {
    return [
      {
        title:
          stats.categories === 0
            ? "Category setup required"
            : "Category structure active",
        text:
          stats.categories === 0
            ? "No categories are currently configured. Set up categories before expanding the catalogue."
            : `${stats.categories} categories are available for organising the catalogue.`,
        status: stats.categories === 0 ? "warning" : "success",
        action: "Review Categories",
        path: "/categories",
      },
      {
        title:
          stats.books === 0
            ? "Catalogue records missing"
            : "Catalogue records available",
        text:
          stats.books === 0
            ? "No book records are currently stored in the system."
            : `${stats.books} book records are currently stored in LibraSys.`,
        status: stats.books === 0 ? "warning" : "success",
        action: "Review Books",
        path: "/books",
      },
      {
        title:
          stats.loans > 0 ? "Borrowing activity in progress" : "No active borrowing activity",
        text:
          stats.loans > 0
            ? `${stats.loans} loan records are currently being tracked.`
            : "There are currently no active loan records requiring review.",
        status: stats.loans > 0 ? "info" : "success",
        action: "View Loans",
        path: "/loaned-books",
      },
      {
        title: stats.fines > 0 ? "Fine records need review" : "Fine activity clear",
        text:
          stats.fines > 0
            ? `${stats.fines} fine records are currently stored in the system.`
            : "No fine records are currently waiting for attention.",
        status: stats.fines > 0 ? "warning" : "success",
        action: "View Fines",
        path: "/fines",
      },
    ];
  }, [stats]);

  const statCards = [
    {
      label: "Total Users",
      value: stats.users,
      note: "Registered accounts",
      icon: Users,
      tone: "green",
    },
    {
      label: "Book Records",
      value: stats.books,
      note: "Catalogue entries",
      icon: BookOpen,
      tone: "green",
    },
    {
      label: "Categories",
      value: stats.categories,
      note: stats.categories === 0 ? "Needs setup" : "Book groups",
      icon: Folder,
      tone: stats.categories === 0 ? "orange" : "green",
    },
    {
      label: "Active Loans",
      value: stats.loans,
      note: "Borrowing records",
      icon: ClipboardList,
      tone: "green",
    },
    {
      label: "Fine Records",
      value: stats.fines,
      note: "Payment tracking",
      icon: ReceiptText,
      tone: stats.fines > 0 ? "orange" : "green",
    },
  ];

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("fullName");
    navigate("/login");
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-icon">
            <BookOpen size={34} />
          </div>
          <div>
            <h2>LibraSys</h2>
            <p>Library Management</p>
          </div>
        </div>

        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className={`admin-nav-item ${
                  item.label === "Dashboard" ? "active" : ""
                }`}
                onClick={() => navigate(item.path)}
              >
                <Icon size={22} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="admin-profile-card">
          <div className="admin-avatar">AL</div>
          <div>
            <h3>{adminName}</h3>
            <p>Librarian</p>
          </div>
        </div>

        <button className="admin-logout" onClick={handleLogout}>
          <LogOut size={20} />
          Logout
        </button>
      </aside>

      <main className="admin-main">
        <section className="dashboard-hero">
          <div>
            <div className="workspace-pill">Staff Workspace</div>
            <h1>Dashboard</h1>
            <p>
              Welcome back, {adminName}. Monitor catalogue health, review priority
              issues, and manage LibraSys operations from one workspace.
            </p>
          </div>

          <div className="live-status-card">
            <Activity size={22} />
            <div>
              <strong>Live overview</strong>
              <span>{loading ? "Loading data..." : "Updated just now"}</span>
            </div>
          </div>
        </section>

        <section className="stats-grid">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.label} className="stat-card">
                <div className={`stat-icon ${card.tone}`}>
                  <Icon size={32} />
                </div>
                <div>
                  <span>{card.label}</span>
                  <h2>{loading ? "..." : card.value}</h2>
                  <p>{card.note}</p>
                </div>
              </article>
            );
          })}
        </section>

        <section className="dashboard-core-grid">
          <article className="priority-board">
            <div className="section-heading-row">
              <div>
                <span className="section-kicker">Operational Focus</span>
                <h2>Today’s Priority Board</h2>
              </div>
              <AlertCircle size={28} />
            </div>

            <div className="priority-list">
              {priorityItems.map((item) => (
                <div key={item.title} className="priority-item">
                  <div className={`priority-status ${item.status}`}>
                    {item.status === "success" ? (
                      <CheckCircle2 size={20} />
                    ) : (
                      <AlertCircle size={20} />
                    )}
                  </div>

                  <div className="priority-copy">
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </div>

                  <button
                    className="priority-action"
                    onClick={() => navigate(item.path)}
                  >
                    {item.action}
                    <ArrowRight size={18} />
                  </button>
                </div>
              ))}
            </div>
          </article>

          <aside className="quick-actions-panel">
            <div className="section-heading-row compact">
              <div>
                <span className="section-kicker">Shortcuts</span>
                <h2>Quick Actions</h2>
              </div>
            </div>

            <div className="quick-actions-list">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    className="quick-action"
                    onClick={() => navigate(action.path)}
                  >
                    <Icon size={22} />
                    <span>{action.label}</span>
                    <ArrowRight size={18} />
                  </button>
                );
              })}
            </div>
          </aside>
        </section>

        <section className="dashboard-secondary-grid">
          <article className="catalogue-health-card">
            <div className="section-heading-row">
              <div>
                <span className="section-kicker">Data Quality</span>
                <h2>Catalogue Health</h2>
              </div>
              <Database size={26} />
            </div>

            <div className="health-checks">
              <div className="health-row">
                <div>
                  <SearchCheck size={21} />
                  <span>ISBN validation</span>
                </div>
                <strong>Active</strong>
              </div>

              <div className="health-row">
                <div>
                  <ShieldCheck size={21} />
                  <span>Borrowable status control</span>
                </div>
                <strong>Active</strong>
              </div>

              <div className="health-row">
                <div>
                  <BookOpen size={21} />
                  <span>Book records stored</span>
                </div>
                <strong>{stats.books}</strong>
              </div>

              <div className={`health-row ${stats.categories === 0 ? "needs-review" : ""}`}>
                <div>
                  <Folder size={21} />
                  <span>Category assignment</span>
                </div>
                <strong>{stats.categories === 0 ? "Review" : "Ready"}</strong>
              </div>
            </div>
          </article>

          <article className="activity-card">
            <div className="section-heading-row">
              <div>
                <span className="section-kicker">System Movement</span>
                <h2>Recent System Activity</h2>
              </div>
              <Activity size={26} />
            </div>

            <div className="activity-list">
              <div className="activity-item">
                <span></span>
                <p>Dashboard statistics loaded from system records.</p>
              </div>
              <div className="activity-item">
                <span></span>
                <p>Catalogue module available for book record management.</p>
              </div>
              <div className="activity-item">
                <span></span>
                <p>Loan and fine modules ready for librarian review.</p>
              </div>
              <div className="activity-item">
                <span></span>
                <p>User access area available for account management.</p>
              </div>
            </div>
          </article>
        </section>

        <section className="workflow-section">
          <div className="workflow-header">
            <div>
              <span className="section-kicker">Connected Modules</span>
              <h2>Library Workflow</h2>
            </div>
            <p>
              Move through the main administrative process without repeating the
              same boring card wall humanity keeps inventing.
            </p>
          </div>

          <div className="workflow-grid">
            <article className="workflow-group">
              <span>Catalogue Setup</span>
              <div className="workflow-chain">
                <button onClick={() => navigate("/categories")}>
                  <Folder size={22} />
                  Categories
                </button>
                <ArrowRight size={22} />
                <button onClick={() => navigate("/books")}>
                  <BookOpen size={22} />
                  Books
                </button>
              </div>
            </article>

            <article className="workflow-group">
              <span>Account Control</span>
              <div className="workflow-chain single">
                <button onClick={() => navigate("/users")}>
                  <Users size={22} />
                  Users
                </button>
              </div>
            </article>

            <article className="workflow-group">
              <span>Borrowing Cycle</span>
              <div className="workflow-chain">
                <button onClick={() => navigate("/loaned-books")}>
                  <ClipboardList size={22} />
                  Loaned Books
                </button>
                <ArrowRight size={22} />
                <button onClick={() => navigate("/fines")}>
                  <ReceiptText size={22} />
                  Fines
                </button>
              </div>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;