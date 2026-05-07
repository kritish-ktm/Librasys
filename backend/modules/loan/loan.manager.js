const loanModel = require("./loan.model");

class LoanManager {
  // Keeps overdue flags current before records are listed in the admin table.
  static listLoans(filters, callback) {
    loanModel.updateOverdueFlags((updateError) => {
      if (updateError) {
        callback(updateError);
        return;
      }

      loanModel.getAll(filters, callback);
    });
  }

  static getLoan(id, callback) {
    loanModel.getById(id, callback);
  }

  static listLoansByUser(userId, callback) {
    if (!isValidId(userId)) {
      callback(validationError("A valid user ID is required"));
      return;
    }

    loanModel.updateOverdueFlags((updateError) => {
      if (updateError) {
        callback(updateError);
        return;
      }

      loanModel.getByUser(Number(userId), callback);
    });
  }

  static listUserOverdueLoans(callback) {
    loanModel.updateOverdueFlags((updateError) => {
      if (updateError) {
        callback(updateError);
        return;
      }

      loanModel.getUserOverdue(callback);
    });
  }

  static getOptions(callback) {
    loanModel.getActiveUsers((userError, users) => {
      if (userError) {
        callback(userError);
        return;
      }

      loanModel.getBorrowableBooks((bookError, books) => {
        if (bookError) {
          callback(bookError);
          return;
        }

        callback(null, { users, books });
      });
    });
  }

  // Applies the core borrowing rule: active user plus borrowable book.
  static createLoan(data, callback) {
    const validationError = validateCreate(data);
    if (validationError) {
      callback(validationError);
      return;
    }

    loanModel.create(
      { UserID: Number(data.UserID), BookID: Number(data.BookID) },
      callback
    );
  }

  static createLoanForMember(userId, data, callback) {
    const validationError = validateCreate({ UserID: userId, BookID: data.BookID });
    if (validationError) {
      callback(validationError);
      return;
    }

    loanModel.createForUser(Number(userId), Number(data.BookID), callback);
  }

  // Allows librarians to correct loan dates while keeping date rules valid.
  static updateLoan(id, data, callback) {
    const validationError = validateUpdate(data);
    if (validationError) {
      callback(validationError);
      return;
    }

    loanModel.update(
      id,
      {
        UserID: Number(data.UserID),
        BookID: Number(data.BookID),
        BorrowDate: data.BorrowDate,
        DueDate: data.DueDate,
        ReturnDate: data.ReturnDate || null,
      },
      callback
    );
  }

  static returnLoan(id, callback) {
    loanModel.markReturned(id, callback);
  }

  static returnMemberLoan(userId, loanId, callback) {
    if (!isValidId(userId)) {
      callback(validationError("A valid member account is required"));
      return;
    }

    if (!isValidId(loanId)) {
      callback(validationError("A valid loan ID is required"));
      return;
    }

    loanModel.markReturnedForUser(Number(loanId), Number(userId), callback);
  }

  static deleteLoan(id, callback) {
    loanModel.remove(id, callback);
  }
}

function validateCreate({ UserID, BookID }) {
  if (!isValidId(UserID)) return validationError("A valid active user is required");
  if (!isValidId(BookID)) return validationError("A valid borrowable book is required");
  return null;
}

function validateUpdate({ UserID, BookID, BorrowDate, DueDate, ReturnDate }) {
  if (!isValidId(UserID)) return validationError("A valid user is required");
  if (!isValidId(BookID)) return validationError("A valid book is required");
  if (!isValidDate(BorrowDate)) return validationError("Borrow date is required");
  if (!isValidDate(DueDate)) return validationError("Due date is required");

  if (new Date(DueDate) < new Date(BorrowDate)) {
    return validationError("Due date cannot be before borrow date");
  }

  if (ReturnDate && !isValidDate(ReturnDate)) {
    return validationError("Return date must be a valid date");
  }

  if (ReturnDate && new Date(ReturnDate) < new Date(BorrowDate)) {
    return validationError("Return date cannot be before borrow date");
  }

  return null;
}

function isValidId(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

function isValidDate(value) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

module.exports = LoanManager;
