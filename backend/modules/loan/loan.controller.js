const LoanManager = require("./loan.manager");

// ===== GET LOANS WITH FILTERS =====
exports.getLoans = (req, res) => {
  const filters = {
    search: String(req.query.search || "").trim(),
    status: String(req.query.status || "all").toLowerCase(),
    borrowedFrom: String(req.query.borrowedFrom || "").trim(),
    borrowedTo: String(req.query.borrowedTo || "").trim(),
    page: req.query.page,
    limit: req.query.limit,
  };

  LoanManager.listLoans(filters, (err, results) => {
    if (err) {
      console.error("Get loans error:", err);
      return res.status(500).json({ error: "Database error while fetching loans" });
    }

    res.json(results);
  });
};

// ===== GET ONE LOAN =====
exports.getLoan = (req, res) => {
  LoanManager.getLoan(req.params.id, (err, results) => {
    if (err) {
      console.error("Get loan error:", err);
      return res.status(500).json({ error: "Database error while fetching loan" });
    }

    if (!results.length) {
      return res.status(404).json({ error: "Loan record not found" });
    }

    res.json(results[0]);
  });
};

// ===== USER LOAN HISTORY =====
exports.getLoansByUser = (req, res) => {
  LoanManager.listLoansByUser(req.params.userid, (err, results) => {
    if (err) {
      console.error("Get user loans error:", err);
      return res.status(err.statusCode || 500).json({
        error: err.statusCode ? err.message : "Database error while fetching user loans",
      });
    }

    res.json(results);
  });
};

// ===== MEMBER: MY LOANS =====
exports.getMyLoans = (req, res) => {
  LoanManager.listLoansByUser(req.user.id, (err, results) => {
    if (err) {
      console.error("Get my loans error:", err);
      return res.status(err.statusCode || 500).json({
        error: err.statusCode ? err.message : "Database error while fetching your loans",
      });
    }

    res.json(results);
  });
};

// ===== OVERDUE LOANS =====
exports.getUserOverdueLoans = (req, res) => {
  LoanManager.listUserOverdueLoans((err, results) => {
    if (err) {
      console.error("Get overdue loans error:", err);
      return res.status(500).json({ error: "Database error while fetching overdue loans" });
    }

    res.json(results);
  });
};

// ===== SEARCH MEMBERS =====
exports.searchUsers = (req, res) => {
  LoanManager.searchUsers(req.query.q, (err, results) => {
    if (err) {
      console.error("Search users error:", err);
      return res.status(500).json({ error: "Database error while searching users" });
    }

    res.json(results);
  });
};

// ===== SEARCH BOOKS =====
exports.searchBooks = (req, res) => {
  LoanManager.searchBooks(req.query.q, (err, results) => {
    if (err) {
      console.error("Search books error:", err);
      return res.status(500).json({ error: "Database error while searching books" });
    }

    res.json(results);
  });
};

// ===== OLD OPTIONS ENDPOINT =====
exports.getLoanOptions = (req, res) => {
  LoanManager.getOptions((err, options) => {
    if (err) {
      console.error("Get loan options error:", err);
      return res.status(500).json({ error: "Database error while fetching loan options" });
    }

    res.json(options);
  });
};

// ===== CREATE LOAN =====
// Creates a borrowing transaction through the LoanManager middle layer.
exports.addLoan = (req, res) => {
  LoanManager.createLoan(req.body, (err, result) => {
    if (err) {
      console.error("Add loan error:", err);
      return res.status(err.statusCode || 500).json({
        error: err.statusCode ? err.message : "Database error while creating loan",
      });
    }

    res.status(201).json({
      message: "Loan created successfully",
      LoanID: result.insertId,
    });
  });
};

// ===== MEMBER BORROW BOOK =====
exports.borrowBookForMember = (req, res) => {
  LoanManager.createLoanForMember(req.user.id, req.body, (err, result) => {
    if (err) {
      console.error("Member borrow error:", err);
      return res.status(err.statusCode || 500).json({
        error: err.statusCode ? err.message : "Database error while borrowing book",
      });
    }

    res.status(201).json({
      message: "Book borrowed successfully",
      LoanID: result.insertId,
    });
  });
};

// ===== UPDATE LOAN =====
exports.updateLoan = (req, res) => {
  LoanManager.updateLoan(req.params.id, req.body, (err, result) => {
    if (err) {
      console.error("Update loan error:", err);
      return res.status(err.statusCode || 500).json({
        error: err.statusCode ? err.message : "Database error while updating loan",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Loan record not found" });
    }

    res.json({ message: "Loan updated successfully" });
  });
};

// ===== RETURN BOOK =====
// Returning a book updates both LoanedBook and the Book inventory count.
exports.returnLoan = (req, res) => {
  LoanManager.returnLoan(req.params.id, (err, result) => {
    if (err) {
      console.error("Return loan error:", err);
      return res.status(err.statusCode || 500).json({
        error: err.statusCode ? err.message : "Database error while returning loan",
      });
    }

    res.json({
      message: "Book returned successfully",
      affectedRows: result.affectedRows,
    });
  });
};

// ===== MEMBER RETURN BOOK =====
exports.returnMyLoan = (req, res) => {
  LoanManager.returnMemberLoan(req.user.id, req.params.id, (err, result) => {
    if (err) {
      console.error("Return my loan error:", err);
      return res.status(err.statusCode || 500).json({
        error: err.statusCode ? err.message : "Database error while returning loan",
      });
    }

    res.json({
      message: "Book returned successfully",
      affectedRows: result.affectedRows,
    });
  });
};

// ===== DELETE LOAN =====
exports.deleteLoan = (req, res) => {
  LoanManager.deleteLoan(req.params.id, (err, result) => {
    if (err) {
      console.error("Delete loan error:", err);
      return res.status(500).json({ error: "Database error while deleting loan" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Loan record not found" });
    }

    res.json({ message: "Loan deleted successfully" });
  });
};
