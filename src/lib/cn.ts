/**
 * Minimal className merge for NativeWind (no tailwind-merge in RN preset by default).
 */
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
