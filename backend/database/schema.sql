CREATE DATABASE IF NOT EXISTS librasys
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
 
USE librasys;
 
-- =============================================================================
-- TABLE: User
-- =============================================================================
CREATE TABLE IF NOT EXISTS user (
    UserID INT AUTO_INCREMENT PRIMARY KEY,
    FullName VARCHAR(100) NOT NULL,
    Email VARCHAR(100) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL,
    Role ENUM('Librarian', 'Member') NOT NULL DEFAULT 'Member',
    IsActive BOOLEAN NOT NULL DEFAULT TRUE,
    DateRegistered DATE NOT NULL DEFAULT (CURRENT_DATE)
);

-- =============================================================================
-- TABLE 1: BookCategory
-- Developer: Kritish Upadhyaya
-- =============================================================================
CREATE TABLE IF NOT EXISTS BookCategory (

    CategoryID INT AUTO_INCREMENT PRIMARY KEY,
    CategoryName VARCHAR(100) NOT NULL UNIQUE,
    Description VARCHAR(200) NOT NULL,
    IsActive BOOLEAN NOT NULL DEFAULT TRUE,
    DeweyCode VARCHAR(10) NOT NULL UNIQUE,
    CategoryColor VARCHAR(7) NOT NULL DEFAULT '#2f6b52',
    CategoryImage LONGTEXT NULL,
    ArchiveReason VARCHAR(80) NULL,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    CreatedBy INT NULL,
    UpdatedBy INT NULL,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table: book
-- Developer: Richart
-- This table stores all book records used in the Book Management page.

CREATE TABLE IF NOT EXISTS book (
    BookID INT AUTO_INCREMENT PRIMARY KEY,

    -- Links each book to a category from the BookCategory table.
    CategoryID INT NOT NULL,

    -- Main book details shown in the catalogue.
    Title VARCHAR(200) NOT NULL,
    ISBN VARCHAR(13) NOT NULL UNIQUE,

    -- Number of copies currently available for borrowing.
    AvailableCopies INT NOT NULL,

    -- Original publication date of the book.
    PublicationDate DATE NOT NULL,

    -- Shows whether the book can be borrowed or is reference-only.
    IsBorrowable BOOLEAN NOT NULL,

    -- Connects CategoryID to the BookCategory table.
    CONSTRAINT fk_book_category
      FOREIGN KEY (CategoryID) REFERENCES BookCategory(CategoryID),

    -- Prevents available copies from becoming negative.
    CONSTRAINT chk_book_available_copies
      CHECK (AvailableCopies >= 0)
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


-- =====================================
-- CREATE DATABASE
    Developer; Nitish Bhattarai
-- =====================================

CREATE DATABASE IF NOT EXISTS librasys;

USE librasys;

-- =====================================
-- CREATE USERS TABLE
-- =====================================

CREATE TABLE IF NOT EXISTS users (

    id INT PRIMARY KEY AUTO_INCREMENT,

    name VARCHAR(100) NOT NULL,

    email VARCHAR(100) UNIQUE NOT NULL,

    password VARCHAR(255) NOT NULL,

    role VARCHAR(50) DEFAULT 'member',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

