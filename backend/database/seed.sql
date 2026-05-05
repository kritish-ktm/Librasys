-- =============================================================================
-- LibraSys — Seed Data
-- Run AFTER schema.sql:
-- =============================================================================
 
USE librasys;
 
-- =============================================================================
-- BookCategory seed (Kritish)

INSERT INTO BookCategory (CategoryName, Description, DeweyCode) VALUES
  ('Fiction',          'Novels and fictional stories',                    '800'),
  ('Science',          'Natural and applied sciences',                    '500'),
  ('Computer Science', 'Programming, AI, and software engineering',       '005'),
  ('History',          'World and regional history',                      '900'),
  ('Mathematics',      'Pure and applied mathematics',                    '510'),
  ('Reference',        'Encyclopedias, dictionaries and reference books', '030');

-- =============================================================================
-- Book seed (Richart)

INSERT INTO Book (CategoryID, Title, ISBN, PublicationDate, AvailableCopies, IsBorrowable) VALUES

-- Fiction (1)
(1, 'Harry Potter and the Philosopher''s Stone', '9780747532699', '1997-06-26', 50, TRUE),
(1, 'The Hobbit', '9780261102217', '1937-09-21', 30, TRUE),
(1, 'The Alchemist', '9780061122415', '1988-04-15', 25, TRUE),
(1, 'Rare Manuscript Collection', '9780000000001', '1920-01-01', 1, FALSE),

-- Science (2)
(2, 'A Brief History of Time', '9780553380163', '1988-03-01', 10, TRUE),
(2, 'The Selfish Gene', '9780199291151', '1976-01-01', 12, TRUE),
(2, 'Cosmos', '9780345331359', '1980-01-01', 8, TRUE),

-- Computer Science (3)
(3, 'Clean Code', '9780132350884', '2008-08-11', 20, TRUE),
(3, 'Introduction to Algorithms', '9780262033848', '2009-07-31', 15, TRUE),
(3, 'You Don''t Know JS', '9781491904244', '2015-12-27', 18, TRUE),
(3, 'Artificial Intelligence: A Modern Approach', '9780136042594', '2010-12-11', 10, TRUE),

-- History (4)
(4, 'Sapiens: A Brief History of Humankind', '9780062316097', '2011-01-01', 14, TRUE),
(4, 'Guns, Germs, and Steel', '9780393317558', '1997-01-01', 9, TRUE),

-- Mathematics (5)
(5, 'Calculus by James Stewart', '9781285740621', '2015-01-01', 7, TRUE),
(5, 'Discrete Mathematics and Its Applications', '9780073383095', '2011-01-01', 6, TRUE),

-- Reference (6) (non-borrowable)
(6, 'Encyclopedia Britannica', '9781593392925', '2010-01-01', 2, FALSE),
(6, 'Oxford English Dictionary', '9780198611868', '1989-01-01', 2, FALSE),
(6, 'World Atlas', '9780756698195', '2012-01-01', 3, FALSE),
(6, 'Library Archive Records', '9780000000002', '1900-01-01', 1, FALSE);