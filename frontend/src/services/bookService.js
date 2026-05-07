import axios from "axios";

// Book API base URL.
// The backend server runs on port 5000.
const API_URL = "http://localhost:5000/books";

// List all books from the backend.
export const getBooks = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

export const getBookById = async (id) => {
  const response = await axios.get(`${API_URL}/${id}`);
  return response.data;
};

// Add a new book record.
export const addBook = async (bookData) => {
  const response = await axios.post(API_URL, bookData);
  return response.data;
};

// Update an existing book by BookID.
export const updateBook = async (id, bookData) => {
  const response = await axios.put(`${API_URL}/${id}`, bookData);
  return response.data;
};

// Delete a book by BookID.
export const deleteBook = async (id) => {
  const response = await axios.delete(`${API_URL}/${id}`);
  return response.data;
};
