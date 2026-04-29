import React, { useEffect, useState } from "react";

function App() {
  // Stores all books from database
  const [books, setBooks] = useState([]);

  // Message for loading / errors
  const [message, setMessage] = useState("Loading books...");

  // Stores form input values
  const [newBook, setNewBook] = useState({
    Title: "",
    ISBN: "",
    AvailableCopies: "",
  });

  // Function to fetch books from backend
  const fetchBooks = () => {
    fetch("http://localhost:5000/books")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Backend response was not OK");
        }
        return res.json();
      })
      .then((data) => {
        setBooks(data);

        // Show message if no data
        setMessage(data.length === 0 ? "No books found" : "");
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setMessage("Error connecting to backend");
      });
  };

  // Runs once when page loads
  useEffect(() => {
    fetchBooks();
  }, []);

  // Handles Add Book button click
  const handleAddBook = () => {
    // Simple validation
    if (!newBook.Title || !newBook.ISBN || !newBook.AvailableCopies) {
      alert("Please fill all fields");
      return;
    }

    // Sending POST request to backend
    fetch("http://localhost:5000/books", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        CategoryID: 1, // Temporary value (we improve later)
        Title: newBook.Title,
        ISBN: newBook.ISBN,
        PublicationDate: "2024-01-01", // Temporary
        AvailableCopies: parseInt(newBook.AvailableCopies),
        IsBorrowable: 1,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Book added:", data);

        // Clear form after adding
        setNewBook({
          Title: "",
          ISBN: "",
          AvailableCopies: "",
        });

        // Refresh book list
        fetchBooks();
      })
      .catch((err) => {
        console.error("Error adding book:", err);
        alert("Failed to add book");
      });
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>LibraSys Book Management</h1>

      {/* Add Book Form */}
      <div style={styles.formBox}>
        <h2 style={styles.subHeading}>Add New Book</h2>

        {/* Title Input */}
        <input
          style={styles.input}
          type="text"
          placeholder="Book Title"
          value={newBook.Title}
          onChange={(e) =>
            setNewBook({ ...newBook, Title: e.target.value })
          }
        />

        {/* ISBN Input */}
        <input
          style={styles.input}
          type="text"
          placeholder="ISBN"
          value={newBook.ISBN}
          onChange={(e) =>
            setNewBook({ ...newBook, ISBN: e.target.value })
          }
        />

        {/* Available Copies Input */}
        <input
          style={styles.input}
          type="number"
          placeholder="Available Copies"
          value={newBook.AvailableCopies}
          onChange={(e) =>
            setNewBook({ ...newBook, AvailableCopies: e.target.value })
          }
        />

        {/* Add Book Button */}
        <button style={styles.button} onClick={handleAddBook}>
          Add Book
        </button>
      </div>

      {/* Message display */}
      {message && <p style={styles.message}>{message}</p>}

      {/* Book Table */}
      {books.length > 0 && (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Book ID</th>
              <th style={styles.th}>Title</th>
              <th style={styles.th}>ISBN</th>
              <th style={styles.th}>Publication Date</th>
              <th style={styles.th}>Available Copies</th>
              <th style={styles.th}>Borrowable</th>
            </tr>
          </thead>

          <tbody>
            {books.map((book) => (
              <tr key={book.BookID}>
                <td style={styles.td}>{book.BookID}</td>
                <td style={styles.td}>{book.Title}</td>
                <td style={styles.td}>{book.ISBN}</td>

                {/* Format date properly */}
                <td style={styles.td}>
                  {book.PublicationDate
                    ? book.PublicationDate.substring(0, 10)
                    : "N/A"}
                </td>

                <td style={styles.td}>{book.AvailableCopies}</td>

                {/* Convert boolean to readable text */}
                <td style={styles.td}>
                  {book.IsBorrowable === 1 ? "Yes" : "No"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// Styling object (inline CSS)
const styles = {
  page: {
    padding: "30px",
    fontFamily: "Arial, sans-serif",
    backgroundColor: "#f4f6f8",
    minHeight: "100vh",
  },
  heading: {
    textAlign: "center",
    color: "#2c3e50",
    marginBottom: "30px",
  },
  subHeading: {
    marginTop: "0",
    color: "#2c3e50",
  },
  formBox: {
    backgroundColor: "white",
    padding: "20px",
    marginBottom: "30px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  input: {
    display: "block",
    width: "100%",
    padding: "10px",
    marginBottom: "12px",
    border: "1px solid #ccc",
    fontSize: "16px",
  },
  button: {
    padding: "10px 18px",
    backgroundColor: "#2c3e50",
    color: "white",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
  },
  message: {
    textAlign: "center",
    fontSize: "18px",
    color: "#555",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    backgroundColor: "white",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  th: {
    backgroundColor: "#2c3e50",
    color: "white",
    padding: "12px",
    border: "1px solid #ddd",
    textAlign: "left",
  },
  td: {
    padding: "12px",
    border: "1px solid #ddd",
  },
};

export default App;