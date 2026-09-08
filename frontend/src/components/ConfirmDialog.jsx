import Modal from './Modal';

/**
 * Diálogo de confirmación liviano (sin libs).
 * props:
 *  isOpen, title, message (string|node), confirmLabel, cancelLabel,
 *  variant: 'danger' | 'primary', loading, onConfirm, onCancel
 */
export default function ConfirmDialog({
  isOpen,
  title = 'Confirmar',
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Volver',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) {
  const confirmClass =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
      : 'bg-primary hover:bg-primary-dark focus:ring-primary';

  return (
    <Modal isOpen={isOpen} title={title} onClose={loading ? undefined : onCancel} size="sm">
      <div className="space-y-5">
        {typeof message === 'string' ? (
          <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600 sm:text-base">
            {message}
          </p>
        ) : (
          <div className="text-sm leading-relaxed text-gray-600 sm:text-base">{message}</div>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-600 text-ink transition hover:bg-gray-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-md px-5 py-2.5 text-sm font-600 text-white transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${confirmClass}`}
          >
            {loading ? 'Procesando…' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
