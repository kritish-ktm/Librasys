import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Boxes,
  ChevronRight,
  Clock3,
  Compass,
  KeyRound,
  Library,
  LockKeyhole,
  Search,
  Sparkles,
  Tags,
  Users,
} from "lucide-react";

import Footer from "../components/Footer";

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
    description: "Stories, novels, and imaginative writing for general reading.",
  },
  {
    icon: <Sparkles size={22} />,
    name: "Science",
    description:
      "Titles covering discovery, nature, space, and scientific thinking.",
  },
  {
    icon: <Boxes size={22} />,
    name: "Computer Science",
    description:
      "Programming, systems, software design, and digital technology.",
  },
  {
    icon: <Clock3 size={22} />,
    name: "History",
    description:
      "Books exploring past events, people, cultures, and societies.",
  },
  {
    icon: <Tags size={22} />,
    name: "Mathematics",
    description:
      "Numbers, logic, problem solving, and mathematical foundations.",
  },
  {
    icon: <Library size={22} />,
    name: "Reference",
    description:
      "In-library resources, encyclopaedias, guides, and non-borrowable material.",
  },
];

const benefits = [
  {
    icon: <KeyRound size={24} />,
    title: "Role-Based Access",
    description: "Separate access for members and authorised staff.",
  },
  {
    icon: <Compass size={24} />,
    title: "Organised Catalogue",
    description: "Books are grouped clearly by category and availability.",
  },
  {
    icon: <Search size={24} />,
    title: "Smart Book Search",
    description: "Users can find books quickly using title, ISBN, or category.",
  },
  {
    icon: <Users size={24} />,
    title: "Live Collection Insights",
    description:
      "Staff can view useful collection and availability information.",
  },
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

        <section className="lp-section lp-featured" aria-labelledby="featured-books">
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
          <div className="lp-section-heading">
            <span className="lp-section-label">Organised discovery</span>
            <h2 id="browse-category">Browse by Category</h2>
            <p>Find books faster by exploring organised library sections.</p>
          </div>

          <div className="lp-category-grid">
            {categories.map((category) => (
              <article className="lp-category-card" key={category.name}>
                <div className="lp-category-icon">{category.icon}</div>
                <h3>{category.name}</h3>
                <p>{category.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="lp-why" id="about" aria-labelledby="why-librasys">
          <div className="lp-why-inner">
            <div className="lp-section-heading lp-section-heading--dark">
              <span className="lp-section-label">Why LibraSys</span>
              <h2 id="why-librasys">Built for real library operations</h2>
              <p>
                LibraSys keeps library access simple for members while giving
                staff the tools they need to manage records securely.
              </p>
            </div>

            <div className="lp-benefits-grid">
              {benefits.map((benefit) => (
                <article className="lp-benefit-card" key={benefit.title}>
                  <div className="lp-benefit-icon">{benefit.icon}</div>
                  <h3>{benefit.title}</h3>
                  <p>{benefit.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}