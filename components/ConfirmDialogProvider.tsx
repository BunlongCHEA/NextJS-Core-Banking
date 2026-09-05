"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  requireInput?: { placeholder?: string };
};

type DialogState = ConfirmOptions & { resolve: (value: string | boolean | null) => void };

const ConfirmContext = createContext<{
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  prompt: (opts: ConfirmOptions) => Promise<string | null>;
} | null>(null);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null);
  const [inputValue, setInputValue] = useState("");

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setInputValue("");
      setState({ ...opts, resolve: (v) => resolve(Boolean(v)) });
    });
  }, []);

  const prompt = useCallback((opts: ConfirmOptions) => {
    return new Promise<string | null>((resolve) => {
      setInputValue("");
      setState({ ...opts, resolve: (v) => resolve(typeof v === "string" ? v : null) });
    });
  }, []);

  function handleCancel() {
    state?.resolve(state.requireInput ? null : false);
    setState(null);
  }
  function handleConfirm() {
    state?.resolve(state.requireInput ? inputValue : true);
    setState(null);
  }

  return (
    <ConfirmContext.Provider value={{ confirm, prompt }}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-vault-950/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {state.destructive && <AlertTriangle className="h-5 w-5 text-signal-rose" />}
                <h3 className="font-display text-base font-semibold text-vault-950">{state.title}</h3>
              </div>
              <button onClick={handleCancel} className="rounded-sm p-1 text-vault-400 hover:bg-vault-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-4 text-sm text-vault-600">{state.message}</p>

            {state.requireInput && (
              <input
                autoFocus
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={state.requireInput.placeholder}
                className="mb-4 w-full rounded-md border border-ledger-line bg-white px-3 py-2 text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal"
              />
            )}

            <div className="flex justify-end gap-2">
              <button onClick={handleCancel}
                className="rounded-md border border-ledger-line px-4 py-2 text-sm font-medium text-vault-700 hover:bg-vault-50">
                {state.cancelLabel ?? "Cancel"}
              </button>
              <button
                onClick={handleConfirm}
                disabled={!!state.requireInput && inputValue.trim() === ""}
                className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                  state.destructive ? "bg-signal-rose hover:bg-red-700" : "bg-vault-950 hover:bg-vault-800"
                }`}
              >
                {state.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirmDialog() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirmDialog must be used within ConfirmDialogProvider");
  return ctx;
}