const express = require("express");
const cors = require("cors");
require("dotenv").config();

// ==========================
// IMPORT ROUTES
// ==========================

const fineRoutes = require("./routes/fineRoutes");

// ==========================
// APP
// ==========================

const app = express();

const PORT = process.env.PORT || 5000;

// ==========================
// MIDDLEWARE
// ==========================

app.use(cors());

app.use(express.json());

// ==========================
// ROUTES
// ==========================

app.use("/books", require("./routes/bookRoutes"));

app.use("/api/auth", require("./routes/auth"));

app.use("/api/users", require("./routes/userRoutes"));

app.use(
  "/categories",
  require("./modules/bookCategory/bookCategory.routes")
);

app.use(
  "/loans",
  require("./modules/loan/loand.routes")
);

// ==========================
// FINE ROUTE
// ==========================

app.use("/api/fines", fineRoutes);

// ==========================
// TEST ROUTE
// ==========================

app.get("/", (req, res) => {

  res.send("LibraSys backend is running");

});

// ==========================
// START SERVER
// ==========================

app.listen(PORT, () => {

  console.log(`Server running on port ${PORT}`);

});