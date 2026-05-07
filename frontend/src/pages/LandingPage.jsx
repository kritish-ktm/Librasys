import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Users,
  ShieldCheck,
  Eye,
  LayoutGrid,
  BarChart3,
  ChevronRight,
  Library,
} from "lucide-react";
import Footer from "../components/Footer";
import "./LandingPage.css";

const features = [
  {
    icon: <BookOpen size={28} />,
    title: "Book Management",
    description:
      "Add, edit, and organise the entire library catalogue with ISBN tracking, category tagging, and copy counts.",
  },
  {
    icon: <BarChart3 size={28} />,
    title: "Loan & Fine Tracking",
    description:
      "Monitor active loans, due dates, and overdue fines across all borrowers from a single management view.",
  },
  {
    icon: <ShieldCheck size={28} />,
    title: "User & Role Management",
    description:
      "Manage member accounts and assign roles — guest, registered user, or librarian — with appropriate access levels.",
  },
  {
    icon: <Eye size={28} />,
    title: "Browse as Guest",
    description:
      "Visitors can explore the library catalogue freely without an account, then register to unlock borrowing.",
  },
  {
    icon: <LayoutGrid size={28} />,
    title: "Category Organisation",
    description:
      "Structure your collection with a flexible category system that makes discovery fast and intuitive.",
  },
  {
    icon: <Users size={28} />,
    title: "Librarian Dashboard",
    description:
      "A dedicated control centre giving librarians instant visibility over inventory, loans, users, and fines.",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="lp-root">
      {/* HEADER */}
      <header className="lp-header">
        <div className="lp-header-inner">
          <div className="lp-logo">
            <Library size={26} className="lp-logo-icon" />
            <span className="lp-logo-text">LibraSys</span>
          </div>

          <nav className="lp-nav">
            <button
              className="lp-nav-ghost"
              onClick={() => navigate("/browse-categories")}
            >
              Browse Books
            </button>

            <button
              className="lp-nav-ghost"
              onClick={() => navigate("/register")}
            >
              Register
            </button>

            <button
              className="lp-nav-cta"
              onClick={() => navigate("/login")}
            >
              Login
            </button>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-hero-bg-shape" aria-hidden="true" />

        <div className="lp-hero-content">
          <span className="lp-hero-badge">
            Library Management System
          </span>

          <h1 className="lp-hero-heading">
            The smarter way to
            <br />
            <span className="lp-hero-accent">
              run your library.
            </span>
          </h1>

          <p className="lp-hero-sub">
            LibraSys brings books, borrowers, and librarians
            together in one organised, role-based platform —
            built for real library operations.
          </p>

          <div className="lp-hero-actions">
            <button
              className="lp-btn-primary"
              onClick={() => navigate("/login")}
            >
              Login to Get Started
              <ChevronRight size={18} />
            </button>

            <button
              className="lp-btn-secondary"
              onClick={() => navigate("/browse-categories")}
            >
              Browse as Guest
            </button>
          </div>

          <p className="lp-hero-hint">
            New here?{" "}
            <span
              className="lp-hero-link"
              onClick={() => navigate("/register")}
            >
              Create an account
            </span>
          </p>
        </div>

        <div className="lp-hero-visual" aria-hidden="true">
          <div className="lp-book-stack">
            <div className="lp-book lp-book-1">
              <BookOpen size={20} />
            </div>

            <div className="lp-book lp-book-2">
              <Library size={22} />
            </div>

            <div className="lp-book lp-book-3">
              <LayoutGrid size={18} />
            </div>
          </div>
        </div>
      </section>

      {/* USER FLOWS */}
      <section className="lp-flows">
        <div className="lp-flows-inner">
          {[
            {
              role: "Guest",
              path: "Landing Page → Browse Books & Categories",
              color: "flow-guest",
            },
            {
              role: "Registered User",
              path: "Landing → Login / Register → Profile & Browse",
              color: "flow-user",
            },
            {
              role: "Librarian / Admin",
              path: "Landing → Login → Dashboard & Management",
              color: "flow-admin",
            },
          ].map((f) => (
            <div
              className={`lp-flow-card ${f.color}`}
              key={f.role}
            >
              <span className="lp-flow-role">
                {f.role}
              </span>

              <span className="lp-flow-path">
                {f.path}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="lp-features">
        <div className="lp-section-label">
          What LibraSys Offers
        </div>

        <h2 className="lp-features-heading">
          Everything a library needs,
          <br />
          nothing it doesn't.
        </h2>

        <div className="lp-features-grid">
          {features.map((f) => (
            <div
              className="lp-feature-card"
              key={f.title}
            >
              <div className="lp-feature-icon">
                {f.icon}
              </div>

              <h3 className="lp-feature-title">
                {f.title}
              </h3>

              <p className="lp-feature-desc">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA STRIP */}
      <section className="lp-cta-strip">
        <h2 className="lp-cta-heading">
          Ready to get started?
        </h2>

        <p className="lp-cta-sub">
          Log in to access your dashboard,
          or explore the catalogue as a guest.
        </p>

        <div className="lp-hero-actions">
          <button
            className="lp-btn-primary"
            onClick={() => navigate("/login")}
          >
            Login to Get Started
            <ChevronRight size={18} />
          </button>

          <button
            className="lp-btn-secondary lp-btn-secondary--light"
            onClick={() => navigate("/browse-categories")}
          >
            Browse as Guest
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
}