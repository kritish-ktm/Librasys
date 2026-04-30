import { useEffect, useState } from "react";

function BookManagement() {
  const [books, setBooks] = useState([]);
  const [form, setForm] = useState({
    CategoryID: "",
    Title: "",
    ISBN: "",
    PublicationDate: "",
    AvailableCopies: "",
    IsBorrowable: true,
  });

  const [editingId, setEditingId] = useState(null);

  // Fetch books
  const fetchBooks = async () => {
    const res = await fetch("http://localhost:5000/books");
    const data = await res.json();
    setBooks(data);
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  // Handle input
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  // Add or Update
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (editingId) {
      // UPDATE
      await fetch(`http://localhost:5000/books/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setEditingId(null);
    } else {
      // ADD
      await fetch("http://localhost:5000/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }

    setForm({
      CategoryID: "",
      Title: "",
      ISBN: "",
      PublicationDate: "",
      AvailableCopies: "",
      IsBorrowable: true,
    });

    fetchBooks();
  };

  // Delete
  const handleDelete = async (id) => {
    await fetch(`http://localhost:5000/books/${id}`, {
      method: "DELETE",
    });
    fetchBooks();
  };

  // Edit
  const handleEdit = (book) => {
    setForm(book);
    setEditingId(book.BookID);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>📚 Book Management</h1>

      <form onSubmit={handleSubmit}>
        <input name="CategoryID" placeholder="CategoryID" value={form.CategoryID} onChange={handleChange} required />
        <input name="Title" placeholder="Title" value={form.Title} onChange={handleChange} required />
        <input name="ISBN" placeholder="ISBN" value={form.ISBN} onChange={handleChange} required />
        <input name="PublicationDate" type="date" value={form.PublicationDate} onChange={handleChange} />
        <input name="AvailableCopies" placeholder="Copies" value={form.AvailableCopies} onChange={handleChange} required />

        <button type="submit">
          {editingId ? "Update Book" : "Add Book"}
        </button>
      </form>

      <hr />

      <table border="1" cellPadding="10">
        <thead>
          <tr>
            <th>Title</th>
            <th>ISBN</th>
            <th>Copies</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {books.map((book) => (
            <tr key={book.BookID}>
              <td>{book.Title}</td>
              <td>{book.ISBN}</td>
              <td>{book.AvailableCopies}</td>
              <td>
                <button onClick={() => handleEdit(book)}>Edit</button>
                <button onClick={() => handleDelete(book.BookID)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default BookManagement;
