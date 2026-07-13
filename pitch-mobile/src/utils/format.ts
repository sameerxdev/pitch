import { format, parseISO } from "date-fns";

export function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString("en-PK")}`;
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  const d = parseISO(dateString);
  return isNaN(d.getTime()) ? "—" : format(d, "dd MMM yyyy");
}

export function formatTime(hour: number): string {
  const h = hour.toString().padStart(2, "0");
  return `${h}:00`;
}

/** 24h clock hour (0–24) to 12h label for slot UI. */
export function formatHour12(hour: number): string {
  if (hour === 0 || hour === 24) return "12:00 AM";
  if (hour === 12) return "12:00 PM";
  if (hour < 12) return `${hour}:00 AM`;
  return `${hour - 12}:00 PM`;
}

export function formatSlotRange(startHour: number, endHour: number): string {
  return `${formatTime(startHour)} – ${formatTime(endHour)}`;
}

export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  const d = parseISO(isoString);
  return isNaN(d.getTime()) ? "—" : format(d, "dd MMM yyyy, HH:mm");
}

export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function formatTrend(percent: number): string {
  if (percent === 0) return "0%";
  const sign = percent > 0 ? "+" : "";
  return `${sign}${percent.toFixed(1)}%`;
}

export function roundUpToTen(amount: number): number {
  return Math.ceil(amount / 10) * 10;
}

export function calculateAdvance(totalPrice: number, advancePercent: number): number {
  return roundUpToTen((totalPrice * advancePercent) / 100);
}

export function maskPhone(phone: string): string {
  return `****${phone.slice(-4)}`;
}

export function getFirstName(fullName: string | null): string {
  if (!fullName) return "Player";
  return fullName.split(" ")[0] ?? fullName;
}

export function anonymizeName(fullName: string): string {
  const parts = fullName.trim().split(" ");
  if (parts.length === 1) return parts[0] ?? fullName;
  return `${parts[0]} ${parts[parts.length - 1]?.[0] ?? ""}.`;
}
