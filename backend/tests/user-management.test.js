const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

jest.mock('../config/db', () => ({
  query: jest.fn(),
}));

process.env.JWT_SECRET = 'portfolio-test-secret';

const db = require('../config/db');
const express = require('express');
const userRoutes = require('../routes/userRoutes');

const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);

const librarianToken = jwt.sign(
  { id: 999, role: 'Librarian' },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

let users;
let nextUserId;
let lastInsertedUser;

const authHeader = () => ({ Authorization: `Bearer ${librarianToken}` });

const normaliseSql = (sql) => sql.replace(/\s+/g, ' ').trim();

const findByEmail = (email) =>
  users.find((user) => user.Email === String(email).trim().toLowerCase());

const handleDbQuery = async (sql, values, callback) => {
  if (typeof values === 'function') {
    callback = values;
    values = [];
  }

  const cleanSql = normaliseSql(sql);

  if (cleanSql.startsWith('SELECT UserID FROM user WHERE Email = ? AND UserID != ?')) {
    const [email, userId] = values;
    const match = users.filter(
      (user) => user.Email === email && user.UserID !== Number(userId)
    );
    return callback(null, match.map((user) => ({ UserID: user.UserID })));
  }

  if (cleanSql.startsWith('SELECT UserID FROM user WHERE Email = ?')) {
    const [email] = values;
    const match = findByEmail(email);
    return callback(null, match ? [{ UserID: match.UserID }] : []);
  }

  if (cleanSql.startsWith('SELECT UserID FROM user WHERE UserID = ?')) {
    const [UserID] = values;
    const match = users.find((user) => user.UserID === Number(UserID));
    return callback(null, match ? [{ UserID: match.UserID }] : []);
  }

  if (cleanSql.startsWith('INSERT INTO user')) {
    const [FullName, Email, PasswordHash, Role] = values;
    lastInsertedUser = {
      UserID: nextUserId++,
      FullName,
      Email,
      PasswordHash,
      Role,
      IsActive: 1,
      DateRegistered: '2026-05-29',
    };
    users.push(lastInsertedUser);
    return callback(null, { insertId: lastInsertedUser.UserID, affectedRows: 1 });
  }

  if (cleanSql.startsWith('SELECT UserID, FullName, Email, Role, IsActive, DateRegistered FROM user ORDER BY UserID DESC')) {
    const rows = [...users]
      .sort((a, b) => b.UserID - a.UserID)
      .map(({ UserID, FullName, Email, Role, IsActive, DateRegistered }) => ({
        UserID,
        FullName,
        Email,
        Role,
        IsActive,
        DateRegistered,
      }));
    return callback(null, rows);
  }

  if (cleanSql.startsWith('UPDATE user SET IsActive = ? WHERE UserID = ?')) {
    const [IsActive, UserID] = values;
    const user = users.find((item) => item.UserID === Number(UserID));
    if (!user) return callback(null, { affectedRows: 0 });
    user.IsActive = IsActive;
    return callback(null, { affectedRows: 1 });
  }

  if (cleanSql.startsWith('UPDATE user SET FullName = ?, Email = ?, Role = ? WHERE UserID = ?')) {
    const [FullName, Email, Role, UserID] = values;
    const user = users.find((item) => item.UserID === Number(UserID));
    if (!user) return callback(null, { affectedRows: 0 });
    Object.assign(user, { FullName, Email, Role });
    return callback(null, { affectedRows: 1 });
  }

  if (cleanSql.startsWith('DELETE FROM user WHERE UserID = ?')) {
    const [UserID] = values;
    const originalLength = users.length;
    users = users.filter((user) => user.UserID !== Number(UserID));
    return callback(null, { affectedRows: originalLength === users.length ? 0 : 1 });
  }

  return callback(new Error(`Unhandled test SQL: ${cleanSql}`));
};

const createUser = (overrides = {}) =>
  request(app)
    .post('/api/users')
    .set(authHeader())
    .send({
      fullName: 'Automated Test Member',
      email: `automated.test.member.${Date.now()}.${nextUserId}@example.com`,
      password: 'secret1',
      role: 'Member',
      ...overrides,
    });

beforeEach(() => {
  users = [];
  nextUserId = 1;
  lastInsertedUser = null;
  db.query.mockImplementation((sql, values, callback) => {
    handleDbQuery(sql, values, callback).catch(callback);
  });
});

afterEach(() => {
  // Cleanup proves test users do not remain in the mocked test database.
  users = users.filter((user) => !user.Email.includes('automated.test.'));
  jest.clearAllMocks();
});

describe('CTEC2713 Portfolio 2 - User Management automated API tests', () => {
  test('TS-01 Full Name Validation - blank full name should fail', async () => {
    // Proves the add-user API rejects an empty required full name.
    const response = await createUser({ fullName: '   ' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/full name/i);
  });

  test('TS-01 Full Name Validation - one-character full name should fail', async () => {
    // Proves the minimum full-name length is enforced.
    const response = await createUser({ fullName: 'A' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/full name/i);
  });

  test('TS-01 Full Name Validation - two-character full name should pass', async () => {
    // Proves the shortest valid full name can create a user.
    const response = await createUser({ fullName: 'Al' });

    expect(response.status).toBe(201);
    expect(lastInsertedUser.FullName).toBe('Al');
  });

  test('TS-01 Full Name Validation - normal full name should pass', async () => {
    // Proves a realistic member name can be accepted by the API.
    const response = await createUser({ fullName: 'Automated Test Member' });

    expect(response.status).toBe(201);
    expect(lastInsertedUser.FullName).toBe('Automated Test Member');
  });

  test('TS-01 Full Name Validation - over 100 characters should fail when creating', async () => {
    // Genuine current limitation check: add-user should match edit-user's 100 character limit.
    const response = await createUser({ fullName: 'A'.repeat(101) });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/full name/i);
  });

  test('TS-01 Full Name Validation - over 100 characters should fail when editing', async () => {
    // Proves the edit-user API enforces the 100 character upper limit.
    await createUser({ email: 'automated.test.member@example.com' });
    const longName = 'A'.repeat(101);

    const response = await request(app)
      .put(`/api/users/${lastInsertedUser.UserID}`)
      .set(authHeader())
      .send({
        fullName: longName,
        email: 'automated.test.member@example.com',
        role: 'Member',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/between 2 and 100/i);
  });

  test('TS-02 Email Validation - blank email should fail', async () => {
    // Proves email is required when creating a user.
    const response = await createUser({ email: '   ' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/valid email/i);
  });

  test('TS-02 Email Validation - invalid email should fail', async () => {
    // Proves malformed email addresses are rejected.
    const response = await createUser({ email: 'not-an-email' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/valid email/i);
  });

  test('TS-02 Email Validation - valid email should pass and be lowercased', async () => {
    // Proves valid email is accepted and normalised before storage.
    const response = await createUser({ email: 'Automated.Test.Member@Example.COM' });

    expect(response.status).toBe(201);
    expect(lastInsertedUser.Email).toBe('automated.test.member@example.com');
  });

  test('TS-02 Email Validation - duplicate email should fail', async () => {
    // Proves duplicate accounts cannot be created with the same email.
    await createUser({ email: 'automated.test.duplicate@example.com' });
    const response = await createUser({ email: 'AUTOMATED.TEST.DUPLICATE@example.com' });

    expect(response.status).toBe(409);
    expect(response.body.error).toMatch(/already exists/i);
  });

  test('TS-03 Password Validation - blank password should fail when creating a user', async () => {
    // Proves password is required for new users.
    const response = await createUser({ password: '' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/password/i);
  });

  test('TS-03 Password Validation - fewer than 6 characters should fail', async () => {
    // Proves passwords shorter than the required length are rejected.
    const response = await createUser({ password: '12345' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/at least 6/i);
  });

  test('TS-03 Password Validation - 6 characters should pass and password should be hashed', async () => {
    // Proves the minimum valid password length is accepted and bcrypt hashing is used.
    const response = await createUser({ password: '123456' });

    expect(response.status).toBe(201);
    expect(lastInsertedUser.PasswordHash).not.toBe('123456');
    await expect(bcrypt.compare('123456', lastInsertedUser.PasswordHash)).resolves.toBe(true);
  });

  test('TS-03 Password Validation - password should not be returned in API responses', async () => {
    // Proves list-user responses expose public fields only, not password hashes.
    await createUser({ email: 'automated.test.hidden.password@example.com' });

    const response = await request(app).get('/api/users').set(authHeader());

    expect(response.status).toBe(200);
    expect(response.body[0]).not.toHaveProperty('PasswordHash');
    expect(response.body[0]).not.toHaveProperty('password');
  });

  test('TS-04 Role Validation - Member should pass', async () => {
    // Proves Member is an accepted role.
    const response = await createUser({ role: 'Member' });

    expect(response.status).toBe(201);
    expect(lastInsertedUser.Role).toBe('Member');
  });

  test('TS-04 Role Validation - Librarian should pass', async () => {
    // Proves Librarian is an accepted role.
    const response = await createUser({
      role: 'Librarian',
      email: 'automated.test.librarian@example.com',
    });

    expect(response.status).toBe(201);
    expect(lastInsertedUser.Role).toBe('Librarian');
  });

  test('TS-04 Role Validation - Administrator should fail', async () => {
    // Proves unsupported text roles are rejected.
    const response = await createUser({ role: 'Administrator' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/role/i);
  });

  test('TS-04 Role Validation - numeric role should fail', async () => {
    // Proves non-string role values cannot bypass role validation.
    const response = await createUser({ role: 123 });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/role/i);
  });

  test('TS-05 User API Functions - Add user with POST /api/users', async () => {
    // Proves the add-user route creates a test member account.
    const response = await createUser({ email: 'automated.test.add@example.com' });

    expect(response.status).toBe(201);
    expect(response.body.message).toMatch(/added successfully/i);
    expect(findByEmail('automated.test.add@example.com')).toBeTruthy();
  });

  test('TS-05 User API Functions - Search/list users with GET /api/users', async () => {
    // Proves the list route returns created users without needing the real database.
    await createUser({ email: 'automated.test.list@example.com' });

    const response = await request(app).get('/api/users').set(authHeader());

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ Email: 'automated.test.list@example.com' }),
      ])
    );
  });

  test('TS-05 User API Functions - Edit user with PUT /api/users/:id', async () => {
    // Proves librarians can edit a user's name, email, and role.
    await createUser({ email: 'automated.test.edit.before@example.com' });

    const response = await request(app)
      .put(`/api/users/${lastInsertedUser.UserID}`)
      .set(authHeader())
      .send({
        fullName: 'Edited Automated Member',
        email: 'automated.test.edit.after@example.com',
        role: 'Librarian',
      });

    expect(response.status).toBe(200);
    expect(findByEmail('automated.test.edit.after@example.com')).toEqual(
      expect.objectContaining({
        FullName: 'Edited Automated Member',
        Role: 'Librarian',
      })
    );
  });

  test('TS-05 User API Functions - Activate/deactivate user with PUT /api/users/:id/status', async () => {
    // Proves the status route can deactivate and reactivate a test user.
    await createUser({ email: 'automated.test.status@example.com' });
    const userId = lastInsertedUser.UserID;

    const deactivateResponse = await request(app)
      .put(`/api/users/${userId}/status`)
      .set(authHeader())
      .send({ isActive: 0 });

    const activateResponse = await request(app)
      .put(`/api/users/${userId}/status`)
      .set(authHeader())
      .send({ isActive: 1 });

    expect(deactivateResponse.status).toBe(200);
    expect(deactivateResponse.body.isActive).toBe(0);
    expect(activateResponse.status).toBe(200);
    expect(activateResponse.body.isActive).toBe(1);
    expect(users.find((user) => user.UserID === userId).IsActive).toBe(1);
  });

  test('TS-05 User API Functions - Delete user with DELETE /api/users/:id', async () => {
    // Proves a test user can be deleted and cleanup behavior works.
    await createUser({ email: 'automated.test.delete@example.com' });
    const userId = lastInsertedUser.UserID;

    const response = await request(app)
      .delete(`/api/users/${userId}`)
      .set(authHeader());

    expect(response.status).toBe(200);
    expect(response.body.message).toMatch(/deleted successfully/i);
    expect(users.find((user) => user.UserID === userId)).toBeUndefined();
  });
});
