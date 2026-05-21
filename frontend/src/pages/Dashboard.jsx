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

function getArrayData(data, keyName) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.[keyName])) return data[keyName];
  return [];
}

function getArrayCount(data, keyName) {
  return getArrayData(data, keyName).length;
}

function Dashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    users: 0,
    books: 0,
    categories: 0,
    loans: 0,
    fines: 0,
    borrowableBooks: 0,
    referenceBooks: 0,
    totalCopies: 0,
  });

  const [loading, setLoading] = useState(true);
  const adminName = localStorage.getItem("fullName") || "Admin Librarian";

  useEffect(() => {
    async function loadDashboardData() {
      const token = localStorage.getItem("token");

      const requestOptions = {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      };

      try {
        const [usersResponse, booksResponse, categoriesResponse, loansResponse, finesResponse] =
          await Promise.allSettled([
            fetch(`${API_BASE}/api/users`, requestOptions),
            fetch(`${API_BASE}/books`, requestOptions),
            fetch(`${API_BASE}/categories`, requestOptions),
            fetch(`${API_BASE}/loans`, requestOptions),
            fetch(`${API_BASE}/fines`, requestOptions),
          ]);

        async function safeJson(result) {
          if (result.status !== "fulfilled") return null;
          if (!result.value.ok) return null;
          return result.value.json();
        }

        const usersData = await safeJson(usersResponse);
        const booksData = await safeJson(booksResponse);
        const categoriesData = await safeJson(categoriesResponse);
        const loansData = await safeJson(loansResponse);
        const finesData = await safeJson(finesResponse);

        const booksArray = getArrayData(booksData, "books");
        const categoriesArray = getArrayData(categoriesData, "categories");

        const borrowableBooks = booksArray.filter((book) =>
          Boolean(book.IsBorrowable)
        ).length;

        const referenceBooks = booksArray.filter(
          (book) => !Boolean(book.IsBorrowable)
        ).length;

        const totalCopies = booksArray.reduce((sum, book) => {
          return sum + Number(book.AvailableCopies || 0);
        }, 0);

        setStats({
          users: getArrayCount(usersData, "users"),
          books: booksArray.length,
          categories: categoriesArray.length,
          loans: getArrayCount(loansData, "loans"),
          fines: getArrayCount(finesData, "fines"),
          borrowableBooks,
          referenceBooks,
          totalCopies,
        });
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
          stats.referenceBooks > 0
            ? "Reference books protected"
            : "No reference-only records",
        text:
          stats.referenceBooks > 0
            ? `${stats.referenceBooks} books are marked as reference-only and cannot be borrowed.`
            : "No books are currently marked as reference-only.",
        status: stats.referenceBooks > 0 ? "info" : "success",
        action: "Review Books",
        path: "/books",
      },
      {
        title:
          stats.loans > 0
            ? "Borrowing activity in progress"
            : "No active borrowing activity",
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
      label: "Borrowable Titles",
      value: stats.borrowableBooks,
      note: "Available for lending",
      icon: CheckCircle2,
      tone: "green",
    },
    {
      label: "Reference Items",
      value: stats.referenceBooks,
      note: "Not available for borrowing",
      icon: ShieldCheck,
      tone: stats.referenceBooks > 0 ? "orange" : "green",
    },
    {
      label: "Total Copies",
      value: stats.totalCopies,
      note: "Copies across all books",
      icon: Database,
      tone: "green",
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
    localStorage.removeItem("name");
    localStorage.removeItem("fullName");
    localStorage.removeItem("userId");
    navigate("/login", { replace: true });
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
              Welcome back, {adminName}. Monitor catalogue health, review
              priority issues, and manage LibraSys operations from one workspace.
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

        <section className="library-snapshot-section">
          <div className="library-snapshot-copy">
            <span className="section-kicker">Live System Preview</span>
            <h2>Library Snapshot</h2>
            <p>
              A quick overview of the collection structure, availability, and
              catalogue coverage inside LibraSys.
            </p>
          </div>

          <div className="library-snapshot-grid">
            <article className="library-snapshot-card">
              <div className="stat-icon green">
                <Database size={30} />
              </div>
              <h3>{loading ? "..." : stats.books}</h3>
              <p>Books Managed</p>
            </article>

            <article className="library-snapshot-card">
              <div className="stat-icon green">
                <Folder size={30} />
              </div>
              <h3>{loading ? "..." : stats.categories}</h3>
              <p>Core Categories</p>
            </article>

            <article className="library-snapshot-card">
              <div className="stat-icon green">
                <CheckCircle2 size={30} />
              </div>
              <h3>{loading ? "..." : stats.borrowableBooks}</h3>
              <p>Borrowable Titles</p>
            </article>

            <article className="library-snapshot-card">
              <div className="stat-icon orange">
                <ShieldCheck size={30} />
              </div>
              <h3>{loading ? "..." : stats.referenceBooks}</h3>
              <p>Reference Items</p>
            </article>
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
                <strong>{loading ? "..." : stats.books}</strong>
              </div>

              <div className="health-row">
                <div>
                  <CheckCircle2 size={21} />
                  <span>Borrowable titles</span>
                </div>
                <strong>{loading ? "..." : stats.borrowableBooks}</strong>
              </div>

              <div className="health-row">
                <div>
                  <ShieldCheck size={21} />
                  <span>Reference-only items</span>
                </div>
                <strong>{loading ? "..." : stats.referenceBooks}</strong>
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
                <p>
                  Catalogue contains {loading ? "..." : stats.books} book
                  records across {loading ? "..." : stats.categories} categories.
                </p>
              </div>
              <div className="activity-item">
                <span></span>
                <p>
                  {loading ? "..." : stats.borrowableBooks} titles are available
                  for borrowing.
                </p>
              </div>
              <div className="activity-item">
                <span></span>
                <p>
                  {loading ? "..." : stats.referenceBooks} reference items are
                  protected from normal borrowing.
                </p>
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
