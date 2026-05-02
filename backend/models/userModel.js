const db = require("../config/db");

const createUser = (userData, callback) => {

    const sql = `
        INSERT INTO User
        (
            FullName,
            Email,
            PasswordHash,
            Role,
            IsActive,
            DateRegistered
        )
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, userData, callback);
};

module.exports = {
    createUser
};