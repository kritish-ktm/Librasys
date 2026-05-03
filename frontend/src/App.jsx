import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import BookManagement from './pages/BookManagement';
import BookCategoryManagement from './pages/BookCategoryManagement';
import LoanedBookManagement from './pages/LoanedBookManagement';
import FineManagement from './pages/FineManagement';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/books" element={<BookManagement />} />
        <Route path="/categories" element={<BookCategoryManagement />} />
        <Route path="/loans" element={<LoanedBookManagement />} />
        <Route path="/fines" element={<FineManagement />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;