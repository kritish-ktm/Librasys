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
import CustomerBookCategories from './pages/CustomerBookCategories';
import LandingPage from './pages/LandingPage';
import MemberLogin from './pages/MemberLogin';
import AdminLogin from './pages/AdminLogin';
import MemberDashboard from './pages/MemberDashboard';
import MyLoans from './pages/MyLoans';
import BookDetail from './pages/BookDetail';

function PrivateRoute({ children, role }) {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  if (!token) return <Navigate to="/login" />;

  if (role && userRole !== role) {
    return <Navigate to="/login" />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* PUBLIC ROUTES */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/member-login" element={<MemberLogin />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/MemberDashboard" element={<MemberDashboard />} />      
        <Route path="/register" element={<Register />} />
        <Route
          path="/browse-categories"
          element={<CustomerBookCategories />}
        />
        <Route path="/book/:id" element={<BookDetail />} />

        {/* USER ROUTES */}
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />

        <Route
          path="/my-loans"
          element={
            <PrivateRoute role="Member">
              <MyLoans />
            </PrivateRoute>
          }
        />

        {/* LIBRARIAN ROUTES */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute role="Librarian">
              <Dashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/users"
          element={
            <PrivateRoute role="Librarian">
              <UserManagement />
            </PrivateRoute>
          }
        />

        <Route
          path="/books"
          element={
            <PrivateRoute role="Librarian">
              <BookManagement />
            </PrivateRoute>
          }
        />

        <Route
          path="/categories"
          element={
            <PrivateRoute role="Librarian">
              <BookCategoryManagement />
            </PrivateRoute>
          }
        />

        <Route
          path="/loans"
          element={
            <PrivateRoute role="Librarian">
              <LoanedBookManagement />
            </PrivateRoute>
          }
        />

        <Route
          path="/fines"
          element={
            <PrivateRoute role="Librarian">
              <FineManagement />
            </PrivateRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
