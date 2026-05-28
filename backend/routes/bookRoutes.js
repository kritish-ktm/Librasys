const express = require("express");
const router = express.Router();
const bookController = require("../controllers/bookController");
const { auth, requireLibrarian } = require("../middleware/auth.middleware");

// Book routes connect each HTTP request to the correct controller function.

// SYSTEM FUNCTION: View Books
// Public catalogue access is kept available so books can be viewed and browsed.
router.get("/", bookController.getBooks);

// SYSTEM FUNCTION: Get Book By ID
// Public book detail access is kept available for catalogue browsing.
router.get("/:id", bookController.getBookById);

// SYSTEM FUNCTION: Add Book
// Only authenticated librarians can add new book records.
router.post("/", auth, requireLibrarian, bookController.addBook);

// SYSTEM FUNCTION: Edit Book
// Only authenticated librarians can update existing book records.
router.put("/:id", auth, requireLibrarian, bookController.updateBook);

// SYSTEM FUNCTION: Delete Book
// Only authenticated librarians can delete book records.
router.delete("/:id", auth, requireLibrarian, bookController.deleteBook);

module.exports = router;