const express = require("express");
const router = express.Router();
const loanController = require("./loan.controller");
const { auth } = require("../../middleware/auth.middleware");

// ===== LOAN LIST AND SEARCH =====
router.get("/", loanController.getLoans);
router.get("/options", loanController.getLoanOptions);
router.get("/search/users", loanController.searchUsers);
router.get("/search/books", loanController.searchBooks);

// ===== MEMBER LOAN ROUTES =====
router.get("/me", auth, loanController.getMyLoans);
router.get("/my", auth, loanController.getMyLoans);
router.get("/user/overdue", loanController.getUserOverdueLoans);
router.get("/user/:userid", loanController.getLoansByUser);
router.get("/:id", loanController.getLoan);

// ===== CREATE, UPDATE, RETURN, DELETE =====
router.post("/", loanController.addLoan);
router.post("/me", auth, loanController.borrowBookForMember);
router.put("/:id", loanController.updateLoan);
router.put("/me/:id/return", auth, loanController.returnMyLoan);
router.put("/:id/return", loanController.returnLoan);
router.patch("/:id/return", loanController.returnLoan);
router.delete("/:id", loanController.deleteLoan);

module.exports = router;
