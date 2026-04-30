const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
const PORT = 5000;

// Allow React frontend from both CRA and Vite ports
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());

// MySQL connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "librasys",
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
    return;
  }

  console.log("Connected to MySQL");
});

// Test route
app.get("/", (req, res) => {
  res.send("LibraSys backend is running");
});

// GET all books
app.get("/books", (req, res) => {
  const sql = "SELECT * FROM book";

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching books:", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json(results);
  });
});

// ADD new book
app.post("/books", (req, res) => {
  const {
    CategoryID,
    Title,
    ISBN,
    PublicationDate,
    AvailableCopies,
    IsBorrowable,
  } = req.body;

  const sql = `
    INSERT INTO book 
    (CategoryID, Title, ISBN, PublicationDate, AvailableCopies, IsBorrowable)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      CategoryID,
      Title,
      ISBN,
      PublicationDate,
      AvailableCopies,
      IsBorrowable,
    ],
    (err, result) => {
      if (err) {
        console.error("Error adding book:", err);
        return res.status(500).json({ error: "Database error" });
      }

      res.json({
        message: "Book added successfully",
        BookID: result.insertId,
      });
    }
  );
});

// UPDATE book
app.put("/books/:id", (req, res) => {
  const { id } = req.params;

  const {
    CategoryID,
    Title,
    ISBN,
    PublicationDate,
    AvailableCopies,
    IsBorrowable,
  } = req.body;

  const sql = `
    UPDATE book
    SET CategoryID = ?, 
        Title = ?, 
        ISBN = ?, 
        PublicationDate = ?, 
        AvailableCopies = ?, 
        IsBorrowable = ?
    WHERE BookID = ?
  `;

  db.query(
    sql,
    [
      CategoryID,
      Title,
      ISBN,
      PublicationDate,
      AvailableCopies,
      IsBorrowable,
      id,
    ],
    (err) => {
      if (err) {
        console.error("Error updating book:", err);
        return res.status(500).json({ error: "Database error" });
      }

      res.json({ message: "Book updated successfully" });
    }
  );
});

// DELETE book
app.delete("/books/:id", (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM book WHERE BookID = ?";

  db.query(sql, [id], (err) => {
    if (err) {
      console.error("Error deleting book:", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json({ message: "Book deleted successfully" });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
