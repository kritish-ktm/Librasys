import axios from "axios";

const API_URL = "http://localhost:5000/categories";

const authConfig = () => {
  const token = localStorage.getItem("token");
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export const getCategories = async (params = {}) => {
  const response = await axios.get(API_URL, { ...authConfig(), params });
  return response.data;
};

export const getActiveCategories = async () => {
  const response = await axios.get(`${API_URL}/active`);
  return response.data;
};

export const getCategoryById = async (id) => {
  const response = await axios.get(`${API_URL}/${id}`, authConfig());
  return response.data;
};

export const getCategoryBooks = async (id) => {
  const response = await axios.get(`${API_URL}/${id}/books`, authConfig());
  return response.data;
};

export const addCategory = async (data) => {
  const response = await axios.post(API_URL, data, authConfig());
  return response.data;
};

export const updateCategory = async (id, data) => {
  const response = await axios.put(`${API_URL}/${id}`, data, authConfig());
  return response.data;
};

export const deleteCategory = async (id) => {
  const response = await axios.delete(`${API_URL}/${id}`, authConfig());
  return response.data;
};

export const getMostBorrowedBooks = () =>
  axios.get("/api/categories/most-borrowed")

export const toggleCategoryStatus = async (id, isActive) => {
  const response = await axios.put(`${API_URL}/${id}/status`, { IsActive: isActive }, authConfig());
  return response.data;
};
