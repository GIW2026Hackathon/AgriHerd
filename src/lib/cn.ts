type Class = string | false | null | undefined;
export function cn(...parts: Class[]): string {
  return parts.filter(Boolean).join(' ');
}
