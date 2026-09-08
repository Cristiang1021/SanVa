import { useCallback, useRef, useState } from 'react';
import ConfirmDialog from './ConfirmDialog';

/**
 * Reemplazo liviano de window.confirm.
 * Uso: const { askConfirm, confirmDialog } = useConfirmDialog();
 *      if (!(await askConfirm({ title, message, ... }))) return;
 *      ...
 *      {confirmDialog}
 */
export function useConfirmDialog() {
  const [opts, setOpts] = useState(null);
  const [loading, setLoading] = useState(false);
  const resolver = useRef(null);

  const close = useCallback((value) => {
    setLoading(false);
    setOpts(null);
    resolver.current?.(value);
    resolver.current = null;
  }, []);

  const askConfirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolver.current = resolve;
      setLoading(false);
      setOpts({
        title: 'Confirmar',
        message: '',
        confirmLabel: 'Confirmar',
        cancelLabel: 'Volver',
        variant: 'danger',
        ...options,
      });
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    if (opts?.onConfirmAsync) {
      try {
        setLoading(true);
        await opts.onConfirmAsync();
        close(true);
      } catch {
        setLoading(false);
      }
      return;
    }
    close(true);
  }, [opts, close]);

  const confirmDialog = opts ? (
    <ConfirmDialog
      isOpen
      title={opts.title}
      message={opts.message}
      confirmLabel={opts.confirmLabel}
      cancelLabel={opts.cancelLabel}
      variant={opts.variant}
      loading={loading}
      onConfirm={handleConfirm}
      onCancel={() => close(false)}
    />
  ) : null;

  return { askConfirm, confirmDialog };
}
