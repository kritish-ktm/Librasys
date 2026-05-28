const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const fineRoutes = require("./routes/fineRoutes");
const db = require("./config/db");

const app = express();
const PORT = process.env.PORT || 5000;

// Allows the frontend to send requests to this backend server.
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Allows the backend to read JSON data sent in request bodies.
app.use(express.json({ limit: "12mb" }));

// Serves uploaded category images so the frontend can display them by URL.
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Logs each incoming request in the terminal for easier debugging.
app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on("finish", () => {
    console.log("[http]", {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      elapsedMs: Date.now() - startedAt,
    });
  });
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
app.use(
  "/api/loans",
  require("./modules/loan/loand.routes")
);

// Fine routes are available under both paths for frontend compatibility.
app.use("/api/fines", fineRoutes);
app.use("/fines", fineRoutes);

// Simple route used to check that the backend server is running.
app.get("/", (req, res) => {
  res.send("LibraSys backend is running");
});

app.get("/health/db", (req, res) => {
  const startedAt = Date.now();
  db.query(
    "SELECT DATABASE() AS databaseName, @@version AS version, 1 AS ok",
    (err, rows) => {
      if (err) {
        console.error("DB health check failed:", err);
        return res.status(500).json({
          ok: false,
          error: err.message,
          code: err.code,
          config: db.configForLogs,
          elapsedMs: Date.now() - startedAt,
        });
      }

      res.json({
        ok: true,
        ...rows[0],
        config: db.configForLogs,
        elapsedMs: Date.now() - startedAt,
      });
    }
  );
});

// Start the backend server.
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
