const db = require("../../config/db");

/*
  Maps frontend sorting keys to actual database columns.
  This prevents SQL injection and ensures safe ORDER BY usage.
*/
const sortableColumns = {
  CategoryID: "bc.CategoryID",
  CategoryName: "bc.CategoryName",
  DeweyCode: "bc.DeweyCode",
  IsActive: "bc.IsActive",
  CreatedAt: "bc.CreatedAt",
  UpdatedAt: "bc.UpdatedAt",
  BookCount: "BookCount",
};

/*
  GET ALL CATEGORIES (MAIN LIST QUERY)

  Purpose:
  - Fetch all book categories from database
  - Supports search, filtering, sorting
  - Includes book count using LEFT JOIN

  Flow:
  filters → SQL WHERE conditions → db.query → result
*/
const getAll = (filters, callback) => {
  const params = [];
  const where = [];

  const search = filters?.search?.trim();
  const status = filters?.status;

  const sortBy = sortableColumns[filters?.sortBy] || sortableColumns.CategoryName;
  const sortDirection =
    String(filters?.sortDirection || "asc").toLowerCase() === "desc"
      ? "DESC"
      : "ASC";

  /*
    SEARCH FILTER
    Searches across:
    - CategoryName
    - DeweyCode
    - Description
  */
  if (search) {
    where.push(
      "(bc.CategoryName LIKE ? OR bc.DeweyCode LIKE ? OR bc.Description LIKE ?)"
    );
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  /*
    STATUS FILTER
    - active → IsActive = 1
    - inactive → IsActive = 0
  */
  if (status === "active") {
    where.push("bc.IsActive = 1");
  } else if (status === "inactive") {
    where.push("bc.IsActive = 0");
  }

  /*
    MAIN SQL QUERY

    - Fetches category data
    - Joins book table to calculate BookCount
    - Groups by category to avoid duplication
  */
  const sql = `
    SELECT
      bc.CategoryID,
      bc.CategoryName,
      bc.DeweyCode,
      bc.Description,
      bc.IsActive,
      bc.CategoryColor,
      bc.CategoryImage,
      bc.ArchiveReason,
      bc.CreatedAt,
      bc.UpdatedAt,
      COUNT(b.BookID) AS BookCount
    FROM bookcategory bc
    LEFT JOIN book b ON b.CategoryID = bc.CategoryID
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    GROUP BY bc.CategoryID, bc.CategoryName, bc.DeweyCode,
             bc.Description, bc.IsActive, bc.CategoryColor,
             bc.CategoryImage, bc.ArchiveReason,
             bc.CreatedAt, bc.UpdatedAt
    ORDER BY ${sortBy} ${sortDirection}, bc.CategoryName ASC
  `;

  db.query(sql, params, callback);
};

/*
  GET ACTIVE CATEGORIES ONLY

  Purpose:
  - Shortcut function
  - Calls getAll() with filter { IsActive = 1 }
*/
const getActive = (callback) => {
  getAll(
    { status: "active", sortBy: "CategoryName", sortDirection: "asc" },
    callback
  );
};

/*
  GET CATEGORY BY ID

  Purpose:
  - Fetch single category details
  - Includes BookCount
*/
const getById = (id, callback) => {
  const sql = `
    SELECT
      bc.CategoryID,
      bc.CategoryName,
      bc.DeweyCode,
      bc.Description,
      bc.IsActive,
      bc.CategoryColor,
      bc.CategoryImage,
      bc.ArchiveReason,
      bc.CreatedAt,
      bc.UpdatedAt,
      COUNT(b.BookID) AS BookCount
    FROM bookcategory bc
    LEFT JOIN book b ON b.CategoryID = bc.CategoryID
    WHERE bc.CategoryID = ?
    GROUP BY bc.CategoryID, bc.CategoryName, bc.DeweyCode,
             bc.Description, bc.IsActive, bc.CategoryColor,
             bc.CategoryImage, bc.ArchiveReason,
             bc.CreatedAt, bc.UpdatedAt
  `;

  db.query(sql, [id], callback);
};

/*
  GET BOOKS UNDER A CATEGORY

  Purpose:
  - Fetch all books assigned to a specific category
*/
const getBooksByCategory = (id, callback) => {
  const sql = `
    SELECT
      BookID,
      Title,
      ISBN,
      PublicationDate,
      AvailableCopies,
      IsBorrowable
    FROM book
    WHERE CategoryID = ?
    ORDER BY Title ASC, BookID ASC
  `;

  db.query(sql, [id], callback);
};

/*
  CREATE NEW CATEGORY

  Purpose:
  - Insert new category into database
  - Defaults IsActive = 1 if not provided
*/
const create = (data, callback) => {
  const sql = `
    INSERT INTO bookcategory
    (CategoryName, DeweyCode, Description, IsActive, CategoryColor, CategoryImage, ArchiveReason)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    data.CategoryName,
    data.DeweyCode,
    data.Description,
    data.IsActive !== undefined ? (data.IsActive ? 1 : 0) : 1,
    data.CategoryColor || "#2f6b52",
    data.CategoryImage || null,
    data.ArchiveReason || null,
  ];

  db.query(sql, values, callback);
};

/*
  UPDATE CATEGORY

  Purpose:
  - Update all category fields
  - Also updates UpdatedAt timestamp automatically
*/
const update = (id, data, callback) => {
  const sql = `
    UPDATE bookcategory
    SET CategoryName = ?, DeweyCode = ?, Description = ?,
        IsActive = ?, CategoryColor = ?, CategoryImage = ?,
        ArchiveReason = ?, UpdatedAt = NOW()
    WHERE CategoryID = ?
  `;

  const values = [
    data.CategoryName,
    data.DeweyCode,
    data.Description,
    data.IsActive !== undefined ? (data.IsActive ? 1 : 0) : 1,
    data.CategoryColor || "#2f6b52",
    data.CategoryImage || null,
    data.ArchiveReason || null,
    id,
  ];

  db.query(sql, values, callback);
};

/*
  UPDATE CATEGORY STATUS ONLY

  Purpose:
  - Activate / Deactivate category
  - Set archive reason when deactivating
*/
const updateStatus = (id, isActive, archiveReason, updatedBy, callback) => {
  const sql = `
    UPDATE bookcategory
    SET IsActive = ?, ArchiveReason = ?, UpdatedAt = NOW()
    WHERE CategoryID = ?
  `;

  db.query(
    sql,
    [isActive ? 1 : 0, isActive ? null : archiveReason, id],
    callback
  );
};

/*
  DELETE CATEGORY

  Purpose:
  - Permanently remove category from database
*/
const remove = (id, callback) => {
  const sql = `DELETE FROM bookcategory WHERE CategoryID = ?`;
  db.query(sql, [id], callback);
};

/*
  CHECK IF CATEGORY HAS BOOKS

  Purpose:
  - Prevent deletion if books are assigned
*/
const hasBooksAssigned = (id, callback) => {
  const sql = `SELECT COUNT(*) AS count FROM book WHERE CategoryID = ?`;
  db.query(sql, [id], callback);
};

/*
  MOST BORROWED BOOKS QUERY

  Purpose:
  - Analytics endpoint
  - Shows top 10 most borrowed books
  - Uses LoanedBook table for counting loans
*/
const getMostBorrowedBooks = (callback) => {
  const sql = `
    SELECT
      b.BookID,
      b.Title,
      b.ISBN,
      b.CategoryID,
      bc.CategoryName,
      COUNT(l.LoanID) AS BorrowCount
    FROM book b
    LEFT JOIN LoanedBook l ON l.BookID = b.BookID
    LEFT JOIN bookcategory bc ON bc.CategoryID = b.CategoryID
    GROUP BY b.BookID, b.Title, b.ISBN, b.CategoryID, bc.CategoryName
    ORDER BY BorrowCount DESC, b.Title ASC
    LIMIT 10
  `;

  db.query(sql, callback);
};

/*
  EXPORT ALL FUNCTIONS
  These are used by controller layer
*/
module.exports = {
  getAll,
  getActive,
  getById,
  getBooksByCategory,
  create,
  update,
  updateStatus,
  remove,
  hasBooksAssigned,
  getMostBorrowedBooks,
};
