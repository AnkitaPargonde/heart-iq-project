export default function ErrorBanner({ message, onDismiss, onRetry }) {
  if (!message) {
    return null;
  }

  return (
    <div className="error-banner" role="alert">
      <div>
        <strong>Analysis error</strong>
        <p>{message}</p>
      </div>
      <div className="error-banner-actions">
        <button type="button" className="error-banner-button" onClick={onRetry}>
          Retry
        </button>
        <button type="button" className="error-banner-button subtle" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
