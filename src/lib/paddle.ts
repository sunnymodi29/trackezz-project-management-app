import { Environment, Paddle } from "@paddle/paddle-node-sdk";
import { validatePaddleProductionEnv } from "@/lib/billing/validate-paddle-env";

let paddleClient: Paddle | null = null;

export function getPaddle(): Paddle {
  validatePaddleProductionEnv();

  const apiKey = process.env.PADDLE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("PADDLE_API_KEY is not configured");
  }

  if (!paddleClient) {
    const env = process.env.PADDLE_ENVIRONMENT?.trim().toLowerCase();
    paddleClient = new Paddle(apiKey, {
      environment:
        env === "production" ? Environment.production : Environment.sandbox,
    });
  }

  return paddleClient;
}

export function paddleWebhookSecret(): string {
  const secret = process.env.PADDLE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error("PADDLE_WEBHOOK_SECRET is not configured");
  }
  return secret;
}

export function proPriceId(interval: "month" | "year"): string {
  const envKey =
    interval === "year"
      ? "PADDLE_PRICE_ID_PRO_ANNUAL"
      : "PADDLE_PRICE_ID_PRO_MONTHLY";
  const priceId = process.env[envKey]?.trim();
  if (!priceId) {
    throw new Error(`${envKey} is not configured`);
  }
  return priceId;
}

export function appOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ??
    process.env.AUTH_URL?.trim() ??
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

/** Origin for the active request (preferred over env for checkout redirects). */
export async function requestAppOrigin(): Promise<string> {
  const { headers } = await import("next/headers");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return appOrigin();

  const isLocal =
    host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const proto =
    h.get("x-forwarded-proto") ??
    h.get("x-forwarded-protocol") ??
    (isLocal ? "http" : "https");

  return `${proto}://${host}`.replace(/\/$/, "");
}

function isLocalhostUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

/** Post-checkout redirect URL (domain must be approved in Paddle dashboard). */
export function paddleCheckoutSuccessUrl(origin?: string): string {
  const base =
    process.env.PADDLE_CHECKOUT_RETURN_URL?.trim() ??
    origin ??
    appOrigin();
  return `${base.replace(/\/$/, "")}/dashboard/settings?tab=billing&checkout=success`;
}

/**
 * Paddle cannot approve localhost domains. On localhost, omit checkout.url and
 * open checkout with Paddle.js overlay on the client instead.
 */
export async function paddleCheckoutConfig(): Promise<
  { url: string } | undefined
> {
  const origin = await requestAppOrigin();
  if (isLocalhostUrl(origin)) {
    return undefined;
  }

  return { url: paddleCheckoutSuccessUrl(origin) };
}

export function paddleJsEnvironment(): "sandbox" | "production" {
  const env = process.env.PADDLE_ENVIRONMENT?.trim().toLowerCase();
  return env === "production" ? "production" : "sandbox";
}

export function isLocalhostAppOrigin(url: string): boolean {
  return isLocalhostUrl(url);
}
