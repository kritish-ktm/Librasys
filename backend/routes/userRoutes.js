const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const router = express.Router();

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const parseId = (param) => {
  const n = parseInt(param, 10);
  return Number.isFinite(n) && n > 0 ? n : NaN;
};

const isActiveUser = (value) => {
  if (value === null || value === undefined) return false;
  if (Buffer.isBuffer(value)) return value[0] === 1;
  if (typeof value === 'object' && Array.isArray(value.data)) return value.data[0] === 1;
  return value === true || value === 1 || value === '1';
};

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided.' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    const expired = err.name === 'TokenExpiredError';
    return res.status(401).json({
      error: expired ? 'Session expired. Please log in again.' : 'Invalid token.',
    });
  }
}

function librarianOnly(req, res, next) {
  if (req.user.role !== 'Librarian') {
    return res.status(403).json({ error: 'Access denied. Librarians only.' });
  }
  next();
}

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

    if (!isActiveUser(results[0].IsActive)) {
      return res.status(403).json({
        error: 'This account has been deactivated. Please contact a librarian.',
      });
    }

    res.json(results[0]);
  });
});

router.put('/profile', auth, (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || fullName.trim().length < 2 || fullName.trim().length > 100) {
    return res.status(400).json({ error: 'Full name must be between 2 and 100 characters.' });
  }

  if (!email || !isValidEmail(email.trim())) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  const checkSql = `SELECT UserID FROM user WHERE Email = ? AND UserID != ?`;

  db.query(checkSql, [email.trim().toLowerCase(), req.user.id], (checkErr, existing) => {
    if (checkErr) {
      console.error('Profile email check error:', checkErr);
      return res.status(500).json({ error: 'Failed to validate email.' });
    }

    if (existing.length > 0) {
      return res.status(409).json({ error: 'This email is already in use by another account.' });
    }

    const updateSql = `UPDATE user SET FullName = ?, Email = ? WHERE UserID = ?`;

    db.query(updateSql, [fullName.trim(), email.trim().toLowerCase(), req.user.id], (err, result) => {
      if (err) {
        console.error('Profile update error:', err);
        return res.status(500).json({ error: 'Failed to update profile.' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'User not found.' });
      }

      res.json({ message: 'Profile updated successfully.' });
    });
  });
});

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

router.post('/', auth, librarianOnly, async (req, res) => {
  const { fullName, email, password, role } = req.body;

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

  db.query('SELECT UserID FROM user WHERE Email = ?', [email.trim().toLowerCase()], async (checkErr, existing) => {
    if (checkErr) {
      console.error('Add user email check error:', checkErr);
      return res.status(500).json({ error: 'Failed to validate email.' });
    }

    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    try {
      const passwordHash = await bcrypt.hash(password, 10);
      const insertSql = `
        INSERT INTO user (FullName, Email, PasswordHash, Role, IsActive, DateRegistered)
        VALUES (?, ?, ?, ?, 1, CURDATE())
      `;

      db.query(insertSql, [fullName.trim(), email.trim().toLowerCase(), passwordHash, role], (insertErr) => {
        if (insertErr) {
          console.error('Add user insert error:', insertErr);
          return res.status(500).json({ error: 'Failed to add user.' });
        }

        res.status(201).json({ message: 'User added successfully.' });
      });
    } catch (hashErr) {
      console.error('Password hash error:', hashErr);
      res.status(500).json({ error: 'Failed to secure password.' });
    }
  });
});

router.put('/:id/status', auth, librarianOnly, (req, res) => {
  const userId = parseId(req.params.id);

  if (isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid user ID.' });
  }

  const requestedStatus = req.body.isActive;
  let isActive;

  if ([1, '1', true].includes(requestedStatus)) isActive = 1;
  else if ([0, '0', false].includes(requestedStatus)) isActive = 0;
  else return res.status(400).json({ error: 'isActive must be 1 or 0.' });

  if (userId === Number(req.user.id) && isActive === 0) {
    return res.status(400).json({ error: 'You cannot deactivate your own account.' });
  }

  db.query('SELECT UserID FROM user WHERE UserID = ?', [userId], (findErr, existing) => {
    if (findErr) {
      console.error('Status user lookup error:', findErr);
      return res.status(500).json({ error: 'Failed to validate user.' });
    }

    if (existing.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    db.query('UPDATE user SET IsActive = ? WHERE UserID = ?', [isActive, userId], (err) => {
      if (err) {
        console.error('Status update error:', err);
        return res.status(500).json({ error: 'Failed to update user status.' });
      }

      res.json({
        message: isActive === 1 ? 'User activated successfully.' : 'User deactivated successfully.',
        isActive,
      });
    });
  });
});

router.put('/:id', auth, librarianOnly, (req, res) => {
  const userId = parseId(req.params.id);

  if (isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid user ID.' });
  }

  const { fullName, email, role } = req.body;

  if (!fullName || fullName.trim().length < 2 || fullName.trim().length > 100) {
    return res.status(400).json({ error: 'Full name must be between 2 and 100 characters.' });
  }

  if (!email || !isValidEmail(email.trim())) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  if (!['Librarian', 'Member'].includes(role)) {
    return res.status(400).json({ error: 'Role must be Librarian or Member.' });
  }

  db.query('SELECT UserID FROM user WHERE UserID = ?', [userId], (findErr, found) => {
    if (findErr) {
      console.error('Edit user lookup error:', findErr);
      return res.status(500).json({ error: 'Failed to validate user.' });
    }

    if (found.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const checkSql = `SELECT UserID FROM user WHERE Email = ? AND UserID != ?`;

    db.query(checkSql, [email.trim().toLowerCase(), userId], (checkErr, existing) => {
      if (checkErr) {
        console.error('Edit user email check error:', checkErr);
        return res.status(500).json({ error: 'Failed to validate email.' });
      }

      if (existing.length > 0) {
        return res.status(409).json({ error: 'This email is already in use by another account.' });
      }

      const updateSql = `
        UPDATE user SET FullName = ?, Email = ?, Role = ?
        WHERE UserID = ?
      `;

      db.query(updateSql, [fullName.trim(), email.trim().toLowerCase(), role, userId], (err) => {
        if (err) {
          console.error('Update user error:', err);
          return res.status(500).json({ error: 'Failed to update user.' });
        }

        res.json({ message: 'User updated successfully.' });
      });
    });
  });
});

router.delete('/:id', auth, librarianOnly, (req, res) => {
  const userId = parseId(req.params.id);

  if (isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid user ID.' });
  }

  if (userId === Number(req.user.id)) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }

  db.query('DELETE FROM user WHERE UserID = ?', [userId], (err, result) => {
    if (err) {
      if (err.errno === 1451) {
        return res.status(409).json({
          error: 'Cannot delete this user because they have active loans or fines. Deactivate them instead.',
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
