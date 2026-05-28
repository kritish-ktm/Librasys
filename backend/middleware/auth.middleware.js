const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "librasys-local-dev-secret";

function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Login required" });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired login" });
  }
}

function requireLibrarian(req, res, next) {
  if (req.user?.role !== "Librarian") {
    return res.status(403).json({ error: "Librarian access required" });
  }

  next();
}

module.exports = { auth, requireLibrarian };
