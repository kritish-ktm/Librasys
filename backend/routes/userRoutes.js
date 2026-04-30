const express = require("express");
const router = express.Router();
const db = require("../db");
const jwt = require("jsonwebtoken");

function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

router.get("/profile", auth, (req, res) => {
  db.query("SELECT UserID, FullName, Email, Role, IsActive, DateRegistered FROM user WHERE UserID = ?",
    [req.user.id], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results[0]);
    });
});

router.put("/profile", auth, (req, res) => {
  const { fullName, email } = req.body;
  db.query("UPDATE user SET FullName = ?, Email = ? WHERE UserID = ?",
    [fullName, email, req.user.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Profile updated" });
    });
});

router.get("/", auth, (req, res) => {
  if (req.user.role !== "Librarian") return res.status(403).json({ error: "Access denied" });
  db.query("SELECT UserID, FullName, Email, Role, IsActive, DateRegistered FROM user", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

router.put("/:id/status", auth, (req, res) => {
  if (req.user.role !== "Librarian") return res.status(403).json({ error: "Access denied" });
  const { isActive } = req.body;
  db.query("UPDATE user SET IsActive = ? WHERE UserID = ?",
    [isActive, req.params.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Status updated" });
    });
});

module.exports = router;