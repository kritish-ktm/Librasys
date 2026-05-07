const db = require("../../config/db");

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

const getAll = ({ search = "", status = "all" }, callback) => {
  const values = [];
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

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const sql = `${LOAN_SELECT} ${whereClause} ORDER BY l.LoanID DESC`;

  db.query(sql, values, callback);
};

const getById = (id, callback) => {
  db.query(`${LOAN_SELECT} WHERE l.LoanID = ?`, [id], callback);
};

const getByUser = (userId, callback) => {
  db.query(
    `${LOAN_SELECT} WHERE l.UserID = ? ORDER BY l.LoanID DESC`,
    [userId],
    callback
  );
};

const getUserOverdue = (callback) => {
  const sql = `
    ${LOAN_SELECT}
    WHERE l.ReturnDate IS NULL AND CURDATE() > l.DueDate
    ORDER BY l.DueDate ASC
  `;

  db.query(sql, callback);
};

const getBorrowableBooks = (callback) => {
  const sql = `
    SELECT BookID, Title, ISBN, AvailableCopies, IsBorrowable
    FROM book
    WHERE AvailableCopies >= 1 AND IsBorrowable = 1
    ORDER BY Title ASC
  `;

  db.query(sql, callback);
};

const getActiveUsers = (callback) => {
  const sql = `
    SELECT UserID, FullName, Email, Role, IsActive
    FROM user
    WHERE IsActive = 1
    ORDER BY FullName ASC
  `;

  db.query(sql, callback);
};

// Creates a loan in one transaction so inventory and loan data stay consistent.
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

      const userSql = "SELECT UserID, IsActive FROM user WHERE UserID = ? FOR UPDATE";
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

          const loanSql = `
            INSERT INTO LoanedBook (UserID, BookID, BorrowDate, DueDate, ReturnDate, IsOverdue)
            VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 14 DAY), NULL, 0)
          `;

          connection.query(loanSql, [UserID, BookID], (loanError, result) => {
            if (loanError) {
              rollback(connection, loanError, callback);
              return;
            }

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
        });
      });
    });
  });
};

const createForUser = (UserID, BookID, callback) => {
  create({ UserID, BookID }, callback);
};

const update = (id, { UserID, BookID, BorrowDate, DueDate, ReturnDate }, callback) => {
  const sql = `
    UPDATE LoanedBook
    SET UserID = ?, BookID = ?, BorrowDate = ?, DueDate = ?, ReturnDate = ?,
        IsOverdue = CASE WHEN ? IS NULL AND CURDATE() > ? THEN 1 ELSE 0 END
    WHERE LoanID = ?
  `;

  db.query(
    sql,
    [UserID, BookID, BorrowDate, DueDate, ReturnDate || null, ReturnDate || null, DueDate, id],
    callback
  );
};

// Marks the loan returned and restores the copy count in the same transaction.
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

const remove = (id, callback) => {
  db.query("DELETE FROM LoanedBook WHERE LoanID = ?", [id], callback);
};

function rollback(connection, error, callback) {
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
  getActiveUsers,
  create,
  createForUser,
  update,
  markReturned,
  markReturnedForUser,
  updateOverdueFlags,
  remove,
};
