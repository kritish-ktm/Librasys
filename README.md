# LibraSys

LibraSys is a full-stack library management system built with React, Node.js, Express, and MySQL. It provides a practical workflow for managing library books, categories, members, loans, fines, authentication, and member-facing library activity.

The project is structured as a separate frontend and backend application, with SQL schema files, automated tests, and supporting portfolio evidence included in the repository.

## Features

- User registration and login with JWT-based authentication
- Admin and member login flows
- Member/user management
- Book management with searchable book data
- Book category management with uploaded category images
- Loaned book tracking
- Fine management and daily fine configuration
- Member dashboard with personal loans and fines
- MySQL database schema and seed data
- Automated backend test coverage for user and book validation workflows
- Portfolio evidence files and screenshots for assessment submission

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, Vite, React Router, Axios, Bootstrap, Bootstrap Icons, Lucide React |
| Backend | Node.js, Express.js |
| Database | MySQL / MariaDB using XAMPP and phpMyAdmin |
| Authentication | JSON Web Tokens, bcrypt |
| Testing | Node test runner, Supertest, Jest dependencies |

## Project Structure

```text
Librasys/
|-- backend/
|   |-- config/              # Database connection
|   |-- controllers/         # Express controller logic
|   |-- database/            # SQL schema and seed files
|   |-- middleware/          # Auth and error middleware
|   |-- models/              # Data access models
|   |-- modules/             # Feature modules
|   |-- routes/              # API route definitions
|   |-- tests/               # Automated tests and evidence SQL
|   |-- uploads/             # Uploaded assets
|   `-- index.js             # Backend entry point
|-- frontend/
|   |-- public/
|   |-- src/
|   |   |-- assets/
|   |   |-- components/
|   |   |-- pages/
|   |   |-- services/
|   |   `-- main.jsx
|   `-- vite.config.js
|-- Test Script and Evidence/
|-- package.json
`-- README.md
```

## Prerequisites

Install the following before running the project:

- Node.js and npm
- XAMPP, with Apache and MySQL services available
- phpMyAdmin or another MySQL client
- Git

## Getting Started

Clone the repository:

```bash
git clone https://github.com/kritish-ktm/Librasys.git
cd Librasys
```

Install backend dependencies:

```bash
cd backend
npm install
```

Install frontend dependencies:

```bash
cd ../frontend
npm install
```

## Environment Configuration

Create a backend environment file from the example:

```bash
cd backend
cp .env.example .env
```

Default local configuration:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=librasys
DB_CONNECTION_LIMIT=10
JWT_SECRET=replace-with-a-long-random-secret
DAILY_FINE_RATE=1
DB_LOG_QUERIES=false
```

For production or shared environments, replace `JWT_SECRET` with a strong private value and avoid committing `.env` files.

## Database Setup

1. Start Apache and MySQL from the XAMPP control panel.
2. Open phpMyAdmin.
3. Create a database named `librasys`.
4. Import the schema file:

```text
backend/database/schema.sql
```

5. Optionally import seed data:

```text
backend/database/seed.sql
```

The default local MySQL credentials are:

```text
Host: localhost
User: root
Password: blank
Database: librasys
```

## Running the Application

Start the backend API:

```bash
cd backend
npm start
```

The backend runs on:

```text
http://localhost:5000
```

Start the frontend development server in a second terminal:

```bash
cd frontend
npm run dev
```

Vite will print the local frontend URL, usually:

```text
http://localhost:5173
```

## Available Scripts

Backend scripts:

```bash
npm start      # Start the Express server
npm run dev    # Start the server with nodemon
npm test       # Run backend automated tests and write test-output.txt
```

Frontend scripts:

```bash
npm run dev      # Start the Vite development server
npm run build    # Build the frontend for production
npm run preview  # Preview the production build
npm run lint     # Run ESLint
```

## API Overview

The backend exposes routes for the main library workflows:

| Route | Purpose |
| --- | --- |
| `/api/auth` | Login and registration |
| `/api/users` | User and member management |
| `/books` | Book management |
| `/categories` | Book category management |
| `/loans` and `/api/loans` | Loaned book management |
| `/fines` and `/api/fines` | Fine management |
| `/uploads` | Static access to uploaded assets |

## Testing

Run backend tests from the backend directory:

```bash
cd backend
npm test
```

The test script writes output to:

```text
backend/test-output.txt
```

Additional test scripts and evidence are stored in:

```text
backend/tests/
Test Script and Evidence/
```

## Portfolio Evidence

This repository includes portfolio evidence for the LibraSys project, including:

- Automated test scripts
- Test output files
- Evidence screenshots
- Database evidence SQL
- User management test coverage
- Book validation test coverage

Evidence files are located in:

```text
Test Script and Evidence/
backend/tests/
```

## Author

Udaya Bahadur Katuwal

P Number: P2893808

Team: LibraSys

Individual Component: User Management / Member Management

## Repository

GitHub: [https://github.com/kritish-ktm/Librasys](https://github.com/kritish-ktm/Librasys)
