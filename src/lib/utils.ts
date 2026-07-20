import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge conditional class names and resolve Tailwind conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * True when a stored `photo_url` is a direct external link (e.g. an Unsplash
 * stock photo) rather than a path in a private Supabase Storage bucket. External
 * links are used as-is; storage paths need a signed URL resolved server-side.
 */
export function isExternalPhotoUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}
