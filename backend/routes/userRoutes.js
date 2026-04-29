const express = require("express");
const router = express.Router();
const db = require("../db");

// =======================
// GET ALL USERS
// =======================
router.get("/", (req, res) => {
  const sql = "SELECT * FROM User";

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// =======================
// GET USER BY ID
// =======================
router.get("/:id", (req, res) => {
  const sql = "SELECT * FROM User WHERE UserID = ?";
  const userId = req.params.id;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(results[0]);
  });
});

// =======================
// CREATE USER
// =======================
router.post("/", (req, res) => {
  const { FullName, Email, Role } = req.body;

  const sql =
    "INSERT INTO User (FullName, Email, Role) VALUES (?, ?, ?)";

  db.query(sql, [FullName, Email, Role], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json({
      message: "User created successfully",
      userId: result.insertId,
    });
  });
});

// =======================
// UPDATE USER
// =======================
router.put("/:id", (req, res) => {
  const { FullName, Email, Role } = req.body;
  const userId = req.params.id;

  const sql =
    "UPDATE User SET FullName = ?, Email = ?, Role = ? WHERE UserID = ?";

  db.query(sql, [FullName, Email, Role, userId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User updated successfully" });
  });
});

// =======================
// DELETE USER
// =======================
router.delete("/:id", (req, res) => {
  const sql = "DELETE FROM User WHERE UserID = ?";
  const userId = req.params.id;

  db.query(sql, [userId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  });
});

module.exports = router;