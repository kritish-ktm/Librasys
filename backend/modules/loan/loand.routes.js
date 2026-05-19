const express = require("express");
const router = express.Router();
const loanController = require("./loan.controller");
const { auth, requireLibrarian } = require("../../middleware/auth.middleware");

const librarianOnly = [auth, requireLibrarian];

// ===== LOAN LIST AND SEARCH =====
router.get("/", librarianOnly, loanController.getLoans);
router.get("/options", librarianOnly, loanController.getLoanOptions);
router.get("/search/users", librarianOnly, loanController.searchUsers);
router.get("/search/books", librarianOnly, loanController.searchBooks);

// ===== MEMBER LOAN ROUTES =====
router.get("/me", auth, loanController.getMyLoans);
router.get("/my", auth, loanController.getMyLoans);
router.get("/user/overdue", librarianOnly, loanController.getUserOverdueLoans);
router.get("/user/:userid", librarianOnly, loanController.getLoansByUser);
router.get("/:id", librarianOnly, loanController.getLoan);

// ===== CREATE, UPDATE, RETURN, DELETE =====
router.post("/", librarianOnly, loanController.addLoan);
router.post("/me", auth, loanController.borrowBookForMember);
router.put("/:id", librarianOnly, loanController.updateLoan);
router.put("/me/:id/return", auth, loanController.returnMyLoan);
router.put("/:id/return", librarianOnly, loanController.returnLoan);
router.patch("/:id/return", librarianOnly, loanController.returnLoan);
router.delete("/:id", librarianOnly, loanController.deleteLoan);

module.exports = router;
