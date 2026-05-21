const db = require("../config/db");

// SYSTEM HELPER: Prepare book values before saving to MySQL
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

// SYSTEM VALIDATION: Check book data before Add/Edit reaches the database
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

// SYSTEM FUNCTION: View Books
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

  // DATABASE ACCESS: Run SELECT query and send books back to frontend
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

// SYSTEM FUNCTION: Get Book By ID
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

  // DATABASE ACCESS: Run SELECT query for one book
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

// SYSTEM FUNCTION: Add Book
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

  // DATABASE ACCESS: Run INSERT query to save a new book
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

// SYSTEM FUNCTION: Edit Book
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

  // DATABASE ACCESS: Run UPDATE query using the selected BookID
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

// SYSTEM FUNCTION: Delete Book
exports.deleteBook = (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM book WHERE BookID = ?";

  // DATABASE ACCESS: Run DELETE query using the selected BookID
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