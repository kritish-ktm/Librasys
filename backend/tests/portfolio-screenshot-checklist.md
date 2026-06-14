# Portfolio 2 Screenshot Checklist - User Management / Member Management

Use these screenshots as evidence in the test log section.

## Automated Test Script Evidence

1. Open `backend/tests/user-management.test.js` in VS Code.
2. Screenshot the top of the file showing Jest, Supertest, mocked database setup, and the test suite name.
3. Screenshot the TS-01 to TS-05 test names inside the file.

## Automated Test Result Evidence

Run this in the VS Code terminal:

```powershell
cd C:\xampp\htdocs\librasys\backend
npm test
```

Screenshot the terminal output showing:

- `Portfolio Test Results - User Management / Member Management`
- the `PASSED` and `FAILED` test result lines
- `Summary: 22 passed, 1 failed, 23 total`
- the Jest failure detail showing `Expected: 400` and `Received: 201`

## Database Connection Evidence

Open and screenshot:

```text
backend/config/db.js
```

Show the part where the backend connects to MySQL using `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`.

## Database Data Evidence

Run this in the VS Code terminal:

```powershell
C:\xampp\mysql\bin\mysql.exe -u root librasys < tests\user-management-database-evidence.sql
```

Screenshot the output showing:

- `DESCRIBE user`
- user records with `UserID`, `FullName`, `Email`, `Role`, `IsActive`, `DateRegistered`
- role/status totals

Do not screenshot `PasswordHash` values for portfolio evidence.
