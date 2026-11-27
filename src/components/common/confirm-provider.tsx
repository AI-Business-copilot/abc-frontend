import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";

/** A yes/no question the staff has to answer before the action runs. */
export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** A destructive action gets the red button. */
  variant?: "default" | "destructive";
  /**
   * Runs the action. The modal stays open and shows a spinner until it finishes, so the staff
   * cannot send the same request twice.
   */
  onConfirm?: () => void | Promise<void>;
}

/** A single value the staff types in before the action runs. */
export interface PromptOptions {
  title: string;
  /** A short explanation above the field. */
  message?: string;
  /** The label of the field. */
  label?: string;
  initialValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm?: (value: string) => void | Promise<void>;
}

/** A message the staff has to acknowledge. Used for the errors the server refused. */
export interface AlertOptions {
  title: string;
  message: string;
  confirmLabel?: string;
}

type DialogState =
  | { kind: "confirm"; options: ConfirmOptions; resolve: (value: boolean) => void }
  | { kind: "prompt"; options: PromptOptions; resolve: (value: string | null) => void }
  | { kind: "alert"; options: AlertOptions; resolve: () => void };

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
  alert: (options: AlertOptions) => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [busy, setBusy] = useState(false);
  const [promptValue, setPromptValue] = useState("");
  // The pending dialog, kept in a ref so settling it never touches a state updater.
  const pendingRef = useRef<DialogState | null>(null);

  const openDialog = useCallback(<T extends DialogState>(state: T) => {
    pendingRef.current = state;
    setDialog(state);
    setBusy(false);
    if (state.kind === "prompt") setPromptValue(state.options.initialValue ?? "");
  }, []);

  /** Closes the dialog and hands the answer back to the caller. */
  const settle = useCallback((answer: boolean | string | null) => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    setDialog(null);
    setBusy(false);
    setPromptValue("");
    if (!pending) return;
    if (pending.kind === "confirm") pending.resolve(answer === true);
    else if (pending.kind === "prompt") pending.resolve(typeof answer === "string" ? answer : null);
    else pending.resolve();
  }, []);

  /** Closes the dialog without running anything: the staff cancelled. */
  const cancel = useCallback(() => {
    if (busy) return;
    settle(null);
  }, [busy, settle]);

  /**
   * Runs the action of the open dialog, then closes it.
   *
   * A failing action closes the modal too: the caller shows the error itself, on the page
   * behind the modal, and the modal must not hide it.
   */
  const confirmValue = useCallback(async () => {
    const pending = pendingRef.current;
    if (!pending || pending.kind === "alert") return;
    setBusy(true);
    try {
      if (pending.kind === "prompt") await pending.options.onConfirm?.(promptValue);
      else await pending.options.onConfirm?.();
      settle(pending.kind === "prompt" ? promptValue : true);
    } catch {
      // The action failed. The caller already recorded the error, so the modal just closes.
      settle(null);
    }
  }, [promptValue, settle]);

  const value = useMemo<ConfirmContextValue>(
    () => ({
      confirm: (options) =>
        new Promise<boolean>((resolve) => {
          openDialog({ kind: "confirm", options, resolve });
        }),
      prompt: (options) =>
        new Promise<string | null>((resolve) => {
          openDialog({ kind: "prompt", options, resolve });
        }),
      alert: (options) =>
        new Promise<void>((resolve) => {
          openDialog({ kind: "alert", options, resolve: () => resolve() });
        }),
    }),
    [openDialog],
  );

  return (
    <ConfirmContext.Provider value={value}>
      {children}

      {dialog?.kind === "confirm" && (
        <Modal onClose={cancel} open title={dialog.options.title}>
          <p className="text-sm leading-relaxed text-slate-700">{dialog.options.message}</p>
          <div className="mt-6 flex justify-end gap-2">
            <Button disabled={busy} onClick={cancel} type="button" variant="outline">
              {dialog.options.cancelLabel ?? "Huỷ"}
            </Button>
            <Button
              disabled={busy}
              onClick={() => void confirmValue()}
              type="button"
              variant={dialog.options.variant === "destructive" ? "destructive" : "default"}
            >
              {busy && <Spinner className="h-4 w-4" />}
              {dialog.options.confirmLabel ?? "Xác nhận"}
            </Button>
          </div>
        </Modal>
      )}

      {dialog?.kind === "prompt" && (
        <Modal onClose={cancel} open title={dialog.options.title}>
          {dialog.options.message ? (
            <p className="mb-3 text-sm leading-relaxed text-slate-700">{dialog.options.message}</p>
          ) : null}
          {dialog.options.label ? (
            <Label
              className="mb-1 block text-sm font-medium text-slate-700"
              htmlFor="confirm-prompt-input"
            >
              {dialog.options.label}
            </Label>
          ) : null}
          <Input
            autoFocus
            id="confirm-prompt-input"
            onChange={(event) => setPromptValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !busy) void confirmValue();
            }}
            placeholder={dialog.options.placeholder}
            value={promptValue}
          />
          <div className="mt-6 flex justify-end gap-2">
            <Button disabled={busy} onClick={cancel} type="button" variant="outline">
              {dialog.options.cancelLabel ?? "Huỷ"}
            </Button>
            <Button
              disabled={busy}
              onClick={() => void confirmValue()}
              type="button"
              variant={dialog.options.variant === "destructive" ? "destructive" : "default"}
            >
              {busy && <Spinner className="h-4 w-4" />}
              {dialog.options.confirmLabel ?? "Xác nhận"}
            </Button>
          </div>
        </Modal>
      )}

      {dialog?.kind === "alert" && (
        <Modal onClose={cancel} open title={dialog.options.title}>
          <p className="text-sm leading-relaxed text-slate-700">{dialog.options.message}</p>
          <div className="mt-6 flex justify-end gap-2">
            <Button onClick={() => settle(null)} type="button" variant="destructive">
              {dialog.options.confirmLabel ?? "Đóng"}
            </Button>
          </div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}

/** Asks a yes/no question. Resolves false when the staff cancels. */
export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error("useConfirm must be used inside ConfirmProvider.");
  return context.confirm;
}

/** Asks for a value. Resolves null when the staff cancels. */
export function usePrompt() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error("usePrompt must be used inside ConfirmProvider.");
  return context.prompt;
}

/** Shows a message the staff has to acknowledge. */
export function useAlert() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error("useAlert must be used inside ConfirmProvider.");
  return context.alert;
}
