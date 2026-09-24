export default function ConfirmModal({ open, title, body, action, danger, onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-inverse-surface/60 p-md backdrop-blur-sm"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-card"
        role="dialog"
        aria-labelledby="confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className="text-headline-sm text-on-surface">
          {title}
        </h2>
        <p className="mt-sm text-body-sm text-on-surface-variant">{body}</p>
        <div className="mt-md flex flex-wrap justify-end gap-sm">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-outline-variant px-md py-xs text-body-sm transition-colors hover:bg-surface-container-low"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-md py-xs text-body-sm shadow-sm transition-opacity hover:opacity-90 ${
              danger ? "bg-error text-on-error" : "bg-primary text-on-primary"
            }`}
          >
            {action}
          </button>
        </div>
      </div>
    </div>
  );
}
