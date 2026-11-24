import { useCallback, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  message: string;
  type: ToastType;
}

let showToastRef: ((message: string, type?: ToastType) => void) | null = null;

export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null);

  const show = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  }, []);

  showToastRef = show;

  return { toast, show, hideToast: () => setToast(null) };
}

export function showToast(message: string, type: ToastType = 'success') {
  showToastRef?.(message, type);
}
