import { useState } from 'react';
import { Results } from './components/Results';
import { ExportGuide, Faq, FilingGuide, Footer, HowItWorks, NotImporter } from './components/Guides';
import { Upload } from './components/Upload';
import { analyze, parseReport, sampleReport, type Analysis, type ParseResult } from './engine';

interface Checked {
  parsed: ParseResult;
  analysis: Analysis;
  fileName: string;
}

export default function App() {
  const [checked, setChecked] = useState<Checked | null>(null);

  const check = (text: string, fileName: string) => {
    const parsed = parseReport(text);
    setChecked({ parsed, analysis: analyze(parsed.lines), fileName });
    requestAnimationFrame(() => document.getElementById('check')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  return (
    <>
      <header className="wrap nav">
        <a className="logo" href="/">
          <img src="/favicon.svg" alt="" />
          Tariff Refund Check
        </a>
        <nav className="nav-links" aria-label="Sections">
          <a href="#how">How it works</a>
          <a href="#export">Get your report</a>
          <a href="#file">File in CAPE</a>
          <a href="#faq">Questions</a>
        </nav>
      </header>

      <main className="wrap">
        <section className="hero">
          <h1>See the tariff refund you’re owed, and the deadline you can’t miss.</h1>
          <p className="lead">
            The Supreme Court struck down the IEEPA tariffs, and CBP is refunding them, but only if you file, and some
            entries have only weeks left. Drop in your ACE report to see your refund, which entries CBP will still take,
            and get the file you upload.
          </p>
          <div className="trust">
            <span>Free</span>
            <span>Your data never leaves your browser</span>
            <span>No account needed</span>
            <span>You keep 100% of your refund</span>
          </div>
        </section>

        <section id="check" style={{ display: 'grid', gap: 16, scrollMarginTop: 16 }}>
          {checked ? (
            <Results {...checked} onReset={() => setChecked(null)} />
          ) : (
            <Upload onText={check} onSample={() => check(sampleReport(), 'sample-es003.csv (made-up data)')} />
          )}
        </section>

        <HowItWorks />
        <ExportGuide />
        <FilingGuide />
        <NotImporter />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
