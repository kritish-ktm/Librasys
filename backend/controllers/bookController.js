const db = require("../config/db");

// GET all books
exports.getBooks = (req, res) => {
  db.query("SELECT * FROM book", (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error" });
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
        console.error(err);
        return res.status(500).json({ error: "Database error" });
      }

      res.json({
        message: "Book added successfully",
        BookID: result.insertId,
      });
    }
  );
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
        console.error(err);
        return res.status(500).json({ error: "Database error" });
      }

      res.json({ message: "Book updated successfully" });
    }
  );
};

// DELETE book
exports.deleteBook = (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM book WHERE BookID = ?", [id], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json({ message: "Book deleted successfully" });
  });
};