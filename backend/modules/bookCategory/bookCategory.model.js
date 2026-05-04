const db = require("../../config/db");

const getAll = (callback) => {
  const sql = `
    SELECT CategoryID, CategoryName, DeweyCode, Description, IsActive, UpdatedAt
    FROM bookcategory
    ORDER BY CategoryID DESC
  `;
  db.query(sql, callback);
};

const getById = (id, callback) => {
  const sql = `
    SELECT CategoryID, CategoryName, DeweyCode, Description, IsActive, UpdatedAt
    FROM bookcategory
    WHERE CategoryID = ?
  `;
  db.query(sql, [id], callback);
};

const create = (data, callback) => {
  const sql = `
    INSERT INTO bookcategory (CategoryName, DeweyCode, Description, IsActive)
    VALUES (?, ?, ?, ?)
  `;
  const values = [
    data.CategoryName,
    data.DeweyCode,
    data.Description || null,
    data.IsActive !== undefined ? (data.IsActive ? 1 : 0) : 1,
  ];
  db.query(sql, values, callback);
};

const update = (id, data, callback) => {
  const sql = `
    UPDATE bookcategory
    SET CategoryName = ?, DeweyCode = ?, Description = ?, IsActive = ?, UpdatedAt = NOW()
    WHERE CategoryID = ?
  `;
  const values = [
    data.CategoryName,
    data.DeweyCode,
    data.Description || null,
    data.IsActive !== undefined ? (data.IsActive ? 1 : 0) : 1,
    id,
  ];
  db.query(sql, values, callback);
};

const updateStatus = (id, isActive, callback) => {
  const sql = `
    UPDATE bookcategory
    SET IsActive = ?, UpdatedAt = NOW()
    WHERE CategoryID = ?
  `;
  db.query(sql, [isActive ? 1 : 0, id], callback);
};

const remove = (id, callback) => {
  const sql = `DELETE FROM bookcategory WHERE CategoryID = ?`;
  db.query(sql, [id], callback);
};

const hasBooksAssigned = (id, callback) => {
  const sql = `SELECT COUNT(*) AS count FROM book WHERE CategoryID = ?`;
  db.query(sql, [id], callback);
};

module.exports = { getAll, getById, create, update, updateStatus, remove, hasBooksAssigned };
