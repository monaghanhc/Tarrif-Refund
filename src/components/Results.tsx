import { useMemo, useState } from 'react';
import { buildCapeFiles, type Analysis, type Bucket, type Field, type ParseResult } from '../engine';
import { date, daysLeft, download, money, plural } from '../format';

const BUCKET_LABEL: Record<Bucket, string> = {
  cape: 'File in CAPE now',
  protest: 'Protest window',
  final: 'Final: court route',
  check: 'Needs a check',
  ineligible: 'Not eligible for CAPE',
};

const FIELD_LABEL: Record<Field, string> = {
  entryNumber: 'Entry Summary Number',
  entryDate: 'Entry Summary Date',
  hts: 'HTS Number – Full',
  duty: 'Line Tariff Duty Amount',
  goodsValue: 'Line Tariff Goods Value Amount',
  liquidationStatus: 'Liquidation Status',
  liquidationDate: 'Liquidation Date',
  entryType: 'Entry Type Code',
  ieepaIndicator: 'IEEPA Tariff Indicator',
};

export function Results({
  parsed,
  analysis,
  fileName,
  onReset,
}: {
  parsed: ParseResult;
  analysis: Analysis;
  fileName: string;
  onReset: () => void;
}) {
  const files = useMemo(() => buildCapeFiles(analysis.entries), [analysis]);
  const [filter, setFilter] = useState<Bucket | 'all'>('all');
  const { totals } = analysis;
  const missingRequired = parsed.missing.filter((f) => ['entryNumber', 'hts', 'duty'].includes(f));

  if (missingRequired.length || parsed.lines.length === 0) {
    return (
      <div className="callout urgent fade-in" role="alert">
        <h3>We couldn’t read this as an ES-003 report</h3>
        <p>
          {missingRequired.length
            ? `It’s missing: ${missingRequired.map((f) => FIELD_LABEL[f]).join(', ')}.`
            : 'No rows with an entry number, HTS code and duty amount were found.'}{' '}
          Follow the steps in <a href="#export">How to get your report</a> and add those columns, then try again.
        </p>
        <div>
          <button className="btn btn-quiet" onClick={onReset}>
            Try Another File
          </button>
        </div>
      </div>
    );
  }

  const soon = analysis.entries.filter((e) => e.bucket !== 'final' && e.daysLeft !== null && e.daysLeft <= 30);
  const shown = analysis.entries.filter((e) => filter === 'all' || e.bucket === filter);

  return (
    <div className="section fade-in" style={{ paddingTop: 8 }} aria-live="polite">
      <div className="total">
        <span className="muted small">
          From <b>{fileName}</b> · read in your browser, nothing uploaded
        </span>
        {analysis.totalIeepa > 0 ? (
          <>
            <span className="amount">{money(analysis.totalIeepa)}</span>
            <p className="lead">
              in IEEPA tariffs found on {plural(analysis.entries.length, 'entry')}
              {totals.cape.amount > 0 && (
                <>
                  . <b>{money(totals.cape.amount)}</b> can be claimed in CAPE right now
                </>
              )}
              . CBP adds interest by law.
            </p>
          </>
        ) : (
          <>
            <span className="amount">$0</span>
            <p className="lead">
              We didn’t find IEEPA tariff lines (HTS 9903.01.xx or 9903.02.xx) in this report. Check that the date range
              covers Feb 2025 through Feb 2026 and that it includes HTS Number – Full.
            </p>
          </>
        )}
      </div>

      {parsed.missing.some((f) => f === 'liquidationStatus' || f === 'liquidationDate') && (
        <div className="callout warn">
          <b>Add Liquidation Status and Liquidation Date to see your deadlines.</b>
          <p className="small">
            Without them we can’t tell which entries CAPE will still accept. In ACE, add both fields to the report’s Result
            Objects and export again.
          </p>
        </div>
      )}

      {soon.length > 0 && (
        <div className="callout urgent" role="alert">
          <b>
            {plural(soon.length, 'entry')} worth {money(soon.reduce((s, e) => s + e.ieepaDuty, 0))} hit a deadline in
            the next 30 days.
          </b>
          <p className="small">
            The first is <code>{soon[0]!.entryNumber}</code>, which{' '}
            {soon[0]!.bucket === 'protest' ? 'needs a protest filed' : 'must be filed in CAPE'} by {date(soon[0]!.deadline)} (
            {daysLeft(soon[0]!.daysLeft)}).
          </p>
        </div>
      )}

      <div className="buckets">
        <div className="bucket primary">
          <span className="pill cape">File in CAPE now</span>
          <span className="num">{money(totals.cape.amount)}</span>
          <span className="muted small">{plural(totals.cape.entries, 'entry')}</span>
          <ul>
            <li>Unliquidated, or liquidated within the last 80 days</li>
            <li>Upload the file below in ACE’s CAPE tab</li>
          </ul>
          {files.map((f) => (
            <button key={f.name} className="btn btn-primary" onClick={() => download(f.name, f.csv)}>
              Download {f.name.replace('.csv', '')} ({plural(f.entries, 'entry')})
            </button>
          ))}
          {files.length > 1 && (
            <p className="small muted">
              One file per filer code (first 3 characters of the entry number), up to 9,999 entries each.
            </p>
          )}
          {files.length > 0 && (
            <a className="small" href="#file">
              How to upload it
            </a>
          )}
        </div>

        {totals.protest.entries > 0 && (
          <div className="bucket">
            <span className="pill protest">Protest window</span>
            <span className="num">{money(totals.protest.amount)}</span>
            <span className="muted small">{plural(totals.protest.entries, 'entry')}</span>
            <ul>
              <li>Past CAPE’s 80 days, but within 180 days of liquidation</li>
              <li>File a protest in ACE (or have a licensed broker do it) before each deadline to keep your right to a refund</li>
              <li>Today, refunds for these also need a court order. Ask a trade attorney about your options</li>
            </ul>
          </div>
        )}

        {totals.final.entries > 0 && (
          <div className="bucket">
            <span className="pill final">Final: court route</span>
            <span className="num">{money(totals.final.amount)}</span>
            <span className="muted small">{plural(totals.final.entries, 'entry')}</span>
            <ul>
              <li>Liquidated more than 180 days ago</li>
              <li>Refunds currently need a Court of International Trade order (CAPE Phase 3)</li>
              <li>A class action may cover these, but there’s no refund order for it yet. Talk to a trade attorney soon</li>
            </ul>
          </div>
        )}

        {totals.check.entries + totals.ineligible.entries > 0 && (
          <div className="bucket">
            <span className="pill check">Needs a check</span>
            <span className="num">{money(totals.check.amount + totals.ineligible.amount)}</span>
            <span className="muted small">{plural(totals.check.entries + totals.ineligible.entries, 'entry')}</span>
            <ul>
              <li>Missing liquidation info, an unusual entry number, or an entry type CAPE doesn’t take</li>
              <li>See the note on each entry below</li>
            </ul>
          </div>
        )}
      </div>

      <div className="split">
        <div className="callout info">
          <b>Not claimable here</b>
          <p className="small muted">
            Section 301, Section 232 and regular (MFN) duties on the same entries stay owed:{' '}
            {money(analysis.entries.reduce((s, e) => s + e.otherDuty, 0))} in this report.
            {analysis.entriesWithoutIeepa > 0 && ` ${plural(analysis.entriesWithoutIeepa, 'entry')} had no IEEPA duty at all.`}
          </p>
        </div>
        <div className="callout info">
          <b>How sure is this?</b>
          <p className="small muted">
            It’s a careful estimate from your own ACE data using CBP’s published rules (as of Nov 2, 2026). CBP makes the
            final call and calculates interest. Always review the entries before you upload.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
          <h3>Every entry</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(['all', 'cape', 'protest', 'final', 'check', 'ineligible'] as const)
              .filter((b) => b === 'all' || totals[b].entries > 0)
              .map((b) => (
                <button
                  key={b}
                  className={`btn ${filter === b ? 'btn-primary' : 'btn-quiet'}`}
                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                  onClick={() => setFilter(b)}
                >
                  {b === 'all' ? `All (${analysis.entries.length})` : `${BUCKET_LABEL[b]} (${totals[b].entries})`}
                </button>
              ))}
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Entry</th>
                <th>Where it stands</th>
                <th className="num">IEEPA duty</th>
                <th>Liquidation</th>
                <th>Deadline</th>
                <th>Why</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((e) => (
                <tr key={e.entryNumber}>
                  <td>
                    <code>{e.entryNumber}</code>
                  </td>
                  <td>
                    <span className={`pill ${e.bucket}`}>{BUCKET_LABEL[e.bucket]}</span>
                  </td>
                  <td className="num">{money(e.ieepaDuty)}</td>
                  <td className="small">
                    {e.liquidationStatus ?? '—'}
                    {e.liquidationDate && <div className="muted">{date(e.liquidationDate)}</div>}
                  </td>
                  <td className="small">
                    {e.deadline ? (
                      <>
                        {date(e.deadline)}
                        <div className={e.daysLeft !== null && e.daysLeft <= 30 ? '' : 'muted'} style={e.daysLeft !== null && e.daysLeft <= 30 ? { color: 'var(--urgent)', fontWeight: 600 } : undefined}>
                          {daysLeft(e.daysLeft)}
                        </div>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="small muted">{e.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {parsed.skippedRows > 0 && (
          <p className="small muted">{plural(parsed.skippedRows, 'row')} without an entry number, HTS code or duty amount were skipped.</p>
        )}
      </div>

      <div>
        <button className="btn btn-quiet" onClick={onReset}>
          Check Another Report
        </button>
      </div>
    </div>
  );
}
