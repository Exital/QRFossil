export default function Toast({ message, kind = "info" }) {
  if (!message) return null;

  const colors = {
    info: "bg-inverse-surface text-inverse-on-surface border-outline-variant",
    error: "bg-error-container text-on-error-container border-error/30",
    success: "bg-active-bg text-active-text border-active-border",
  };

  return (
    <div
      className={`toast-enter fixed bottom-gutter right-gutter z-[100] max-w-sm rounded-lg border px-md py-sm text-body-sm shadow-card ${colors[kind] || colors.info}`}
      role="status"
    >
      {message}
    </div>
  );
}
