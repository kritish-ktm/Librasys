const model = require("./bookCategory.model");
const deweyPattern = /^\d{3}(?:\.\d{1,3})?$/;
const colorPattern = /^#[0-9a-fA-F]{6}$/;
const allowedArchiveReasons = new Set(["merged", "outdated", "temporary hidden"]);

const normalizeCategoryStyle = (body) => {
  const color = body.CategoryColor ? String(body.CategoryColor).trim() : "#2f6b52";
  const image = body.CategoryImage ? String(body.CategoryImage).trim() : null;
  const archiveReason = body.ArchiveReason ? String(body.ArchiveReason).trim() : null;

  if (!colorPattern.test(color)) {
    return { error: "Category color must be a valid hex color like #2f6b52" };
  }
  if (image && image.length > 850 * 1024) {
    return { error: "Category image is too large. Please use a smaller image" };
  }
  if (archiveReason && archiveReason.length > 80) {
    return { error: "Archive reason cannot exceed 80 characters" };
  }

  return { CategoryColor: color, CategoryImage: image, ArchiveReason: archiveReason };
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
  const { CategoryName, DeweyCode, Description, IsActive } = req.body;
  const trimmedDescription = Description ? Description.trim() : "";
  const style = normalizeCategoryStyle(req.body);

  if (style.error) {
    return res.status(400).json({ error: style.error });
  }
  if (!CategoryName || CategoryName.trim() === "") {
    return res.status(400).json({ error: "Category name is required" });
  }
  if (CategoryName.trim().length > 100) {
    return res.status(400).json({ error: "Category name cannot exceed 100 characters" });
  }
  if (!DeweyCode || DeweyCode.trim() === "") {
    return res.status(400).json({ error: "Dewey Code is required" });
  }
  if (DeweyCode.trim().length > 10) {
    return res.status(400).json({ error: "Dewey Code cannot exceed 10 characters" });
  }
  if (!deweyPattern.test(DeweyCode.trim())) {
    return res.status(400).json({ error: "Dewey Code must look like 500 or 500.1" });
  }
  if (!trimmedDescription) {
    return res.status(400).json({ error: "Description is required" });
  }
  if (trimmedDescription.length > 200) {
    return res.status(400).json({ error: "Description cannot exceed 200 characters" });
  }
  if (IsActive === false && !allowedArchiveReasons.has(style.ArchiveReason)) {
    return res.status(400).json({ error: "Archive reason must be merged, outdated, or temporary hidden" });
  }

  const data = {
    CategoryName: CategoryName.trim(),
    DeweyCode: DeweyCode.trim(),
    Description: trimmedDescription,
    IsActive: IsActive !== undefined ? IsActive : true,
    CategoryColor: style.CategoryColor,
    CategoryImage: style.CategoryImage,
    ArchiveReason: IsActive === false ? style.ArchiveReason : null,
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
  const { CategoryName, DeweyCode, Description, IsActive, status } = req.body;

  const isActiveValue = IsActive !== undefined ? IsActive : (status !== undefined ? status : true);
  const trimmedDescription = Description ? Description.trim() : "";
  const style = normalizeCategoryStyle(req.body);

  if (style.error) {
    return res.status(400).json({ error: style.error });
  }
  if (!CategoryName || CategoryName.trim() === "") {
    return res.status(400).json({ error: "Category name is required" });
  }
  if (CategoryName.trim().length > 100) {
    return res.status(400).json({ error: "Category name cannot exceed 100 characters" });
  }
  if (!DeweyCode || DeweyCode.trim() === "") {
    return res.status(400).json({ error: "Dewey Code is required" });
  }
  if (DeweyCode.trim().length > 10) {
    return res.status(400).json({ error: "Dewey Code cannot exceed 10 characters" });
  }
  if (!deweyPattern.test(DeweyCode.trim())) {
    return res.status(400).json({ error: "Dewey Code must look like 500 or 500.1" });
  }
  if (!trimmedDescription) {
    return res.status(400).json({ error: "Description is required" });
  }
  if (trimmedDescription.length > 200) {
    return res.status(400).json({ error: "Description cannot exceed 200 characters" });
  }
  if (!isActiveValue && !allowedArchiveReasons.has(style.ArchiveReason)) {
    return res.status(400).json({ error: "Archive reason must be merged, outdated, or temporary hidden" });
  }

  const data = {
    CategoryName: CategoryName.trim(),
    DeweyCode: DeweyCode.trim(),
    Description: trimmedDescription,
    IsActive: isActiveValue,
    CategoryColor: style.CategoryColor,
    CategoryImage: style.CategoryImage,
    ArchiveReason: isActiveValue ? null : style.ArchiveReason,
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
  const { IsActive, ArchiveReason } = req.body;

  if (IsActive === undefined) {
    return res.status(400).json({ error: "IsActive value is required" });
  }
  const archiveReason = ArchiveReason ? String(ArchiveReason).trim() : "";
  if (!IsActive && !allowedArchiveReasons.has(archiveReason)) {
    return res.status(400).json({ error: "Archive reason must be merged, outdated, or temporary hidden" });
  }

  model.updateStatus(id, IsActive, archiveReason, req.user?.id || null, (err, result) => {
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
