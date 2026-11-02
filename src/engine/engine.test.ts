import { describe, expect, it } from 'vitest';
import { analyze, buildCapeFiles, isIeepaHts, liquidationState, parseDate, parseMoney, parseReport, sampleReport } from '.';

const today = new Date(2026, 10, 2); // Nov 2, 2026

describe('parsing', () => {
  it('reads money and dates in ACE formats', () => {
    expect(parseMoney('"$1,234.56"'.replace(/"/g, ''))).toBe(1234.56);
    expect(parseMoney('(12.00)')).toBe(-12);
    expect(parseMoney('')).toBeNull();
    expect(parseDate('3/7/2026')?.toDateString()).toBe(new Date(2026, 2, 7).toDateString());
    expect(parseDate('2026-03-07T00:00:00')?.getDate()).toBe(7);
    expect(parseDate('7/3/26')?.getFullYear()).toBe(2026);
    expect(parseDate('soon')).toBeNull();
  });

  it('finds the header row below a title block and maps renamed columns', () => {
    const csv = [
      'Report title',
      'Run 11/1/2026',
      'Entry Number,HTS Number,Calculated Duty,Liq Status,Liq Date',
      'AB1-2345678-9,9903.01.25,"$100.00",Liquidated,10/1/2026',
      ',,,,',
    ].join('\n');
    const r = parseReport(csv);
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0]).toMatchObject({ entryNumber: 'AB123456789', hts: '9903.01.25', duty: 100 });
    expect(r.missing).toEqual([]);
  });

  it('reports what’s missing when the file isn’t an ES-003 export', () => {
    expect(parseReport('name,amount\nfoo,1').missing).toEqual(['entryNumber', 'hts', 'duty']);
    expect(parseReport('Entry Summary Number,HTS Number - Full,Line Tariff Duty Amount\nX,1,1').missing).toEqual([
      'liquidationStatus',
      'liquidationDate',
    ]);
  });
});

describe('IEEPA detection', () => {
  it('counts Chapter 99 IEEPA codes only', () => {
    expect(isIeepaHts('9903.01.24')).toBe(true);
    expect(isIeepaHts('9903020100')).toBe(true);
    expect(isIeepaHts('9903.88.15')).toBe(false); // Section 301
    expect(isIeepaHts('9903.81.90')).toBe(false); // Section 232
    expect(isIeepaHts('6110.20.2079')).toBe(false);
  });

  it('lets the ACE IEEPA indicator override the code', () => {
    const csv = 'Entry Summary Number,HTS Number - Full,Line Tariff Duty Amount,IEEPA Tariff Indicator,Liquidation Status\n' +
      'ABC12345678,9903.01.25,50,N,Unliquidated\nABC12345678,9903.99.99,70,Y,Unliquidated';
    const a = analyze(parseReport(csv).lines, today);
    expect(a.totalIeepa).toBe(70);
  });
});

describe('deadline buckets', () => {
  it('understands ACE liquidation statuses', () => {
    expect(liquidationState('Unliquidated', null, today)).toBe('open');
    expect(liquidationState('Suspended', null, today)).toBe('open');
    expect(liquidationState('Liquidated', new Date(2026, 8, 1), today)).toBe('liquidated');
    expect(liquidationState('Liquidated', new Date(2026, 11, 1), today)).toBe('open');
    expect(liquidationState('Liquidated', null, today)).toBe('unknown');
    expect(liquidationState(null, null, today)).toBe('unknown');
  });

  it('sorts the sample into CAPE now, protest, final and nothing-to-claim', () => {
    const a = analyze(parseReport(sampleReport(today)).lines, today);
    expect(a.totals.cape).toEqual({ entries: 3, amount: 1680 + 840 + 1040 + 520 + 930 });
    expect(a.totals.protest).toEqual({ entries: 1, amount: 780 });
    expect(a.totals.final).toEqual({ entries: 1, amount: 180 });
    expect(a.entriesWithoutIeepa).toBe(1);
    // Section 301 and MFN duty stay out of the refund.
    expect(a.entries.find((e) => e.entryNumber === 'ZZZ10000173')).toMatchObject({ ieepaDuty: 2520, otherDuty: 2016 });
    // Liquidated 64 days ago: 16 days left in CAPE, and it's the most urgent.
    expect(a.earliestCapeDeadline).toMatchObject({ entryNumber: 'ZZZ10000251', daysLeft: 16 });
    expect(a.entries.find((e) => e.bucket === 'protest')).toMatchObject({ daysLeft: 60 });
  });

  it('keeps bad entry numbers and excluded entry types out of CAPE', () => {
    const csv = 'Entry Summary Number,Entry Type Code,HTS Number - Full,Line Tariff Duty Amount,Liquidation Status\n' +
      'ABC123,01,9903.01.25,10,Unliquidated\nABC12345678,9,9903.01.25,10,Unliquidated\nABD12345678,1,9903.01.25,10,Unliquidated';
    const a = analyze(parseReport(csv).lines, today);
    expect(a.entries.map((e) => [e.entryNumber, e.bucket])).toEqual([
      ['ABD12345678', 'cape'],
      ['ABC123', 'check'],
      ['ABC12345678', 'ineligible'],
    ]);
  });
});

describe('CAPE files', () => {
  it('writes one column with the exact header, split by filer code', () => {
    const csv = 'Entry Summary Number,HTS Number - Full,Line Tariff Duty Amount,Liquidation Status\n' +
      'BBB12345678,9903.01.25,10,Unliquidated\nAAA12345678,9903.01.25,10,Unliquidated\nAAA12345678,9903.01.24,5,Unliquidated\n' +
      'AAA87654321,9903.01.25,10,Unliquidated';
    const files = buildCapeFiles(analyze(parseReport(csv).lines, today).entries);
    expect(files.map((f) => [f.name, f.entries])).toEqual([
      ['CAPE-declaration-AAA.csv', 2],
      ['CAPE-declaration-BBB.csv', 1],
    ]);
    expect(files[0]!.csv.split('\r\n')[0]).toBe('Entry Number');
    expect(files[0]!.csv).not.toContain(',');
  });

  it('splits above 9,999 entries per file', () => {
    const rows = Array.from({ length: 10_050 }, (_, i) => `AAA${String(i).padStart(8, '0')},9903.01.25,1,Unliquidated`);
    const csv = 'Entry Summary Number,HTS Number - Full,Line Tariff Duty Amount,Liquidation Status\n' + rows.join('\n');
    const files = buildCapeFiles(analyze(parseReport(csv).lines, today).entries);
    expect(files.map((f) => f.entries)).toEqual([9_999, 51]);
  });
});
