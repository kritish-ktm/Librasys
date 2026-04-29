const express = require('express');
const mysql = require('mysql2');

const app = express();
app.use(express.json());

// MySQL connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'librasys'
});

connection.connect((err) => {
    if (err) {
        console.error('MySQL connection error:', err);
    } else {
        console.log('Connected to MySQL');
    }
});

// Test route
app.get('/', (req, res) => {
    res.send('LibraSys Backend Running');
});

// Get all books
app.get('/books', (req, res) => {
    const sql = 'SELECT * FROM book';

    connection.query(sql, (err, result) => {
        if (err) {
            res.status(500).send('Error fetching books');
        } else {
            res.json(result);
        }
    });
});

// Add new book
app.post('/books', (req, res) => {
    const { Title, ISBN, PublicationDate, AvailableCopies, IsBorrowable } = req.body;

    const sql = `
        INSERT INTO book (Title, ISBN, PublicationDate, AvailableCopies, IsBorrowable)
        VALUES (?, ?, ?, ?, ?)
    `;

    connection.query(
        sql,
        [Title, ISBN, PublicationDate, AvailableCopies, IsBorrowable],
        (err, result) => {
            if (err) {
                res.status(500).send('Error inserting book');
            } else {
                res.send('Book added successfully');
            }
        }
    );
});

// Update book
app.put('/books/:id', (req, res) => {
    const bookId = req.params.id;
    const { Title, ISBN, PublicationDate, AvailableCopies, IsBorrowable } = req.body;

    const sql = `
        UPDATE book
        SET Title = ?, ISBN = ?, PublicationDate = ?, AvailableCopies = ?, IsBorrowable = ?
        WHERE BookID = ?
    `;

    connection.query(
        sql,
        [Title, ISBN, PublicationDate, AvailableCopies, IsBorrowable, bookId],
        (err, result) => {
            if (err) {
                res.status(500).send('Error updating book');
            } else {
                res.send('Book updated successfully');
            }
        }
    );
});

// Delete book
app.delete('/books/:id', (req, res) => {
    const bookId = req.params.id;

    const sql = 'DELETE FROM book WHERE BookID = ?';

    connection.query(sql, [bookId], (err, result) => {
        if (err) {
            res.status(500).send('Error deleting book');
        } else {
            res.send('Book deleted successfully');
        }
    });
});

// Start server
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});