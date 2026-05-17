import "./LoadingOverlay.css";

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
