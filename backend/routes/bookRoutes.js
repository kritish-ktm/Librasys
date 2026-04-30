const express = require("express");
const router = express.Router();
const bookController = require("../controllers/bookController");

// Book routes
router.get("/", bookController.getBooks);
router.post("/", bookController.addBook);
router.put("/:id", bookController.updateBook);
router.delete("/:id", bookController.deleteBook);

module.exports = router;