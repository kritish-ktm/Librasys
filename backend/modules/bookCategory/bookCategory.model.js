const db = require("../../config/db");

const sortableColumns = {
  CategoryID: "bc.CategoryID",
  CategoryName: "bc.CategoryName",
  DeweyCode: "bc.DeweyCode",
  IsActive: "bc.IsActive",
  CreatedAt: "bc.CreatedAt",
  UpdatedAt: "bc.UpdatedAt",
  BookCount: "BookCount",
};

const getAll = (filters, callback) => {
  const params = [];
  const where = [];
  const search = filters?.search?.trim();
  const status = filters?.status;
  const sortBy = sortableColumns[filters?.sortBy] || sortableColumns.CategoryName;
  const sortDirection = String(filters?.sortDirection || "asc").toLowerCase() === "desc" ? "DESC" : "ASC";

  if (search) {
    where.push("(bc.CategoryName LIKE ? OR bc.DeweyCode LIKE ? OR bc.Description LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (status === "active") {
    where.push("bc.IsActive = 1");
  } else if (status === "inactive") {
    where.push("bc.IsActive = 0");
  }

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
    GROUP BY bc.CategoryID, bc.CategoryName, bc.DeweyCode, bc.Description, bc.IsActive, bc.CategoryColor, bc.CategoryImage, bc.ArchiveReason, bc.CreatedAt, bc.UpdatedAt
    ORDER BY ${sortBy} ${sortDirection}, bc.CategoryName ASC
  `;
  db.query(sql, params, callback);
};

const getActive = (callback) => {
  getAll({ status: "active", sortBy: "CategoryName", sortDirection: "asc" }, callback);
};

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
    GROUP BY bc.CategoryID, bc.CategoryName, bc.DeweyCode, bc.Description, bc.IsActive, bc.CategoryColor, bc.CategoryImage, bc.ArchiveReason, bc.CreatedAt, bc.UpdatedAt
  `;
  db.query(sql, [id], callback);
};

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

const create = (data, callback) => {
  const sql = `
    INSERT INTO bookcategory (CategoryName, DeweyCode, Description, IsActive, CategoryColor, CategoryImage, ArchiveReason)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [
    data.CategoryName,
    data.DeweyCode,
    data.Description,
    data.IsActive !== undefined ? (data.IsActive ? 1 : 0) : 1,
    data.CategoryColor,
    data.CategoryImage || null,
    data.ArchiveReason || null,
  ];
  db.query(sql, values, callback);
};

const update = (id, data, callback) => {
  const sql = `
    UPDATE bookcategory
    SET CategoryName = ?, DeweyCode = ?, Description = ?, IsActive = ?, CategoryColor = ?, CategoryImage = ?, ArchiveReason = ?, UpdatedAt = NOW()
    WHERE CategoryID = ?
  `;
  const values = [
    data.CategoryName,
    data.DeweyCode,
    data.Description,
    data.IsActive !== undefined ? (data.IsActive ? 1 : 0) : 1,
    data.CategoryColor,
    data.CategoryImage || null,
    data.ArchiveReason || null,
    id,
  ];
  db.query(sql, values, callback);
};

const updateStatus = (id, isActive, archiveReason, updatedBy, callback) => {
  const sql = `
    UPDATE bookcategory
    SET IsActive = ?, ArchiveReason = ?, UpdatedAt = NOW()
    WHERE CategoryID = ?
  `;
  db.query(sql, [isActive ? 1 : 0, isActive ? null : archiveReason, id], callback);
};

const remove = (id, callback) => {
  const sql = `DELETE FROM bookcategory WHERE CategoryID = ?`;
  db.query(sql, [id], callback);
};

const hasBooksAssigned = (id, callback) => {
  const sql = `SELECT COUNT(*) AS count FROM book WHERE CategoryID = ?`;
  db.query(sql, [id], callback);
};

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

module.exports = { getAll, getActive, getById, getBooksByCategory, create, update, updateStatus, remove, hasBooksAssigned, getMostBorrowedBooks };
