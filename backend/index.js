const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/books", require("./routes/bookRoutes"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/categories", require("./modules/bookCategory/bookCategory.routes"));
app.use("/loans", require("./modules/loan/loand.routes"));

// Test route
app.get("/", (req, res) => {
  res.send("LibraSys backend is running");
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});