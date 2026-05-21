/*
  Book Detail page.
  Most of this page belongs to the book module, but it connects to Arun's
  LoanedBook workflow through BorrowButton. After a successful borrow,
  BorrowButton calls loadBook again so the displayed available copy count stays
  up to date.
*/
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BorrowButton from "../components/BorrowButton";
import { getBookById } from "../services/bookService";
import "./BookDetail.css";

function BookDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /*
    Loads the selected book record from the book API. The same function is
    passed to BorrowButton as onBorrowed, so after a member borrows the book the
    page reloads the book data and reflects the reduced AvailableCopies value.
  */
  const loadBook = async () => {
    setLoading(true);

    try {
      const data = await getBookById(id);
      setBook(data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Unable to load this book.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBook();
  }, [id]);

  return (
    <main className="book-detail-page">
      <section className="book-detail-header">
        <button type="button" className="book-detail-back" onClick={() => navigate(-1)}>
          Back
        </button>

        <div>
          <p className="book-detail-kicker">Book Detail</p>
          <h1>{book?.Title || "Library Book"}</h1>
        </div>
      </section>

      {loading ? (
        <section className="book-detail-panel">Loading book...</section>
      ) : error ? (
        <section className="book-detail-panel error">{error}</section>
      ) : (
        <section className="book-detail-panel">
          <div className="book-detail-main">
            <div>
              <p className="book-detail-kicker">{book.CategoryName || "Uncategorised"}</p>
              <h2>{book.Title}</h2>

              <dl className="book-detail-list">
                <div>
                  <dt>ISBN</dt>
                  <dd>{book.ISBN}</dd>
                </div>

                <div>
                  <dt>Publication Date</dt>
                  <dd>{formatDate(book.PublicationDate)}</dd>
                </div>

                <div>
                  <dt>Borrowing Status</dt>
                  <dd>{book.IsBorrowable ? "Borrowable" : "Locked"}</dd>
                </div>
              </dl>
            </div>

            {/* Connects Book Detail to the member self-borrowing LoanedBook flow. */}
            <BorrowButton book={book} onBorrowed={loadBook} />
          </div>
        </section>
      )}
    </main>
  );
}

function formatDate(value) {
  if (!value) return "Not recorded";
  return String(value).split("T")[0];
}

export default BookDetail;
