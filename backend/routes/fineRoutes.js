const express = require("express");
const router = express.Router();

/*
  FINE MANAGEMENT BACKEND ROUTES
  ------------------------------
  This file contains only the Fine Management API.
  Frontend FineManagement.jsx calls these routes using axios.

  Important connection path:
  React Fine page -> http://localhost:5000/api/fines -> this file -> db.query()
  -> backend/config/db.js -> XAMPP MySQL database `librasys`.
*/
const db = require("../config/db");
const { auth, requireLibrarian } = require("../middleware/auth.middleware");

// Fine rate used for automatic calculation: $1 per overdue day by default.
const DAILY_FINE_RATE = Number(process.env.DAILY_FINE_RATE || 1);

// GET /api/fines
// Librarian list page. Returns automatic overdue fines and manual rare/damage fines.
router.get("/", auth, requireLibrarian, (req, res) => {
  listFines(null, res);
});

// GET /api/fines/options
// Data for the manual fine form. Kept inside the Fine module so the Fine page
// does not need to edit teammate User or Book pages.
router.get("/options", auth, requireLibrarian, (req, res) => {
  getManualFineOptions(res);
});

// GET /api/fines/my
// Member self-view. Same fine logic, but only for the logged-in member.
router.get("/my", auth, (req, res) => {
  listFines(req.user?.id || req.user?.UserID || req.user?.userId, res);
});

// POST /api/fines/sync
// This is our "Add" action for automatic fines. It creates fine rows from
// overdue loanedbook rows instead of requiring manual fine insertion.
router.post("/sync", auth, requireLibrarian, (req, res) => {
  syncAutomaticFines(res);
});

// POST /api/fines
// Manual fine creation for rare/reference collection damage inside the library.
// This does not create or edit loanedbook rows.
router.post("/", auth, requireLibrarian, (req, res) => {
  createManualFine(req.body, res);
});

// PATCH routes are the Fine "Edit/Update" code.
// They edit only the fine Status, because the fine amount is calculated from
// the linked loanedbook DueDate.
router.patch("/:id/paid", auth, requireLibrarian, (req, res) => {
  updateFineStatus(req.params.id, "Paid", res);
});

router.patch("/:id/waived", auth, requireLibrarian, (req, res) => {
  updateFineStatus(req.params.id, "Waived", res);
});

router.patch("/:id/unpaid", auth, requireLibrarian, (req, res) => {
  updateFineStatus(req.params.id, "Unpaid", res);
});

// PUT /api/fines/:id
// Edits manual rare/reference fines only. Automatic overdue fines keep their
// amount/reason connected to loanedbook and Sync Fines.
router.put("/:id", auth, requireLibrarian, (req, res) => {
  updateManualFine(req.params.id, req.body, res);
});

router.delete("/:id", auth, requireLibrarian, (req, res) => {
  deleteFine(req.params.id, res);
});

function listFines(userId, res) {
  const values = [DAILY_FINE_RATE];
  const overdueUserFilter = userId ? "AND l.UserID = ?" : "";
  const manualUserFilter = userId ? "AND f.UserID = ?" : "";
  if (userId) values.push(userId);
  if (userId) values.push(userId);

  /*
    Main Fine SELECT query:
    Part 1 starts from loanedbook for automatic overdue fines.
    Part 2 starts from fine for manual rare/damage fines, because manual fines
    do not have a LoanID.

    Overdue condition:
    ReturnDate IS NULL and either current date is after DueDate or IsOverdue is b'1'.
  */
  const sql = `
    SELECT
      COALESCE(CAST(f.FineID AS CHAR), CONCAT('calculated-', l.LoanID)) AS FineID,
      f.FineID AS StoredFineID,
      l.LoanID,
      l.UserID,
      u.FullName AS MemberName,
      u.Email AS MemberEmail,
      b.BookID,
      b.Title AS BookTitle,
      b.Title,
      l.BorrowDate,
      l.DueDate,
      l.ReturnDate,
      GREATEST(DATEDIFF(CURDATE(), l.DueDate), CASE WHEN l.IsOverdue = b'1' THEN 1 ELSE 0 END) AS OverdueDays,
      COALESCE(
        f.Amount,
        GREATEST(DATEDIFF(CURDATE(), l.DueDate), CASE WHEN l.IsOverdue = b'1' THEN 1 ELSE 0 END) * ?
      ) AS Amount,
      COALESCE(f.Reason, 'Overdue return charge') AS Reason,
      COALESCE(f.FineType, 'Overdue') AS FineType,
      f.Notes,
      COALESCE(f.Status, 'Unpaid') AS Status,
      COALESCE(f.CreatedAt, l.DueDate) AS CreatedAt,
      COALESCE(f.FineDate, l.DueDate) AS FineDate,
      CASE WHEN f.FineID IS NULL THEN 1 ELSE 0 END AS IsCalculated
    FROM loanedbook l
    INNER JOIN user u ON u.UserID = l.UserID
    INNER JOIN book b ON b.BookID = l.BookID
    LEFT JOIN fine f ON f.LoanID = l.LoanID
    WHERE l.ReturnDate IS NULL
      AND (CURDATE() > l.DueDate OR l.IsOverdue = b'1')
      ${overdueUserFilter}

    UNION ALL

    SELECT
      CAST(f.FineID AS CHAR) AS FineID,
      f.FineID AS StoredFineID,
      NULL AS LoanID,
      f.UserID,
      u.FullName AS MemberName,
      u.Email AS MemberEmail,
      b.BookID,
      b.Title AS BookTitle,
      b.Title,
      NULL AS BorrowDate,
      NULL AS DueDate,
      NULL AS ReturnDate,
      NULL AS OverdueDays,
      f.Amount,
      f.Reason,
      f.FineType,
      f.Notes,
      f.Status,
      f.CreatedAt,
      f.FineDate,
      0 AS IsCalculated
    FROM fine f
    INNER JOIN user u ON u.UserID = f.UserID
    LEFT JOIN book b ON b.BookID = f.BookID
    WHERE f.FineType = 'Manual'
      ${manualUserFilter}

    ORDER BY FineDate DESC, FineID DESC
  `;

  db.query(sql, values, (err, results) => {
    if (err) {
      console.error("Fine list SQL failed:", err.stack || err);
      return res.status(500).json({
        error: "Unable to load fine records.",
        code: err.code,
        detail: err.message,
      });
    }

    console.log("[api:fines]", { userId: userId || null, rows: results.length });
    res.json(results);
  });
}

function getManualFineOptions(res) {
  /*
    Manual fine dropdowns:
    - Members come from user table.
    - Rare/reference books come from book where IsBorrowable = 0.
    This keeps the manual fine feature focused on in-library/reference damage.
  */
  const usersSql = `
    SELECT UserID, FullName, Email
    FROM user
    WHERE Role = 'Member' AND IsActive = b'1'
    ORDER BY FullName ASC
  `;

  const booksSql = `
    SELECT BookID, Title, ISBN
    FROM book
    WHERE IsBorrowable = 0
    ORDER BY Title ASC
  `;

  db.query(usersSql, (userErr, users) => {
    if (userErr) {
      console.error("Manual fine users lookup failed:", userErr.stack || userErr);
      return res.status(500).json({ error: "Unable to load members for manual fine." });
    }

    db.query(booksSql, (bookErr, books) => {
      if (bookErr) {
        console.error("Manual fine books lookup failed:", bookErr.stack || bookErr);
        return res.status(500).json({ error: "Unable to load rare/reference books for manual fine." });
      }

      res.json({ users, books });
    });
  });
}

function createManualFine(body, res) {
  /*
    MANUAL FINE CREATE CODE
    -----------------------
    Used for rare/reference item damage such as coffee spill, page damage,
    or wear and tear. LoanID is intentionally NULL because the item was used
    inside the library and was not borrowed through loanedbook.
  */
  const userId = Number(body.UserID || body.userId);
  const bookId = Number(body.BookID || body.bookId);
  const amount = Number(body.Amount || body.amount);
  const reason = String(body.Reason || body.reason || "").trim();
  const notes = String(body.Notes || body.notes || "").trim() || null;

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "Please select a valid member." });
  }

  if (!Number.isInteger(bookId) || bookId <= 0) {
    return res.status(400).json({ error: "Please select a valid rare/reference book." });
  }

  if (!Number.isFinite(amount) || amount <= 0 || amount > 9999.99) {
    return res.status(400).json({ error: "Manual fine amount must be between $0.01 and $9,999.99." });
  }

  if (reason.length < 3 || reason.length > 160) {
    return res.status(400).json({ error: "Reason must be between 3 and 160 characters." });
  }

  if (notes && notes.length > 255) {
    return res.status(400).json({ error: "Notes cannot be longer than 255 characters." });
  }

  const validateSql = `
    SELECT
      u.UserID,
      b.BookID
    FROM user u
    INNER JOIN book b ON b.BookID = ?
    WHERE u.UserID = ?
      AND u.Role = 'Member'
      AND u.IsActive = b'1'
      AND b.IsBorrowable = 0
    LIMIT 1
  `;

  db.query(validateSql, [bookId, userId], (validateErr, rows) => {
    if (validateErr) {
      console.error("Manual fine validation failed:", validateErr.stack || validateErr);
      return res.status(500).json({ error: "Unable to validate manual fine." });
    }

    if (!rows.length) {
      return res.status(400).json({
        error: "Manual fines can only be added for active members and non-borrowable rare/reference books.",
      });
    }

    const insertSql = `
      INSERT INTO fine (LoanID, UserID, BookID, Amount, Reason, FineType, Notes, Status, FineDate)
      VALUES (NULL, ?, ?, ?, ?, 'Manual', ?, 'Unpaid', CURDATE())
    `;

    db.query(insertSql, [userId, bookId, amount, reason, notes], (insertErr, result) => {
      if (insertErr) {
        console.error("Manual fine insert failed:", insertErr.stack || insertErr);
        return res.status(500).json({ error: "Unable to create manual fine.", detail: insertErr.message });
      }

      res.status(201).json({
        message: "Manual rare/reference fine created successfully.",
        FineID: result.insertId,
      });
    });
  });
}

function updateManualFine(fineId, body, res) {
  /*
    MANUAL FINE EDIT CODE
    ---------------------
    This updates only fines where FineType = 'Manual'. It intentionally does
    not edit automatic overdue fines because those are calculated from
    loanedbook due dates.
  */
  const userId = Number(body.UserID || body.userId);
  const bookId = Number(body.BookID || body.bookId);
  const amount = Number(body.Amount || body.amount);
  const reason = String(body.Reason || body.reason || "").trim();
  const notes = String(body.Notes || body.notes || "").trim() || null;

  if (!Number.isInteger(Number(fineId)) || Number(fineId) <= 0) {
    return res.status(400).json({ error: "Please provide a valid fine ID." });
  }

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "Please select a valid member." });
  }

  if (!Number.isInteger(bookId) || bookId <= 0) {
    return res.status(400).json({ error: "Please select a valid rare/reference book." });
  }

  if (!Number.isFinite(amount) || amount <= 0 || amount > 9999.99) {
    return res.status(400).json({ error: "Manual fine amount must be between $0.01 and $9,999.99." });
  }

  if (reason.length < 3 || reason.length > 160) {
    return res.status(400).json({ error: "Reason must be between 3 and 160 characters." });
  }

  if (notes && notes.length > 255) {
    return res.status(400).json({ error: "Notes cannot be longer than 255 characters." });
  }

  const validateSql = `
    SELECT
      u.UserID,
      b.BookID
    FROM user u
    INNER JOIN book b ON b.BookID = ?
    WHERE u.UserID = ?
      AND u.Role = 'Member'
      AND u.IsActive = b'1'
      AND b.IsBorrowable = 0
    LIMIT 1
  `;

  db.query(validateSql, [bookId, userId], (validateErr, rows) => {
    if (validateErr) {
      console.error("Manual fine edit validation failed:", validateErr.stack || validateErr);
      return res.status(500).json({ error: "Unable to validate manual fine edit." });
    }

    if (!rows.length) {
      return res.status(400).json({
        error: "Manual fines can only be edited for active members and non-borrowable rare/reference books.",
      });
    }

    const updateSql = `
      UPDATE fine
      SET UserID = ?,
          BookID = ?,
          Amount = ?,
          Reason = ?,
          Notes = ?
      WHERE FineID = ?
        AND FineType = 'Manual'
    `;

    db.query(updateSql, [userId, bookId, amount, reason, notes, fineId], (updateErr, result) => {
      if (updateErr) {
        console.error("Manual fine update failed:", updateErr.stack || updateErr);
        return res.status(500).json({ error: "Unable to update manual fine.", detail: updateErr.message });
      }

      if (!result.affectedRows) {
        return res.status(404).json({ error: "Manual fine not found. Automatic overdue fines cannot be edited manually." });
      }

      res.json({ message: "Manual fine updated successfully." });
    });
  });
}

function updateFineStatus(fineId, status, res) {
  /*
    This function is the main Fine "edit/update" backend logic.
    It receives the FineID from the URL and updates Status in the fine table.

    If the frontend sends a calculated ID like calculated-15, that means a
    stored fine row does not exist yet. In that case we create/update the fine
    row by LoanID first using upsertFineByLoanId().
  */
  const raw = String(fineId || "");
  const loanId = raw.startsWith("calculated-") ? Number(raw.replace("calculated-", "")) : null;

  if (loanId) {
    upsertFineByLoanId(loanId, status, res);
    return;
  }

  db.query(
    `
      UPDATE fine
      SET Status = ?,
          PaidAt = CASE WHEN ? = 'Paid' THEN COALESCE(PaidAt, NOW()) ELSE NULL END
      WHERE FineID = ?
    `,
    [status, status, fineId],
    (err, result) => {
      if (err) {
        console.error("Fine status update failed:", err.stack || err);
        return res.status(500).json({ error: "Unable to update fine status.", detail: err.message });
      }

      if (!result.affectedRows) {
        return res.status(404).json({ error: "Fine record not found." });
      }

      res.json({ message: `Fine marked as ${status.toLowerCase()}.` });
    }
  );
}

function syncAutomaticFines(res) {
  /*
    Sync/Add automatic fines:
    This INSERT ... SELECT reads overdue rows from loanedbook and inserts them
    into fine. If a fine already exists for that LoanID, the UNIQUE KEY updates
    the amount and date but keeps the existing status.
  */
  const sql = `
    INSERT INTO fine (LoanID, UserID, BookID, Amount, Reason, FineType, Status, FineDate, PaidAt)
    SELECT
      l.LoanID,
      l.UserID,
      l.BookID,
      GREATEST(DATEDIFF(CURDATE(), l.DueDate), CASE WHEN l.IsOverdue = b'1' THEN 1 ELSE 0 END) * ?,
      'Overdue return charge',
      'Overdue',
      COALESCE(f.Status, 'Unpaid'),
      CURDATE(),
      f.PaidAt
    FROM loanedbook l
    LEFT JOIN fine f ON f.LoanID = l.LoanID
    WHERE l.ReturnDate IS NULL
      AND (CURDATE() > l.DueDate OR l.IsOverdue = b'1')
    ON DUPLICATE KEY UPDATE
      UserID = VALUES(UserID),
      BookID = VALUES(BookID),
      Amount = VALUES(Amount),
      Reason = VALUES(Reason),
      FineType = VALUES(FineType),
      FineDate = VALUES(FineDate),
      Status = fine.Status
  `;

  db.query(sql, [DAILY_FINE_RATE], (err, result) => {
    if (err) {
      console.error("Fine sync failed:", err.stack || err);
      return res.status(500).json({ error: "Unable to sync automatic fines.", detail: err.message });
    }

    res.status(201).json({
      message: "Automatic fines synced successfully.",
      affectedRows: result.affectedRows,
    });
  });
}

function upsertFineByLoanId(loanId, status, res) {
  /*
    Creates a fine from one overdue loan and immediately applies a status.
    This supports editing calculated fines that have not yet been stored.
  */
  const sql = `
    INSERT INTO fine (LoanID, UserID, BookID, Amount, Reason, FineType, Status, FineDate, PaidAt)
    SELECT
      l.LoanID,
      l.UserID,
      l.BookID,
      GREATEST(DATEDIFF(CURDATE(), l.DueDate), CASE WHEN l.IsOverdue = b'1' THEN 1 ELSE 0 END) * ?,
      'Overdue return charge',
      'Overdue',
      ?,
      CURDATE(),
      CASE WHEN ? = 'Paid' THEN NOW() ELSE NULL END
    FROM loanedbook l
    WHERE l.LoanID = ?
      AND l.ReturnDate IS NULL
      AND (CURDATE() > l.DueDate OR l.IsOverdue = b'1')
    ON DUPLICATE KEY UPDATE
      UserID = VALUES(UserID),
      BookID = VALUES(BookID),
      Amount = VALUES(Amount),
      Reason = VALUES(Reason),
      FineType = VALUES(FineType),
      Status = VALUES(Status),
      FineDate = VALUES(FineDate),
      PaidAt = VALUES(PaidAt)
  `;

  db.query(sql, [DAILY_FINE_RATE, status, status, loanId], (err, result) => {
    if (err) {
      console.error("Calculated fine upsert failed:", err.stack || err);
      return res.status(500).json({ error: "Unable to save calculated fine.", detail: err.message });
    }

    if (!result.affectedRows) {
      return res.status(404).json({ error: "Overdue loan not found." });
    }

    res.json({ message: `Fine marked as ${status.toLowerCase()}.` });
  });
}

function deleteFine(fineId, res) {
  /*
    Delete stored fine record.
    We do not delete the loanedbook row here. If the loan is still overdue,
    Sync Fines can create the fine again. This keeps teammate loan data safe.
  */
  const raw = String(fineId || "");
  const loanId = raw.startsWith("calculated-") ? Number(raw.replace("calculated-", "")) : null;
  const sql = loanId ? "DELETE FROM fine WHERE LoanID = ?" : "DELETE FROM fine WHERE FineID = ?";
  const value = loanId || fineId;

  db.query(sql, [value], (err, result) => {
    if (err) {
      console.error("Fine delete failed:", err.stack || err);
      return res.status(500).json({ error: "Unable to delete fine.", detail: err.message });
    }

    res.json({
      message: result.affectedRows
        ? "Fine deleted successfully."
        : "No stored fine was deleted. If the loan is still overdue, it can be synced again.",
      affectedRows: result.affectedRows,
    });
  });
}

module.exports = router;
