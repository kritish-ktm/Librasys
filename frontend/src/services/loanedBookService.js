import axios from "axios";

const API_URL = "http://localhost:5000/loans";

const authConfig = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});

// ===== GET LOANS WITH FILTERS =====
export const getLoans = async ({
  search = "",
  status = "all",
  borrowedFrom = "",
  borrowedTo = "",
  page = 1,
  limit = 10,
} = {}) => {
  const response = await axios.get(API_URL, {
    params: { search, status, borrowedFrom, borrowedTo, page, limit },
  });
  return response.data;
};

// ===== OLD FORM OPTIONS =====
export const getLoanOptions = async () => {
  const response = await axios.get(`${API_URL}/options`);
  return response.data;
};

// ===== SEARCH MEMBERS =====
export const searchLoanUsers = async (query) => {
  const response = await axios.get(`${API_URL}/search/users`, {
    params: { q: query },
  });
  return response.data;
};

// ===== SEARCH BOOKS =====
export const searchLoanBooks = async (query) => {
  const response = await axios.get(`${API_URL}/search/books`, {
    params: { q: query },
  });
  return response.data;
};

// ===== GET ONE LOAN =====
export const getLoanById = async (id) => {
  const response = await axios.get(`${API_URL}/${id}`);
  return response.data;
};

// ===== GET USER LOANS =====
export const getLoansByUser = async (userId) => {
  const response = await axios.get(`${API_URL}/user/${userId}`);
  return response.data;
};

// ===== GET OVERDUE LOANS =====
export const getOverdueLoans = async () => {
  const response = await axios.get(`${API_URL}/user/overdue`);
  return response.data;
};

// ===== MEMBER: MY LOANS =====
export const getMyLoans = async () => {
  const response = await axios.get(`${API_URL}/me`, authConfig());
  return response.data;
};

// ===== CREATE LOAN =====
export const addLoan = async (loanData) => {
  const response = await axios.post(API_URL, loanData);
  return response.data;
};

// ===== MEMBER BORROW BOOK =====
export const borrowBook = async (bookId) => {
  const response = await axios.post(
    `${API_URL}/me`,
    { BookID: bookId },
    authConfig()
  );
  return response.data;
};

// ===== UPDATE LOAN =====
export const updateLoan = async (id, loanData) => {
  const response = await axios.put(`${API_URL}/${id}`, loanData);
  return response.data;
};

// ===== RETURN BOOK =====
export const returnLoan = async (id) => {
  const response = await axios.put(`${API_URL}/${id}/return`);
  return response.data;
};

// ===== MEMBER RETURN BOOK =====
export const returnMyLoan = async (id) => {
  const response = await axios.put(`${API_URL}/me/${id}/return`, {}, authConfig());
  return response.data;
};

// ===== DELETE LOAN =====
export const deleteLoan = async (id) => {
  const response = await axios.delete(`${API_URL}/${id}`);
  return response.data;
};
