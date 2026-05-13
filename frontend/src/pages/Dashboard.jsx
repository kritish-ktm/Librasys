import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  ClipboardList,
  FolderOpen,
  Receipt,
  UsersRound,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";
import DashboardCard from "../components/DashboardCard";
import "../styles/dashboard.css";

const API_BASE_URL = "http://localhost:5000";

const moduleCards = [
  {
    title: "Users",
    description: "Manage members and librarian accounts.",
    path: "/users",
    icon: UsersRound,
  },
  {
    title: "Books",
    description: "Add, update, and track book records.",
    path: "/books",
    icon: BookOpen,
  },
  {
    title: "Categories",
    description: "Organize books by category and Dewey code.",
    path: "/categories",
    icon: FolderOpen,
  },
  {
    title: "Loaned Books",
    description: "Create loans, returns, overdue filters, and history.",
    path: "/loans",
    icon: ClipboardList,
  },
  {
    title: "Fines",
    description: "Review paid and unpaid fine records.",
    path: "/fines",
    icon: Receipt,
  },
];

function Dashboard() {
  const navigate = useNavigate();
  const name = localStorage.getItem("name");
  const token = localStorage.getItem("token");
  const [stats, setStats] = useState({
    users: 0,
    books: 0,
    categories: 0,
    activeLoans: 0,
    fines: 0,
  });

  useEffect(() => {
    const authHeader = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

    const loadDashboardStats = async () => {
      const [users, books, categories, loans, fines] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/api/users`, authHeader),
        axios.get(`${API_BASE_URL}/books`),
        axios.get(`${API_BASE_URL}/categories`, authHeader),
        axios.get(`${API_BASE_URL}/loans`, { params: { status: "all", page: 1, limit: 1 } }),
        axios.get(`${API_BASE_URL}/api/fines`),
      ]);

      setStats({
        users: Array.isArray(users.value?.data) ? users.value.data.length : 0,
        books: Array.isArray(books.value?.data) ? books.value.data.length : 0,
        categories: Array.isArray(categories.value?.data)
          ? categories.value.data.length
          : Array.isArray(categories.value?.data?.data)
            ? categories.value.data.data.length
            : 0,
        activeLoans: loans.value?.data?.summary?.active || 0,
        fines: Array.isArray(fines.value?.data) ? fines.value.data.length : 0,
      });
    };

    loadDashboardStats();
  }, [token]);

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="app-main">
        <header className="app-page-heading">
          <h1>Dashboard</h1>
          <p>{name ? `Hi, ${name}. Manage LibraSys modules from one place.` : "Manage LibraSys modules from one place."}</p>
        </header>

        <section className="app-stats-grid" aria-label="Dashboard summary">
          <StatCard title="Total Users" value={stats.users} detail="Registered accounts" icon={UsersRound} />
          <StatCard title="Books" value={stats.books} detail="Library records" icon={BookOpen} />
          <StatCard title="Categories" value={stats.categories} detail="Book groups" icon={FolderOpen} />
          <StatCard title="Active Loans" value={stats.activeLoans} detail="Currently borrowed" icon={ClipboardList} />
          <StatCard title="Fines" value={stats.fines} detail="Fine records" icon={Receipt} tone="orange" />
        </section>

        <section className="dashboard-module-grid" aria-label="Module navigation">
          {moduleCards.map((card) => (
            <DashboardCard
              key={card.path}
              title={card.title}
              description={card.description}
              icon={card.icon}
              onClick={() => navigate(card.path)}
            />
          ))}
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
