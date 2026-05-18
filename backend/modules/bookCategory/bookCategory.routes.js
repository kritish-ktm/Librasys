const express = require("express");
const router = express.Router();
const controller = require("./bookCategory.controller");
const { auth, requireLibrarian } = require("../../middleware/auth.middleware");

router.get("/active", controller.getActiveCategories);
router.get("/most-borrowed", auth, requireLibrarian, controller.getMostBorrowedBooks);
router.get("/", auth, requireLibrarian, controller.getCategories);
router.get("/:id/books", auth, requireLibrarian, controller.getCategoryBooks);
router.get("/:id", auth, requireLibrarian, controller.getCategoryById);
router.post("/", auth, requireLibrarian, controller.createCategory);
router.put("/:id/status", auth, requireLibrarian, controller.toggleStatus);
router.put("/:id", auth, requireLibrarian, controller.updateCategory);
router.delete("/:id", auth, requireLibrarian, controller.deleteCategory);

module.exports = router;
