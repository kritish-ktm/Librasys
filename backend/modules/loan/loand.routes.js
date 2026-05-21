/*
  LoanedBook route layer.
  This file connects HTTP API paths to the LoanedBook controller functions.
  It also applies authentication and role protection so users cannot bypass the
  React frontend and call librarian-only loan APIs directly.
*/
const express = require("express");
const router = express.Router();
const loanController = require("./loan.controller");
const { auth, requireLibrarian } = require("../../middleware/auth.middleware");

/*
  Librarian-only routes first check that a valid login token exists, then check
  that the authenticated user's role is Librarian. This gives:
  - 401 when the user is not logged in or the token is invalid.
  - 403 when the user is logged in but is not a librarian.
*/
const librarianOnly = [auth, requireLibrarian];

// ===== LOAN LIST AND SEARCH =====
// Librarian management table, search boxes, and loan form lookup endpoints.
router.get("/", librarianOnly, loanController.getLoans);
router.get("/options", librarianOnly, loanController.getLoanOptions);
router.get("/search/users", librarianOnly, loanController.searchUsers);
router.get("/search/books", librarianOnly, loanController.searchBooks);

// ===== MEMBER LOAN ROUTES =====
/*
  Member self-service routes use auth only. They use req.user.id from the token
  so a member can view or return only their own loans.
*/
router.get("/me", auth, loanController.getMyLoans);
router.get("/my", auth, loanController.getMyLoans);

// Librarian history/detail routes can inspect any member or loan record.
router.get("/user/overdue", librarianOnly, loanController.getUserOverdueLoans);
router.get("/user/:userid", librarianOnly, loanController.getLoansByUser);
router.get("/:id", librarianOnly, loanController.getLoan);

// ===== CREATE, UPDATE, RETURN, DELETE =====
// Librarian actions for creating/correcting/deleting managed loan records.
router.post("/", librarianOnly, loanController.addLoan);

// Member self-borrowing from the Book Detail page.
router.post("/me", auth, loanController.borrowBookForMember);

// Librarian edit, return, and delete actions from the Loaned Books page.
router.put("/:id", librarianOnly, loanController.updateLoan);
router.put("/me/:id/return", auth, loanController.returnMyLoan);
router.put("/:id/return", librarianOnly, loanController.returnLoan);
router.patch("/:id/return", librarianOnly, loanController.returnLoan);
router.delete("/:id", librarianOnly, loanController.deleteLoan);

module.exports = router;
