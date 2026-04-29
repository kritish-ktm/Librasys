import React, { useEffect, useState } from "react";

function App() {
  const [books, setBooks] = useState([]);
  const [message, setMessage] = useState("Loading books...");

  useEffect(() => {
    fetch("http://localhost:5000/books")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Backend response was not OK");
        }
        return res.json();
      })
      .then((data) => {
        console.log("Books received:", data);
        setBooks(data);

        if (data.length === 0) {
          setMessage("No books found");
        } else {
          setMessage("");
        }
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setMessage("Error connecting to backend");
      });
  }, []);

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>LibraSys Book Management</h1>

      {message && <p style={styles.message}>{message}</p>}

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
                <td style={styles.td}>
                  {book.PublicationDate
                    ? book.PublicationDate.substring(0, 10)
                    : "N/A"}
                </td>
                <td style={styles.td}>{book.AvailableCopies}</td>
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