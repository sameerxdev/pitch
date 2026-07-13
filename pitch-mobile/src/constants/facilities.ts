/**
 * Canonical ground facilities — owner picker, chips, and seed data must use these labels only.
 */
export const GROUND_FACILITIES = [
  { label: "Washrooms", icon: "🚿" },
  { label: "Floodlights", icon: "💡" },
  { label: "Parking", icon: "🅿️" },
  { label: "Cafeteria", icon: "☕" },
  { label: "Bats", icon: "🏏" },
] as const;

export type GroundFacilityLabel = (typeof GROUND_FACILITIES)[number]["label"];

const ICON_BY_LABEL_LOWER = new Map(
  GROUND_FACILITIES.map((f) => [f.label.toLowerCase(), f.icon] as const),
);

export function getFacilityIcon(label: string): string {
  return ICON_BY_LABEL_LOWER.get(label.trim().toLowerCase()) ?? "✓";
}

export function isKnownFacilityLabel(label: string): boolean {
  return ICON_BY_LABEL_LOWER.has(label.trim().toLowerCase());
}
