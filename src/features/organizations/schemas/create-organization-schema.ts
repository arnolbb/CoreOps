import { z } from "zod";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const currencyCodePattern = /^[A-Z]{3}$/;

export function generateOrganizationSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 63);
}

function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export const businessTypeOptions = [
  "general",
  "service",
  "retail",
  "distribution",
  "manufacturing",
  "nonprofit",
] as const;

export const currencyCodeOptions = [
  "USD",
  "IDR",
  "EUR",
  "GBP",
  "AUD",
  "SGD",
] as const;

export const timezoneOptions = [
  "UTC",
  "Asia/Jakarta",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Europe/London",
  "America/New_York",
] as const;

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter organization name.")
    .max(120, "Organization name is too long."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Enter organization address.")
    .max(63, "Organization address is too long.")
    .regex(slugPattern, "Use lowercase letters, numbers, and dashes."),
  businessType: z.enum(businessTypeOptions, {
    error: "Choose a business type.",
  }),
  timezone: z
    .string()
    .trim()
    .min(1, "Choose a timezone.")
    .refine(isValidTimeZone, "Choose a valid timezone."),
  currencyCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(currencyCodePattern, "Choose a valid currency."),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
