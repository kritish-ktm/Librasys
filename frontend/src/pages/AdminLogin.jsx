import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  ChevronRight,
  ClipboardList,
  Database,
  Eye,
  EyeOff,
  Library,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import "./Login.css";

function AdminLogin() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.email.trim() || !form.password.trim()) {
      setError("Email and password are required.");
      return;
    }

    try {
      const res = await axios.post(
        "http://localhost:5000/api/auth/login",
        form
      );

      if (res.data.role !== "Librarian") {
        setError("Access denied. This login is for authorised staff only.");
        return;
      }

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);
      localStorage.setItem("name", res.data.name);

      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Please try again.");
    }
  };

  return (
    <main className="auth-page auth-page-admin">
      <section className="auth-shell">
        <aside className="auth-intro-panel auth-intro-panel-admin">
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
              <p>Staff Operations Portal</p>
            </div>
          </div>

          <div className="auth-intro-copy">
            <span className="auth-kicker">Protected Staff Access</span>

            <h1>Manage library records with controlled access.</h1>

            <p>
              Authorised staff can maintain book records, review catalogue data,
              and manage library operations securely.
            </p>
          </div>

          <div className="auth-feature-list">
            <div className="auth-feature-item">
              <ClipboardList size={21} />
              <span>Add, update, and maintain book records</span>
            </div>

            <div className="auth-feature-item">
              <Database size={21} />
              <span>Protect catalogue data through staff-only access</span>
            </div>

            <div className="auth-feature-item">
              <BarChart3 size={21} />
              <span>View collection and availability insights</span>
            </div>
          </div>
        </aside>

        <section className="auth-card auth-card-admin" aria-labelledby="admin-login-title">
          <div className="auth-card-header">
            <div className="auth-card-icon">
              <LockKeyhole size={25} />
            </div>

            <span>Staff Access</span>
            <h2 id="admin-login-title">Admin Login</h2>
            <p>Only authorised library staff should continue here.</p>
          </div>

          {error && <p className="login-error">{error}</p>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span>Staff email address</span>
              <input
                className="login-input"
                type="email"
                placeholder="Enter staff email"
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
                  placeholder="Enter staff password"
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
              Login securely
              <ChevronRight size={18} />
            </button>
          </form>

          <p className="login-register-text">
            Are you a member?{" "}
            <Link to="/member-login" className="login-register-link">
              Member Login
            </Link>
          </p>

          <div className="auth-security-note auth-security-note-admin">
            <ShieldCheck size={18} />
            <span>Staff access is restricted to users with Librarian role.</span>
          </div>
        </section>
      </section>
    </main>
  );
}

export default AdminLogin;