const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/books", require("./routes/bookRoutes"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/userRoutes"));

app.get("/", (req, res) => {
  res.send("LibraSys backend is running");
});

app.listen(PORT, "localhost", () => {
  console.log(`Server running on port ${PORT}`);
});
