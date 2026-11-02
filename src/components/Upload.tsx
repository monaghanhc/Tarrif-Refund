import { useRef, useState } from 'react';

const MAX_BYTES = 50 * 1024 * 1024;

/** Drop zone. The file is read in the browser and never uploaded anywhere. */
export function Upload({ onText, onSample }: { onText: (text: string, name: string) => void; onSample: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const read = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (/\.(xlsx?|xlsm)$/i.test(file.name)) {
      setError('That’s an Excel file. In ACE, export the ES-003 report as CSV, or in Excel use File › Save As › CSV.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('That file is over 50 MB. Run the report for a shorter date range and check each file separately.');
      return;
    }
    onText(await file.text(), file.name);
  };

  return (
    <div
      className={`drop${over ? ' over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        void read(e.dataTransfer.files[0]);
      }}
    >
      <h3>Drop your ES-003 report (CSV) here</h3>
      <p className="muted small">It’s read right here in your browser. Nothing is uploaded or stored.</p>
      <div className="actions">
        <button className="btn btn-primary" onClick={() => input.current?.click()}>
          Choose CSV File
        </button>
        <button className="btn btn-quiet" onClick={onSample}>
          Try With Sample Data
        </button>
      </div>
      <a className="small" href="#export">
        How do I get this report?
      </a>
      <input
        ref={input}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={(e) => {
          void read(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {error && (
        <p className="callout warn small" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
