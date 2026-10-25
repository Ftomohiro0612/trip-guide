import { LIMITS } from "./types";

export function generateShareToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export async function hashShareToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function isPlausibleShareToken(value: unknown): value is string {
  return typeof value === "string" && value.length >= LIMITS.tokenMin && value.length <= LIMITS.tokenMax && /^[A-Za-z0-9_-]+$/.test(value);
}
