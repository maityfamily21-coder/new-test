// Treats "YYYY-MM-DD HH:mm:ss" (or "YYYY-MM-DDTHH:mm:ss") without zone as IST.
// If a zone is present (Z or +offset), rely on the native parser.

export function parseISTDate(value: string | Date): Date {
  if (typeof value === "string") {
    // Normalize to ISO-like
    let s = value.trim().replace(" ", "T")

    // Strip any explicit timezone info (Z or +hh:mm / -hh:mm) to avoid double shifting
    // Examples it handles: 2025-09-27T12:00Z, 2025-09-27T12:00+00:00, 2025-09-27T12:00:00+05:30
    s = s.replace(/Z$/i, "").replace(/([+-]\d{2}:\d{2})$/i, "")

    // If only date part provided, keep as-is; otherwise ensure we add IST offset
    // Always treat as IST local time
    return new Date(`${s}+05:30`)
  }
  return new Date(value)
}

export function formatISTDateTime(value: string | Date) {
  const d = parseISTDate(value)
  const dateText = d.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Kolkata",
  })
  const timeText = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  })
  return { dateText, timeText, dateObj: d }
}
