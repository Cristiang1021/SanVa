export default function Modal({ isOpen, title, children, onClose, size = 'md' }) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className={`bg-white rounded-lg shadow-xl ${sizeClasses[size] || sizeClasses.md} w-full max-h-[90vh] flex flex-col`}
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-xl font-bold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto min-h-0">{children}</div>
      </div>
    </div>
  );
}
