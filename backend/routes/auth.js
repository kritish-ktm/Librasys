const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const db      = require('../config/db');

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Basic email format check.
 * Not a replacement for email verification, but catches obvious typos
 * before we waste a DB round-trip.
 */
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/**
 * Safely reads MySQL BIT(1) / TINYINT(1) / boolean / Buffer values.
 *
 * MySQL BIT(1) columns arrive over the wire as a Buffer: <Buffer 01> or <Buffer 00>.
 * After JSON serialisation they become { type: 'Buffer', data: [1] }.
 * We handle all three shapes here so the check is reliable regardless of
 * driver version or column type.
 */
const isActiveUser = (value) => {
  if (value === null || value === undefined) return false;

  // Raw Buffer from mysql / mysql2 driver (server-side Node context)
  if (Buffer.isBuffer(value)) return value[0] === 1;

  // JSON-serialised Buffer shape: { type: 'Buffer', data: [0|1] }
  if (typeof value === 'object' && Array.isArray(value.data)) return value.data[0] === 1;

  // Plain number (0 / 1) or boolean
  return Number(value) === 1;
};

// ─── POST /api/auth/register ───────────────────────────────────────────────────
/**
 * Creates a new Member account.
 *
 * Validation:
 *  - fullName  : required, 2+ chars
 *  - email     : required, valid format
 *  - password  : required, 6+ chars
 *
 * All new accounts are given the 'Member' role and IsActive = 1 by default.
 * The DateRegistered is set to today's date in YYYY-MM-DD format.
 */
router.post('/register', async (req, res) => {
  const { fullName, email, password } = req.body;

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

  // ── Hash password + insert ────────────────────────────────────────────────
  try {
    // bcrypt cost factor 10 — good balance of security vs. response time (~100 ms)
    const hash  = await bcrypt.hash(password, 10);
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const sql = `
      INSERT INTO user (FullName, Email, PasswordHash, Role, IsActive, DateRegistered)
      VALUES (?, ?, ?, 'Member', 1, ?)
    `;

    db.query(sql, [fullName.trim(), email.trim().toLowerCase(), hash, today], (err) => {
      if (err) {
        // MySQL error 1062 = duplicate entry (unique constraint on Email)
        if (err.errno === 1062) {
          return res.status(409).json({ error: 'An account with this email already exists.' });
        }
        console.error('Register DB error:', err);
        return res.status(500).json({ error: 'Registration failed. Please try again.' });
      }

      // Never return the password hash — only confirm success
      res.status(201).json({ message: 'Account registered successfully.' });
    });

  } catch (err) {
    // Catches bcrypt failures (e.g. password is somehow not a string)
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ─── POST /api/auth/login ──────────────────────────────────────────────────────
/**
 * Authenticates a user and returns a signed JWT.
 *
 * Security notes:
 *  - We return the SAME error message ("Invalid credentials") whether the email
 *    doesn't exist OR the password is wrong. This prevents user enumeration —
 *    an attacker cannot tell which field was incorrect.
 *  - We NEVER log the password.
 *  - The JWT payload contains only non-sensitive identifiers (UserID + Role).
 *    It is signed with JWT_SECRET from the environment — never hardcoded.
 *  - Token expires in 1 day; the client must re-login after that.
 */
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  // ── Input validation ──────────────────────────────────────────────────────
  if (!email || !isValidEmail(email.trim())) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  if (!password) {
    return res.status(400).json({ error: 'Password is required.' });
  }

  // ── Look up user by email ─────────────────────────────────────────────────
  // Logging only the email (never the password) is safe for debugging
  console.log('Login attempt for:', email.trim().toLowerCase());

  db.query(
    'SELECT * FROM user WHERE Email = ?',
    [email.trim().toLowerCase()],
    async (err, results) => {

      // DB error — log internally but don't expose details to the client
      if (err) {
        console.error('Login DB error:', err);
        return res.status(500).json({ error: 'Login failed. Please try again.' });
      }

      // No matching email — same response as wrong password (prevents enumeration)
      if (results.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      const user = results[0];

      // ── Account status check ────────────────────────────────────────────
      // Must happen BEFORE bcrypt.compare so deactivated users can't log in
      // even with the correct password.
      if (!isActiveUser(user.IsActive)) {
        return res.status(403).json({
          error: 'This account has been deactivated. Please contact a librarian.'
        });
      }

      // ── Password verification ───────────────────────────────────────────
      try {
        const match = await bcrypt.compare(password, user.PasswordHash);

        if (!match) {
          // Same message as "user not found" — prevents enumeration
          return res.status(401).json({ error: 'Invalid credentials.' });
        }
      } catch (err) {
        console.error('bcrypt.compare error:', err);
        return res.status(500).json({ error: 'Login failed. Please try again.' });
      }

      // ── Sign JWT ────────────────────────────────────────────────────────
      // Payload is intentionally minimal — only what the backend needs to
      // authorise requests. Never include the password hash or sensitive PII.
      const token = jwt.sign(
        { id: user.UserID, role: user.Role },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      // Return token + display info the frontend needs immediately
      res.json({
        token,
        userId: user.UserID,
        role: user.Role,
        name: user.FullName
      });
    }
  );
});
// ─── POST /api/auth/member-login ──────────────────────────────────────────────
// Member login only. Librarian/Admin accounts are blocked here.
router.post('/memberlogin', (req, res) => {
  const { email, password } = req.body;

  // Validate email
  if (!email || !isValidEmail(email.trim())) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  // Validate password
  if (!password) {
    return res.status(400).json({ error: 'Password is required.' });
  }

  db.query(
    'SELECT * FROM user WHERE Email = ?',
    [email.trim().toLowerCase()],
    async (err, results) => {
      if (err) {
        console.error('Member login DB error:', err);
        return res.status(500).json({ error: 'Login failed. Please try again.' });
      }

      if (results.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      const user = results[0];

      // Block Librarian/Admin from member login
      if (user.Role !== 'Member') {
        return res.status(403).json({
          error: 'Only members can log in from this page.'
        });
      }

      // Block inactive members
      if (!isActiveUser(user.IsActive)) {
        return res.status(403).json({
          error: 'This account has been deactivated. Please contact a librarian.'
        });
      }

      // Check password
      const match = await bcrypt.compare(password, user.PasswordHash);

      if (!match) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      // Create token
      const token = jwt.sign(
        { id: user.UserID, role: user.Role },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      res.json({
        token,
        userId: user.UserID,
        role: user.Role,
        name: user.FullName
      });
    }
  );
});
module.exports = router;
