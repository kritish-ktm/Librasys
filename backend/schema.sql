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

- =============================================================================
-- TABLE 3: LoanedBook
-- Developer: Arun Shrestha
-- =============================================================================

USE librasys;

CREATE TABLE IF NOT EXISTS loanedbook (
  LoanID      INT NOT NULL AUTO_INCREMENT,
  UserID      INT NOT NULL,
  BookID      INT NOT NULL,
  BorrowDate  DATE NOT NULL,
  DueDate     DATE NOT NULL,
  ReturnDate  DATE NULL DEFAULT NULL,
  IsOverdue   BIT(1) NOT NULL DEFAULT 0,

  PRIMARY KEY (LoanID),

  CONSTRAINT fk_loanedbook_user
    FOREIGN KEY (UserID) REFERENCES users(UserID)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT fk_loanedbook_book
    FOREIGN KEY (BookID) REFERENCES books(BookID)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;


