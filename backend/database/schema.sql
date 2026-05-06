CREATE DATABASE IF NOT EXISTS librasys
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
 
USE librasys;
 
-- =============================================================================
-- TABLE 1: BookCategory
-- Developer: Kritish Upadhyaya
-- =============================================================================
CREATE TABLE IF NOT EXISTS BookCategory (

    CategoryID INT AUTO_INCREMENT PRIMARY KEY,
    CategoryName VARCHAR(100) NOT NULL UNIQUE,
    Description VARCHAR(200) NULL,
    IsActive BOOLEAN NOT NULL DEFAULT TRUE,
    DeweyCode VARCHAR(10) NOT NULL UNIQUE,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =============================================================================
-- TABLE: LoanedBook
-- Developer: Arun Shrestha
-- =============================================================================
CREATE TABLE IF NOT EXISTS LoanedBook (
    LoanID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL,
    BookID INT NOT NULL,
    BorrowDate DATE NOT NULL,
    DueDate DATE NOT NULL,
    ReturnDate DATE NULL,
    IsOverdue BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_loanedbook_user
      FOREIGN KEY (UserID) REFERENCES user(UserID),
    CONSTRAINT fk_loanedbook_book
      FOREIGN KEY (BookID) REFERENCES book(BookID),
    CONSTRAINT chk_loanedbook_dates
      CHECK (DueDate >= BorrowDate AND (ReturnDate IS NULL OR ReturnDate >= BorrowDate))
);

