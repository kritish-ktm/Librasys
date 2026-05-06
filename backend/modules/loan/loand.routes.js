const express = require("express");
const router = express.Router();
const loanController = require("./loan.controller");

router.get("/", loanController.getLoans);
router.get("/options", loanController.getLoanOptions);
router.get("/:id", loanController.getLoan);
router.post("/", loanController.addLoan);
router.put("/:id", loanController.updateLoan);
router.patch("/:id/return", loanController.returnLoan);
router.delete("/:id", loanController.deleteLoan);

module.exports = router;
