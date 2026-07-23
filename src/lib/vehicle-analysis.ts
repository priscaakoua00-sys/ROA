import type { VehicleDossier } from '@/integrations/rdw/client';

export type InsightLevel = 'urgent' | 'warning' | 'good';
export type InsightCode =
  | 'apkExpired'
  | 'apkSoon'
  | 'recallOpen'
  | 'notInsured'
  | 'odometerIllogical'
  | 'apkOk'
  | 'allClear';
export type InsightAction = 'bookApk' | 'notifyCustomer' | null;

export interface VehicleInsight {
  code: InsightCode;
  level: InsightLevel;
  action: InsightAction;
  /** Filled for the templated messages that need them. */
  weeks?: number;
  date?: string;
}

function weeksUntil(iso: string, now: Date): number {
  return Math.round((new Date(iso).getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 7));
}

/**
 * Ruben's read of a vehicle: turns raw public data into a short, ranked list of
 * what actually matters — most urgent first — each carrying a suggested action.
 * Deterministic (no AI cost), so it is instant and always the same. The first
 * item becomes Ruben's headline on the sheet.
 */
export function analyzeVehicle(dossier: VehicleDossier, now: Date = new Date()): VehicleInsight[] {
  const out: VehicleInsight[] = [];

  if (dossier.apkExpiry) {
    const weeks = weeksUntil(dossier.apkExpiry, now);
    if (weeks < 0) {
      out.push({ code: 'apkExpired', level: 'urgent', action: 'bookApk', date: dossier.apkExpiry });
    } else if (weeks <= 6) {
      out.push({ code: 'apkSoon', level: 'warning', action: 'bookApk', weeks, date: dossier.apkExpiry });
    }
  }

  if (dossier.openRecall === true) {
    out.push({ code: 'recallOpen', level: 'urgent', action: 'notifyCustomer' });
  }

  if (dossier.insuredWam === false) {
    out.push({ code: 'notInsured', level: 'warning', action: 'notifyCustomer' });
  }

  if (dossier.odometerJudgement && /onlogisch/i.test(dossier.odometerJudgement)) {
    out.push({ code: 'odometerIllogical', level: 'warning', action: null });
  }

  // Rank: urgent first, then warnings; stable within a level.
  const rank: Record<InsightLevel, number> = { urgent: 0, warning: 1, good: 2 };
  out.sort((a, b) => rank[a.level] - rank[b.level]);

  if (out.length === 0) {
    if (dossier.apkExpiry) {
      out.push({ code: 'apkOk', level: 'good', action: null, date: dossier.apkExpiry });
    } else {
      out.push({ code: 'allClear', level: 'good', action: null });
    }
  }
  return out;
}
