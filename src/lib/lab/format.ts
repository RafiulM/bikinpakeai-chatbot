// Display helpers shared by every Support Lab view. A fixed time zone keeps
// the server render and the browser render identical.

const TIME_ZONE = "Asia/Jakarta";

const clockFormat = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

export function formatClock(iso: string) {
  return clockFormat.format(new Date(iso)).replace(":", ".");
}

export function formatSeconds(ms: number) {
  return `${(ms / 1000).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} dtk`;
}

export function formatUsd(value: number, digits = 4) {
  return `$${value.toLocaleString("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

/** Whole number with Indonesian grouping, e.g. 12.480. */
export function formatCount(value: number) {
  return value.toLocaleString("id-ID");
}

export function formatScore(value: number) {
  return value.toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPercent(part: number, total: number) {
  if (total === 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

const dayFormat = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TIME_ZONE,
});

const dayKeyFormat = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: TIME_ZONE,
});

/** Calendar day in the lab's time zone, e.g. "2026-10-01". */
export function dayKey(iso: string) {
  return dayKeyFormat.format(new Date(iso));
}

export function formatDay(iso: string) {
  return dayFormat.format(new Date(iso));
}
