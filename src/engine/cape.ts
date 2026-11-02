import type { EntrySummary } from './analyze';

/** CBP's limit per CAPE Declaration (its guidance says both 9,999 and 10,000; stay under). */
export const MAX_ENTRIES_PER_FILE = 9_999;

export interface CapeFile {
  name: string;
  filerCode: string;
  entries: number;
  csv: string;
}

/**
 * CAPE Declaration CSVs: one column, header "Entry Number", one entry per row.
 * Split by filer code (filer/broker accounts must match the first three
 * characters) and at 9,999 entries per file.
 */
export function buildCapeFiles(entries: EntrySummary[]): CapeFile[] {
  const eligible = entries.filter((e) => e.bucket === 'cape' && e.validNumber);
  const byFiler = new Map<string, string[]>();
  for (const e of eligible) {
    const list = byFiler.get(e.filerCode) ?? [];
    if (!list.includes(e.entryNumber)) list.push(e.entryNumber);
    byFiler.set(e.filerCode, list);
  }
  const files: CapeFile[] = [];
  for (const [filerCode, numbers] of [...byFiler].sort(([a], [b]) => a.localeCompare(b))) {
    for (let i = 0; i < numbers.length; i += MAX_ENTRIES_PER_FILE) {
      const chunk = numbers.slice(i, i + MAX_ENTRIES_PER_FILE);
      const part = numbers.length > MAX_ENTRIES_PER_FILE ? `-part${i / MAX_ENTRIES_PER_FILE + 1}` : '';
      files.push({
        name: `CAPE-declaration-${filerCode}${part}.csv`,
        filerCode,
        entries: chunk.length,
        csv: ['Entry Number', ...chunk].join('\r\n') + '\r\n',
      });
    }
  }
  return files;
}
