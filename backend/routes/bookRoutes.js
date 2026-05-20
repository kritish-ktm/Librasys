const express = require("express");
const router = express.Router();
const bookController = require("../controllers/bookController");

// Book routes connect each HTTP request to the correct controller function.
router.get("/", bookController.getBooks); // Get all books.
router.get("/:id", bookController.getBookById); // Get one book by BookID.
router.post("/", bookController.addBook); // Add a new book.
router.put("/:id", bookController.updateBook); // Update an existing book.
router.delete("/:id", bookController.deleteBook); // Delete a book.

module.exports = router;