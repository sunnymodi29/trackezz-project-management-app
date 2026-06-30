import { NextResponse } from "next/server";
import { PlanLimitError } from "@/lib/billing/entitlements";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof PlanLimitError) {
    return jsonError(error.message, 402);
  }
  if (error instanceof Error) {
    if (error.message.startsWith("FORBIDDEN")) {
      return jsonError(error.message.replace("FORBIDDEN: ", ""), 403);
    }
    if (error.message.startsWith("NOT_FOUND")) {
      return jsonError(error.message.replace("NOT_FOUND: ", ""), 404);
    }
    if (error.message === "Unauthorized") {
      return jsonError("Unauthorized", 401);
    }
  }
  console.error("[API]", error);
  return jsonError("Internal server error", 500);
}
