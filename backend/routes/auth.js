const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

router.post('/register', async (req, res) => {
  const { fullName, email, password } = req.body;
  console.log('Register attempt:', fullName, email);
  const hash = await bcrypt.hash(password, 10);
  const today = new Date().toISOString().split('T')[0];
  const sql = `INSERT INTO user (FullName, Email, PasswordHash, Role, IsActive, DateRegistered)
               VALUES (?, ?, ?, 'Member', 1, ?)`;
  db.query(sql, [fullName, email, hash, today], (err) => {
    if (err) {
      console.log('DB Error:', err.message);
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.json({ message: 'Registered successfully' });
  });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt:', email, password);
  db.query('SELECT * FROM user WHERE Email = ?', [email], async (err, results) => {
    console.log('DB results:', results);
    console.log('DB error:', err);
    if (err || results.length === 0)
      return res.status(401).json({ error: 'Invalid credentials' });
    const user = results[0];
    if (!user.IsActive || user.IsActive.toString() === '0') return res.status(403).json({ error: 'Account is deactivated' });
    const match = await bcrypt.compare(password, user.PasswordHash);
    console.log('Password match:', match);
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