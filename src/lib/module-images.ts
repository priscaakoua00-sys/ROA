import 'server-only';

import fs from 'fs';
import path from 'path';

export type ModuleImageKey =
  | 'repairs'
  | 'appointments'
  | 'invoices'
  | 'parts'
  | 'diagnostics'
  | 'history'
  | 'robin';

const MODULE_DIR = path.join(process.cwd(), 'public', 'images', 'modules');
const EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

/**
 * Looks for /public/images/modules/<key>.{jpg,jpeg,png,webp} and returns its
 * public URL, or null if nobody has dropped a photo in yet. This is the only
 * place that needs to know the file naming convention: pages just render
 * whatever comes back (or a themed placeholder) and never touch the disk
 * directly, so adding a real photo later is a file drop, not a code change.
 */
export function getModuleImageSrc(key: ModuleImageKey): string | null {
  for (const ext of EXTENSIONS) {
    const file = `${key}.${ext}`;
    if (fs.existsSync(path.join(MODULE_DIR, file))) {
      return `/images/modules/${file}`;
    }
  }
  return null;
}
