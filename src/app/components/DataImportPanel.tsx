import { useRef, useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Loader2, AlertCircle, Info } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAppStore, type Transaction } from '../../store/useAppStore';

// ─── Date Normalizer ──────────────────────────────────────────────────────────

function normalizeDate(raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return '';
  const s = String(raw).trim();

  // Excel serial date number (e.g. 45658)
  const n = Number(s);
  if (!isNaN(n) && n > 10000 && n < 100000) {
    // Excel epoch: Dec 30, 1899
    const d = new Date(Date.UTC(1899, 11, 30) + n * 86400000);
    return d.toISOString().slice(0, 10);
  }

  // DD/MM/YYYY or DD-MM-YYYY (Indonesian format)
  const m1 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m1) return `${m1[3]}-${m1[2].padStart(2, '0')}-${m1[1].padStart(2, '0')}`;

  // YYYY/MM/DD or YYYY-MM-DD
  const m2 = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (m2) return `${m2[1]}-${m2[2].padStart(2, '0')}-${m2[3].padStart(2, '0')}`;

  // Try native parse as fallback
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);

  return s;
}

// ─── Excel Parser ─────────────────────────────────────────────────────────────

function parseWorkbook(file: File): Promise<Transaction[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result as ArrayBuffer, { type: 'array', cellDates: false });

        // FIX 1: Prioritaskan sheet 'transaksi 20%' sebagai sumber data utama.
        // Kode lama milih sheet dengan row terbanyak → kena 'transaksi baru' (1.938 baris).
        // Sekarang cari sheet prioritas dulu, baru fallback ke logika lama.
        const PRIORITY_SHEETS = ['transaksi 20%', 'transaksi20%', 'transaksi_20%'];
        const EXCLUDE_KEYWORDS = ['nilai', 'support', 'confidence', 'lift', 'itemset', 'sheet2', 'asosia', 'asosias'];

        let sheetName = '';

        // Cari sheet prioritas dulu
        for (const target of PRIORITY_SHEETS) {
          const found = wb.SheetNames.find(n => n.toLowerCase().trim() === target.toLowerCase());
          if (found) { sheetName = found; break; }
        }

        // Kalau tidak ada sheet prioritas, fallback ke sheet dengan row terbanyak
        if (!sheetName) {
          let bestScore = -1;
          for (const name of wb.SheetNames) {
            const lower = name.toLowerCase();
            if (EXCLUDE_KEYWORDS.some(k => lower.includes(k))) continue;
            const wsTest = wb.Sheets[name];
            const ref = wsTest['!ref'];
            if (!ref) continue;
            const range = XLSX.utils.decode_range(ref);
            if (range.e.r > bestScore) { bestScore = range.e.r; sheetName = name; }
          }
        }

        if (!sheetName) sheetName = wb.SheetNames[0];

        const ws = wb.Sheets[sheetName];
        const allRows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true }) as unknown[][];

        // FIX 2: Skip baris kosong di awal untuk handle sheet 'transaksi 20%'
        // yang punya 2 baris kosong + kolom pertama kosong sebelum header.
        // Kode lama langsung baca baris 0 sebagai header → kolom tidak terdeteksi.
        let headerRowIdx = 0;
        for (let r = 0; r < Math.min(allRows.length, 10); r++) {
          const row = allRows[r] as unknown[];
          const nonEmpty = row.filter(c => String(c ?? '').trim() !== '');
          if (nonEmpty.length >= 2) { headerRowIdx = r; break; }
        }

        const rows = allRows.slice(headerRowIdx);

        if (rows.length < 2) {
          reject(new Error('Sheet tidak memiliki cukup data (minimal 2 baris termasuk header).'));
          return;
        }

        const headerRaw = rows[0] as unknown[];
        const header = headerRaw.map(h => String(h ?? '').toLowerCase().trim());

        // Detect column indices
        const idColIdx = header.findIndex(h =>
          h.includes('id') || h.includes('kode') || h.includes('transaksi') || h === 'no'
        );
        const dateColIdx = header.findIndex(h =>
          h.includes('tanggal') || h.includes('date') || h.includes('tgl') || h.includes('waktu')
        );
        const itemColIdx = header.findIndex(h =>
          h.includes('layanan') || h.includes('item') || h.includes('treatment') ||
          h.includes('produk') || h.includes('service') || h.includes('jenis')
        );

        const transactions: Transaction[] = [];

        // ── LONG FORMAT: one item per row (most common format in this Excel) ──
        if (itemColIdx >= 0) {
          const txMap = new Map<string, { date: string; services: Set<string> }>();

          for (let r = 1; r < rows.length; r++) {
            const row = rows[r] as unknown[];
            const rawId   = idColIdx >= 0  ? String(row[idColIdx]   ?? '').trim() : `TXN-${r}`;
            const rawDate = dateColIdx >= 0 ? row[dateColIdx]                      : '';
            const rawItem = itemColIdx >= 0 ? String(row[itemColIdx] ?? '').trim() : '';

            if (!rawId || !rawItem) continue;

            const date = normalizeDate(rawDate);

            if (!txMap.has(rawId)) txMap.set(rawId, { date, services: new Set() });

            // Handle comma-separated items in one cell (format sheet transaksi 20%)
            rawItem.split(/[,;]/).forEach(part => {
              const p = part.trim();
              if (p) txMap.get(rawId)!.services.add(p);
            });
          }

          for (const [id, { date, services }] of txMap) {
            if (services.size === 0) continue;
            transactions.push({ id, date, services: [...services] });
          }
        } else {
          // ── WIDE FORMAT: each column = one service slot ──
          const skipCols = new Set([idColIdx, dateColIdx].filter(i => i >= 0));
          const firstDataRow = (rows[1] as unknown[]).map(c => String(c ?? '').trim().toLowerCase());
          const nonSkipVals = firstDataRow.filter((_, i) => !skipCols.has(i) && firstDataRow[i]);
          const isBinary = nonSkipVals.length > 0 && nonSkipVals.every(v =>
            ['1', '0', 'ya', 'tidak', 'y', 'n', 'v', 'x', 'true', 'false'].includes(v)
          );

          for (let r = 1; r < rows.length; r++) {
            const row = (rows[r] as unknown[]).map(c => String(c ?? '').trim());
            if (row.every(c => !c)) continue;

            const txId = idColIdx >= 0 ? (row[idColIdx] || `TXN-${r}`) : `TXN-${r}`;
            const date = dateColIdx >= 0 ? normalizeDate(row[dateColIdx]) : '';
            const services: string[] = [];

            if (isBinary) {
              header.forEach((h, i) => {
                if (skipCols.has(i)) return;
                const v = row[i]?.toLowerCase() ?? '';
                if (['1', 'ya', 'y', 'v', 'true'].includes(v)) services.push(rows[0][i] as string);
              });
            } else {
              row.forEach((val, i) => {
                if (skipCols.has(i) || !val) return;
                val.split(/[,;]/).forEach(p => { if (p.trim()) services.push(p.trim()); });
              });
            }

            if (services.length === 0) continue;
            transactions.push({ id: txId, date, services: [...new Set(services)] });
          }
        }

        if (transactions.length === 0) {
          reject(new Error(
            `Tidak ada transaksi yang dapat diproses dari sheet "${sheetName}".\n\n` +
            'Format yang didukung:\n' +
            '• Long: Tanggal | ID Transaksi | Jenis Layanan (1 baris = 1 layanan)\n' +
            '• Wide: Tanggal | ID Transaksi | Layanan1 | Layanan2 | ...\n' +
            '• Binary: header = nama layanan, nilai = 1/Ya jika dibeli'
          ));
          return;
        }

        resolve(transactions);
      } catch (err) {
        reject(new Error('Gagal memproses file: ' + (err instanceof Error ? err.message : String(err))));
      }
    };

    reader.onerror = () => reject(new Error('Gagal membaca file.'));
    reader.readAsArrayBuffer(file);
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DataImportPanel() {
  const { setTransactions, clearData, isProcessing, runAnalysis, fileName, isDataLoaded, transactions, params } = useAppStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver]         = useState(false);
  const [error, setError]               = useState('');
  const [localLoading, setLocalLoading] = useState(false);

  const processFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError('Format tidak didukung. Gunakan .xlsx, .xls, atau .csv');
      return;
    }
    setError('');
    setLocalLoading(true);
    try {
      const parsed = await parseWorkbook(file);
      setTransactions(parsed, file.name);
      setLocalLoading(false);
      setTimeout(() => runAnalysis(), 50);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan tidak dikenal.');
      setLocalLoading(false);
    }
  }, [setTransactions, runAnalysis]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0]; if (f) processFile(f);
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = '';
  };

  const isBusy = localLoading || isProcessing;

  const stats = isDataLoaded ? {
    total: transactions.length,
    unique: new Set(transactions.flatMap(t => t.services)).size,
    avg: (transactions.reduce((s, t) => s + t.services.length, 0) / transactions.length).toFixed(1),
    dates: (() => {
      const d = transactions.map(t => t.date).filter(Boolean).sort();
      return d.length >= 2 ? `${d[0]} s/d ${d[d.length - 1]}` : d[0] ?? '—';
    })(),
  } : null;

  return (
    <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl text-gray-800 mb-1">Impor Data Transaksi</h3>
          <p className="text-sm text-gray-500">Unggah file <strong>.xlsx / .xls / .csv</strong>. Analisis Apriori berjalan otomatis setelah upload.</p>
        </div>
        {isDataLoaded && (
          <button
            onClick={clearData}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap"
          >
            <XCircle size={16} /> Hapus Data
          </button>
        )}
      </div>

      {/* Format info */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-lg">
        <Info size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-700 space-y-1">
          <p><strong>Format kolom yang didukung:</strong></p>
          <p>• <strong>Long (utama):</strong> Tanggal | ID Transaksi | Jenis Layanan — <em>1 baris = 1 layanan, ID sama = 1 transaksi</em></p>
          <p>• <strong>Wide:</strong> Tanggal | ID Transaksi | Layanan1 | Layanan2 | ...</p>
          <p>• <strong>Binary:</strong> Header = nama layanan, nilai sel = 1 / Ya / ✓ jika dibeli</p>
          <p className="text-blue-600 pt-1">
            Parameter aktif — Min Support: <strong>{(params.minSupport * 100).toFixed(0)}%</strong> · Min Confidence: <strong>{(params.minConfidence * 100).toFixed(0)}%</strong>
          </p>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !isBusy && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
          dragOver
            ? 'border-teal-500 bg-teal-50'
            : isBusy
            ? 'border-gray-200 bg-gray-50 cursor-wait'
            : 'border-gray-300 hover:border-teal-400 hover:bg-teal-50/30'
        }`}
      >
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleChange} />
        {isBusy ? (
          <div className="flex flex-col items-center">
            <Loader2 size={40} className="text-teal-500 animate-spin mb-4" />
            <p className="text-gray-600 font-medium">
              {localLoading ? 'Membaca file Excel...' : 'Menjalankan algoritma Apriori...'}
            </p>
            <p className="text-sm text-gray-400 mt-1">Mohon tunggu</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mb-4">
              <Upload size={32} className="text-teal-600" />
            </div>
            <h4 className="text-lg text-gray-700 mb-2">Tarik &amp; Lepas file di sini</h4>
            <p className="text-sm text-gray-500 mb-4">atau klik untuk memilih file</p>
            <span className="px-6 py-2.5 bg-teal-600 text-white rounded-lg text-sm">Pilih File Excel / CSV</span>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <pre className="text-sm text-red-600 whitespace-pre-wrap font-sans">{error}</pre>
        </div>
      )}

      {stats && !isBusy && (
        <div className="bg-green-50 border border-green-100 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <FileSpreadsheet size={22} className="text-teal-600" />
              <span className="text-sm font-semibold text-gray-800">{fileName}</span>
            </div>
            <CheckCircle size={22} className="text-green-500" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            {[
              { label: 'Total Transaksi', value: stats.total.toLocaleString('id-ID') },
              { label: 'Layanan Unik',    value: stats.unique },
              { label: 'Rata-rata Item',  value: stats.avg },
              { label: 'Rentang Tanggal', value: stats.dates },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-lg font-bold text-teal-700">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}