const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const app = express();

// ── Middleware ──────────────────────────────────────────
app.use(cors());          // Allow React frontend to connect
app.use(express.json());  // Parse incoming JSON request bodies

// ── Routes ──────────────────────────────────────────────
const bookRoutes = require('./routes/books');
app.use('/api/books', bookRoutes);

// Add YOUR routes here:
// const userRoutes = require('./routes/users');
// app.use('/api/users', userRoutes);

// ── Start Server ────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
