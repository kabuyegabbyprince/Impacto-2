import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: any, type?: any) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: any, type?: any) => {
    const id = Date.now();
    let msg = "";
    let tType: string = "info";
    
    if (typeof message === "object" && message !== null) {
      msg = message.message || message.title || JSON.stringify(message);
      tType = message.type || "info";
    } else {
      msg = String(message);
      tType = type || "info";
    }

    let finalType: ToastType = "info";
    if (tType === "success") finalType = "success";
    else if (tType === "error" || tType === "warning") finalType = "error";

    setToasts((prev) => [...prev, { id, message: msg, type: finalType }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2.5 w-full max-w-md px-4 pointer-events-none select-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl shadow-2xl bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md border border-slate-800 text-slate-100 animate-slide-up duration-200"
          >
            <div className="flex items-center gap-2.5">
              {toast.type === "success" && (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              )}
              {toast.type === "error" && (
                <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
              )}
              {toast.type === "info" && (
                <Info className="h-5 w-5 text-sky-400 shrink-0" />
              )}
              <span className="text-sm font-medium tracking-tight text-slate-100">
                {toast.message}
              </span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 transition-colors shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
};

