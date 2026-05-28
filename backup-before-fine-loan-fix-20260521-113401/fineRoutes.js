const express = require("express");
const router = express.Router();

const db = require("../config/db");
const { auth, requireLibrarian } = require("../middleware/auth.middleware");

const missingFineTable = (err) => err?.code === "ER_NO_SUCH_TABLE";
const missingTable = (err) => err?.code === "ER_NO_SUCH_TABLE";
const badField = (err) => err?.code === "ER_BAD_FIELD_ERROR";
const missingProcedure = (err) => err?.code === "ER_SP_DOES_NOT_EXIST";
const DAILY_FINE_RATE = Number(process.env.DAILY_FINE_RATE || 1);

router.get("/", auth, requireLibrarian, (req, res) => {
  const sql = `
    SELECT
      f.id AS FineID,
      f.id,
      f.member,
      f.book,
      f.amount AS Amount,
      f.amount,
      f.status AS Status,
      f.status,
      l.LoanID,
      l.UserID,
      l.DueDate AS FineDate,
      u.FullName AS MemberName,
      u.Email AS MemberEmail,
      b.Title AS BookTitle,
      b.Title,
      CONCAT('Fine for overdue loan #', l.LoanID) AS Reason
    FROM fine f
    INNER JOIN user u ON LOWER(TRIM(u.FullName)) = LOWER(TRIM(f.member))
    INNER JOIN loanedbook l ON l.UserID = u.UserID
    INNER JOIN book b ON b.BookID = l.BookID AND LOWER(TRIM(b.Title)) = LOWER(TRIM(f.book))
    WHERE l.ReturnDate IS NULL
      AND l.IsOverdue = 1
    ORDER BY l.DueDate ASC, f.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      if (missingTable(err) || badField(err)) return listStoredFinesSimple(null, res);
      console.log(err);
      return res.status(500).json(err);
    }

    res.json(results);
  });
});

router.get("/my", auth, (req, res) => {
  const userId = req.user?.id || req.user?.UserID || req.user?.userId;
  const sql = `
    SELECT
      f.id AS FineID,
      f.id,
      f.member,
      f.book,
      f.amount AS Amount,
      f.amount,
      f.status AS Status,
      f.status,
      l.LoanID,
      l.UserID,
      l.DueDate AS FineDate,
      b.Title AS BookTitle,
      b.Title,
      CONCAT('Fine for overdue loan #', l.LoanID) AS Reason
    FROM fine f
    INNER JOIN user u ON u.UserID = ?
      AND LOWER(TRIM(u.FullName)) = LOWER(TRIM(f.member))
    INNER JOIN loanedbook l ON l.UserID = u.UserID
    INNER JOIN book b ON b.BookID = l.BookID AND LOWER(TRIM(b.Title)) = LOWER(TRIM(f.book))
    WHERE l.ReturnDate IS NULL
      AND l.IsOverdue = 1
    ORDER BY l.DueDate ASC, f.id DESC
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      if (missingTable(err) || badField(err)) return listStoredFinesSimple(userId, res);
      console.log(err);
      return res.status(500).json(err);
    }

    if (results.length) return res.json(results);
    listCalculatedFines(userId, res);
  });
});

router.patch("/:id/paid", auth, requireLibrarian, (req, res) => {
  updateFineStatus(req.params.id, "Paid", "sp_MarkFinePaid", res);
});

router.patch("/:id/waived", auth, requireLibrarian, (req, res) => {
  updateFineStatus(req.params.id, "Waived", "sp_WaiveFine", res);
});

function listCalculatedFines(userId, res) {
  const values = [];
  const userFilter = userId ? "AND l.UserID = ?" : "";
  if (userId) values.push(userId);

  const sql = `
    SELECT
      CONCAT('calculated-', l.LoanID) AS FineID,
      l.LoanID,
      l.UserID,
      u.FullName AS MemberName,
      u.Email AS MemberEmail,
      b.Title AS BookTitle,
      b.Title,
      GREATEST(DATEDIFF(CURDATE(), l.DueDate), 1) * ? AS Amount,
      l.DueDate AS FineDate,
      'Unpaid' AS Status,
      CONCAT('Calculated from ', GREATEST(DATEDIFF(CURDATE(), l.DueDate), 1), ' overdue day(s)') AS Reason,
      1 AS IsCalculated
    FROM loanedbook l
    INNER JOIN user u ON u.UserID = l.UserID
    INNER JOIN book b ON b.BookID = l.BookID
    WHERE l.ReturnDate IS NULL
      AND l.IsOverdue = 1
      ${userFilter}
    ORDER BY l.DueDate ASC
  `;

  db.query(sql, [DAILY_FINE_RATE, ...values], (err, results) => {
    if (err) {
      if (missingTable(err)) return res.json([]);
      console.log(err);
      return res.status(500).json({ error: "Unable to calculate fines from overdue loans." });
    }

    res.json(results);
  });
}

function listStoredFinesSimple(userId, res) {
  const sql = userId
    ? `
      SELECT
        f.id AS FineID,
        f.id,
        f.member,
        f.book,
        f.amount AS Amount,
        f.amount,
        f.status AS Status,
        f.status,
        l.LoanID,
        l.UserID,
        l.DueDate AS FineDate,
        b.Title AS BookTitle,
        b.Title,
        CONCAT('Fine for overdue loan #', l.LoanID) AS Reason
      FROM fine f
      INNER JOIN user u ON u.UserID = ?
        AND LOWER(TRIM(f.member)) = LOWER(TRIM(u.FullName))
      INNER JOIN loanedbook l ON l.UserID = u.UserID
      INNER JOIN book b ON b.BookID = l.BookID AND LOWER(TRIM(b.Title)) = LOWER(TRIM(f.book))
      WHERE l.ReturnDate IS NULL
        AND l.IsOverdue = 1
      ORDER BY l.DueDate ASC, f.id DESC
    `
    : `
      SELECT
        f.id AS FineID,
        f.id,
        f.member,
        f.book,
        f.amount AS Amount,
        f.amount,
        f.status AS Status,
        f.status,
        l.LoanID,
        l.UserID,
        l.DueDate AS FineDate,
        u.FullName AS MemberName,
        u.Email AS MemberEmail,
        b.Title AS BookTitle,
        b.Title,
        CONCAT('Fine for overdue loan #', l.LoanID) AS Reason
      FROM fine f
      INNER JOIN user u ON LOWER(TRIM(u.FullName)) = LOWER(TRIM(f.member))
      INNER JOIN loanedbook l ON l.UserID = u.UserID
      INNER JOIN book b ON b.BookID = l.BookID AND LOWER(TRIM(b.Title)) = LOWER(TRIM(f.book))
      WHERE l.ReturnDate IS NULL
        AND l.IsOverdue = 1
      ORDER BY l.DueDate ASC, f.id DESC
    `;
  const values = userId ? [userId] : [];

  db.query(sql, values, (err, results) => {
    if (err) {
      if (missingFineTable(err)) return listCalculatedFines(userId, res);
      if (userId && badField(err)) return res.json([]);
      console.log(err);
      return res.status(500).json({ error: "Unable to load fine records." });
    }

    if (results.length) return res.json(results);
    listCalculatedFines(userId, res);
  });
}

function updateFineStatus(fineId, status, procedureName, res) {
  if (String(fineId).startsWith("calculated-")) {
    return res.status(400).json({
      error: "This fine is calculated from an overdue loan. Create the fine record before marking it paid or waived.",
    });
  }

  db.query(`CALL ${procedureName}(?)`, [fineId], (procedureErr) => {
    if (!procedureErr) {
      return res.json({ message: `Fine marked as ${status.toLowerCase()}.` });
    }

    if (!missingProcedure(procedureErr)) {
      console.log(procedureErr);
      return res.status(500).json({ error: "Unable to update fine status." });
    }

    db.query(
      "UPDATE fine SET Status = ? WHERE FineID = ?",
      [status, fineId],
      (updateErr, result) => {
        if (updateErr) {
          if (badField(updateErr)) {
            return db.query(
              "UPDATE fine SET status = ? WHERE id = ?",
              [status, fineId],
              (legacyErr, legacyResult) => {
                if (legacyErr) {
                  console.log(legacyErr);
                  return res.status(500).json({ error: "Unable to update fine status." });
                }

                if (!legacyResult.affectedRows) {
                  return res.status(404).json({ error: "Fine record not found." });
                }

                res.json({ message: `Fine marked as ${status.toLowerCase()}.` });
              }
            );
          }

          console.log(updateErr);
          return res.status(500).json({ error: "Unable to update fine status." });
        }

        if (!result.affectedRows) {
          return res.status(404).json({ error: "Fine record not found." });
        }

        res.json({ message: `Fine marked as ${status.toLowerCase()}.` });
      }
    );
  });
}

module.exports = router;
