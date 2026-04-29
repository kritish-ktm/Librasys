const express = require('express');
const mysql = require('mysql2');

const app = express();
app.use(express.json());

// 🔌 MySQL Connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'librasys'
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
    } else {
        console.log('Connected to MySQL');
    }
});

// ✅ TEST ROUTE
app.get('/', (req, res) => {
    res.send('LibraSys Backend Running');
});

// ✅ GET ALL BOOKS
app.get('/books', (req, res) => {
    const sql = 'SELECT * FROM book';
    connection.query(sql, (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching books');
        } else {
            res.json(result);
        }
    });
});

// ✅ ADD NEW BOOK (POST)
app.post('/books', (req, res) => {
    const { Title, ISBN, PublicationDate, AvailableCopies, IsBorrowable } = req.body;

    const sql = `
        INSERT INTO book (Title, ISBN, PublicationDate, AvailableCopies, IsBorrowable)
        VALUES (?, ?, ?, ?, ?)
    `;

    connection.query(sql, [Title, ISBN, PublicationDate, AvailableCopies, IsBorrowable], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error inserting book');
        } else {
            res.send('Book added successfully');
        }
    });
});

// 🚀 START SERVER
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});