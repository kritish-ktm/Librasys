const model = require("./bookCategory.model");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const {
  parseCategoryImageUpload,
  validateCategoryPayload,
  validateStatusPayload,
} = require("./bookCategory.validation");



exports.uploadCategoryImage = (req, res) => {
  const validation = parseCategoryImageUpload(req.body);

  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  const { extension, fileName, imageBuffer } = validation.data;
  const safeBaseName = path
    .parse(fileName)
    .name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "category";
  const uniqueName = `${safeBaseName}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${extension}`;
  const uploadDir = path.join(__dirname, "../../uploads/category-images");
  const savedPath = path.join(uploadDir, uniqueName);

  fs.mkdirSync(uploadDir, { recursive: true });
  fs.writeFileSync(savedPath, imageBuffer);

  const imageUrl = `${req.protocol}://${req.get("host")}/uploads/category-images/${uniqueName}`;
  res.status(201).json({ imageUrl });
};

exports.getCategories = (req, res) => {
  const { search = "", status = "all", sortBy = "CategoryName", sortDirection = "asc" } = req.query;

  model.getAll({ search, status, sortBy, sortDirection }, (err, results) => {
    if (err) {
      console.error("Get categories error:", err);
      return res.status(500).json({ error: "Database error while fetching categories" });
    }
    res.json(results);
  });
};

exports.getActiveCategories = (req, res) => {
  model.getActive((err, results) => {
    if (err) {
      console.error("Get active categories error:", err);
      return res.status(500).json({ error: "Database error while fetching active categories" });
    }
    res.json(results);
  });
};



exports.getCategoryById = (req, res) => {
  const { id } = req.params;
  model.getById(id, (err, results) => {
    if (err) {
      console.error("Get category error:", err);
      return res.status(500).json({ error: "Database error while fetching category" });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.json(results[0]);
  });
};

exports.getCategoryBooks = (req, res) => {
  const { id } = req.params;

  model.getBooksByCategory(id, (err, results) => {
    if (err) {
      console.error("Get category books error:", err);
      return res.status(500).json({ error: "Database error while fetching category books" });
    }

    res.json(results);
  });
};

exports.createCategory = (req, res) => {
  const validation = validateCategoryPayload(req.body);

  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  const data = {
    ...validation.data,
    CreatedBy: req.user?.id || null,
    UpdatedBy: req.user?.id || null,
  };

  model.create(data, (err, result) => {
    if (err) {
      console.error("Create category error:", err);
      if (err.code === "ER_DUP_ENTRY") {
        const duplicateField = err.sqlMessage?.includes("CategoryName") ? "name" : "Dewey Code";
        return res.status(400).json({ error: `A category with this ${duplicateField} already exists` });
      }
      if (err.code === "ER_NET_PACKET_TOO_LARGE") {
        return res.status(413).json({ error: "Category image is too large for the database packet limit" });
      }
      return res.status(500).json({ error: "Database error while creating category" });
    }
    res.status(201).json({ message: "Category created successfully", CategoryID: result.insertId });
  });
};

exports.updateCategory = (req, res) => {
  const { id } = req.params;
  const validation = validateCategoryPayload(req.body, { allowStatusAlias: true });

  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  const data = {
    ...validation.data,
    UpdatedBy: req.user?.id || null,
  };

  model.update(id, data, (err, result) => {
    if (err) {
      console.error("Update category error:", err);
      if (err.code === "ER_DUP_ENTRY") {
        const duplicateField = err.sqlMessage?.includes("CategoryName") ? "name" : "Dewey Code";
        return res.status(400).json({ error: `A category with this ${duplicateField} already exists` });
      }
      if (err.code === "ER_NET_PACKET_TOO_LARGE") {
        return res.status(413).json({ error: "Category image is too large for the database packet limit" });
      }
      return res.status(500).json({ error: "Database error while updating category" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.json({ message: "Category updated successfully" });
  });
};

exports.toggleStatus = (req, res) => {
  const { id } = req.params;
  const validation = validateStatusPayload(req.body);

  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  const { IsActive, ArchiveReason } = validation.data;
  model.updateStatus(id, IsActive, ArchiveReason, req.user?.id || null, (err, result) => {
    if (err) {
      console.error("Toggle status error:", err);
      return res.status(500).json({ error: "Database error while updating status" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.json({ message: `Category ${IsActive ? "activated" : "deactivated"} successfully` });
  });
};

exports.deleteCategory = (req, res) => {
  const { id } = req.params;

  model.hasBooksAssigned(id, (err, results) => {
    if (err) {
      console.error("Check books error:", err);
      return res.status(500).json({ error: "Database error while checking category" });
    }

    const count = results[0].count;
    if (count > 0) {
      return res.status(400).json({
        error: `Cannot delete this category because ${count} book(s) are assigned to it`,
      });
    }

    model.remove(id, (err2, result) => {
      if (err2) {
        console.error("Delete category error:", err2);
        if (err2.code === "ER_ROW_IS_REFERENCED_2") {
          return res.status(400).json({ error: "Cannot delete: category is referenced by other records" });
        }
        return res.status(500).json({ error: "Database error while deleting category" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json({ message: "Category deleted successfully" });
    });
  });
};

exports.getMostBorrowedBooks = (req, res) => {
  model.getMostBorrowedBooks((err, results) => {
    if (err) {
      console.error("Most borrowed books error:", err);
      return res.status(500).json({
        error: "Database error while fetching most borrowed books"
      });
    }

    res.json(results);
  });
};
