"use client";

type PaddleCheckoutEvent = {
  name: string;
  data?: { transaction_id?: string };
};

type PaddleJs = {
  Environment: { set: (env: "sandbox" | "production") => void };
  Initialize: (options: {
    token: string;
    eventCallback?: (event: PaddleCheckoutEvent) => void;
  }) => void;
  Checkout: {
    open: (options: {
      transactionId: string;
      settings?: { displayMode?: "overlay" | "inline" };
    }) => void;
  };
};

declare global {
  interface Window {
    Paddle?: PaddleJs;
  }
}

let paddleScriptPromise: Promise<void> | null = null;
let paddleInitialized = false;
let pendingTransactionId: string | null = null;
let checkoutCompleted = false;
let checkoutResolve: (() => void) | null = null;
let checkoutReject: ((error: Error) => void) | null = null;
let checkoutCompleteHandler:
  | ((transactionId: string) => void | Promise<void>)
  | null = null;

function loadPaddleScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Paddle.js can only load in the browser"));
  }
  if (window.Paddle?.Checkout) return Promise.resolve();
  if (paddleScriptPromise) return paddleScriptPromise;

  paddleScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Paddle.js from CDN"));
    document.head.appendChild(script);
  });

  return paddleScriptPromise;
}

function paddleClientToken(): string {
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is not configured. Create a client-side token in Paddle → Developer tools → Authentication.",
    );
  }
  return token;
}

function paddleJsEnvironment(): "sandbox" | "production" {
  const env = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT?.trim().toLowerCase();
  return env === "production" ? "production" : "sandbox";
}

function handlePaddleEvent(event: PaddleCheckoutEvent) {
  if (event.name === "checkout.completed") {
    checkoutCompleted = true;
    const txnId = event.data?.transaction_id ?? pendingTransactionId;
    if (!txnId || !checkoutCompleteHandler) return;

    void Promise.resolve(checkoutCompleteHandler(txnId))
      .then(() => checkoutResolve?.())
      .catch((error) =>
        checkoutReject?.(
          error instanceof Error ? error : new Error("Checkout sync failed"),
        ),
      );
    return;
  }

  if (event.name === "checkout.closed" && !checkoutCompleted) {
    checkoutReject?.(new Error("Checkout canceled"));
  }
}

async function ensurePaddleInitialized(): Promise<PaddleJs> {
  await loadPaddleScript();
  const Paddle = window.Paddle;
  if (!Paddle) {
    throw new Error("Paddle.js failed to initialize");
  }

  const environment = paddleJsEnvironment();
  if (environment === "sandbox") {
    Paddle.Environment.set("sandbox");
  }

  if (!paddleInitialized) {
    Paddle.Initialize({
      token: paddleClientToken(),
      eventCallback: handlePaddleEvent,
    });
    paddleInitialized = true;
  }

  return Paddle;
}

export async function openPaddleOverlayCheckout(
  transactionId: string,
  onCompleted: (transactionId: string) => void | Promise<void>,
): Promise<void> {
  const Paddle = await ensurePaddleInitialized();

  return new Promise((resolve, reject) => {
    pendingTransactionId = transactionId;
    checkoutCompleted = false;
    checkoutCompleteHandler = onCompleted;
    checkoutResolve = resolve;
    checkoutReject = reject;

    Paddle.Checkout.open({
      transactionId,
      settings: { displayMode: "overlay" },
    });
  });
}
