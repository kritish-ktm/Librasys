import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

function Register() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!form.fullName.trim() || !form.email.trim() || !form.password.trim()) {
      setMessage("Please fill in all fields.");
      return;
    }

    try {
      await axios.post("http://localhost:5000/api/auth/register", form);
      setMessage("Account created successfully. Redirecting to member login...");
      setTimeout(() => navigate("/member-login"), 1500);
    } catch (err) {
      console.error("Register error:", err.response?.data || err.message);
      setMessage(
        err.response?.data?.error ||
          "Registration failed. Please check the backend or database."
      );
    }
  };

  return (
    <>
      <style>{registerStyles}</style>

      <main className="register-page">
        <div className="register-overlay" />
        <div className="register-glow register-glow-one" />
        <div className="register-glow register-glow-two" />

        <section className="register-card" aria-labelledby="register-title">
          <button
            type="button"
            className="register-back"
            onClick={() => navigate("/")}
          >
            ← Back to Home
          </button>

          <div className="register-badge">Member Registration</div>

          <h1 className="register-brand">LibraSys</h1>

          <h2 id="register-title" className="register-title">
            Create your member account
          </h2>

          <p className="register-subtitle">
            Join LibraSys to access member features and explore the library
            collection.
          </p>

          {message && <p className="register-message">{message}</p>}

          <form className="register-form" onSubmit={handleSubmit}>
            <label className="register-field">
              <span>Full Name</span>
              <input
                type="text"
                placeholder="Enter your full name"
                value={form.fullName}
                onChange={(e) =>
                  setForm({ ...form, fullName: e.target.value })
                }
              />
            </label>

            <label className="register-field">
              <span>Email address</span>
              <input
                type="email"
                placeholder="Enter your email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>

            <label className="register-field">
              <span>Password</span>
              <input
                type="password"
                placeholder="Create a password"
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
              />
            </label>

            <button type="submit" className="register-submit">
              Create Account
            </button>
          </form>

          <p className="register-login-line">
            Already have an account?{" "}
            <Link to="/member-login">Member Login</Link>
          </p>
        </section>
      </main>
    </>
  );
}

const registerStyles = `
  .register-page {
    position: relative;
    min-height: 100vh;
    padding: 32px 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background:
      radial-gradient(circle at 20% 15%, rgba(244, 166, 74, 0.30), transparent 28%),
      radial-gradient(circle at 80% 80%, rgba(47, 59, 37, 0.42), transparent 35%),
      linear-gradient(135deg, #26351f 0%, #4d5137 48%, #a99578 100%);
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .register-page::before {
    content: "";
    position: absolute;
    inset: 0;
    background:
      linear-gradient(rgba(20, 25, 15, 0.48), rgba(20, 25, 15, 0.58)),
      url("https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1800&q=80");
    background-size: cover;
    background-position: center;
    transform: scale(1.05);
    animation: registerSlowZoom 18s ease-in-out infinite alternate;
    z-index: 0;
  }

  .register-overlay {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 50% 20%, rgba(255, 244, 225, 0.18), transparent 34%),
      linear-gradient(90deg, rgba(20, 25, 15, 0.74), rgba(20, 25, 15, 0.38));
    z-index: 1;
  }

  .register-glow {
    position: absolute;
    border-radius: 999px;
    filter: blur(30px);
    opacity: 0.55;
    z-index: 1;
    pointer-events: none;
  }

  .register-glow-one {
    width: 260px;
    height: 260px;
    background: rgba(232, 121, 36, 0.34);
    top: 8%;
    right: 16%;
  }

  .register-glow-two {
    width: 220px;
    height: 220px;
    background: rgba(250, 247, 241, 0.22);
    bottom: 12%;
    left: 14%;
  }

  .register-card {
    position: relative;
    z-index: 2;
    width: min(510px, 92vw);
    padding: 38px 46px 42px;
    border-radius: 32px;
    background: rgba(250, 247, 241, 0.93);
    border: 1px solid rgba(216, 203, 184, 0.72);
    box-shadow: 0 34px 90px rgba(20, 25, 15, 0.36);
    backdrop-filter: blur(18px);
    color: #26351f;
  }

  .register-back {
    border: none;
    background: rgba(47, 59, 37, 0.08);
    color: #2f3b25;
    padding: 10px 14px;
    border-radius: 999px;
    font-weight: 800;
    cursor: pointer;
    transition: transform 180ms ease, background 180ms ease;
  }

  .register-back:hover {
    transform: translateY(-1px);
    background: rgba(47, 59, 37, 0.14);
  }

  .register-badge {
    width: fit-content;
    margin: 26px auto 14px;
    padding: 8px 15px;
    border-radius: 999px;
    background: rgba(232, 121, 36, 0.10);
    border: 1px solid rgba(232, 121, 36, 0.28);
    color: #c95f16;
    font-size: 0.82rem;
    font-weight: 900;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .register-brand {
    margin: 0;
    text-align: center;
    font-family: Georgia, "Times New Roman", serif;
    font-size: clamp(3rem, 7vw, 4.8rem);
    line-height: 0.95;
    letter-spacing: -0.055em;
    color: #26351f;
  }

  .register-title {
    margin: 18px 0 0;
    text-align: center;
    font-size: clamp(1.45rem, 3vw, 2rem);
    line-height: 1.15;
    color: #2f3b25;
  }

  .register-subtitle {
    margin: 14px auto 26px;
    max-width: 390px;
    text-align: center;
    color: #7d8468;
    font-size: 1rem;
    line-height: 1.6;
  }

  .register-message {
    margin: 0 0 18px;
    padding: 12px 14px;
    border-radius: 14px;
    background: rgba(232, 121, 36, 0.10);
    border: 1px solid rgba(232, 121, 36, 0.24);
    color: #8f3f0f;
    text-align: center;
    font-weight: 700;
    line-height: 1.4;
  }

  .register-form {
    display: grid;
    gap: 18px;
  }

  .register-field {
    display: grid;
    gap: 8px;
    color: #2f3b25;
    font-weight: 800;
  }

  .register-field span {
    font-size: 0.94rem;
  }

  .register-field input {
    width: 100%;
    height: 56px;
    padding: 0 16px;
    border-radius: 16px;
    border: 1px solid #d8cbb8;
    background: rgba(255, 255, 255, 0.84);
    color: #26351f;
    font-size: 1rem;
    outline: none;
    box-sizing: border-box;
    transition: border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
  }

  .register-field input::placeholder {
    color: rgba(84, 93, 70, 0.62);
  }

  .register-field input:focus {
    border-color: #e87924;
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 0 0 4px rgba(232, 121, 36, 0.14);
  }

  .register-submit {
    width: 100%;
    height: 58px;
    margin-top: 6px;
    border: none;
    border-radius: 17px;
    background: linear-gradient(135deg, #e87924, #f4a64a);
    color: white;
    font-size: 1.05rem;
    font-weight: 900;
    cursor: pointer;
    box-shadow: 0 18px 36px rgba(232, 121, 36, 0.30);
    transition: transform 180ms ease, box-shadow 180ms ease, filter 180ms ease;
  }

  .register-submit:hover {
    transform: translateY(-2px);
    filter: brightness(0.98);
    box-shadow: 0 22px 44px rgba(232, 121, 36, 0.38);
  }

  .register-submit:active {
    transform: translateY(0);
  }

  .register-login-line {
    margin: 24px 0 0;
    text-align: center;
    color: #2f3b25;
    font-size: 1rem;
  }

  .register-login-line a {
    color: #e87924;
    font-weight: 900;
    text-decoration: underline;
    text-underline-offset: 4px;
  }

  .register-login-line a:hover {
    color: #c95f16;
  }

  @keyframes registerSlowZoom {
    from {
      transform: scale(1.05);
    }
    to {
      transform: scale(1.12);
    }
  }

  @media (max-width: 560px) {
    .register-page {
      padding: 20px 14px;
      align-items: flex-start;
      padding-top: 34px;
    }

    .register-card {
      padding: 28px 22px 32px;
      border-radius: 26px;
    }

    .register-badge {
      margin-top: 22px;
    }

    .register-field input,
    .register-submit {
      height: 54px;
    }
  }
`;

export default Register;