import { useRef, useState } from 'react';
import { createWorker } from 'tesseract.js';

export interface ScanResult {
  gross: string;
  date: string;
}

interface Props {
  onResult: (result: ScanResult) => void;
}

// ── OCR extraction helpers ────────────────────────────────────────────────────

/**
 * Finds all currency-formatted numbers in the OCR text and returns the
 * largest one, which is most likely the receipt total.
 * Matches: £12.50  12.50  12,50  1,234.56  etc.
 */
function extractLargestAmount(text: string): string {
  const pattern = /(?:£\s*)?(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})|\d+\.\d{2})/g;
  const matches = [...text.matchAll(pattern)];
  if (!matches.length) return '';
  const amounts = matches
    .map(m => parseFloat(m[1].replace(/[,\s]/g, '')))
    .filter(n => !isNaN(n) && n > 0);
  if (!amounts.length) return '';
  return Math.max(...amounts).toFixed(2);
}

/**
 * Tries to find a date in several common receipt formats and returns
 * it as a YYYY-MM-DD string for the date input.
 * Handles:
 *   DD/MM/YYYY  DD-MM-YYYY  DD.MM.YYYY
 *   YYYY-MM-DD
 *   DD Mon YYYY  (e.g. 12 Apr 2026)
 *   Mon DD YYYY  (e.g. Apr 12 2026)
 */
function extractDate(text: string): string {
  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmy = text.match(/\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // YYYY-MM-DD
  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return iso[0];

  // DD Mon YYYY or Mon DD YYYY (named month)
  const named = text.match(
    /\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})\b/i,
  );
  if (named) {
    const [, d, mon, y] = named;
    return `${y}-${months[mon.toLowerCase().slice(0, 3)]}-${d.padStart(2, '0')}`;
  }

  const namedRev = text.match(
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})[,\s]+(\d{4})\b/i,
  );
  if (namedRev) {
    const [, mon, d, y] = namedRev;
    return `${y}-${months[mon.toLowerCase().slice(0, 3)]}-${d.padStart(2, '0')}`;
  }

  return '';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ReceiptScanner({ onResult }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setScanning(true);
    setProgress(0);

    try {
      const worker = await createWorker('eng', 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const { data } = await worker.recognize(file);
      await worker.terminate();

      const text = data.text;
      const gross = extractLargestAmount(text);
      const date = extractDate(text);

      if (!gross && !date) {
        setError('Could not read receipt. Please enter details manually.');
      } else {
        onResult({ gross, date });
      }
    } catch {
      setError('Scan failed. Please enter details manually.');
    } finally {
      setScanning(false);
      setProgress(0);
      // Reset input so the same file can be re-scanned
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="scanner-wrap">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFile}
        id="receipt-file-input"
      />

      <button
        type="button"
        className={`btn btn-outline btn-sm scanner-btn ${scanning ? 'scanning' : ''}`}
        onClick={() => !scanning && inputRef.current?.click()}
        disabled={scanning}
        title="Scan receipt"
      >
        {scanning ? (
          <>
            <span className="scanner-spinner" />
            {progress > 0 ? `${progress}%` : 'Reading…'}
          </>
        ) : (
          <>
            <CameraIcon />
            Scan
          </>
        )}
      </button>

      {error && <p className="scanner-error">{error}</p>}
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
