/** Minimal clsx-compatible implementation (no extra dep needed) */
export type ClassValue = string | number | null | false | undefined | ClassValue[] | Record<string, boolean | null | undefined>;
export function clsx(...inputs: ClassValue[]): string {
  const out: string[] = [];
  for (const input of inputs) {
    if (!input) continue;
    if (typeof input === 'string' || typeof input === 'number') out.push(String(input));
    else if (Array.isArray(input)) { const r = clsx(...input); if (r) out.push(r); }
    else for (const [k, v] of Object.entries(input)) if (v) out.push(k);
  }
  return out.join(' ');
}
