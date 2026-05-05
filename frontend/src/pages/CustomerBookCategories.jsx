import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCategories } from "../services/bookCategoryService";

const DEWEY_META = {
  "0": { label: "General Works",      color: "#636e72", gradient: "135deg, #636e72, #b2bec3", icon: "bi-globe" },
  "1": { label: "Philosophy",         color: "#6c5ce7", gradient: "135deg, #6c5ce7, #a29bfe", icon: "bi-lightbulb" },
  "2": { label: "Religion",           color: "#fdcb6e", gradient: "135deg, #fdcb6e, #e17055", icon: "bi-star" },
  "3": { label: "Social Sciences",    color: "#0984e3", gradient: "135deg, #0984e3, #74b9ff", icon: "bi-people" },
  "4": { label: "Language",           color: "#00cec9", gradient: "135deg, #00cec9, #81ecec", icon: "bi-translate" },
  "5": { label: "Natural Science",    color: "#00b894", gradient: "135deg, #00b894, #55efc4", icon: "bi-flower1" },
  "6": { label: "Technology",         color: "#e17055", gradient: "135deg, #e17055, #fab1a0", icon: "bi-gear" },
  "7": { label: "Arts",               color: "#fd79a8", gradient: "135deg, #fd79a8, #fdcfe8", icon: "bi-palette" },
  "8": { label: "Literature",         color: "#d63031", gradient: "135deg, #d63031, #ff7675", icon: "bi-book" },
  "9": { label: "History",            color: "#2d3436", gradient: "135deg, #2d3436, #636e72", icon: "bi-hourglass-split" },
};

function getDeweyMeta(code) {
  const first = String(code || "0")[0];
  return DEWEY_META[first] || DEWEY_META["0"];
}

function CategoryCard({ cat, index }) {
  const meta = getDeweyMeta(cat.DeweyCode);
  return (
    <div className="col-12 col-sm-6 col-lg-4 col-xl-3 fade-in-up"
      style={{ animationDelay: `${index * 0.07}s` }}>
      <div className="category-card-glow shadow h-100"
        style={{ background: `linear-gradient(${meta.gradient})` }}>
        <div className="card-body p-4 d-flex flex-column h-100">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div className="rounded-3 d-flex align-items-center justify-content-center float-anim"
              style={{ width: 52, height: 52, background: "rgba(255,255,255,0.2)", backdropFilter: "blur(4px)" }}>
              <i className={`bi ${meta.icon} text-white fs-4`}></i>
            </div>
            <span className="badge rounded-pill"
              style={{ background: "rgba(255,255,255,0.25)", color: "white", backdropFilter: "blur(4px)", fontSize: "0.75rem" }}>
              {meta.label}
            </span>
          </div>

          <div className="mb-2">
            <code className="dewey-badge px-2 py-1 rounded"
              style={{ background: "rgba(0,0,0,0.2)", color: "rgba(255,255,255,0.9)", fontSize: "0.85rem" }}>
              {cat.DeweyCode}
            </code>
          </div>

          <h5 className="fw-bold text-white mb-2">{cat.CategoryName}</h5>

          <p className="text-white-50 small flex-grow-1 mb-3">
            {cat.Description || "Explore books in this collection."}
          </p>

          <div className="d-flex align-items-center justify-content-between mt-auto">
            <span className="badge rounded-pill"
              style={{ background: "rgba(255,255,255,0.2)", color: "white", padding: "6px 12px" }}>
              <i className="bi bi-circle-fill me-1 pulse-active" style={{ fontSize: 8 }}></i>
              Available
            </span>
            <i className="bi bi-arrow-right-circle text-white fs-5" style={{ opacity: 0.7 }}></i>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CustomerBookCategories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const role = localStorage.getItem("role");

  useEffect(() => {
    getCategories()
      .then(data => setCategories(data.filter(c => c.IsActive)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = categories.filter(c => {
    const q = search.toLowerCase();
    return (
      c.CategoryName.toLowerCase().includes(q) ||
      c.DeweyCode.toLowerCase().includes(q) ||
      (c.Description || "").toLowerCase().includes(q)
    );
  });

  const deweyGroups = [...new Set(categories.map(c => String(c.DeweyCode || "0")[0]))];

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f23" }}>

      {/* Hero */}
      <div className="gradient-hero text-white py-5 px-4 text-center position-relative overflow-hidden">
        <div className="position-absolute top-0 start-0 w-100 h-100" style={{
          background: "radial-gradient(ellipse at 30% 50%, rgba(108,92,231,0.3), transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(0,184,148,0.2), transparent 60%)",
          pointerEvents: "none"
        }}></div>

        <div className="position-relative">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <button className="btn btn-outline-light btn-sm btn-animate"
              onClick={() => navigate(role === "Librarian" ? "/dashboard" : "/profile")}>
              <i className="bi bi-arrow-left me-1"></i> Back
            </button>
            {role === "Librarian" && (
              <button className="btn btn-warning btn-sm btn-animate fw-semibold"
                onClick={() => navigate("/categories")}>
                <i className="bi bi-gear me-1"></i> Manage Categories
              </button>
            )}
          </div>

          <div className="float-anim d-inline-block mb-3">
            <i className="bi bi-collection-fill text-warning" style={{ fontSize: 64 }}></i>
          </div>
          <h1 className="display-5 fw-bold animate__animated animate__fadeInDown mb-2">
            Explore Our Library Collections
          </h1>
          <p className="lead text-white-50 animate__animated animate__fadeInUp mb-4">
            Browse {categories.length} curated categories using the Dewey Decimal System
          </p>

          {/* Search */}
          <div className="mx-auto animate__animated animate__fadeInUp" style={{ maxWidth: 520, animationDelay: "0.2s" }}>
            <div className="input-group input-group-lg shadow-lg">
              <span className="input-group-text bg-white border-0">
                <i className="bi bi-search text-muted"></i>
              </span>
              <input type="text" className="form-control border-0 search-animated"
                placeholder="Search by name, Dewey code, or description..."
                value={search} onChange={e => setSearch(e.target.value)} />
              {search && (
                <button className="btn btn-light border-0" onClick={() => setSearch("")}>
                  <i className="bi bi-x"></i>
                </button>
              )}
            </div>
          </div>

          {/* Quick Filter Badges */}
          {deweyGroups.length > 0 && (
            <div className="d-flex flex-wrap justify-content-center gap-2 mt-4 animate__animated animate__fadeIn">
              <button className={`btn btn-sm btn-animate rounded-pill px-3 ${filter === "all" ? "btn-warning" : "btn-outline-light"}`}
                onClick={() => setFilter("all")}>All</button>
              {deweyGroups.map(g => {
                const m = getDeweyMeta(g + "00");
                return (
                  <button key={g}
                    className={`btn btn-sm btn-animate rounded-pill px-3 ${filter === g ? "btn-warning" : "btn-outline-light"}`}
                    onClick={() => setFilter(g)}>
                    <i className={`bi ${m.icon} me-1`}></i>{g}xx
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="container-fluid px-4 py-5">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-warning" style={{ width: 56, height: 56 }}></div>
            <p className="mt-3 text-white-50">Loading collections...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-5 animate__animated animate__fadeIn">
            <i className="bi bi-search text-white-50" style={{ fontSize: 64 }}></i>
            <p className="mt-3 text-white-50 fs-5">No categories found for "{search}"</p>
            <button className="btn btn-outline-light btn-animate mt-2" onClick={() => setSearch("")}>Clear Search</button>
          </div>
        ) : (
          <>
            <p className="text-white-50 mb-4 text-center">
              Showing <span className="text-warning fw-bold">{filtered.length}</span> collection{filtered.length !== 1 ? "s" : ""}
            </p>
            <div className="row g-4">
              {filtered
                .filter(c => filter === "all" || String(c.DeweyCode || "0")[0] === filter)
                .map((cat, i) => <CategoryCard key={cat.CategoryID} cat={cat} index={i} />)}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-white-50 small border-top" style={{ borderColor: "rgba(255,255,255,0.1) !important" }}>
        <i className="bi bi-book me-1"></i> LibraSys — Dewey Decimal Classification System
      </div>
    </div>
  );
}
