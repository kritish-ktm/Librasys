/*
  LoanedBook API service layer.
  This file is the single frontend place that knows the loan API URLs. React
  pages/components call these helper functions instead of repeating axios calls
  everywhere.
*/
import axios from "axios";

const API_URL = "http://localhost:5000/loans";
const REQUEST_TIMEOUT_MS = 15000;

const loanApi = axios.create({
  timeout: REQUEST_TIMEOUT_MS,
});

/*
  Protected loan routes need the JWT token. Librarian routes use it to prove the
  user has the Librarian role, and member routes use it to identify whose
  "My Loans" records or return request is being handled.
*/
const authConfig = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});

// ===== GET LOANS WITH FILTERS =====
/*
  Loads the librarian loan table.
  The query parameters match the table controls: keyword search, status tab,
  borrowed date range, current page, and page size.
*/
export const getLoans = async ({
  search = "",
  status = "all",
  borrowedFrom = "",
  borrowedTo = "",
  page = 1,
  limit = 10,
} = {}) => {
  const response = await loanApi.get(API_URL, {
    params: { search, status, borrowedFrom, borrowedTo, page, limit },
    ...authConfig(),
  });
  return response.data;
};

// ===== OLD FORM OPTIONS =====
// Kept for compatibility with older form code; the current UI prefers search APIs.
export const getLoanOptions = async () => {
  const response = await loanApi.get(`${API_URL}/options`, authConfig());
  return response.data;
};

// ===== SEARCH MEMBERS =====
// Returns a small list of matching active members for the searchable member input.
export const searchLoanUsers = async (query) => {
  const response = await loanApi.get(`${API_URL}/search/users`, {
    params: { q: query },
    ...authConfig(),
  });
  return response.data;
};

// ===== SEARCH BOOKS =====
// Returns a small list of matching borrowable books for the searchable book input.
export const searchLoanBooks = async (query) => {
  const response = await loanApi.get(`${API_URL}/search/books`, {
    params: { q: query },
    ...authConfig(),
  });
  return response.data;
};

// ===== GET ONE LOAN =====
// Used before opening the edit modal so the modal has fresh loan details.
export const getLoanById = async (id) => {
  const response = await loanApi.get(`${API_URL}/${id}`, authConfig());
  return response.data;
};

// ===== GET USER LOANS =====
// Librarian lookup for a selected member's loan history.
export const getLoansByUser = async (userId) => {
  const response = await loanApi.get(`${API_URL}/user/${userId}`, authConfig());
  return response.data;
};

// ===== GET OVERDUE LOANS =====
// Librarian overdue list. Overdue means not returned and past the due date.
export const getOverdueLoans = async () => {
  const response = await loanApi.get(`${API_URL}/user/overdue`, authConfig());
  return response.data;
};

// ===== MEMBER: MY LOANS =====
// Member page data. The backend reads the member id from the JWT token.
export const getMyLoans = async () => {
  const response = await loanApi.get(`${API_URL}/me`, authConfig());
  return response.data;
};

// ===== CREATE LOAN =====
// Librarian creates a loan for a selected member and book.
export const addLoan = async (loanData) => {
  const response = await loanApi.post(API_URL, loanData, authConfig());
  return response.data;
};

// ===== MEMBER BORROW BOOK =====
// Member borrows directly from the Book Detail page.
export const borrowBook = async (bookId) => {
  const response = await loanApi.post(
    `${API_URL}/me`,
    { BookID: bookId },
    authConfig()
  );
  return response.data;
};

// ===== UPDATE LOAN =====
// Librarian saves corrections from the edit loan modal.
export const updateLoan = async (id, loanData) => {
  const response = await loanApi.put(`${API_URL}/${id}`, loanData, authConfig());
  return response.data;
};

// ===== RETURN BOOK =====
// Librarian marks any managed loan as returned.
export const returnLoan = async (id) => {
  const response = await loanApi.put(`${API_URL}/${id}/return`, {}, authConfig());
  return response.data;
};

// ===== MEMBER RETURN BOOK =====
// Member marks only their own loan as returned.
export const returnMyLoan = async (id) => {
  const response = await loanApi.put(`${API_URL}/me/${id}/return`, {}, authConfig());
  return response.data;
};

// ===== DELETE LOAN =====
// Librarian deletes an incorrect returned loan record.
export const deleteLoan = async (id) => {
  const response = await loanApi.delete(`${API_URL}/${id}`, authConfig());
  return response.data;
};
