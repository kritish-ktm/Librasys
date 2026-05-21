import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Database,
  Folder,
  Plus,
  ReceiptText,
  SearchCheck,
  ShieldCheck,
  Users,
} from "lucide-react";
import LoadingOverlay from "../components/LoadingOverlay";
import Sidebar from "../components/Sidebar";
import "./Dashboard.css";

const API_BASE = "http://localhost:5000";

const QUICK_ACTIONS = [
  { label: "Add Book", path: "/books", icon: Plus },
  { label: "Create Category", path: "/categories", icon: Folder },
  { label: "Manage Users", path: "/users", icon: Users },
  { label: "Review Loans", path: "/loans", icon: ClipboardList },
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

  // Dashboard summary values loaded from the backend.
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

  // Loading state uses the shared admin loading overlay.
  const [loading, setLoading] = useState(true);
  const adminName =
    localStorage.getItem("fullName") ||
    localStorage.getItem("name") ||
    "Admin Librarian";

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
        path: "/loans",
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
      tone: "total",
    },
    {
      label: "Book Records",
      value: stats.books,
      note: "Catalogue entries",
      icon: BookOpen,
      tone: "books",
    },
    {
      label: "Categories",
      value: stats.categories,
      note: stats.categories === 0 ? "Needs setup" : "Book groups",
      icon: Folder,
      tone: stats.categories === 0 ? "warning" : "categories",
    },
    {
      label: "Borrowable Titles",
      value: stats.borrowableBooks,
      note: "Available for lending",
      icon: CheckCircle2,
      tone: "borrowable",
    },
    {
      label: "Reference Items",
      value: stats.referenceBooks,
      note: "Not available for borrowing",
      icon: ShieldCheck,
      tone: "reference",
    },
    {
      label: "Total Copies",
      value: stats.totalCopies,
      note: "Copies across all books",
      icon: Database,
      tone: "copies",
    },
    {
      label: "Active Loans",
      value: stats.loans,
      note: "Borrowing records",
      icon: ClipboardList,
      tone: "loans",
    },
    {
      label: "Fine Records",
      value: stats.fines,
      note: "Payment tracking",
      icon: ReceiptText,
      tone: stats.fines > 0 ? "warning" : "fines",
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
    <div className="dashboard-shell">
      <LoadingOverlay
        show={loading}
        message="Loading Dashboard..."
        subtext="Fetching latest library information..."
      />

      <Sidebar />

      <main className="dashboard-page">
        <section className="dashboard-hero">
          <div>
            <p className="dashboard-kicker">LIBRARY ADMINISTRATION</p>
            <h1>Dashboard</h1>
            <p className="dashboard-hero-text">
              Welcome back, {adminName}. Monitor catalogue health, review
              priority items, and manage LibraSys operations from one workspace.
            </p>
          </div>

          <div className="dashboard-live-card">
            <Activity size={22} />
            <span>
              <strong>Live overview</strong>
              <small>{loading ? "Loading data..." : "Updated just now"}</small>
            </span>
          </div>
        </section>

        <section className="dashboard-stats-grid" aria-label="Dashboard summary">
          {statCards.map((card) => (
            <StatCard key={card.label} card={card} loading={loading} />
          ))}
        </section>

        <section className="dashboard-content-grid">
          <article className="dashboard-panel dashboard-priority-panel">
            <div className="dashboard-panel-header">
              <div>
                <p className="dashboard-kicker">OPERATIONAL FOCUS</p>
                <h2>Priority Board</h2>
                <span>Quick checks based on current system records.</span>
              </div>
              <AlertCircle size={24} />
            </div>

            <div className="dashboard-priority-list">
              {priorityItems.map((item) => (
                <div key={item.title} className="dashboard-priority-item">
                  <span className={`dashboard-priority-status ${item.status}`}>
                    {item.status === "success" ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <AlertCircle size={18} />
                    )}
                  </span>

                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </div>

                  <button
                    type="button"
                    className="dashboard-link-button"
                    onClick={() => navigate(item.path)}
                  >
                    {item.action}
                    <ArrowRight size={16} />
                  </button>
                </div>
              ))}
            </div>
          </article>

          <aside className="dashboard-panel dashboard-actions-panel">
            <div className="dashboard-panel-header">
              <div>
                <p className="dashboard-kicker">SHORTCUTS</p>
                <h2>Quick Actions</h2>
                <span>Open common admin tasks faster.</span>
              </div>
            </div>

            <div className="dashboard-actions-list">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;

                return (
                  <button
                    key={action.label}
                    type="button"
                    className="dashboard-action"
                    onClick={() => navigate(action.path)}
                  >
                    <Icon size={20} />
                    <span>{action.label}</span>
                    <ArrowRight size={16} />
                  </button>
                );
              })}
            </div>
          </aside>
        </section>

        <section className="dashboard-secondary-grid">
          <article className="dashboard-panel">
            <div className="dashboard-panel-header">
              <div>
                <p className="dashboard-kicker">DATA QUALITY</p>
                <h2>Catalogue Health</h2>
                <span>Useful checks for book record management.</span>
              </div>
              <Database size={24} />
            </div>

            <div className="dashboard-health-list">
              <HealthRow icon={SearchCheck} label="ISBN validation" value="Active" />
              <HealthRow
                icon={ShieldCheck}
                label="Borrowable status control"
                value="Active"
              />
              <HealthRow
                icon={BookOpen}
                label="Book records stored"
                value={loading ? "..." : stats.books}
              />
              <HealthRow
                icon={CheckCircle2}
                label="Borrowable titles"
                value={loading ? "..." : stats.borrowableBooks}
              />
              <HealthRow
                icon={ShieldCheck}
                label="Reference-only items"
                value={loading ? "..." : stats.referenceBooks}
              />
              <HealthRow
                icon={Folder}
                label="Category assignment"
                value={stats.categories === 0 ? "Review" : "Ready"}
                warning={stats.categories === 0}
              />
            </div>
          </article>

          <article className="dashboard-panel">
            <div className="dashboard-panel-header">
              <div>
                <p className="dashboard-kicker">SYSTEM MOVEMENT</p>
                <h2>Recent Activity</h2>
                <span>Current activity calculated from dashboard data.</span>
              </div>
              <Activity size={24} />
            </div>

            <div className="dashboard-activity-list">
              <ActivityItem text="Dashboard statistics loaded from system records." />
              <ActivityItem
                text={`Catalogue contains ${
                  loading ? "..." : stats.books
                } book records across ${
                  loading ? "..." : stats.categories
                } categories.`}
              />
              <ActivityItem
                text={`${
                  loading ? "..." : stats.borrowableBooks
                } titles are available for borrowing.`}
              />
              <ActivityItem
                text={`${
                  loading ? "..." : stats.referenceBooks
                } reference items are protected from normal borrowing.`}
              />
            </div>
          </article>
        </section>

        <section className="dashboard-panel dashboard-workflow-panel">
          <div className="dashboard-panel-header">
            <div>
              <p className="dashboard-kicker">CONNECTED MODULES</p>
              <h2>Library Workflow</h2>
              <span>Move through the main administrative process.</span>
            </div>
          </div>

          <div className="dashboard-workflow-grid">
            <WorkflowGroup
              title="Catalogue Setup"
              items={[
                { label: "Categories", path: "/categories", icon: Folder },
                { label: "Books", path: "/books", icon: BookOpen },
              ]}
              navigate={navigate}
            />
            <WorkflowGroup
              title="Account Control"
              items={[{ label: "Users", path: "/users", icon: Users }]}
              navigate={navigate}
            />
            <WorkflowGroup
              title="Borrowing Cycle"
              items={[
                { label: "Loaned Books", path: "/loans", icon: ClipboardList },
                { label: "Fines", path: "/fines", icon: ReceiptText },
              ]}
              navigate={navigate}
            />
          </div>
        </section>
      </main>
    </div>
  );
}


export default Dashboard;

function StatCard({ card, loading }) {
  const Icon = card.icon;

  return (
    <article className={`dashboard-stat-card ${card.tone}`}>
      <span className="dashboard-stat-icon">
        <Icon size={30} strokeWidth={2.1} />
      </span>
      <span>
        <small>{card.label}</small>
        <strong>{loading ? "..." : card.value}</strong>
        <em>{card.note}</em>
      </span>
    </article>
  );
}

function HealthRow({ icon: Icon, label, value, warning = false }) {
  return (
    <div className={`dashboard-health-row ${warning ? "warning" : ""}`}>
      <span>
        <Icon size={19} />
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}

function ActivityItem({ text }) {
  return (
    <div className="dashboard-activity-item">
      <span />
      <p>{text}</p>
    </div>
  );
}

function WorkflowGroup({ title, items, navigate }) {
  return (
    <article className="dashboard-workflow-group">
      <span>{title}</span>
      <div className="dashboard-workflow-chain">
        {items.map((item, index) => {
          const Icon = item.icon;

          return (
            <div className="dashboard-workflow-step" key={item.label}>
              {index > 0 && <ArrowRight size={18} />}
              <button type="button" onClick={() => navigate(item.path)}>
                <Icon size={19} />
                {item.label}
              </button>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export default Dashboard;

