/**
 * A made-up ES-003 export for the demo. Dates are relative to today so every
 * deadline bucket shows up. Entry numbers use filer code "ZZZ" (not a real filer).
 */
const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
const ago = (today: Date, days: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - days);

interface SampleEntry {
  n: string;
  entered: number;
  liq: { status: string; daysAgo: number | null };
  lines: [string, number, number][]; // HTS, goods value, duty
}

export function sampleReport(today: Date = new Date()): string {
  const entries: SampleEntry[] = [
    {
      n: 'ZZZ-1000017-3',
      entered: 250,
      liq: { status: 'Unliquidated', daysAgo: null },
      lines: [
        ['6110.20.2079', 8400, 1386],
        ['9903.01.24', 8400, 1680],
        ['9903.01.25', 8400, 840],
        ['9903.88.15', 8400, 630],
      ],
    },
    {
      n: 'ZZZ-1000025-1',
      entered: 330,
      liq: { status: 'Liquidated', daysAgo: 64 },
      lines: [
        ['9403.60.8081', 5200, 0],
        ['9903.01.24', 5200, 1040],
        ['9903.01.25', 5200, 520],
      ],
    },
    {
      n: 'ZZZ-1000033-9',
      entered: 300,
      liq: { status: 'Extended', daysAgo: null },
      lines: [
        ['4202.92.9100', 3100, 540],
        ['9903.02.01', 3100, 930],
      ],
    },
    {
      n: 'ZZZ-1000041-7',
      entered: 420,
      liq: { status: 'Liquidated', daysAgo: 120 },
      lines: [
        ['8516.79.0000', 2600, 0],
        ['9903.01.24', 2600, 520],
        ['9903.01.25', 2600, 260],
      ],
    },
    {
      n: 'ZZZ-1000058-2',
      entered: 560,
      liq: { status: 'Liquidated', daysAgo: 230 },
      lines: [
        ['6402.99.3165', 1800, 216],
        ['9903.01.24', 1800, 180],
      ],
    },
    {
      n: 'ZZZ-1000066-5',
      entered: 600,
      liq: { status: 'Liquidated', daysAgo: 290 },
      lines: [['7323.93.0080', 900, 18]],
    },
  ];
  const header = [
    'Entry Summary Number',
    'Entry Summary Date',
    'Entry Summary Line Number',
    'Tariff Ordinal Number',
    'HTS Number - Full',
    'Line Tariff Goods Value Amount',
    'Line Tariff Duty Amount',
    'Liquidation Status',
    'Liquidation Date',
  ];
  const rows = [
    'ES-003 Entry Summary Line Tariff Details (SAMPLE DATA)',
    '',
    header.join(','),
    ...entries.flatMap((e) =>
      e.lines.map(([hts, value, duty], i) =>
        [
          e.n,
          fmt(ago(today, e.entered)),
          '001',
          String(i + 1),
          hts,
          `"$${value.toLocaleString('en-US')}.00"`,
          `"$${duty.toLocaleString('en-US')}.00"`,
          e.liq.status,
          e.liq.daysAgo === null ? '' : fmt(ago(today, e.liq.daysAgo)),
        ].join(','),
      ),
    ),
  ];
  return rows.join('\n');
}
