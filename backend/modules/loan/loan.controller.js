/*
  LoanedBook controller layer.
  These functions receive HTTP requests from the loan routes, collect request
  parameters/body data, call the LoanManager layer, and send clear JSON responses
  back to the React frontend.
*/
const LoanManager = require("./loan.manager");

// ===== GET LOANS WITH FILTERS =====
/*
  Librarian table endpoint.
  Reads search text, status, borrowed date range, and pagination settings from
  the query string, then asks the manager for matching loan records.
*/
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
/*
  Gets one loan record by LoanID.
  The frontend edit modal uses this so it edits the latest version of the row
  instead of relying only on the copy already visible in the table.
*/
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
/*
  Librarian lookup for one user's loan history.
  This is different from "My Loans" because a librarian can inspect a member's
  borrowing records using the user id in the route.
*/
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
/*
  Member self-service history.
  The user id comes from the verified JWT token, not from the URL, so members
  cannot change the route to view somebody else's loans.
*/
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
// Librarian endpoint for viewing loans that are active and past their due date.
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
// Search-first member lookup used by create/edit loan forms instead of a large dropdown.
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
// Search-first book lookup used by create/edit loan forms instead of a large dropdown.
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
/*
  Older helper endpoint for form options.
  It is kept for compatibility so existing frontend calls do not break, even
  though the newer UI mainly uses search endpoints.
*/
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
/*
  Librarian-created loan.
  The controller passes UserID and BookID from the request body to the manager.
  Validation and database inventory updates are handled below this layer.
*/
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
/*
  Member self-borrowing from the Book Detail page.
  The member id comes from req.user.id after authentication, while the selected
  BookID comes from the request body.
*/
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
/*
  Librarian edit/correction endpoint.
  Used by the custom edit modal to correct member, book, borrow date, due date,
  and return date while keeping the LoanID unchanged.
*/
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
/*
  Librarian return endpoint.
  Returning a book updates both LoanedBook and the Book inventory count through
  the manager/model transaction.
*/
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
/*
  Member return endpoint.
  The manager verifies that the selected loan belongs to the logged-in member
  before marking it as returned.
*/
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
/*
  Librarian delete endpoint for incorrect records.
  The model blocks active loans from being deleted so inventory cannot become
  inconsistent.
*/
exports.deleteLoan = (req, res) => {
  LoanManager.deleteLoan(req.params.id, (err, result) => {
    if (err) {
      console.error("Delete loan error:", err);
      return res.status(err.statusCode || 500).json({
        error: err.statusCode ? err.message : "Database error while deleting loan",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Loan record not found" });
    }

    res.json({ message: "Loan deleted successfully" });
  });
};
