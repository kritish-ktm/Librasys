const LoanManager = require("./loan.manager");

exports.getLoans = (req, res) => {
  const filters = {
    search: String(req.query.search || "").trim(),
    status: String(req.query.status || "all").toLowerCase(),
  };

  LoanManager.listLoans(filters, (err, results) => {
    if (err) {
      console.error("Get loans error:", err);
      return res.status(500).json({ error: "Database error while fetching loans" });
    }

    res.json(results);
  });
};

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

exports.getUserOverdueLoans = (req, res) => {
  LoanManager.listUserOverdueLoans((err, results) => {
    if (err) {
      console.error("Get overdue loans error:", err);
      return res.status(500).json({ error: "Database error while fetching overdue loans" });
    }

    res.json(results);
  });
};

exports.getLoanOptions = (req, res) => {
  LoanManager.getOptions((err, options) => {
    if (err) {
      console.error("Get loan options error:", err);
      return res.status(500).json({ error: "Database error while fetching loan options" });
    }

    res.json(options);
  });
};

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
