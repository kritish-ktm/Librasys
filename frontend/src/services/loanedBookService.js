import axios from "axios";

const API_URL = "/loans";

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

export const addLoan = async (loanData) => {
  const response = await axios.post(API_URL, loanData);
  return response.data;
};

export const updateLoan = async (id, loanData) => {
  const response = await axios.put(`${API_URL}/${id}`, loanData);
  return response.data;
};

export const returnLoan = async (id) => {
  const response = await axios.patch(`${API_URL}/${id}/return`);
  return response.data;
};

export const deleteLoan = async (id) => {
  const response = await axios.delete(`${API_URL}/${id}`);
  return response.data;
};
