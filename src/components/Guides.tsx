import { RULES_AS_OF } from '../engine';

export function HowItWorks() {
  return (
    <section className="section" id="how">
      <h2>How it works</h2>
      <div className="steps">
        <div className="step">
          <b>Step 1</b>
          <h3>Export one report from ACE</h3>
          <p className="muted small">The ES-003 line report lists every tariff you paid, line by line. It takes about 5 minutes.</p>
        </div>
        <div className="step">
          <b>Step 2</b>
          <h3>See your refund and deadlines</h3>
          <p className="muted small">
            We find the IEEPA tariffs, total them, and sort every entry by what you can still do and by when.
          </p>
        </div>
        <div className="step">
          <b>Step 3</b>
          <h3>Upload the CAPE file in ACE</h3>
          <p className="muted small">
            Download a file in CBP’s exact format and upload it yourself. CBP pays your bank directly, usually 60 to 90 days
            after acceptance.
          </p>
        </div>
      </div>
    </section>
  );
}

export function ExportGuide() {
  return (
    <section className="section" id="export">
      <h2>How to get your ES-003 report</h2>
      <p className="muted">
        You need to be the importer of record (or its customs broker) with an ACE Portal account. If you don’t have one,
        see <a href="#not-importer">Didn’t import it yourself?</a> below.
      </p>
      <ol className="guide">
        <li>
          Log in to the <a href="https://ace.cbp.dhs.gov" target="_blank" rel="noreferrer">ACE Portal</a> and open{' '}
          <b>Reports › Entry Summary › ES-003 Entry Summary Line Tariff Details</b>.
        </li>
        <li>
          Set <b>Entry Summary Date</b> from <code>2/1/2025</code> to <code>2/28/2026</code>. IEEPA tariffs were collected
          from February 2025 until February 23, 2026.
        </li>
        <li>
          In <b>Result Objects</b>, make sure these columns are included: <b>Entry Summary Number</b>, <b>HTS Number – Full</b>
          , <b>Line Tariff Duty Amount</b>, <b>Liquidation Status</b> and <b>Liquidation Date</b>. The last two aren’t there by
          default, and they’re what tell you your deadlines. Optional: Entry Summary Date, Line Tariff Goods Value Amount,
          Entry Type Code, and the IEEPA tariff indicator.
        </li>
        <li>
          Run the report, then use the <b>•••</b> menu › <b>Export</b> › <b>CSV</b>.
        </li>
        <li>
          Drop the CSV into the box at the top of this page. If the report times out, run it in smaller date ranges and check
          each file.
        </li>
      </ol>
    </section>
  );
}

export function FilingGuide() {
  return (
    <section className="section" id="file">
      <h2>How to file in CAPE</h2>
      <ol className="guide">
        <li>
          <b>Set up refund banking.</b> In ACE, add an <b>ACH Refund</b> bank account in your Importer account. It’s separate
          from the account you pay duties with, and CBP only pays refunds by ACH.
        </li>
        <li>
          <b>Upload your file.</b> Open the <b>CAPE</b> tab, choose <b>Upload</b>, and select the CAPE file from this page. It
          has one column titled <code>Entry Number</code>, one entry per row.
        </li>
        <li>
          <b>Check the result.</b> The upload history shows Accepted, Accepted with Error(s) or Rejected. Download the details
          to see any entry CBP turned down and why.
        </li>
        <li>
          <b>Track the money.</b> Use ACE reports <b>ES-022</b> (CAPE entries) and <b>REV-603</b> (refund status). Valid refunds
          are usually paid 60 to 90 days after acceptance, with interest.
        </li>
      </ol>
      <p className="small muted">
        Using a customs broker? They can upload the same file for you. Brokers and filer accounts can only include entries
        that start with their own filer code, which is why we make one file per filer code.
      </p>
    </section>
  );
}

export function NotImporter() {
  return (
    <section className="section" id="not-importer">
      <h2>Didn’t import it yourself?</h2>
      <div className="split">
        <div className="step">
          <h3>Shipped by UPS, FedEx or DHL</h3>
          <p className="muted small">
            When the carrier was the importer of record, it claims the refund and passes it back to whoever paid the duties.
            Check your carrier’s refund page: <a href="https://ieepa-refunds.fedex.com/faq" target="_blank" rel="noreferrer">FedEx</a>
            ,{' '}
            <a href="https://www.ups.com/us/en/shipping/international-shipping/tariffs/tariff-refunds/refund-eligible-shipments" target="_blank" rel="noreferrer">
              UPS
            </a>
            ,{' '}
            <a href="https://www.dhl.com/discover/en-us/global-logistics-advice/logistics-insights/navigating-us-trade-uncertainty/IEEPA-Trump-Tariff-Refunds" target="_blank" rel="noreferrer">
              DHL
            </a>
            .
          </p>
        </div>
        <div className="step">
          <h3>Bought from a US supplier</h3>
          <p className="muted small">
            Only the importer of record can claim from CBP. If your supplier billed you a separate tariff surcharge, you can ask
            for your share of its refund. Whether it has to pay depends on your contract, so keep the invoices and talk to a
            lawyer for large amounts.
          </p>
        </div>
      </div>
    </section>
  );
}

const FAQ: [string, string][] = [
  ['Is this really free?', 'Yes. Checking your report and downloading the CAPE file are free while we’re in beta.'],
  [
    'Do you see my data?',
    'No. Your report is read by your own browser and never sent to us or anyone else. The site is locked by a security policy that blocks it from sending data anywhere, which you can check in your browser’s developer tools. Close the tab and it’s gone.',
  ],
  [
    'Do you file the claim for me?',
    'No. We’re an independent tool, not a customs broker or law firm. You (the importer of record) or your licensed customs broker upload the file in ACE.',
  ],
  [
    'How is the refund calculated?',
    'We add up the duty on lines with the IEEPA Chapter 99 codes (HTS 9903.01.xx and 9903.02.xx), or on lines ACE marks with the IEEPA indicator. Section 301, Section 232 and regular duties aren’t refundable and are left out. CBP adds interest and has the final word on the amount.',
  ],
  [
    'Why does 80 days matter?',
    'CBP can only fix a liquidated entry on its own for a short time after liquidation, so CAPE accepts liquidated entries for 80 days. After that, a protest (within 180 days of liquidation) keeps your rights open.',
  ],
  [
    'My entries are past 180 days. Is the money gone?',
    'Not necessarily. Today, refunds for finally liquidated entries need a Court of International Trade order (CAPE Phase 3), and a class action is pending. Deadlines to sue may start running in early 2027, so talk to a trade attorney soon.',
  ],
  [
    'Why are there two (or more) CAPE files?',
    'CBP allows up to 9,999 entries per file, and broker or filer accounts can only upload entries that start with their own filer code. We split the files so each one passes CBP’s checks.',
  ],
];

export function Faq() {
  return (
    <section className="section" id="faq">
      <h2>Questions</h2>
      <div>
        {FAQ.map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="wrap">
      <p>
        Tariff Refund Check is an independent tool. It isn’t affiliated with U.S. Customs and Border Protection, isn’t a
        licensed customs broker, and doesn’t give legal advice. Rules reflect CBP guidance and court orders as of {RULES_AS_OF}
        ; they’re changing, so always confirm in ACE.
      </p>
      <p>
        Sources:{' '}
        <a href="https://www.cbp.gov/trade/programs-administration/trade-remedies/ieepa-duty-refunds" target="_blank" rel="noreferrer">
          CBP IEEPA Duty Refunds
        </a>
        ,{' '}
        <a href="https://www.cbp.gov/sites/default/files/2026-06/ace_portal_cape_qrg_trade.pdf" target="_blank" rel="noreferrer">
          CAPE quick reference guide
        </a>
        ,{' '}
        <a href="https://www.cbp.gov/trade/automated/ace-reports/monitoring-refunds" target="_blank" rel="noreferrer">
          ACE refund reports
        </a>
        .
      </p>
    </footer>
  );
}
