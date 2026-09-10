/**
 * Pure helpers for the slot-template builder used by the manager and owner
 * "manage slots" screens. Mirrors the validation the backend applies to
 * `POST /{manager|owner}/grounds/{id}/slots/apply`.
 */
import type { RateType } from "@/api/types";

export type ManualSlotTemplate = {
  start_hour: number;
  end_hour: number;
  rate_type: RateType;
  /** Fixed slot price; if omitted, day/night hourly × duration is used. */
  price?: number;
};

export function validateManualSlotTemplate(
  template: ManualSlotTemplate,
): string | null {
  if (template.start_hour < 0 || template.start_hour > 23) {
    return "Start hour must be between 0 and 23.";
  }
  if (template.end_hour < 1 || template.end_hour > 24) {
    return "End hour must be between 1 and 24.";
  }
  if (template.end_hour <= template.start_hour) {
    return "End time must be after start time.";
  }
  return null;
}

export function slotPriceFromTemplate(
  template: ManualSlotTemplate,
  hourlyDay: number,
  hourlyNight: number,
): number {
  if (template.price != null && template.price > 0) return template.price;
  const hours = template.end_hour - template.start_hour;
  const hourly = template.rate_type === "night" ? hourlyNight : hourlyDay;
  return hourly * hours;
}

/** Day slots run 6 AM – 6 PM; anything starting outside that is a night slot. */
export function inferRateType(startHour: number): RateType {
  return startHour >= 18 || startHour < 6 ? "night" : "day";
}
