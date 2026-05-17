const express  = require('express');
const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const db       = require('../config/db');

const router = express.Router();

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Basic email format check — rejects obviously malformed addresses. */
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/**
 * Ensures a URL parameter is a positive integer before it touches the DB.
 * Prevents ugly DB errors (and potential surprises) from non-numeric IDs.
 * Returns the parsed integer, or NaN if invalid.
 */
const parseId = (param) => {
  const n = parseInt(param, 10);
  return Number.isFinite(n) && n > 0 ? n : NaN;
};

// ─── Middleware ────────────────────────────────────────────────────────────────

/**
 * auth — verifies the JWT in the Authorization header.
 *
 * Distinguishes between an EXPIRED token (TokenExpiredError) and a
 * TAMPERED / invalid token so the frontend can react differently if needed
 * (e.g. show "session expired" vs "access denied").
 *
 * On success, attaches the decoded payload to req.user:
 *   { id: UserID, role: 'Librarian' | 'Member', iat, exp }
 */
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided.' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    // JsonWebTokenError  → tampered or malformed
    // TokenExpiredError  → valid structure but past expiry
    const expired = err.name === 'TokenExpiredError';
    return res.status(401).json({
      error: expired ? 'Session expired. Please log in again.' : 'Invalid token.'
    });
  }
}

/**
 * librarianOnly — restricts a route to users with the Librarian role.
 * Must be used AFTER the auth middleware so req.user is already set.
 */
function librarianOnly(req, res, next) {
  if (req.user.role !== 'Librarian') {
    return res.status(403).json({ error: 'Access denied. Librarians only.' });
  }
  next();
}

// ─── GET /api/users/profile ────────────────────────────────────────────────────
/**
 * Returns the profile of the currently logged-in user.
 *
 * We re-query the DB (rather than trusting the JWT payload) so that
 * deactivated accounts are blocked even if their token hasn't expired yet.
 */
router.get('/profile', auth, (req, res) => {
  const sql = `
    SELECT UserID, FullName, Email, Role, IsActive, DateRegistered
    FROM user
    WHERE UserID = ?
  `;

  db.query(sql, [req.user.id], (err, results) => {
    if (err) {
      console.error('Profile fetch error:', err);
      return res.status(500).json({ error: 'Failed to load profile.' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = results[0];

    // Block deactivated users even if their JWT is still valid
    if (!user.IsActive || Number(user.IsActive) === 0) {
      return res.status(403).json({
        error: 'This account has been deactivated. Please contact a librarian.'
      });
    }

    res.json(user);
  });
});

// ─── PUT /api/users/profile ────────────────────────────────────────────────────
/**
 * Allows the logged-in user to update their own name and email.
 *
 * Validation:
 *  - fullName : required, 2–100 chars
 *  - email    : required, valid format, not already used by another account
 *
 * We intentionally do NOT allow role or password changes here —
 * role changes are librarian-only (PUT /:id) and passwords need
 * a dedicated change-password flow with current-password confirmation.
 */
router.put('/profile', auth, (req, res) => {
  const { fullName, email } = req.body;

  // ── Input validation ──────────────────────────────────────────────────────
  if (!fullName || fullName.trim().length < 2 || fullName.trim().length > 100) {
    return res.status(400).json({ error: 'Full name must be between 2 and 100 characters.' });
  }

  if (!email || !isValidEmail(email.trim())) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  // ── Check email isn't already taken by a different account ────────────────
  const checkSql = `SELECT UserID FROM user WHERE Email = ? AND UserID != ?`;

  db.query(checkSql, [email.trim().toLowerCase(), req.user.id], (checkErr, existing) => {
    if (checkErr) {
      console.error('Profile email check error:', checkErr);
      return res.status(500).json({ error: 'Failed to validate email.' });
    }

    if (existing.length > 0) {
      return res.status(409).json({ error: 'This email is already in use by another account.' });
    }

    // ── Apply the update ──────────────────────────────────────────────────
    const updateSql = `UPDATE user SET FullName = ?, Email = ? WHERE UserID = ?`;

    db.query(
      updateSql,
      [fullName.trim(), email.trim().toLowerCase(), req.user.id],
      (err, result) => {
        if (err) {
          console.error('Profile update error:', err);
          return res.status(500).json({ error: 'Failed to update profile.' });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'User not found.' });
        }

        res.json({ message: 'Profile updated successfully.' });
      }
    );
  });
});

// ─── GET /api/users ────────────────────────────────────────────────────────────
/**
 * Returns all user records. Librarians only.
 * Ordered newest-first so recently added users appear at the top.
 */
router.get('/', auth, librarianOnly, (req, res) => {
  const sql = `
    SELECT UserID, FullName, Email, Role, IsActive, DateRegistered
    FROM user
    ORDER BY UserID DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Fetch users error:', err);
      return res.status(500).json({ error: 'Failed to fetch users.' });
    }

    res.json(results);
  });
});

// ─── POST /api/users ───────────────────────────────────────────────────────────
/**
 * Creates a new user account. Librarians only.
 *
 * Validation:
 *  - fullName : required, 2+ chars
 *  - email    : required, valid format, unique
 *  - password : required, 6+ chars
 *  - role     : must be 'Librarian' or 'Member'
 *
 * Passwords are hashed with bcrypt (cost 10) before storage.
 * We do an explicit email uniqueness check before inserting to return
 * a clear 409 error instead of a raw DB constraint violation.
 */
router.post('/', auth, librarianOnly, async (req, res) => {
  const { fullName, email, password, role } = req.body;

  // ── Input validation ──────────────────────────────────────────────────────
  if (!fullName || fullName.trim().length < 2) {
    return res.status(400).json({ error: 'Full name must be at least 2 characters.' });
  }

  if (!email || !isValidEmail(email.trim())) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  if (!['Librarian', 'Member'].includes(role)) {
    return res.status(400).json({ error: 'Role must be Librarian or Member.' });
  }

  // ── Check for duplicate email ─────────────────────────────────────────────
  db.query(
    'SELECT UserID FROM user WHERE Email = ?',
    [email.trim().toLowerCase()],
    async (checkErr, existing) => {
      if (checkErr) {
        console.error('Add user email check error:', checkErr);
        return res.status(500).json({ error: 'Failed to validate email.' });
      }

      if (existing.length > 0) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }

      // ── Hash password and insert ────────────────────────────────────────
      try {
        const passwordHash = await bcrypt.hash(password, 10);

        const insertSql = `
          INSERT INTO user (FullName, Email, PasswordHash, Role, IsActive, DateRegistered)
          VALUES (?, ?, ?, ?, 1, CURDATE())
        `;

        db.query(
          insertSql,
          [fullName.trim(), email.trim().toLowerCase(), passwordHash, role],
          (insertErr) => {
            if (insertErr) {
              console.error('Add user insert error:', insertErr);
              return res.status(500).json({ error: 'Failed to add user.' });
            }

            res.status(201).json({ message: 'User added successfully.' });
          }
        );
      } catch (hashErr) {
        console.error('Password hash error:', hashErr);
        res.status(500).json({ error: 'Failed to secure password.' });
      }
    }
  );
});

// ─── PUT /api/users/:id/status ─────────────────────────────────────────────────
/**
 * Activates or deactivates a user account. Librarians only.
 *
 * Accepts isActive as 1, 0, true, false, "1", or "0" for flexibility.
 * Guards:
 *  - Librarians cannot deactivate their own account (would lock themselves out)
 *  - Non-numeric or missing IDs return 400 before touching the DB
 */
router.put('/:id/status', auth, librarianOnly, (req, res) => {
  const userId = parseId(req.params.id);

  // Reject non-numeric IDs immediately
  if (isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid user ID.' });
  }

  const requestedStatus = req.body.isActive;

  // Normalise all truthy/falsy representations to a DB-safe 1 or 0
  let isActive;
  if ([1, '1', true].includes(requestedStatus))       isActive = 1;
  else if ([0, '0', false].includes(requestedStatus)) isActive = 0;
  else return res.status(400).json({ error: 'isActive must be 1 or 0.' });

  // Prevent a librarian from locking themselves out
  if (userId === Number(req.user.id) && isActive === 0) {
    return res.status(400).json({ error: 'You cannot deactivate your own account.' });
  }

  const sql = `UPDATE user SET IsActive = ? WHERE UserID = ?`;

  db.query(sql, [isActive, userId], (err, result) => {
    if (err) {
      console.error('Status update error:', err);
      return res.status(500).json({ error: 'Failed to update user status.' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({
      message: isActive === 1 ? 'User activated successfully.' : 'User deactivated successfully.',
      isActive
    });
  });
});

// ─── PUT /api/users/:id ────────────────────────────────────────────────────────
/**
 * Updates a user's name, email, and role. Librarians only.
 *
 * Validation:
 *  - fullName : required, 2–100 chars
 *  - email    : required, valid format, not taken by a different user
 *  - role     : must be 'Librarian' or 'Member'
 *
 * Note: Password changes are handled separately and require the current
 * password for confirmation. They are NOT part of this route.
 */
router.put('/:id', auth, librarianOnly, (req, res) => {
  const userId = parseId(req.params.id);

  if (isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid user ID.' });
  }

  const { fullName, email, role } = req.body;

  // ── Input validation ──────────────────────────────────────────────────────
  if (!fullName || fullName.trim().length < 2 || fullName.trim().length > 100) {
    return res.status(400).json({ error: 'Full name must be between 2 and 100 characters.' });
  }

  if (!email || !isValidEmail(email.trim())) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  if (!['Librarian', 'Member'].includes(role)) {
    return res.status(400).json({ error: 'Role must be Librarian or Member.' });
  }

  // ── Check email isn't already used by a different account ─────────────────
  const checkSql = `SELECT UserID FROM user WHERE Email = ? AND UserID != ?`;

  db.query(checkSql, [email.trim().toLowerCase(), userId], (checkErr, existing) => {
    if (checkErr) {
      console.error('Edit user email check error:', checkErr);
      return res.status(500).json({ error: 'Failed to validate email.' });
    }

    if (existing.length > 0) {
      return res.status(409).json({ error: 'This email is already in use by another account.' });
    }

    // ── Apply update ──────────────────────────────────────────────────────
    const updateSql = `
      UPDATE user SET FullName = ?, Email = ?, Role = ?
      WHERE UserID = ?
    `;

    db.query(
      updateSql,
      [fullName.trim(), email.trim().toLowerCase(), role, userId],
      (err, result) => {
        if (err) {
          console.error('Update user error:', err);
          return res.status(500).json({ error: 'Failed to update user.' });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'User not found.' });
        }

        res.json({ message: 'User updated successfully.' });
      }
    );
  });
});

// ─── DELETE /api/users/:id ─────────────────────────────────────────────────────
/**
 * Permanently deletes a user. Librarians only.
 *
 * Guards:
 *  - Librarians cannot delete their own account
 *  - Non-numeric IDs are rejected before touching the DB
 *
 * ⚠️  If your DB schema has foreign key constraints on UserID (e.g. Loans,
 *     Fines), deletion will fail with a FK error if the user has related
 *     records. Consider soft-delete (IsActive = 0) as a safer alternative.
 */
router.delete('/:id', auth, librarianOnly, (req, res) => {
  const userId = parseId(req.params.id);

  if (isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid user ID.' });
  }

  // Prevent self-deletion — would orphan the current session
  if (userId === Number(req.user.id)) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }

  const sql = `DELETE FROM user WHERE UserID = ?`;

  db.query(sql, [userId], (err, result) => {
    if (err) {
      // FK constraint violation — user has linked loans or fines
      if (err.errno === 1451) {
        return res.status(409).json({
          error: 'Cannot delete this user — they have active loans or fines. Deactivate them instead.'
        });
      }
      console.error('Delete user error:', err);
      return res.status(500).json({ error: 'Failed to delete user.' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ message: 'User deleted successfully.' });
  });
});

module.exports = router;