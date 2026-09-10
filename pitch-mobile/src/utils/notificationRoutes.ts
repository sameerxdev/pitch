/**
 * Maps a push payload to the screen it should open.
 *
 * The server sends a semantic `type` plus ids (see the backend's
 * notification_service); routing is a client concern, so the translation lives
 * here. A payload may also carry an explicit `route`, which always wins.
 */
import type { UserRole } from "@/api/types";

type PushData = Record<string, unknown> | undefined;

function str(data: PushData, key: string): string | null {
  const value = data?.[key];
  return typeof value === "string" && value ? value : null;
}

export function routeForNotification(
  data: PushData,
  role: UserRole | undefined,
): string | null {
  const explicit = str(data, "route");
  if (explicit) return explicit;

  const type = str(data, "type");
  const bookingId = str(data, "booking_id");

  switch (type) {
    case "booking_confirmed":
      // The QR is the thing the player needs at the gate.
      return bookingId ? `/(player)/booking/${bookingId}/qr` : "/(player)/bookings";
    case "booking_completed":
      return bookingId
        ? `/(player)/booking/${bookingId}/review`
        : "/(player)/bookings";
    case "booking_cancelled":
      return role === "player" ? "/(player)/bookings" : "/(manager)/(tabs)/bookings";
    case "booking_created":
      // Only ground staff receive this one.
      return role === "manager"
        ? "/(manager)/(tabs)/bookings"
        : "/(owner)/(tabs)";
    case "manager_assigned":
      return "/(manager)/ground-select";
    case "ground_status":
      return "/(owner)/(tabs)/grounds";
    case "review_reply":
      return "/(player)/bookings";
    default:
      return null;
  }
}
