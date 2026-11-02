import Papa from 'papaparse';

/** One HTS line from an ACE ES-003 "Entry Summary Line Tariff Details" export. */
export interface TariffLine {
  /** 11-character entry number with dashes and spaces removed. */
  entryNumber: string;
  entryDate: Date | null;
  hts: string;
  duty: number;
  goodsValue: number | null;
  liquidationStatus: string | null;
  liquidationDate: Date | null;
  entryType: string | null;
  /** From the optional "IEEPA Tariff Indicator" column, when the report includes it. */
  ieepaIndicator: boolean | null;
}

export interface ParseResult {
  lines: TariffLine[];
  /** Columns we found, so the UI can say what's missing. */
  found: Partial<Record<Field, string>>;
  missing: Field[];
  skippedRows: number;
}

export type Field =
  | 'entryNumber'
  | 'entryDate'
  | 'hts'
  | 'duty'
  | 'goodsValue'
  | 'liquidationStatus'
  | 'liquidationDate'
  | 'entryType'
  | 'ieepaIndicator';

export const REQUIRED: Field[] = ['entryNumber', 'hts', 'duty'];
export const RECOMMENDED: Field[] = ['liquidationStatus', 'liquidationDate'];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Header names as ACE (and brokers' exports) spell them, normalized. First match wins. */
const ALIASES: Record<Field, string[]> = {
  entryNumber: ['entrysummarynumber', 'entrynumber', 'entrysummarynbr', 'entrynbr', 'entryno'],
  entryDate: ['entrysummarydate', 'entrydate'],
  hts: ['htsnumberfull', 'htsnumber', 'htsfull', 'htscode', 'hts', 'tariffnumber', 'htsus'],
  duty: ['linetariffdutyamount', 'tariffdutyamount', 'linedutyamount', 'dutyamount', 'calculatedduty', 'duty'],
  goodsValue: ['linetariffgoodsvalueamount', 'goodsvalueamount', 'enteredvalue', 'linevalue'],
  liquidationStatus: ['liquidationstatus', 'liquidationstatuscode', 'liqstatus'],
  liquidationDate: ['liquidationdate', 'liqdate', 'scheduledliquidationdate'],
  entryType: ['entrytypecode', 'entrytype'],
  ieepaIndicator: ['ieepatariffindicator', 'ieepaindicator', 'ieepa'],
};

export function matchColumns(headers: string[]): Partial<Record<Field, number>> {
  const normalized = headers.map(norm);
  const out: Partial<Record<Field, number>> = {};
  for (const field of Object.keys(ALIASES) as Field[]) {
    for (const alias of ALIASES[field]) {
      const i = normalized.indexOf(alias);
      if (i >= 0 && !Object.values(out).includes(i)) {
        out[field] = i;
        break;
      }
    }
  }
  return out;
}

/** "$1,234.56", "1234.56", "(12.00)" → number. Empty → null. */
export function parseMoney(raw: string | undefined): number | null {
  const s = (raw ?? '').trim();
  if (!s) return null;
  const negative = /^\(.*\)$/.test(s) || s.startsWith('-');
  const n = Number.parseFloat(s.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

/** MM/DD/YYYY, M/D/YY, YYYY-MM-DD (optionally with a time). Local calendar date. */
export function parseDate(raw: string | undefined): Date | null {
  const s = (raw ?? '').trim();
  if (!s) return null;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return valid(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(s);
  if (m) {
    const y = Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3]);
    return valid(new Date(y, Number(m[1]) - 1, Number(m[2])));
  }
  return null;
}

const valid = (d: Date) => (Number.isNaN(d.getTime()) ? null : d);

export const cleanEntryNumber = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, '');

function parseFlag(raw: string | undefined): boolean | null {
  const s = (raw ?? '').trim().toLowerCase();
  if (!s) return null;
  if (['y', 'yes', 'true', '1'].includes(s)) return true;
  if (['n', 'no', 'false', '0'].includes(s)) return false;
  return null;
}

/**
 * Parses the CSV text. ACE exports sometimes start with a title block, so the
 * header row is the first row that has an HTS column and an entry number column.
 */
export function parseReport(text: string): ParseResult {
  const { data } = Papa.parse<string[]>(text.replace(/^\uFEFF/, ''), { skipEmptyLines: 'greedy' });
  const headerIndex = data.findIndex((row) => {
    const cols = matchColumns(row);
    return cols.hts !== undefined && cols.entryNumber !== undefined;
  });
  if (headerIndex < 0) {
    return { lines: [], found: {}, missing: [...REQUIRED], skippedRows: data.length };
  }
  const headers = data[headerIndex]!;
  const cols = matchColumns(headers);
  const found = Object.fromEntries(Object.entries(cols).map(([f, i]) => [f, headers[i as number]!])) as ParseResult['found'];
  const missing = [...REQUIRED, ...RECOMMENDED].filter((f) => cols[f] === undefined);

  const lines: TariffLine[] = [];
  let skippedRows = 0;
  for (const row of data.slice(headerIndex + 1)) {
    const get = (f: Field) => (cols[f] === undefined ? undefined : row[cols[f]!]);
    const entryNumber = cleanEntryNumber(get('entryNumber') ?? '');
    const hts = (get('hts') ?? '').trim();
    const duty = parseMoney(get('duty'));
    if (!entryNumber || !hts || duty === null) {
      skippedRows++;
      continue;
    }
    lines.push({
      entryNumber,
      entryDate: parseDate(get('entryDate')),
      hts,
      duty,
      goodsValue: parseMoney(get('goodsValue')),
      liquidationStatus: get('liquidationStatus')?.trim() || null,
      liquidationDate: parseDate(get('liquidationDate')),
      entryType: get('entryType')?.trim() ? get('entryType')!.trim().padStart(2, '0') : null,
      ieepaIndicator: parseFlag(get('ieepaIndicator')),
    });
  }
  return { lines, found, missing, skippedRows };
}
