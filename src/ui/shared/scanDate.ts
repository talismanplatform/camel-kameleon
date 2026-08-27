/**
 * Scan dates are stored as UTC ISO 8601 instants (`2026-08-27T03:12:44Z`) so the
 * value in `public/data/scan.json` is unambiguous. Rendering is the UI's job:
 * absolute in the reader's own locale and time zone, relative for the summary.
 */

const ABSOLUTE = new Intl.DateTimeFormat(undefined, {dateStyle: 'medium', timeStyle: 'short'});

const RELATIVE = new Intl.RelativeTimeFormat(undefined, {numeric: 'auto'});

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 365 * 24 * 3600_000],
    ['month', 30 * 24 * 3600_000],
    ['day', 24 * 3600_000],
    ['hour', 3600_000],
    ['minute', 60_000],
];

function parse(scannedAt?: string): Date | undefined {
    if (!scannedAt) {
        return undefined;
    }
    const date = new Date(scannedAt);
    return Number.isNaN(date.getTime()) ? undefined : date;
}

/** `27 Aug 2026, 03:12`, or `-` when the date is missing or unparsable. */
export function formatScanDate(scannedAt?: string): string {
    const date = parse(scannedAt);
    return date ? date?.toISOString()?.split(".")?.[0]?.replace("T", " ") : '-';
}

/** `3 hours ago`, or undefined when the date is missing or unparsable. */
export function formatScanAge(scannedAt?: string, now: number = Date.now()): string | undefined {
    const date = parse(scannedAt);
    if (!date) {
        return undefined;
    }
    const elapsed = date.getTime() - now;
    const [unit, ms] = UNITS.find(([, ms]) => Math.abs(elapsed) >= ms) ?? UNITS[UNITS.length - 1];
    return RELATIVE.format(Math.round(elapsed / ms), unit);
}
