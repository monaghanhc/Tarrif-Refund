import type { TariffLine } from './parse';

/**
 * Rules as of Nov 2, 2026 (CBP CAPE guidance and Court of International Trade orders):
 * - CAPE accepts entries that are unliquidated (incl. suspended/extended/under review)
 *   or liquidated within the past 80 days.
 * - After liquidation an importer has 180 days to protest (19 U.S.C. 1514).
 * - Past that, entries are finally liquidated; refunds currently need a CIT order.
 * - CAPE rejects entry types 08 (duty deferral), 09 (recon), 23 (TIB) and 47 (drawback).
 */
export const RULES_AS_OF = 'November 2, 2026';
export const CAPE_WINDOW_DAYS = 80;
export const PROTEST_WINDOW_DAYS = 180;
const INELIGIBLE_TYPES: Record<string, string> = {
  '08': 'Duty deferral entries (type 08) can’t go through CAPE.',
  '09': 'Reconciliation entries (type 09) can’t go through CAPE.',
  '23': 'Temporary importation under bond (type 23) can’t go through CAPE.',
  '47': 'Drawback entries (type 47) can’t go through CAPE.',
};

export type Bucket = 'cape' | 'protest' | 'final' | 'check' | 'ineligible';

export interface EntrySummary {
  entryNumber: string;
  filerCode: string;
  validNumber: boolean;
  entryDate: Date | null;
  liquidationStatus: string | null;
  liquidationDate: Date | null;
  /** Sum of duties on IEEPA lines (the refundable principal, before interest). */
  ieepaDuty: number;
  /** Duties on other lines (Section 301/232/MFN, etc.), not refundable here. */
  otherDuty: number;
  ieepaLines: number;
  bucket: Bucket;
  /** Last day to act for this bucket (CAPE: liquidation + 80; protest: liquidation + 180). */
  deadline: Date | null;
  daysLeft: number | null;
  reason: string;
}

export interface Analysis {
  entries: EntrySummary[];
  totals: Record<Bucket, { entries: number; amount: number }>;
  totalIeepa: number;
  /** Entries with no IEEPA duty at all (nothing to claim). */
  entriesWithoutIeepa: number;
  earliestCapeDeadline: EntrySummary | null;
}

/** IEEPA duties were reported under HTS 9903.01.xx and 9903.02.xx (Chapter 99). */
export function isIeepaHts(hts: string): boolean {
  const digits = hts.replace(/\D/g, '');
  return digits.startsWith('990301') || digits.startsWith('990302');
}

const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const daysBetween = (a: Date, b: Date) => Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY);

type Liquidation = 'open' | 'liquidated' | 'unknown';

/** ACE spells statuses out ("Unliquidated", "Liquidated", "Suspended", "Extended"). */
export function liquidationState(status: string | null, date: Date | null, today: Date): Liquidation {
  const s = (status ?? '').toLowerCase();
  if (/unliq|suspend|extend|review|open|pending/.test(s)) return 'open';
  if (/liq/.test(s) || s === 'l') return date ? (date > today ? 'open' : 'liquidated') : 'unknown';
  if (!s) {
    if (!date) return 'unknown';
    // No status column: a past date means it liquidated; a future one is scheduled.
    return date > today ? 'open' : 'liquidated';
  }
  return 'unknown';
}

export function analyze(lines: TariffLine[], today: Date = new Date()): Analysis {
  const byEntry = new Map<string, TariffLine[]>();
  for (const l of lines) byEntry.set(l.entryNumber, [...(byEntry.get(l.entryNumber) ?? []), l]);

  const entries: EntrySummary[] = [];
  let entriesWithoutIeepa = 0;
  for (const [entryNumber, ls] of byEntry) {
    // ACE's IEEPA indicator wins when the report has it; otherwise the Chapter 99 code decides.
    const ieepa = ls.filter((l) => l.ieepaIndicator ?? isIeepaHts(l.hts));
    const ieepaDuty = round2(ieepa.reduce((s, l) => s + l.duty, 0));
    const otherDuty = round2(ls.filter((l) => !ieepa.includes(l)).reduce((s, l) => s + l.duty, 0));
    if (ieepaDuty <= 0) {
      entriesWithoutIeepa++;
      continue;
    }
    const first = ls[0]!;
    const liquidationDate = ls.find((l) => l.liquidationDate)?.liquidationDate ?? null;
    const liquidationStatus = ls.find((l) => l.liquidationStatus)?.liquidationStatus ?? null;
    const entryType = ls.find((l) => l.entryType)?.entryType ?? null;
    const base = {
      entryNumber,
      filerCode: entryNumber.slice(0, 3),
      validNumber: /^[A-Z0-9]{11}$/.test(entryNumber),
      entryDate: first.entryDate,
      liquidationStatus,
      liquidationDate,
      ieepaDuty,
      otherDuty,
      ieepaLines: ieepa.length,
    };
    entries.push({ ...base, ...classify(base.validNumber, entryType, liquidationStatus, liquidationDate, today) });
  }

  entries.sort((a, b) => order(a) - order(b) || (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999) || b.ieepaDuty - a.ieepaDuty);
  const buckets: Bucket[] = ['cape', 'protest', 'final', 'check', 'ineligible'];
  const totals = Object.fromEntries(
    buckets.map((b) => {
      const es = entries.filter((e) => e.bucket === b);
      return [b, { entries: es.length, amount: round2(es.reduce((s, e) => s + e.ieepaDuty, 0)) }];
    }),
  ) as Analysis['totals'];
  const capeWithDeadline = entries.filter((e) => e.bucket === 'cape' && e.deadline);
  return {
    entries,
    totals,
    totalIeepa: round2(entries.reduce((s, e) => s + e.ieepaDuty, 0)),
    entriesWithoutIeepa,
    earliestCapeDeadline: capeWithDeadline.sort((a, b) => a.deadline!.getTime() - b.deadline!.getTime())[0] ?? null,
  };
}

function classify(
  validNumber: boolean,
  entryType: string | null,
  status: string | null,
  liqDate: Date | null,
  today: Date,
): Pick<EntrySummary, 'bucket' | 'deadline' | 'daysLeft' | 'reason'> {
  if (!validNumber) {
    return { bucket: 'check', deadline: null, daysLeft: null, reason: 'Entry numbers must be 11 letters or digits. Check this one in ACE.' };
  }
  if (entryType && INELIGIBLE_TYPES[entryType]) {
    return { bucket: 'ineligible', deadline: null, daysLeft: null, reason: INELIGIBLE_TYPES[entryType]! };
  }
  const state = liquidationState(status, liqDate, today);
  if (state === 'unknown') {
    return {
      bucket: 'check',
      deadline: null,
      daysLeft: null,
      reason: 'Liquidation status or date is missing. Add both columns to your ES-003 report to see this entry’s deadline.',
    };
  }
  if (state === 'open') {
    const deadline = liqDate ? addDays(liqDate, CAPE_WINDOW_DAYS) : null;
    return {
      bucket: 'cape',
      deadline,
      daysLeft: deadline ? daysBetween(today, deadline) : null,
      reason: liqDate
        ? 'Not liquidated yet. File in CAPE now; the window closes 80 days after it liquidates.'
        : 'Not liquidated yet. File in CAPE now.',
    };
  }
  const since = daysBetween(liqDate!, today);
  if (since <= CAPE_WINDOW_DAYS) {
    const deadline = addDays(liqDate!, CAPE_WINDOW_DAYS);
    return { bucket: 'cape', deadline, daysLeft: daysBetween(today, deadline), reason: `Liquidated ${since} days ago. CAPE accepts it for up to 80 days.` };
  }
  if (since <= PROTEST_WINDOW_DAYS) {
    const deadline = addDays(liqDate!, PROTEST_WINDOW_DAYS);
    return {
      bucket: 'protest',
      deadline,
      daysLeft: daysBetween(today, deadline),
      reason: `Liquidated ${since} days ago: past CAPE’s 80 days, but a protest can still be filed within 180.`,
    };
  }
  return {
    bucket: 'final',
    deadline: null,
    daysLeft: null,
    reason: `Liquidated ${since} days ago, so it’s final. Refunds for final entries currently need a court order.`,
  };
}

const order = (e: EntrySummary) => ['cape', 'protest', 'check', 'final', 'ineligible'].indexOf(e.bucket);
const round2 = (n: number) => Math.round(n * 100) / 100;
