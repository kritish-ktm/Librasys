import { Library } from "lucide-react";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-footer-inner">
        <div className="lp-footer-brand">
          <Library size={18} className="lp-footer-icon" />
          <span className="lp-footer-name">LibraSys</span>
        </div>
        <p className="lp-footer-copy">
          © 2025 LibraSys — Agile Development Team Project
        </p>
        <p className="lp-footer-note">
          A role-based Library Management System built with React, Node.js &amp; MySQL.
        </p>
      </div>
    </footer>
  );
}
