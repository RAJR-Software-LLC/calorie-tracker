import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind class names so later arguments override earlier conflicting utilities
 * (e.g. CardContent defaults + screen-level padding).
 */
export function cn(...classes: (string | undefined | false | null)[]): string {
  return twMerge(...classes);
}
