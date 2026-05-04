# LibraSys

A Library Management System built with React (frontend) and Express.js (backend), using MySQL as the database.

## Architecture

- **Frontend**: React + Vite, runs on port 5000 (0.0.0.0)
- **Backend**: Express.js, runs on port 3001 (localhost)
- **Database**: MySQL (external — configure via environment variables)

## Project Structure

```
/
├── frontend/          # React + Vite SPA
│   ├── src/
│   │   ├── pages/     # Login, Register, Dashboard, Profile, BookManagement, etc.
│   │   ├── services/  # Axios API service files (use relative URLs via Vite proxy)
│   │   └── App.jsx    # Routes (BrowserRouter with PrivateRoute guards)
│   └── vite.config.js # Proxies /api, /books, /categories, /loans, /fines → backend
│
└── backend/           # Express.js REST API
    ├── config/db.js   # MySQL connection pool
    ├── routes/        # Auth, Users (bookRoutes, auth, userRoutes)
    ├── controllers/   # bookController, userController, etc.
    ├── models/        # userModel
    ├── middleware/    # auth.middleware, error.middleware
    └── modules/       # book, bookCategory, fine, loan (module folders)
```

## Workflows

- **Start application** — `cd frontend && npm run dev` (port 5000, webview)
- **Backend API** — `cd backend && node index.js` (port 3001, console)

## Database Setup

The backend connects to MySQL using environment variables. Set these secrets:

| Variable      | Description              |
|---------------|--------------------------|
| `DB_HOST`     | MySQL server hostname    |
| `DB_USER`     | MySQL username           |
| `DB_PASSWORD` | MySQL password           |
| `DB_NAME`     | Database name (librasys) |
| `JWT_SECRET`  | JWT signing secret       |
| `PORT`        | Backend port (default 3001) |

## Key Features

- **Authentication**: JWT-based login/register with role-based access (Librarian / Member)
- **Book Management**: CRUD for books with ISBN validation and borrowable flag
- **Book Categories**: Dewey Decimal classification system
- **User Management**: Activate/deactivate users, profile editing
- **Loans & Fines**: Pages exist (stub/coming soon)

## Frontend API Calls

All frontend API calls use relative URLs (e.g., `/api/auth/login`) which Vite proxies to the backend on port 3001. No hardcoded `localhost` URLs.

## Deployment

Configured as autoscale deployment:
- **Build**: `cd frontend && npm install && npm run build`
- **Run**: Backend on port 3001 + frontend preview on port 5000
- Requires MySQL environment variables to be set as Replit secrets for production
