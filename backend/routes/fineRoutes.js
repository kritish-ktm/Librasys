const express = require("express");
const router = express.Router();

const db = require("../config/db");
const { auth } = require("../middleware/auth.middleware");

const missingFineTable = (err) => err?.code === "ER_NO_SUCH_TABLE";

router.get("/", (req, res) => {
  const sql = "SELECT * FROM fine";

  db.query(sql, (err, results) => {
    if (err) {
      if (missingFineTable(err)) return res.json([]);
      console.log(err);
      return res.status(500).json(err);
    }

    res.json(results);
  });
});

router.get("/my", auth, (req, res) => {
  const userId = req.user?.id || req.user?.UserID || req.user?.userId;
  const sql = `
    SELECT f.*, b.Title AS BookTitle, b.Title
    FROM fine f
    LEFT JOIN loanedbook l ON l.LoanID = f.LoanID
    LEFT JOIN book b ON b.BookID = l.BookID
    WHERE f.UserID = ? OR l.UserID = ?
    ORDER BY COALESCE(f.FineDate, f.CreatedAt, f.FineID) DESC
  `;

  db.query(sql, [userId, userId], (err, results) => {
    if (err) {
      if (missingFineTable(err)) return res.json([]);
      console.log(err);
      return res.status(500).json(err);
    }

    res.json(results);
  });
});

module.exports = router;
