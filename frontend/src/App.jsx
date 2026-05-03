import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import BookManagement from './pages/BookManagement';
import BookCategoryManagement from './pages/BookCategoryManagement';
import LoanedBookManagement from './pages/LoanedBookManagement';
import FineManagement from './pages/FineManagement';

function PrivateRoute({ children, role }) {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');
  if (!token) return <Navigate to="/" />;
  if (role && userRole !== role) return <Navigate to="/" />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/dashboard" element={<PrivateRoute role="Librarian"><Dashboard /></PrivateRoute>} />
        <Route path="/users" element={<PrivateRoute role="Librarian"><UserManagement /></PrivateRoute>} />
        <Route path="/books" element={<PrivateRoute role="Librarian"><BookManagement /></PrivateRoute>} />
        <Route path="/categories" element={<PrivateRoute role="Librarian"><BookCategoryManagement /></PrivateRoute>} />
        <Route path="/loans" element={<PrivateRoute role="Librarian"><LoanedBookManagement /></PrivateRoute>} />
        <Route path="/fines" element={<PrivateRoute role="Librarian"><FineManagement /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;