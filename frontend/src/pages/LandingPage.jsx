import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  BookCheck,
  BookOpen,
  Boxes,
  ChevronRight,
  ClipboardList,
  Clock3,
  Database,
  Library,
  LockKeyhole,
  Search,
  ShieldCheck,
  Sparkles,
  Tags,
  UserRound,
} from "lucide-react";

import cleanCodeImg from "../assets/books/clean-code.jpg";
import silentPatientImg from "../assets/books/silent-patient.jpg";
import briefHistoryImg from "../assets/books/brief-history-time.jpg";
import encyclopaediaImg from "../assets/books/encyclopaedia-reference.jpg";

import "./LandingPage.css";

const featuredBooks = [
  {
    title: "Clean Code",
    category: "Computer Science",
    badge: "Available",
    image: cleanCodeImg,
  },
  {
    title: "The Silent Patient",
    category: "Fiction",
    badge: "Available",
    image: silentPatientImg,
  },
  {
    title: "A Brief History of Time",
    category: "Science",
    badge: "Limited Copies",
    image: briefHistoryImg,
  },
  {
    title: "Encyclopaedia Reference",
    category: "Reference",
    badge: "In-library only",
    image: encyclopaediaImg,
  },
];

const categories = [
  {
    icon: <BookOpen size={22} />,
    name: "Fiction",
    count: "24 titles",
    description: "Stories, novels, and imaginative writing.",
  },
  {
    icon: <Sparkles size={22} />,
    name: "Science",
    count: "18 titles",
    description: "Discovery, nature, space, and scientific thinking.",
  },
  {
    icon: <Boxes size={22} />,
    name: "Computer Science",
    count: "21 titles",
    description: "Programming, systems, and digital technology.",
  },
  {
    icon: <Clock3 size={22} />,
    name: "History",
    count: "16 titles",
    description: "Past events, people, cultures, and societies.",
  },
  {
    icon: <Tags size={22} />,
    name: "Mathematics",
    count: "13 titles",
    description: "Logic, numbers, problem solving, and foundations.",
  },
  {
    icon: <Library size={22} />,
    name: "Reference",
    count: "12 items",
    description: "Guides, encyclopaedias, and in-library resources.",
  },
];

const snapshotStats = [
  {
    icon: <Database size={23} />,
    value: "120+",
    label: "Books Managed",
  },
  {
    icon: <Boxes size={23} />,
    value: "6",
    label: "Core Categories",
  },
  {
    icon: <BookCheck size={23} />,
    value: "94",
    label: "Borrowable Titles",
  },
  {
    icon: <ShieldCheck size={23} />,
    value: "12",
    label: "Reference Items",
  },
];

const memberActions = [
  "Browse the public catalogue",
  "Search books by title, ISBN, or category",
  "Check book availability before requesting",
  "Create and access a member profile",
];

const staffActions = [
  "Add, update, and maintain book records",
  "Manage borrowable and reference-only items",
  "Review catalogue and availability information",
  "Protect staff tools through controlled access",
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="lp-root">
      <header className="lp-header">
        <div className="lp-header-inner">
          <button
            className="lp-logo"
            onClick={() => navigate("/")}
            aria-label="LibraSys home"
          >
            <Library size={28} className="lp-logo-icon" />
            <span className="lp-logo-text">LibraSys</span>
          </button>

          <nav className="lp-nav" aria-label="Primary navigation">
            <button className="lp-nav-link" onClick={() => navigate("/")}>
              Home
            </button>

            <button
              className="lp-nav-link"
              onClick={() => navigate("/browse-categories")}
            >
              Browse
            </button>

            <a className="lp-nav-link" href="#about">
              About
            </a>
          </nav>

          <div className="lp-access">
            <button
              className="lp-member-link"
              onClick={() => navigate("/member-login")}
            >
              Member Login
            </button>

            <button
              className="lp-staff-button"
              onClick={() => navigate("/admin-login")}
            >
              <LockKeyhole size={16} />
              Staff Access
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-hero-image" aria-hidden="true" />
          <div className="lp-hero-overlay" aria-hidden="true" />
          <div className="lp-hero-glow" aria-hidden="true" />
          <div className="lp-dust" aria-hidden="true" />

          <div className="lp-hero-content">
            <span className="lp-hero-kicker">Modern library management</span>

            <h1 className="lp-hero-heading">
              The smarter way to <span>run your library.</span>
            </h1>

            <p className="lp-hero-sub">
              LibraSys brings books, borrowers, and librarians together in one
              organised, role-based platform — built for real library
              operations.
            </p>

            <button
              className="lp-btn-primary"
              onClick={() => navigate("/browse-categories")}
            >
              Browse as Guest
              <ChevronRight size={19} />
            </button>

            <p className="lp-signup-line">
              <span>New here?</span>{" "}
              <button onClick={() => navigate("/register")}>
                Create an account
              </button>
            </p>
          </div>
        </section>

        <section
          className="lp-section lp-featured"
          aria-labelledby="featured-books"
        >
          <div className="lp-section-heading">
            <span className="lp-section-label">Selected collection</span>
            <h2 id="featured-books">Featured Books</h2>
            <p>Explore selected titles from the LibraSys collection.</p>
          </div>

          <div className="lp-books-grid">
            {featuredBooks.map((book) => (
              <article className="lp-book-card" key={book.title}>
                <div className="lp-book-cover">
                  <img
                    src={book.image}
                    alt={`${book.title} book cover`}
                    className="lp-book-cover-img"
                  />
                </div>

                <div className="lp-book-info">
                  <span className="lp-book-badge">{book.badge}</span>
                  <h3>{book.title}</h3>
                  <p>{book.category}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          className="lp-section lp-categories"
          aria-labelledby="browse-category"
        >
          <div className="lp-section-heading-row">
            <div className="lp-section-heading lp-section-heading-compact">
              <span className="lp-section-label">Organised discovery</span>
              <h2 id="browse-category">Explore the catalogue by section</h2>
              <p>
                Preview the main library categories before browsing the full
                catalogue.
              </p>
            </div>

            <button
              className="lp-btn-secondary"
              onClick={() => navigate("/browse-categories")}
            >
              View full catalogue
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="lp-category-grid">
            {categories.map((category) => (
              <article className="lp-category-card" key={category.name}>
                <div className="lp-category-top">
                  <div className="lp-category-icon">{category.icon}</div>
                  <span className="lp-category-count">{category.count}</span>
                </div>

                <h3>{category.name}</h3>
                <p>{category.description}</p>

                <button
                  className="lp-card-link"
                  onClick={() => navigate("/browse-categories")}
                >
                  View books
                  <ChevronRight size={16} />
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="lp-snapshot" aria-labelledby="library-snapshot">
          <div className="lp-snapshot-inner">
            <div className="lp-snapshot-copy">
              <span className="lp-section-label">Live system preview</span>
              <h2 id="library-snapshot">Library Snapshot</h2>
              <p>
                A quick overview of the collection structure, availability, and
                catalogue coverage inside LibraSys.
              </p>
            </div>

            <div className="lp-snapshot-grid">
              {snapshotStats.map((stat) => (
                <article className="lp-stat-card" key={stat.label}>
                  <div className="lp-stat-icon">{stat.icon}</div>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-access-paths" id="about" aria-labelledby="access-paths">
          <div className="lp-access-paths-inner">
            <div className="lp-section-heading lp-section-heading--dark lp-path-heading">
              <span className="lp-section-label">Why LibraSys</span>
              <h2 id="access-paths">One platform, two clear access paths</h2>
              <p>
                Members can browse and search the catalogue, while staff manage
                records through protected system access.
              </p>
            </div>

            <div className="lp-path-grid">
              <article className="lp-path-card">
                <div className="lp-path-card-header">
                  <div className="lp-path-icon">
                    <UserRound size={25} />
                  </div>

                  <div>
                    <span>For readers and members</span>
                    <h3>Member Access</h3>
                  </div>
                </div>

                <ul>
                  {memberActions.map((action) => (
                    <li key={action}>
                      <CheckDot />
                      {action}
                    </li>
                  ))}
                </ul>

                <button
                  className="lp-path-button lp-path-button-light"
                  onClick={() => navigate("/member-login")}
                >
                  Continue as Member
                  <ChevronRight size={18} />
                </button>
              </article>

              <article className="lp-path-card lp-path-card-highlight">
                <div className="lp-path-card-header">
                  <div className="lp-path-icon">
                    <ClipboardList size={25} />
                  </div>

                  <div>
                    <span>For authorised library staff</span>
                    <h3>Staff Access</h3>
                  </div>
                </div>

                <ul>
                  {staffActions.map((action) => (
                    <li key={action}>
                      <CheckDot />
                      {action}
                    </li>
                  ))}
                </ul>

                <button
                  className="lp-path-button lp-path-button-orange"
                  onClick={() => navigate("/admin-login")}
                >
                  Open Staff Access
                  <LockKeyhole size={17} />
                </button>
              </article>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <button
              className="lp-footer-logo"
              onClick={() => navigate("/")}
              aria-label="Return to LibraSys home"
            >
              <Library size={27} />
              <span>LibraSys</span>
            </button>

            <p>
              A modern library management system built for organised catalogue
              access, role-based control, and reliable book record management.
            </p>
          </div>

          <div className="lp-footer-column">
            <h4>Platform</h4>
            <button onClick={() => navigate("/")}>Home</button>
            <button onClick={() => navigate("/browse-categories")}>
              Browse Catalogue
            </button>
            <button onClick={() => navigate("/member-login")}>
              Member Login
            </button>
            <button onClick={() => navigate("/admin-login")}>
              Staff Access
            </button>
          </div>

          <div className="lp-footer-column">
            <h4>System Features</h4>
            <span>Book Management</span>
            <span>Category Browsing</span>
            <span>Availability Tracking</span>
            <span>Role-Based Access</span>
          </div>

          <div className="lp-footer-column">
            <h4>Project</h4>
            <span>Agile Development Team Project</span>
            <span>React · Node.js · Express · MySQL</span>
            <span>BSc Computer Science</span>
          </div>
        </div>

        <div className="lp-footer-bottom">
          <span>© 2026 LibraSys</span>
          <span>Built for secure and organised library operations.</span>
        </div>
      </footer>
    </div>
  );
}

function CheckDot() {
  return (
    <span className="lp-check-dot" aria-hidden="true">
      <ChevronRight size={14} />
    </span>
  );
}