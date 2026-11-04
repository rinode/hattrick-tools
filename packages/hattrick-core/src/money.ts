/**
 * Hattrick's CHPP API reports all money in SEK (Swedish krona). In this
 * toolchain we present money in EUR, where 10 SEK = 1 EUR.
 *
 * Keep raw SEK from the API and convert only at the presentation edge.
 */
export const SEK_PER_EUR = 10;

/** Converts a raw SEK amount from the API into EUR. */
export function sekToEur(sek: number): number {
  return sek / SEK_PER_EUR;
}

/** Converts EUR back into the SEK integer the API expects. */
export function eurToSek(eur: number): number {
  return Math.round(eur * SEK_PER_EUR);
}

/** Formats a EUR amount with thousands separators, e.g. "€1,234". */
export function formatEur(eur: number, { cents = false }: { cents?: boolean } = {}): string {
  const abs = Math.abs(eur);
  const body = abs.toLocaleString("en-US", {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });
  return (eur < 0 ? "-€" : "€") + body;
}

/** Formats a raw SEK API amount directly as EUR, e.g. 130000 SEK -> "€13,000". */
export function formatSekAsEur(sek: number, opts?: { cents?: boolean }): string {
  return formatEur(sekToEur(sek), opts);
}
