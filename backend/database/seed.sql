
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