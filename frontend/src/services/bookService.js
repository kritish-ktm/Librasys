import axios from "axios";

const API_URL = "http://localhost:5000/books";

// SYSTEM FUNCTION: Get Auth Header
// Reads the login token from localStorage and prepares it for protected backend routes.
const getAuthHeader = () => {
  const token = localStorage.getItem("token");

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

// SYSTEM FUNCTION: Get Books
// Gets all book records from the backend.
export const getBooks = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

// SYSTEM FUNCTION: Get Book By ID
// Gets one specific book record from the backend.
export const getBookById = async (id) => {
  const response = await axios.get(`${API_URL}/${id}`);
  return response.data;
};

// SYSTEM FUNCTION: Add Book
// Sends a new book record to the backend.
export const addBook = async (bookData) => {
  const response = await axios.post(API_URL, bookData, getAuthHeader());
  return response.data;
};

// SYSTEM FUNCTION: Update Book
// Sends updated book details to the backend.
export const updateBook = async (id, bookData) => {
  const response = await axios.put(`${API_URL}/${id}`, bookData, getAuthHeader());
  return response.data;
};

// SYSTEM FUNCTION: Delete Book
// Sends the delete request with the login token.
// This fixes the "Login required" issue because the backend DELETE route is protected.
export const deleteBook = async (id) => {
  const response = await axios.delete(`${API_URL}/${id}`, getAuthHeader());
  return response.data;
};