const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

// REGISTER
router.post('/register', async (req, res) => {
  const { fullName, email, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const today = new Date().toISOString().split('T')[0];

  const sql = `INSERT INTO User (FullName, Email, PasswordHash, Role, IsActive, DateRegistered)
               VALUES (?, ?, ?, 'Member', 1, ?)`;

  db.query(sql, [fullName, email, hash, today], (err) => {
    if (err) return res.status(400).json({ error: 'Email already exists' });
    res.json({ message: 'Registered successfully' });
  });
});

// LOGIN
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  db.query('SELECT * FROM User WHERE Email = ?', [email], async (err, results) => {
    if (err || results.length === 0)
      return res.status(401).json({ error: 'Invalid credentials' });

    const user = results[0];
    if (!user.IsActive)
      return res.status(403).json({ error: 'Account is deactivated' });

    const match = await bcrypt.compare(password, user.PasswordHash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.UserID, role: user.Role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ token, role: user.Role, name: user.FullName });
  });
});

module.exports = router;