/*
  LoanedBook model layer.
  This file talks directly to the MySQL database for Arun Shrestha's
  LoanedBook / Loan and Borrowing System component. It contains the main
  database rules for listing loans, creating loans, returning books, editing
  records, deleting records, and keeping Book.AvailableCopies consistent.
*/
const db = require("../../config/db");

// ===== COMMON LOAN SELECT =====
/*
  This shared SELECT is reused by list, detail, member-history, and overdue
  queries. ReturnDate being NULL means the book has not been returned yet, so
  the loan is still active. The IsOverdue and Status values are calculated from
  the database date so the frontend always receives the current loan state.
*/
const LOAN_SELECT = `
  SELECT
    l.LoanID,
    l.UserID,
    l.BookID,
    l.BorrowDate,
    l.BorrowDate AS LoanDate,
    l.DueDate,
    l.ReturnDate,
    CASE
      WHEN l.ReturnDate IS NULL AND CURDATE() > l.DueDate THEN 1
      ELSE 0
    END AS IsOverdue,
    CASE
      WHEN l.ReturnDate IS NOT NULL THEN 'Returned'
      WHEN CURDATE() > l.DueDate THEN 'Overdue'
      ELSE 'Active'
    END AS Status,
    u.FullName AS BorrowerName,
    u.Email AS BorrowerEmail,
    b.Title AS Title,
    b.Title AS BookTitle,
    b.ISBN
  FROM LoanedBook l
  INNER JOIN user u ON u.UserID = l.UserID
  INNER JOIN book b ON b.BookID = l.BookID
`;

// ===== FILTER BUILDER =====
/*
  Builds the WHERE clauses for search, status, and date filters.
  The normal whereClause filters the visible table rows. The summaryWhereClause
  intentionally removes the selected status filter so the four summary counters
  can still show All, Active, Overdue, and Returned counts for the same search
  and date range.
*/
const buildLoanFilters = ({ search = "", status = "all", borrowedFrom = "", borrowedTo = "" }) => {
  const values = [];
  const statusValues = [];
  const filters = [];

  if (search) {
    filters.push(`
      (
        u.FullName LIKE ?
        OR u.Email LIKE ?
        OR b.Title LIKE ?
        OR b.ISBN LIKE ?
        OR CAST(l.LoanID AS CHAR) LIKE ?
      )
    `);

    const searchValue = `%${search}%`;
    values.push(searchValue, searchValue, searchValue, searchValue, searchValue);
  }

  if (status === "active") {
    filters.push("l.ReturnDate IS NULL AND CURDATE() <= l.DueDate");
  }

  if (status === "returned") {
    filters.push("l.ReturnDate IS NOT NULL");
  }

  if (status === "overdue") {
    filters.push("l.ReturnDate IS NULL AND CURDATE() > l.DueDate");
  }

  if (borrowedFrom) {
    filters.push("l.BorrowDate >= ?");
    values.push(borrowedFrom);
  }

  if (borrowedTo) {
    filters.push("l.BorrowDate <= ?");
    values.push(borrowedTo);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const summaryFilters = filters.filter((filter) => {
    return ![
      "l.ReturnDate IS NULL AND CURDATE() <= l.DueDate",
      "l.ReturnDate IS NOT NULL",
      "l.ReturnDate IS NULL AND CURDATE() > l.DueDate",
    ].includes(filter);
  });
  const summaryWhereClause = summaryFilters.length ? `WHERE ${summaryFilters.join(" AND ")}` : "";

  if (search) {
    const searchValue = `%${search}%`;
    statusValues.push(searchValue, searchValue, searchValue, searchValue, searchValue);
  }

  if (borrowedFrom) statusValues.push(borrowedFrom);
  if (borrowedTo) statusValues.push(borrowedTo);

  return { whereClause, values, summaryWhereClause, summaryValues: statusValues };
};

// ===== LIST LOANS WITH PAGINATION =====
/*
  Returns the librarian loan table data.
  It performs three related queries:
  1. countSql gets the total number of matching rows for pagination.
  2. summarySql gets the dashboard counts shown above the table.
  3. dataSql gets only the current page of loan records.
*/
const getAll = (filters, callback) => {
  const page = Math.max(Number(filters.page) || 1, 1);
  const limit = Math.min(Math.max(Number(filters.limit) || 10, 1), 50);
  const offset = (page - 1) * limit;
  const { whereClause, values, summaryWhereClause, summaryValues } = buildLoanFilters(filters);
  const dataSql = `${LOAN_SELECT} ${whereClause} ORDER BY l.LoanID DESC LIMIT ? OFFSET ?`;
  const countSql = `
    SELECT COUNT(*) AS total
    FROM LoanedBook l
    INNER JOIN user u ON u.UserID = l.UserID
    INNER JOIN book b ON b.BookID = l.BookID
    ${whereClause}
  `;
  const summarySql = `
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN l.ReturnDate IS NULL AND CURDATE() <= l.DueDate THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN l.ReturnDate IS NULL AND CURDATE() > l.DueDate THEN 1 ELSE 0 END) AS overdue,
      SUM(CASE WHEN l.ReturnDate IS NOT NULL THEN 1 ELSE 0 END) AS returned
    FROM LoanedBook l
    INNER JOIN user u ON u.UserID = l.UserID
    INNER JOIN book b ON b.BookID = l.BookID
    ${summaryWhereClause}
  `;

  db.query(countSql, values, (countError, countRows) => {
    if (countError) {
      callback(countError);
      return;
    }

    db.query(summarySql, summaryValues, (summaryError, summaryRows) => {
      if (summaryError) {
        callback(summaryError);
        return;
      }

      db.query(dataSql, [...values, limit, offset], (dataError, rows) => {
        if (dataError) {
          callback(dataError);
          return;
        }

        const total = Number(countRows[0]?.total || 0);
        const summary = summaryRows[0] || {};

        callback(null, {
          data: rows,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.max(Math.ceil(total / limit), 1),
          },
          summary: {
            total: Number(summary.total || 0),
            active: Number(summary.active || 0),
            overdue: Number(summary.overdue || 0),
            returned: Number(summary.returned || 0),
          },
        });
      });
    });
  });
};

// ===== GET LOAN BY ID =====
// Used when the edit modal opens, so the modal works with the latest database copy.
const getById = (id, callback) => {
  db.query(`${LOAN_SELECT} WHERE l.LoanID = ?`, [id], callback);
};

// ===== GET LOANS BY USER =====
// Used by both librarian user-history lookup and the member "My Loans" page.
const getByUser = (userId, callback) => {
  db.query(
    `${LOAN_SELECT} WHERE l.UserID = ? ORDER BY l.LoanID DESC`,
    [userId],
    callback
  );
};

// ===== GET OVERDUE LOANS =====
/*
  Returns active loans whose due date has passed.
  A loan is overdue only while ReturnDate is NULL; returned books are no longer
  part of the active overdue list.
*/
const getUserOverdue = (callback) => {
  const sql = `
    ${LOAN_SELECT}
    WHERE l.ReturnDate IS NULL AND CURDATE() > l.DueDate
    ORDER BY l.DueDate ASC
  `;

  db.query(sql, callback);
};

// ===== BORROWABLE BOOK OPTIONS =====
// Legacy option list for forms. The newer UI mainly uses searchable book lookup.
const getBorrowableBooks = (callback) => {
  const sql = `
    SELECT BookID, Title, ISBN, AvailableCopies, IsBorrowable
    FROM book
    WHERE AvailableCopies >= 1 AND IsBorrowable = 1
    ORDER BY Title ASC
  `;

  db.query(sql, callback);
};

// ===== SEARCH BORROWABLE BOOKS =====
/*
  Search-first book lookup for create/edit loan forms.
  This avoids loading a huge dropdown of books and lets the librarian search by
  title, ISBN, or BookID. Available books are listed before unavailable matches.
*/
const searchBorrowableBooks = (query, callback) => {
  const searchValue = `%${query}%`;
  const sql = `
    SELECT BookID, Title, ISBN, PublicationDate, AvailableCopies, IsBorrowable
    FROM book
    WHERE
      (
        Title LIKE ?
        OR ISBN LIKE ?
        OR CAST(BookID AS CHAR) LIKE ?
      )
      AND IsBorrowable = 1
    ORDER BY
      CASE WHEN AvailableCopies > 0 THEN 0 ELSE 1 END,
      Title ASC
    LIMIT 8
  `;

  db.query(sql, [searchValue, searchValue, searchValue], callback);
};

// ===== ACTIVE USER OPTIONS =====
// Legacy option list for forms. The newer UI mainly uses searchable member lookup.
const getActiveUsers = (callback) => {
  const sql = `
    SELECT UserID, FullName, Email, Role, IsActive
    FROM user
    WHERE IsActive = 1
    ORDER BY FullName ASC
  `;

  db.query(sql, callback);
};

// ===== SEARCH ACTIVE MEMBERS =====
/*
  Search-first member lookup for the loan forms.
  Only active members are returned because inactive accounts should not receive
  new borrowing transactions.
*/
const searchActiveUsers = (query, callback) => {
  const searchValue = `%${query}%`;
  const sql = `
    SELECT UserID, FullName, Email, Role, IsActive
    FROM user
    WHERE
      IsActive = 1
      AND Role = 'Member'
      AND (
        FullName LIKE ?
        OR Email LIKE ?
        OR CAST(UserID AS CHAR) LIKE ?
      )
    ORDER BY FullName ASC
    LIMIT 8
  `;

  db.query(sql, [searchValue, searchValue, searchValue], callback);
};

// ===== CREATE LOAN =====
/*
  Creates a borrowing transaction for a selected member and book.

  The loan insert and the book availability update happen inside one database
  transaction. This matters because the system should never create a LoanedBook
  row without also reducing AvailableCopies, and it should never reduce stock
  without creating the matching loan.
*/
const create = ({ UserID, BookID }, callback) => {
  db.getConnection((connectionError, connection) => {
    if (connectionError) {
      callback(connectionError);
      return;
    }

    connection.beginTransaction((transactionError) => {
      if (transactionError) {
        connection.release();
        callback(transactionError);
        return;
      }

      /*
        FOR UPDATE locks the selected user row while the transaction runs.
        The row lock helps prevent two requests from changing related borrowing
        data at the same time using stale information.
      */
      const userSql = "SELECT UserID, Role, IsActive FROM user WHERE UserID = ? FOR UPDATE";
      connection.query(userSql, [UserID], (userError, users) => {
        if (userError) {
          rollback(connection, userError, callback);
          return;
        }

        if (!users.length) {
          rollback(connection, validationError("Selected user does not exist"), callback);
          return;
        }

        if (!users[0].IsActive) {
          rollback(connection, validationError("Only active users can borrow books"), callback);
          return;
        }

        if (users[0].Role !== "Member") {
          rollback(connection, validationError("Only members can borrow books."), callback);
          return;
        }

        /*
          The book row is locked before checking AvailableCopies. This prevents
          two librarians or members from borrowing the last copy at the same time.
        */
        const bookSql = `
          SELECT BookID, AvailableCopies, IsBorrowable
          FROM book
          WHERE BookID = ?
          FOR UPDATE
        `;

        connection.query(bookSql, [BookID], (bookError, books) => {
          if (bookError) {
            rollback(connection, bookError, callback);
            return;
          }

          if (!books.length) {
            rollback(connection, validationError("Selected book does not exist"), callback);
            return;
          }

          const book = books[0];
          if (!book.IsBorrowable || Number(book.AvailableCopies) < 1) {
            rollback(connection, validationError("This book is not currently available to borrow"), callback);
            return;
          }

          /*
            A member cannot have two active loans for the same book. ReturnDate
            NULL means the existing copy has not been returned yet.
          */
          connection.query(
            "SELECT LoanID FROM LoanedBook WHERE UserID = ? AND BookID = ? AND ReturnDate IS NULL LIMIT 1",
            [UserID, BookID],
            (duplicateError, duplicates) => {
              if (duplicateError) {
                rollback(connection, duplicateError, callback);
                return;
              }

              if (duplicates.length) {
                rollback(connection, validationError("This member already has an active loan for this book"), callback);
                return;
              }

              /*
                BorrowDate is today's date and DueDate is automatically fixed at
                14 days after borrowing. ReturnDate starts as NULL because the
                book is active until it is returned.
              */
              const loanSql = `
                INSERT INTO LoanedBook (UserID, BookID, BorrowDate, DueDate, ReturnDate, IsOverdue)
                VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 14 DAY), NULL, 0)
              `;

              connection.query(loanSql, [UserID, BookID], (loanError, result) => {
                if (loanError) {
                  rollback(connection, loanError, callback);
                  return;
                }

                // Reduce the available stock only after the loan row is created.
                connection.query(
                  "UPDATE book SET AvailableCopies = AvailableCopies - 1 WHERE BookID = ?",
                  [BookID],
                  (updateError) => {
                    if (updateError) {
                      rollback(connection, updateError, callback);
                      return;
                    }

                    connection.commit((commitError) => {
                      connection.release();

                      if (commitError) {
                        callback(commitError);
                        return;
                      }

                      callback(null, result);
                    });
                  }
                );
              });
            }
          );
        });
      });
    });
  });
};

// ===== UPDATE LOAN =====
/*
  Corrects an existing loan record from the librarian edit modal.
  LoanID is not changed. The function can update member, book, dates, and
  ReturnDate, but member/book changes are blocked once a loan has already been
  returned because stock movement has already been completed.
*/
const update = (id, { UserID, BookID, BorrowDate, DueDate, ReturnDate }, callback) => {
  db.getConnection((connectionError, connection) => {
    if (connectionError) {
      callback(connectionError);
      return;
    }

    connection.beginTransaction((transactionError) => {
      if (transactionError) {
        connection.release();
        callback(transactionError);
        return;
      }

      /*
        Lock the current loan first so the edit is based on the real current
        state and cannot race with a return/delete happening at the same time.
      */
      connection.query(
        "SELECT LoanID, UserID, BookID, ReturnDate FROM LoanedBook WHERE LoanID = ? FOR UPDATE",
        [id],
        (loanError, loans) => {
          if (loanError) {
            rollback(connection, loanError, callback);
            return;
          }

          if (!loans.length) {
            rollback(connection, notFoundError("Loan record not found"), callback);
            return;
          }

          const currentLoan = loans[0];
          const newUserId = Number(UserID);
          const newBookId = Number(BookID);
          const memberChanged = Number(currentLoan.UserID) !== newUserId;
          const bookChanged = Number(currentLoan.BookID) !== newBookId;
          const isAlreadyReturned = Boolean(currentLoan.ReturnDate);
          const willBeReturned = Boolean(ReturnDate);

          if (isAlreadyReturned && (memberChanged || bookChanged)) {
            rollback(connection, validationError("Member and book can only be changed for active loans"), callback);
            return;
          }

          // The selected borrower must still exist and must be an active member.
          connection.query(
            "SELECT UserID, Role, IsActive FROM user WHERE UserID = ? FOR UPDATE",
            [newUserId],
            (userError, users) => {
              if (userError) {
                rollback(connection, userError, callback);
                return;
              }

              if (!users.length) {
                rollback(connection, validationError("Selected member does not exist"), callback);
                return;
              }

              if (users[0].Role !== "Member" || !users[0].IsActive) {
                rollback(connection, validationError("Selected member must be an active member"), callback);
                return;
              }

              // The selected book must exist, be borrowable, and have stock if changed.
              connection.query(
                "SELECT BookID, AvailableCopies, IsBorrowable FROM book WHERE BookID = ? FOR UPDATE",
                [newBookId],
                (bookError, books) => {
                  if (bookError) {
                    rollback(connection, bookError, callback);
                    return;
                  }

                  if (!books.length) {
                    rollback(connection, validationError("Selected book does not exist"), callback);
                    return;
                  }

                  const newBook = books[0];

                  if (!newBook.IsBorrowable) {
                    rollback(connection, validationError("Selected book must be borrowable"), callback);
                    return;
                  }

                  if (bookChanged && Number(newBook.AvailableCopies) < 1) {
                    rollback(connection, validationError("Selected book has no available copies"), callback);
                    return;
                  }

                  /*
                    Duplicate active loans are also checked during edit. The
                    current LoanID is excluded because it is the record being
                    corrected.
                  */
                  connection.query(
                    `
                      SELECT LoanID
                      FROM LoanedBook
                      WHERE LoanID <> ?
                        AND UserID = ?
                        AND BookID = ?
                        AND ReturnDate IS NULL
                      LIMIT 1
                    `,
                    [id, newUserId, newBookId],
                    (duplicateError, duplicates) => {
                      if (duplicateError) {
                        rollback(connection, duplicateError, callback);
                        return;
                      }

                      if (duplicates.length && !ReturnDate) {
                        rollback(connection, validationError("This member already has an active loan for this book"), callback);
                        return;
                      }

                      /*
                        IsOverdue is recalculated from DueDate and ReturnDate.
                        This keeps overdue status data-driven instead of trusting
                        a manual UI value.
                      */
                      const updateSql = `
                        UPDATE LoanedBook
                        SET UserID = ?, BookID = ?, BorrowDate = ?, DueDate = ?, ReturnDate = ?,
                            IsOverdue = CASE WHEN ? IS NULL AND CURDATE() > ? THEN 1 ELSE 0 END
                        WHERE LoanID = ?
                      `;
                      const updateValues = [
                        newUserId,
                        newBookId,
                        BorrowDate,
                        DueDate,
                        ReturnDate || null,
                        ReturnDate || null,
                        DueDate,
                        id,
                      ];

                      connection.query(updateSql, updateValues, (updateError, result) => {
                        if (updateError) {
                          rollback(connection, updateError, callback);
                          return;
                        }

                        const finish = () => {
                          connection.commit((commitError) => {
                            connection.release();

                            if (commitError) {
                              callback(commitError);
                              return;
                            }

                            callback(null, result);
                          });
                        };

                        /*
                          Editing ReturnDate can change whether a loan consumes
                          an available copy. The normal return endpoint already
                          restores stock, but this edit path must do the same
                          inventory movement when a librarian corrects ReturnDate
                          directly from the modal.
                        */
                        const inventoryUpdates = [];

                        if (!isAlreadyReturned && willBeReturned) {
                          inventoryUpdates.push({
                            sql: "UPDATE book SET AvailableCopies = AvailableCopies + 1 WHERE BookID = ?",
                            params: [currentLoan.BookID],
                            error: "Unable to restore book availability for returned loan",
                          });
                        }

                        if (isAlreadyReturned && !willBeReturned) {
                          inventoryUpdates.push({
                            sql: "UPDATE book SET AvailableCopies = AvailableCopies - 1 WHERE BookID = ? AND AvailableCopies > 0",
                            params: [currentLoan.BookID],
                            requireAffected: true,
                            error: "Cannot reopen this loan because no available copies remain",
                          });
                        }

                        /*
                          If the librarian changes the book while the edited loan
                          remains active, transfer the borrowed copy from the old
                          book to the new book. Returned loans do not consume
                          stock, and returned loan member/book changes are blocked
                          above, so no book-transfer update is needed for them.
                        */
                        if (bookChanged && !willBeReturned) {
                          inventoryUpdates.push(
                            {
                              sql: "UPDATE book SET AvailableCopies = AvailableCopies + 1 WHERE BookID = ?",
                              params: [currentLoan.BookID],
                              error: "Unable to restore availability on the previous book",
                            },
                            {
                              sql: "UPDATE book SET AvailableCopies = AvailableCopies - 1 WHERE BookID = ? AND AvailableCopies > 0",
                              params: [newBookId],
                              requireAffected: true,
                              error: "Selected book has no available copies",
                            }
                          );
                        }

                        runInventoryUpdates(connection, inventoryUpdates, finish, callback);
                      });
                    }
                  );
                }
              );
            }
          );
        }
      );
    });
  });
};

// ===== CREATE LOAN FOR MEMBER =====
// Member self-borrowing uses the same core create logic as librarian-created loans.
const createForUser = (UserID, BookID, callback) => {
  create({ UserID, BookID }, callback);
};

// ===== RETURN BOOK =====
/*
  Librarian return workflow.
  Returning a book sets ReturnDate automatically and increases AvailableCopies
  in the same transaction. If ReturnDate already exists, the function blocks a
  second return so the copy count cannot be increased twice.
*/
const markReturned = (id, callback) => {
  db.getConnection((connectionError, connection) => {
    if (connectionError) {
      callback(connectionError);
      return;
    }

    connection.beginTransaction((transactionError) => {
      if (transactionError) {
        connection.release();
        callback(transactionError);
        return;
      }

      const loanSql = "SELECT LoanID, BookID, ReturnDate FROM LoanedBook WHERE LoanID = ? FOR UPDATE";
      connection.query(loanSql, [id], (loanError, loans) => {
        if (loanError) {
          rollback(connection, loanError, callback);
          return;
        }

        if (!loans.length) {
          rollback(connection, notFoundError("Loan record not found"), callback);
          return;
        }

        if (loans[0].ReturnDate) {
          rollback(connection, validationError("This loan has already been returned"), callback);
          return;
        }

        // Mark the loan as returned before restoring the book copy.
        connection.query(
          "UPDATE LoanedBook SET ReturnDate = CURDATE(), IsOverdue = 0 WHERE LoanID = ?",
          [id],
          (returnError, result) => {
            if (returnError) {
              rollback(connection, returnError, callback);
              return;
            }

            // Add the physical/digital copy back to the available stock count.
            connection.query(
              "UPDATE book SET AvailableCopies = AvailableCopies + 1 WHERE BookID = ?",
              [loans[0].BookID],
              (bookError) => {
                if (bookError) {
                  rollback(connection, bookError, callback);
                  return;
                }

                connection.commit((commitError) => {
                  connection.release();

                  if (commitError) {
                    callback(commitError);
                    return;
                  }

                  callback(null, result);
                });
              }
            );
          }
        );
      });
    });
  });
};

// ===== MEMBER RETURN BOOK =====
/*
  Member return workflow.
  This is similar to librarian return, but the WHERE clause includes UserID so a
  logged-in member can only return their own loan record.
*/
const markReturnedForUser = (id, userId, callback) => {
  db.getConnection((connectionError, connection) => {
    if (connectionError) {
      callback(connectionError);
      return;
    }

    connection.beginTransaction((transactionError) => {
      if (transactionError) {
        connection.release();
        callback(transactionError);
        return;
      }

      const loanSql = `
        SELECT LoanID, BookID, ReturnDate
        FROM LoanedBook
        WHERE LoanID = ? AND UserID = ?
        FOR UPDATE
      `;

      connection.query(loanSql, [id, userId], (loanError, loans) => {
        if (loanError) {
          rollback(connection, loanError, callback);
          return;
        }

        if (!loans.length) {
          rollback(connection, notFoundError("Loan record not found for this member"), callback);
          return;
        }

        if (loans[0].ReturnDate) {
          rollback(connection, validationError("This loan has already been returned"), callback);
          return;
        }

        connection.query(
          "UPDATE LoanedBook SET ReturnDate = CURDATE(), IsOverdue = 0 WHERE LoanID = ?",
          [id],
          (returnError, result) => {
            if (returnError) {
              rollback(connection, returnError, callback);
              return;
            }

            connection.query(
              "UPDATE book SET AvailableCopies = AvailableCopies + 1 WHERE BookID = ?",
              [loans[0].BookID],
              (bookError) => {
                if (bookError) {
                  rollback(connection, bookError, callback);
                  return;
                }

                connection.commit((commitError) => {
                  connection.release();

                  if (commitError) {
                    callback(commitError);
                    return;
                  }

                  callback(null, result);
                });
              }
            );
          }
        );
      });
    });
  });
};

// ===== REFRESH OVERDUE FLAGS =====
/*
  Keeps the stored IsOverdue flag in sync with the actual dates.
  Overdue means the loan is still active and today's date is after DueDate.
*/
const updateOverdueFlags = (callback) => {
  const sql = `
    UPDATE LoanedBook
    SET IsOverdue = CASE
      WHEN ReturnDate IS NULL AND CURDATE() > DueDate THEN 1
      ELSE 0
    END
  `;

  db.query(sql, callback);
};

// ===== DELETE LOAN =====
/*
  Deletes an incorrect loan record only after it has been returned.
  Active loans cannot be deleted because deleting them would remove the record
  without restoring the borrowed book copy to AvailableCopies.
*/
const remove = (id, callback) => {
  db.query("SELECT LoanID, ReturnDate FROM LoanedBook WHERE LoanID = ?", [id], (selectError, loans) => {
    if (selectError) {
      callback(selectError);
      return;
    }

    if (!loans.length) {
      callback(null, { affectedRows: 0 });
      return;
    }

    if (!loans[0].ReturnDate) {
      callback(validationError("Active loans cannot be deleted. Return the book first."));
      return;
    }

    db.query("DELETE FROM LoanedBook WHERE LoanID = ?", [id], callback);
  });
};

function runInventoryUpdates(connection, updates, finish, callback) {
  if (!updates.length) {
    finish();
    return;
  }

  const [nextUpdate, ...remainingUpdates] = updates;
  connection.query(nextUpdate.sql, nextUpdate.params, (error, result) => {
    if (error) {
      rollback(connection, error, callback);
      return;
    }

    if (nextUpdate.requireAffected && result.affectedRows === 0) {
      rollback(connection, validationError(nextUpdate.error), callback);
      return;
    }

    runInventoryUpdates(connection, remainingUpdates, finish, callback);
  });
}

function rollback(connection, error, callback) {
  // Any failed validation or query inside a transaction releases all partial work.
  connection.rollback(() => {
    connection.release();
    callback(error);
  });
}

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function notFoundError(message) {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
}

module.exports = {
  getAll,
  getById,
  getByUser,
  getUserOverdue,
  getBorrowableBooks,
  searchBorrowableBooks,
  getActiveUsers,
  searchActiveUsers,
  create,
  createForUser,
  update,
  markReturned,
  markReturnedForUser,
  updateOverdueFlags,
  remove,
};
