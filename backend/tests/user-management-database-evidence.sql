-- LibraSys Portfolio 2 database evidence for User Management / Member Management
-- Safe evidence queries: these do NOT show PasswordHash values.

USE librasys;

-- Evidence 1: show the User Management table structure.
DESCRIBE user;

-- Evidence 2: show user/member records without exposing passwords.
SELECT
  UserID,
  FullName,
  Email,
  Role,
  CAST(IsActive AS UNSIGNED) AS IsActive,
  DateRegistered
FROM user
ORDER BY UserID DESC
LIMIT 20;

-- Evidence 3: show role/status totals for User Management.
SELECT
  Role,
  CAST(IsActive AS UNSIGNED) AS IsActive,
  COUNT(*) AS TotalUsers
FROM user
GROUP BY Role, CAST(IsActive AS UNSIGNED)
ORDER BY Role, CAST(IsActive AS UNSIGNED);
