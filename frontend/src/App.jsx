import React, { useEffect, useState } from "react";

function App() {
  const [books, setBooks] = useState([]);
  const [message, setMessage] = useState("Loading books...");

  const [newBook, setNewBook] = useState({
    Title: "",
    ISBN: "",
    AvailableCopies: "",
  });

  // NEW: track editing mode
  const [editingBookId, setEditingBookId] = useState(null);

  const fetchBooks = () => {
    fetch("http://localhost:5000/books")
      .then((res) => {
        if (!res.ok) throw new Error("Backend response was not OK");
        return res.json();
      })
      .then((data) => {
        setBooks(data);
        setMessage(data.length === 0 ? "No books found" : "");
      })
      .catch((err) => {
        console.error(err);
        setMessage("Error connecting to backend");
      });
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleAddBook = () => {
    if (!newBook.Title || !newBook.ISBN || !newBook.AvailableCopies) {
      alert("Please fill all fields");
      return;
    }

    fetch("http://localhost:5000/books", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        CategoryID: 1,
        Title: newBook.Title,
        ISBN: newBook.ISBN,
        PublicationDate: "2024-01-01",
        AvailableCopies: parseInt(newBook.AvailableCopies),
        IsBorrowable: 1,
      }),
    })
      .then((res) => res.json())
      .then(() => {
        setNewBook({ Title: "", ISBN: "", AvailableCopies: "" });
        fetchBooks();
      });
  };

  const handleDeleteBook = (id) => {
    fetch(`http://localhost:5000/books/${id}`, {
      method: "DELETE",
    }).then(() => fetchBooks());
  };

  // NEW: when clicking Edit button
  const handleEditClick = (book) => {
    setEditingBookId(book.BookID);

    // fill form with existing data
    setNewBook({
      Title: book.Title,
      ISBN: book.ISBN,
      AvailableCopies: book.AvailableCopies,
    });
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>LibraSys Book Management</h1>

      <div style={styles.formBox}>
        <h2 style={styles.subHeading}>
          {editingBookId ? "Edit Book" : "Add New Book"}
        </h2>

        <input
          style={styles.input}
          placeholder="Title"
          value={newBook.Title}
          onChange={(e) =>
            setNewBook({ ...newBook, Title: e.target.value })
          }
        />

        <input
          style={styles.input}
          placeholder="ISBN"
          value={newBook.ISBN}
          onChange={(e) =>
            setNewBook({ ...newBook, ISBN: e.target.value })
          }
        />

        <input
          style={styles.input}
          placeholder="Copies"
          value={newBook.AvailableCopies}
          onChange={(e) =>
            setNewBook({ ...newBook, AvailableCopies: e.target.value })
          }
        />

        <button style={styles.button} onClick={handleAddBook}>
          {editingBookId ? "Update Book" : "Add Book"}
        </button>
      </div>

      {books.length > 0 && (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Title</th>
              <th style={styles.th}>ISBN</th>
              <th style={styles.th}>Copies</th>
              <th style={styles.th}>Action</th>
            </tr>
          </thead>

          <tbody>
            {books.map((book) => (
              <tr key={book.BookID}>
                <td style={styles.td}>{book.Title}</td>
                <td style={styles.td}>{book.ISBN}</td>
                <td style={styles.td}>{book.AvailableCopies}</td>

                <td style={styles.td}>
                  <button
                    style={styles.button}
                    onClick={() => handleEditClick(book)}
                  >
                    Edit
                  </button>

                  <button
                    style={styles.deleteButton}
                    onClick={() => handleDeleteBook(book.BookID)}
                  >
                    Delete
                  </button>
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
  page: { padding: "30px" },
  heading: { textAlign: "center" },
  formBox: { marginBottom: "20px" },
  input: { display: "block", marginBottom: "10px", padding: "8px" },
  button: { marginRight: "10px" },
  deleteButton: { backgroundColor: "red", color: "white" },
  table: { width: "100%" },
  th: { border: "1px solid black" },
  td: { border: "1px solid black" },
};

export default App;