import { z } from "zod";

// Pakistan mobile numbers: 10 digits starting with 3 after the +92 prefix
export const pakistanPhoneRegex = /^3[0-9]{9}$/;

export function isValidPakistanPhone(number: string): boolean {
  return pakistanPhoneRegex.test(number);
}

export function isValidOtp(otp: string): boolean {
  return /^\d{6}$/.test(otp);
}

export function formatPhoneE164(localNumber: string): string {
  return `+92${localNumber}`;
}

export function stripPhonePrefix(e164Phone: string): string {
  return e164Phone.replace(/^\+92/, "");
}

/**
 * Normalize whatever the user typed into the `+923XXXXXXXXX` form the API
 * requires — tolerating spaces, a leading 0, or an already-prefixed number.
 * Returns null when the result still isn't a valid PK mobile number.
 */
export function toE164Pk(input: string): string | null {
  const digitsOnly = input.replace(/[\s-()]/g, "");
  const local = digitsOnly
    .replace(/^\+92/, "")
    .replace(/^0092/, "")
    .replace(/^92(?=3)/, "")
    .replace(/^0(?=3)/, "");
  return isValidPakistanPhone(local) ? formatPhoneE164(local) : null;
}

// Zod schemas
export const phoneSchema = z
  .string()
  .regex(pakistanPhoneRegex, "Enter a valid 10-digit mobile number (e.g. 3001234567)");

export const otpSchema = z
  .string()
  .length(6, "Enter the 6-digit code")
  .regex(/^\d+$/, "OTP must be numeric");

export const profileSetupSchema = z.object({
  full_name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long"),
  city: z.string().min(1, "Please select your city"),
});

export const reviewSchema = z.object({
  overall_rating: z.number().min(1, "Please rate your experience").max(5),
  rating_pitch: z.number().min(1).max(5).optional(),
  rating_cleanliness: z.number().min(1).max(5).optional(),
  rating_value: z.number().min(1).max(5).optional(),
  rating_manager: z.number().min(1).max(5).optional(),
  review_text: z.string().max(1000, "Review must be under 1000 characters").optional(),
});

export const completionSchema = z.object({
  payment_method: z.enum(["cash", "bank_transfer"]),
  amount_received: z
    .number()
    .min(0, "Amount must be 0 or more")
    .nonnegative("Amount cannot be negative"),
});

export const createGroundSchema = z.object({
  name: z.string().min(3, "Ground name must be at least 3 characters").max(120),
  city: z.string().min(1, "Please select a city"),
  area: z.string().min(2, "Area is required").max(80),
  address: z.string().min(5, "Full address is required"),
  hourly_rate_day: z.number().min(100, "Day rate must be at least PKR 100"),
  hourly_rate_night: z.number().min(100, "Night rate must be at least PKR 100"),
  advance_percent: z.number().min(10).max(50),
});
