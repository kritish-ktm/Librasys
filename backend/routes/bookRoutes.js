const express = require("express");
const router = express.Router();
const bookController = require("../controllers/bookController");

// Book routes connect HTTP requests to the correct controller function.
router.get("/", bookController.getBooks);       // List / find books on frontend
router.post("/", bookController.addBook);       // Add a new book
router.put("/:id", bookController.updateBook);  // Edit / update a book
router.delete("/:id", bookController.deleteBook); // Delete a book

module.exports = router;
