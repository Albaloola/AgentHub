"use client";

export type AppDateFormat = "system" | "MM/DD/YYYY" | "DD/MM/YYYY";

interface FormatUiDateOptions {
  includeTime?: boolean;
}

function getFormattedDateParts(date: Date) {
  return {
    month: String(date.getMonth() + 1).padStart(2, "0"),
    day: String(date.getDate()).padStart(2, "0"),
    year: date.getFullYear(),
    hours24: date.getHours(),
    minutes: String(date.getMinutes()).padStart(2, "0"),
  };
}

export function formatUiDateTime(
  date: Date,
  format: AppDateFormat = "system",
  options: FormatUiDateOptions = {},
) {
  const { includeTime = true } = options;

  if (format === "system") {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      ...(includeTime
        ? {
            hour: "numeric",
            minute: "2-digit",
          }
        : {}),
    }).format(date);
  }

  const { month, day, year, hours24, minutes } = getFormattedDateParts(date);
  const hours12 = hours24 % 12 || 12;
  const suffix = hours24 >= 12 ? "PM" : "AM";
  const time = `${hours12}:${minutes} ${suffix}`;
  const dateOnly = format === "MM/DD/YYYY" ? `${month}/${day}/${year}` : `${day}/${month}/${year}`;

  return includeTime ? `${dateOnly} ${time}` : dateOnly;
}
