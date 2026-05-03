const db = require("../config/db");

// GET all books
exports.getBooks = (req, res) => {
  const sql = `
    SELECT 
      BookID,
      CategoryID,
      Title,
      ISBN,
      PublicationDate,
      AvailableCopies,
      IsBorrowable
    FROM book
    ORDER BY BookID DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Get books error:", err);
      return res.status(500).json({
        error: "Database error while fetching books",
      });
    }

    res.json(results);
  });
};

// ADD new book
exports.addBook = (req, res) => {
  const {
    CategoryID,
    Title,
    ISBN,
    PublicationDate,
    AvailableCopies,
    IsBorrowable,
  } = req.body;

  if (!Title || Title.trim() === "") {
    return res.status(400).json({ error: "Book title is required" });
  }

  if (!ISBN || ISBN.trim() === "") {
    return res.status(400).json({ error: "ISBN is required" });
  }

  if (ISBN.trim().length > 13) {
    return res.status(400).json({
      error: "ISBN cannot be longer than 13 characters",
    });
  }

  const copies = Number(AvailableCopies);

  if (Number.isNaN(copies) || copies < 0) {
    return res.status(400).json({
      error: "Available copies must be 0 or more",
    });
  }

  const sql = `
    INSERT INTO book 
    (CategoryID, Title, ISBN, PublicationDate, AvailableCopies, IsBorrowable)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  const values = [
    CategoryID === "" || CategoryID === undefined || CategoryID === null
      ? null
      : Number(CategoryID),
    Title.trim(),
    ISBN.trim(),
    PublicationDate === "" || PublicationDate === undefined || PublicationDate === null
      ? null
      : PublicationDate,
    copies,
    IsBorrowable ? 1 : 0,
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Add book error:", err);

      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json({
          error: "A book with this ISBN already exists",
        });
      }

      return res.status(500).json({
        error: "Database error while adding book",
      });
    }

    res.status(201).json({
      message: "Book added successfully",
      BookID: result.insertId,
    });
  });
};

// UPDATE book
exports.updateBook = (req, res) => {
  const { id } = req.params;

  const {
    CategoryID,
    Title,
    ISBN,
    PublicationDate,
    AvailableCopies,
    IsBorrowable,
  } = req.body;

  if (!Title || Title.trim() === "") {
    return res.status(400).json({ error: "Book title is required" });
  }

  if (!ISBN || ISBN.trim() === "") {
    return res.status(400).json({ error: "ISBN is required" });
  }

  if (ISBN.trim().length > 13) {
    return res.status(400).json({
      error: "ISBN cannot be longer than 13 characters",
    });
  }

  const copies = Number(AvailableCopies);

  if (Number.isNaN(copies) || copies < 0) {
    return res.status(400).json({
      error: "Available copies must be 0 or more",
    });
  }

  const sql = `
    UPDATE book
    SET 
      CategoryID = ?, 
      Title = ?, 
      ISBN = ?, 
      PublicationDate = ?, 
      AvailableCopies = ?, 
      IsBorrowable = ?
    WHERE BookID = ?
  `;

  const values = [
    CategoryID === "" || CategoryID === undefined || CategoryID === null
      ? null
      : Number(CategoryID),
    Title.trim(),
    ISBN.trim(),
    PublicationDate === "" || PublicationDate === undefined || PublicationDate === null
      ? null
      : PublicationDate,
    copies,
    IsBorrowable ? 1 : 0,
    id,
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Update book error:", err);

      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json({
          error: "A book with this ISBN already exists",
        });
      }

      return res.status(500).json({
        error: "Database error while updating book",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Book not found" });
    }

    res.json({ message: "Book updated successfully" });
  });
};

// DELETE book
exports.deleteBook = (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM book WHERE BookID = ?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Delete book error:", err);

      if (err.code === "ER_ROW_IS_REFERENCED_2") {
        return res.status(400).json({
          error: "Cannot delete this book because it is connected to another record",
        });
      }

      return res.status(500).json({
        error: "Database error while deleting book",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Book not found" });
    }

    res.json({ message: "Book deleted successfully" });
  });
};