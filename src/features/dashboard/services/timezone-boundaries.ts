export type MonthBoundariesUtc = {
  startIso: string;
  endIso: string;
  monthLabel: string;
  resolvedTimezone: string;
};

type ZonedDateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

/**
 * Validates an IANA timezone string using Intl.DateTimeFormat and falls back to UTC if invalid.
 */
export function resolveValidTimezone(
  timezone: string | null | undefined,
): string {
  const trimmed = timezone?.trim();
  if (!trimmed) {
    return "UTC";
  }

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: trimmed,
    });
    return formatter.resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function getZonedDateTimeParts(
  date: Date,
  timeZone: string,
): ZonedDateTimeParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const readPart = (type: Intl.DateTimeFormatPartTypes) => {
    const raw = parts.find((part) => part.type === type)?.value ?? "0";
    return Number.parseInt(raw, 10);
  };

  // Normalize midnight formatted as "24" on older ICU data to "00".
  const rawHour = readPart("hour");

  return {
    year: readPart("year"),
    month: readPart("month"),
    day: readPart("day"),
    hour: rawHour === 24 ? 0 : rawHour,
    minute: readPart("minute"),
    second: readPart("second"),
  };
}

/**
 * Fixed-point iteration converter finding the exact UTC instant corresponding to
 * YYYY-MM-DDT00:00:00 in the target IANA timezone without external libraries.
 */
function zonedMidnightToUtc(
  year: number,
  month: number,
  day: number,
  timeZone: string,
): Date {
  const targetAsUtcMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  let guessMs = targetAsUtcMs;

  for (let iteration = 0; iteration < 5; iteration += 1) {
    const zoned = getZonedDateTimeParts(new Date(guessMs), timeZone);
    const zonedAsUtcMs = Date.UTC(
      zoned.year,
      zoned.month - 1,
      zoned.day,
      zoned.hour,
      zoned.minute,
      zoned.second,
      0,
    );
    const diffMs = targetAsUtcMs - zonedAsUtcMs;

    if (diffMs === 0) {
      return new Date(guessMs);
    }

    guessMs += diffMs;
  }

  return new Date(guessMs);
}

/**
 * Computes exact UTC start/end instants for the current calendar month in the given IANA timezone.
 */
export function getCurrentMonthBoundariesUtc(
  timezone: string,
  now?: Date,
): MonthBoundariesUtc {
  const resolvedTimezone = resolveValidTimezone(timezone);
  const referenceDate = now && !Number.isNaN(now.getTime()) ? now : new Date();
  const current = getZonedDateTimeParts(referenceDate, resolvedTimezone);

  const startDate = zonedMidnightToUtc(
    current.year,
    current.month,
    1,
    resolvedTimezone,
  );
  const nextYear = current.month === 12 ? current.year + 1 : current.year;
  const nextMonth = current.month === 12 ? 1 : current.month + 1;
  const endDate = zonedMidnightToUtc(nextYear, nextMonth, 1, resolvedTimezone);

  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: resolvedTimezone,
  }).format(startDate);

  return {
    startIso: startDate.toISOString(),
    endIso: endDate.toISOString(),
    monthLabel,
    resolvedTimezone,
  };
}
