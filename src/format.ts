const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const usdWhole = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export const money = (n: number) => usd.format(n);
export const moneyWhole = (n: number) => usdWhole.format(n);
export const date = (d: Date | null) =>
  d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const PLURALS: Record<string, string> = { entry: 'entries' };
export const plural = (n: number, word: string) =>
  `${n.toLocaleString('en-US')} ${n === 1 ? word : (PLURALS[word] ?? `${word}s`)}`;
export const daysLeft = (n: number | null) =>
  n === null ? '' : n < 0 ? 'passed' : n === 0 ? 'today' : n === 1 ? '1 day left' : `${n} days left`;

export function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
