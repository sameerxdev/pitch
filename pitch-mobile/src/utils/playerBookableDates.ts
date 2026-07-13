import { addDays, startOfDay } from "date-fns";
import { Config } from "@/constants/config";

export function getPlayerBookableDates(): Date[] {
  const today = startOfDay(new Date());
  return Array.from({ length: Config.PLAYER_MAX_BOOKING_DAYS_AHEAD }, (_, i) =>
    addDays(today, i),
  );
}
