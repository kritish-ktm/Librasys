const express = require("express");
const router = express.Router();
const controller = require("./bookCategory.controller");

router.get("/", controller.getCategories);
router.get("/:id", controller.getCategoryById);
router.post("/", controller.createCategory);
router.put("/:id/status", controller.toggleStatus);
router.put("/:id", controller.updateCategory);
router.delete("/:id", controller.deleteCategory);

module.exports = router;
