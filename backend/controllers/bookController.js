const db = require("../config/db");

// Converts empty optional fields into values MySQL can store.
const prepareBookValues = (book) => {
  const categoryId =
    book.CategoryID === "" ||
    book.CategoryID === undefined ||
    book.CategoryID === null
      ? null
      : Number(book.CategoryID);

  const publicationDate =
    book.PublicationDate === "" ||
    book.PublicationDate === undefined ||
    book.PublicationDate === null
      ? null
      : book.PublicationDate;

  return {
    CategoryID: categoryId,
    Title: book.Title.trim(),
    ISBN: book.ISBN.trim(),
    PublicationDate: publicationDate,
    AvailableCopies: Number(book.AvailableCopies),
    IsBorrowable: book.IsBorrowable ? 1 : 0,
  };
};

// Backend validation protects the database from invalid book records.
const validateBook = (book) => {
  if (!book.Title || book.Title.trim() === "") {
    return "Book title is required";
  }

  if (!book.ISBN || book.ISBN.trim() === "") {
    return "ISBN is required";
  }

  if (book.ISBN.trim().length > 13) {
    return "ISBN cannot be longer than 13 characters";
  }

  const copies = Number(book.AvailableCopies);

  if (Number.isNaN(copies) || copies < 0) {
    return "Available copies must be 0 or more";
  }

  return "";
};

// List all books from the MySQL Book table.
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

  // db.query uses the shared MySQL connection pool from config/db.js.
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

// Get one book by its BookID, including the category name if available.
exports.getBookById = (req, res) => {
  const sql = `
    SELECT
      b.BookID,
      b.CategoryID,
      b.Title,
      b.ISBN,
      b.PublicationDate,
      b.AvailableCopies,
      b.IsBorrowable,
      c.CategoryName
    FROM book b
    LEFT JOIN BookCategory c ON c.CategoryID = b.CategoryID
    WHERE b.BookID = ?
  `;

  db.query(sql, [req.params.id], (err, results) => {
    if (err) {
      console.error("Get book error:", err);
      return res.status(500).json({
        error: "Database error while fetching book",
      });
    }

    if (!results.length) {
      return res.status(404).json({ error: "Book not found" });
    }

    res.json(results[0]);
  });
};

// Add a new book after validation passes.
exports.addBook = (req, res) => {
  const validationError = validateBook(req.body);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const book = prepareBookValues(req.body);

  const sql = `
    INSERT INTO book 
    (CategoryID, Title, ISBN, PublicationDate, AvailableCopies, IsBorrowable)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  const values = [
    book.CategoryID,
    book.Title,
    book.ISBN,
    book.PublicationDate,
    book.AvailableCopies,
    book.IsBorrowable,
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

// Update an existing book by its BookID.
exports.updateBook = (req, res) => {
  const { id } = req.params;
  const validationError = validateBook(req.body);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const book = prepareBookValues(req.body);

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
    book.CategoryID,
    book.Title,
    book.ISBN,
    book.PublicationDate,
    book.AvailableCopies,
    book.IsBorrowable,
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

// Delete a book if it is not linked to another record.
exports.deleteBook = (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM book WHERE BookID = ?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Delete book error:", err);

      if (err.code === "ER_ROW_IS_REFERENCED_2") {
        return res.status(400).json({
          error:
            "Cannot delete this book because it is connected to another record",
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