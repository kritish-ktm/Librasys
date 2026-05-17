const model = require("./bookCategory.model");
const deweyPattern = /^\d{3}(?:\.\d{1,3})?$/;

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

  const data = {
    CategoryName: CategoryName.trim(),
    DeweyCode: DeweyCode.trim(),
    Description: trimmedDescription,
    IsActive: IsActive !== undefined ? IsActive : true,
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

  const data = {
    CategoryName: CategoryName.trim(),
    DeweyCode: DeweyCode.trim(),
    Description: trimmedDescription,
    IsActive: isActiveValue,
    UpdatedBy: req.user?.id || null,
  };

  model.update(id, data, (err, result) => {
    if (err) {
      console.error("Update category error:", err);
      if (err.code === "ER_DUP_ENTRY") {
        const duplicateField = err.sqlMessage?.includes("CategoryName") ? "name" : "Dewey Code";
        return res.status(400).json({ error: `A category with this ${duplicateField} already exists` });
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
  const { IsActive } = req.body;

  if (IsActive === undefined) {
    return res.status(400).json({ error: "IsActive value is required" });
  }

  model.updateStatus(id, IsActive, req.user?.id || null, (err, result) => {
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
