import axios from "axios";

const API_URL = "http://localhost:5000/loans";

const authConfig = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});

export const getLoans = async ({ search = "", status = "all" } = {}) => {
  const response = await axios.get(API_URL, {
    params: { search, status },
  });
  return response.data;
};

export const getLoanOptions = async () => {
  const response = await axios.get(`${API_URL}/options`);
  return response.data;
};

export const getLoanById = async (id) => {
  const response = await axios.get(`${API_URL}/${id}`);
  return response.data;
};

export const getLoansByUser = async (userId) => {
  const response = await axios.get(`${API_URL}/user/${userId}`);
  return response.data;
};

export const getOverdueLoans = async () => {
  const response = await axios.get(`${API_URL}/user/overdue`);
  return response.data;
};

export const getMyLoans = async () => {
  const response = await axios.get(`${API_URL}/me`, authConfig());
  return response.data;
};

export const addLoan = async (loanData) => {
  const response = await axios.post(API_URL, loanData);
  return response.data;
};

export const borrowBook = async (bookId) => {
  const response = await axios.post(
    `${API_URL}/me`,
    { BookID: bookId },
    authConfig()
  );
  return response.data;
};

export const updateLoan = async (id, loanData) => {
  const response = await axios.put(`${API_URL}/${id}`, loanData);
  return response.data;
};

export const returnLoan = async (id) => {
  const response = await axios.put(`${API_URL}/${id}/return`);
  return response.data;
};

export const returnMyLoan = async (id) => {
  const response = await axios.put(`${API_URL}/me/${id}/return`, {}, authConfig());
  return response.data;
};

export const deleteLoan = async (id) => {
  const response = await axios.delete(`${API_URL}/${id}`);
  return response.data;
};
