import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { borrowBook } from "../services/loanedBookService";
import "./BorrowButton.css";

function BorrowButton({ book, onBorrowed }) {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isBorrowing, setIsBorrowing] = useState(false);

  const role = localStorage.getItem("role");
  const token = localStorage.getItem("token");
  const availableCopies = Number(book?.AvailableCopies || 0);
  const canBorrow = Boolean(book?.IsBorrowable) && availableCopies > 0;

  const handleBorrow = async () => {
    setMessage("");
    setError("");

    if (!token) {
      navigate("/login");
      return;
    }

    if (role !== "Member") {
      setError("Only members can borrow books.");
      return;
    }

    if (!canBorrow) {
      setError("This book is not currently available to borrow.");
      return;
    }

    setIsBorrowing(true);

    try {
      await borrowBook(book.BookID);
      setMessage("Book borrowed successfully. Due date is set for 14 days.");
      onBorrowed?.();
    } catch (err) {
      setError(err.response?.data?.error || "Unable to borrow this book.");
    } finally {
      setIsBorrowing(false);
    }
  };

  return (
    <div className="borrow-box">
      <button
        type="button"
        className="borrow-button"
        disabled={isBorrowing || !canBorrow}
        onClick={handleBorrow}
      >
        {isBorrowing ? "Borrowing..." : "Borrow Book"}
      </button>

      <span className={canBorrow ? "borrow-stock available" : "borrow-stock unavailable"}>
        {canBorrow ? `${availableCopies} available` : "Unavailable"}
      </span>

      {message && <p className="borrow-message success">{message}</p>}
      {error && <p className="borrow-message error">{error}</p>}
    </div>
  );
}

export default BorrowButton;
