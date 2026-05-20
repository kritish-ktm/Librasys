/*
  Reusable LoanedBook loading overlay component.
  The librarian loan page uses this instead of browser-default waiting behavior
  so long-running actions such as fetching, saving, returning, and deleting feel
  consistent with the custom modal UI.
*/
import "./LoadingOverlay.css";

/*
  When show is false, nothing is mounted. When show is true, the overlay covers
  the page with a backdrop and a centered card containing the current action
  message.
*/
function LoadingOverlay({ show, message = "Loading...", subtext = "Please wait..." }) {
  if (!show) return null;

  return (
    <div className="loading-overlay" role="status" aria-live="polite" aria-label={message}>
      <div className="loading-card">
        <span className="loading-spinner" aria-hidden="true" />
        <strong>{message}</strong>
        {subtext && <small>{subtext}</small>}
      </div>
    </div>
  );
}

export default LoadingOverlay;
