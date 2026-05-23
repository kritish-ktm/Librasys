const db = require("../config/db");

// SYSTEM HELPER: Prepare book values before saving to MySQL
const prepareBookValues = (book) => {
  const publicationDate =
    book.PublicationDate === "" ||
    book.PublicationDate === undefined ||
    book.PublicationDate === null
      ? null
      : book.PublicationDate;

  return {
    CategoryID: Number(book.CategoryID),
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

  if (book.Title.trim().length > 150) {
    return "Book title cannot be longer than 150 characters";
  }

  if (!book.ISBN || book.ISBN.trim() === "") {
    return "ISBN is required";
  }

  const isbn = book.ISBN.trim();

  if (!/^\d+$/.test(isbn)) {
    return "ISBN must contain digits only";
  }

  if (isbn.length !== 10 && isbn.length !== 13) {
    return "ISBN must be exactly 10 or 13 digits";
  }

  if (
    book.CategoryID === "" ||
    book.CategoryID === undefined ||
    book.CategoryID === null
  ) {
    return "Category ID is required";
  }

  const categoryId = Number(book.CategoryID);

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return "Category ID must be a valid whole number";
  }

  if (
    book.AvailableCopies === "" ||
    book.AvailableCopies === undefined ||
    book.AvailableCopies === null
  ) {
    return "Available copies is required";
  }

  const copies = Number(book.AvailableCopies);

  if (!Number.isInteger(copies) || copies < 0) {
    return "Available copies must be a whole number of 0 or more";
  }

  if (book.PublicationDate) {
    const publicationDate = new Date(book.PublicationDate);
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    if (Number.isNaN(publicationDate.getTime())) {
      return "Publication date must be a valid date";
    }

    if (publicationDate > today) {
      return "Publication date cannot be in the future";
    }
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

  // DATABASE ACCESS: Check if this book is linked to any loan records first
  const loanCheckSql = "SELECT COUNT(*) AS loanCount FROM LoanedBook WHERE BookID = ?";

  db.query(loanCheckSql, [id], (loanErr, loanResults) => {
    if (loanErr) {
      console.error("Delete book loan check error:", loanErr);
      return res.status(500).json({
        error: "Database error while checking book loan history",
      });
    }

    const loanCount = Number(loanResults[0]?.loanCount || 0);

    if (loanCount > 0) {
      return res.status(400).json({
        error:
          "Cannot delete this book because it is connected to existing loan records. This protects borrowing history and database integrity.",
      });
    }

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
  });
};