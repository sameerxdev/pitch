/** Decode booking id from PITCH QR JWT payload (`sub` claim). */
export function bookingIdFromQrToken(token: string): string | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const padded =
      part.replace(/-/g, "+").replace(/_/g, "/") +
      "=".repeat((4 - (part.length % 4)) % 4);
    const json = JSON.parse(atob(padded)) as { sub?: string };
    return json.sub ?? null;
  } catch {
    return null;
  }
}
