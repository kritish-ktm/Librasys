const express = require("express");
const cors = require("cors");
require("dotenv").config();

const fineRoutes = require("./routes/fineRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Allows the frontend to send requests to this backend server.
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Allows the backend to read JSON data sent in request bodies.
app.use(express.json({ limit: "12mb" }));

// Logs each incoming request in the terminal for easier debugging.
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Book management routes.
app.use("/books", require("./routes/bookRoutes"));

// Authentication routes for login and registration.
app.use("/api/auth", require("./routes/auth"));

// User management routes.
app.use("/api/users", require("./routes/userRoutes"));

// Book category routes.
app.use(
  "/categories",
  require("./modules/bookCategory/bookCategory.routes")
);

// Loan management routes.
app.use(
  "/loans",
  require("./modules/loan/loand.routes")
);

// Fine routes are available under both paths for frontend compatibility.
app.use("/api/fines", fineRoutes);
app.use("/fines", fineRoutes);

// Simple route used to check that the backend server is running.
app.get("/", (req, res) => {
  res.send("LibraSys backend is running");
});

// Start the backend server.
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});