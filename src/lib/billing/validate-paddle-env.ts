const PRODUCTION_PADDLE_VARS = [
  "PADDLE_API_KEY",
  "PADDLE_WEBHOOK_SECRET",
  "PADDLE_PRICE_ID_PRO_MONTHLY",
  "PADDLE_PRICE_ID_PRO_ANNUAL",
  "NEXT_PUBLIC_APP_URL",
] as const;

export function isPaddleProduction(): boolean {
  return process.env.PADDLE_ENVIRONMENT?.trim().toLowerCase() === "production";
}

/** Throws when required Paddle production configuration is missing or unsafe. */
export function validatePaddleProductionEnv(): void {
  if (!isPaddleProduction()) return;

  const missing = PRODUCTION_PADDLE_VARS.filter(
    (key) => !process.env[key]?.trim(),
  );
  if (missing.length > 0) {
    throw new Error(
      `Missing production Paddle environment variables: ${missing.join(", ")}`,
    );
  }

  const apiKey = process.env.PADDLE_API_KEY!.trim();
  if (!apiKey.startsWith("pdl_live_")) {
    throw new Error(
      "PADDLE_API_KEY must be a live key (pdl_live_...) when PADDLE_ENVIRONMENT=production",
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!.trim();
  if (/localhost|127\.0\.0\.1/i.test(appUrl)) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL must be your production domain when PADDLE_ENVIRONMENT=production",
    );
  }
}
