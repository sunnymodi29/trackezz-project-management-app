import { toast } from "sonner";

function errorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

export function toastSuccess(message: string): void {
  toast.success(message);
}

export function toastInfo(message: string): void {
  toast.info(message);
}

export function toastError(error: unknown, fallback?: string): void {
  toast.error(errorMessage(error, fallback));
}

export function toastPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((value: T) => string);
    error?: string;
  },
): Promise<T> {
   toast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: (err: unknown) =>
      errorMessage(err, messages.error ?? "Something went wrong"),
  });
  return promise;
}
