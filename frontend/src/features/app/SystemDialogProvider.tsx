import React from 'react';
import { AlertCircle, CheckCircle2, HelpCircle, Info, X, XCircle } from 'lucide-react';

type DialogVariant = 'info' | 'success' | 'warning' | 'danger' | 'error';

type AlertOptions = {
  title?: string;
  message: string;
  variant?: DialogVariant;
};

type ConfirmOptions = AlertOptions & {
  confirmLabel?: string;
  cancelLabel?: string;
};

type ActiveDialog = (AlertOptions & {
  type: 'alert';
  resolve: () => void;
}) | (ConfirmOptions & {
  type: 'confirm';
  resolve: (confirmed: boolean) => void;
});

interface SystemDialogContextValue {
  alert: (options: AlertOptions | string) => Promise<void>;
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

const SystemDialogContext = React.createContext<SystemDialogContextValue | null>(null);

const variantStyles: Record<DialogVariant, { icon: React.ReactNode; iconClass: string; buttonClass: string; title: string }> = {
  info: {
    icon: <Info size={22} />,
    iconClass: 'border-sky-400/30 bg-sky-500/15 text-sky-200',
    buttonClass: 'border-sky-500/40 bg-sky-500/20 text-sky-100 hover:bg-sky-500/30',
    title: 'Thông báo',
  },
  success: {
    icon: <CheckCircle2 size={22} />,
    iconClass: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200',
    buttonClass: 'border-emerald-500/40 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30',
    title: 'Thành công',
  },
  warning: {
    icon: <AlertCircle size={22} />,
    iconClass: 'border-amber-400/30 bg-amber-500/15 text-amber-200',
    buttonClass: 'border-amber-500/40 bg-amber-500/20 text-amber-100 hover:bg-amber-500/30',
    title: 'Cần xác nhận',
  },
  danger: {
    icon: <XCircle size={22} />,
    iconClass: 'border-red-400/30 bg-red-500/15 text-red-200',
    buttonClass: 'border-red-500/40 bg-red-500/20 text-red-100 hover:bg-red-500/30',
    title: 'Xác nhận thao tác',
  },
  error: {
    icon: <XCircle size={22} />,
    iconClass: 'border-red-400/30 bg-red-500/15 text-red-200',
    buttonClass: 'border-red-500/40 bg-red-500/20 text-red-100 hover:bg-red-500/30',
    title: 'Có lỗi xảy ra',
  },
};

function normalizeAlertOptions(options: AlertOptions | string): AlertOptions {
  return typeof options === 'string' ? { message: options } : options;
}

function normalizeConfirmOptions(options: ConfirmOptions | string): ConfirmOptions {
  return typeof options === 'string' ? { message: options } : options;
}

export const SystemDialogProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [activeDialog, setActiveDialog] = React.useState<ActiveDialog | null>(null);
  const queueRef = React.useRef<ActiveDialog[]>([]);

  const showNextDialog = React.useCallback(() => {
    setActiveDialog(current => current ?? queueRef.current.shift() ?? null);
  }, []);

  const enqueueDialog = React.useCallback((dialog: ActiveDialog) => {
    queueRef.current.push(dialog);
    showNextDialog();
  }, [showNextDialog]);

  const alert = React.useCallback<SystemDialogContextValue['alert']>((options) => {
    const normalized = normalizeAlertOptions(options);
    return new Promise<void>(resolve => {
      enqueueDialog({
        type: 'alert',
        variant: normalized.variant ?? 'info',
        title: normalized.title,
        message: normalized.message,
        resolve,
      });
    });
  }, [enqueueDialog]);

  const confirm = React.useCallback<SystemDialogContextValue['confirm']>((options) => {
    const normalized = normalizeConfirmOptions(options);
    return new Promise<boolean>(resolve => {
      enqueueDialog({
        type: 'confirm',
        variant: normalized.variant ?? 'warning',
        title: normalized.title,
        message: normalized.message,
        confirmLabel: normalized.confirmLabel,
        cancelLabel: normalized.cancelLabel,
        resolve,
      });
    });
  }, [enqueueDialog]);

  const closeDialog = React.useCallback((confirmed?: boolean) => {
    setActiveDialog(current => {
      if (!current) return null;

      if (current.type === 'confirm') {
        current.resolve(Boolean(confirmed));
      } else {
        current.resolve();
      }

      return queueRef.current.shift() ?? null;
    });
  }, []);

  const contextValue = React.useMemo(() => ({ alert, confirm }), [alert, confirm]);
  const variant = activeDialog?.variant ?? 'info';
  const styles = variantStyles[variant];

  return (
    <SystemDialogContext.Provider value={contextValue}>
      {children}
      {activeDialog && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          onClick={() => closeDialog(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/95 shadow-2xl shadow-black/35 animate-in fade-in zoom-in-95 duration-150"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-start gap-4 border-b border-slate-800 p-5">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${styles.iconClass}`}>
                {activeDialog.type === 'confirm' && variant === 'warning' ? <HelpCircle size={22} /> : styles.icon}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-black uppercase tracking-[0.14em] text-white">
                  {activeDialog.title || styles.title}
                </h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-300">
                  {activeDialog.message}
                </p>
              </div>
              <button
                onClick={() => closeDialog(false)}
                className="rounded-lg border border-slate-700 bg-slate-900/80 p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                aria-label="Đóng"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex justify-end gap-2 bg-slate-900/45 p-4">
              {activeDialog.type === 'confirm' && (
                <button
                  onClick={() => closeDialog(false)}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                >
                  {activeDialog.cancelLabel || 'Hủy'}
                </button>
              )}
              <button
                onClick={() => closeDialog(activeDialog.type === 'confirm' ? true : undefined)}
                className={`rounded-lg border px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${styles.buttonClass}`}
              >
                {activeDialog.type === 'confirm' ? activeDialog.confirmLabel || 'Xác nhận' : 'Đã hiểu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SystemDialogContext.Provider>
  );
};

export function useSystemDialog() {
  const context = React.useContext(SystemDialogContext);
  if (!context) {
    throw new Error('useSystemDialog must be used within SystemDialogProvider');
  }
  return context;
}
