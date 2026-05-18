import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Eye,
  EyeOff,
  Library,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import "./Login.css";

function Login() {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const validate = () => {
    if (!form.email.trim() || !form.password.trim()) {
      setError("Email and password are required.");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(form.email)) {
      setError("Please enter a valid email address.");
      return false;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validate()) return;

    try {
      const res = await axios.post(
        "http://localhost:5000/api/auth/login",
        form
      );

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);
      localStorage.setItem("name", res.data.name);

      if (res.data.role === "Librarian") {
        navigate("/dashboard");
      } else {
        navigate("/profile");
      }
    } catch (err) {
      console.error("Login error:", err);

      setError(err.response?.data?.error || "Login failed. Please try again.");
    }
  };

  return (
    <main className="auth-page auth-page-member">
      <section className="auth-shell">
        <aside className="auth-intro-panel">
          <button
            className="auth-back-link"
            type="button"
            onClick={() => navigate("/")}
          >
            <ArrowLeft size={17} />
            Back to home
          </button>

          <div className="auth-brand">
            <div className="auth-brand-icon">
              <Library size={31} />
            </div>

            <div>
              <span>LibraSys</span>
              <p>Library Management System</p>
            </div>
          </div>

          <div className="auth-intro-copy">
            <span className="auth-kicker">Member Access</span>

            <h1>Welcome back to your library space.</h1>

            <p>
              Sign in to browse the catalogue, check book availability, and
              access your member profile through LibraSys.
            </p>
          </div>

          <div className="auth-feature-list">
            <div className="auth-feature-item">
              <BookOpen size={21} />
              <span>Browse organised library categories</span>
            </div>

            <div className="auth-feature-item">
              <Search size={21} />
              <span>Search books by title, ISBN, or category</span>
            </div>

            <div className="auth-feature-item">
              <UserRound size={21} />
              <span>Access your member profile securely</span>
            </div>
          </div>
        </aside>

        <section className="auth-card" aria-labelledby="member-login-title">
          <div className="auth-card-header">
            <div className="auth-card-icon">
              <UserRound size={25} />
            </div>

            <span>Member Login</span>
            <h2 id="member-login-title">Access your account</h2>
            <p>Enter your details to continue to LibraSys.</p>
          </div>

          {error && <p className="login-error">{error}</p>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span>Email address</span>
              <input
                className="login-input"
                type="email"
                placeholder="Enter your email"
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
              />
            </label>

            <label className="auth-field">
              <span>Password</span>

              <div className="auth-password-wrap">
                <input
                  className="login-input login-input-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                />

                <button
                  className="auth-password-toggle"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </label>

            <button className="login-button" type="submit">
              Login
              <ChevronRight size={18} />
            </button>
          </form>

          <p className="login-register-text">
            No account?{" "}
            <Link to="/register" className="login-register-link">
              Create an account
            </Link>
          </p>

          <div className="auth-security-note">
            <ShieldCheck size={18} />
            <span>Your login connects to the protected LibraSys account system.</span>
          </div>
        </section>
      </section>
    </main>
  );
}

export default Login;