import { useRef, useState } from 'react';
import { FileText, Download, Loader2, LayoutList, Star } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAppStore } from '../../store/useAppStore';

type ExportType = 'lift-ratio' | 'promo-strategy';

// html2canvas-safe base: Arial, no gradient, no flex, no letter-spacing
const F: React.CSSProperties = { fontFamily: 'Arial, Helvetica, sans-serif' };

interface PromoPackage { namaPaket: string; layanan: string; strategi: string; }

function derivePromoPackages(
  rules: ReturnType<typeof useAppStore.getState>['associationRules']
): PromoPackage[] {
  const FALLBACK: PromoPackage[] = [
    {
      namaPaket: 'Paket "BEAUTY FACE"',
      layanan: 'Facial + Totok Wajah',
      strategi: 'Bundling wajah eksklusif. Karyawan wajib menawarkan Totok Wajah saat pelanggan memesan Facial. Cocok dijadikan paket hemat dengan diskon 10-15%.',
    },
    {
      namaPaket: 'Paket "HAIR GLOW"',
      layanan: 'Coloring + Hair Mask + Vitamin Rambut',
      strategi: 'Paket perawatan rambut lengkap. Strategi: bundling 3 layanan dengan harga spesial untuk mendorong perawatan rambut menyeluruh dalam 1 kunjungan.',
    },
    {
      namaPaket: 'Paket "BASIC CARE"',
      layanan: 'Potong Rambut + Cuci Blow',
      strategi: 'Paket rutin harian. Cross-selling: tawarkanlah Potong Rambut saat pelanggan memilih Cuci Blow. Jadikan sebagai paket combo terjangkau untuk pelanggan reguler.',
    },
  ];

  if (!rules.length) return FALLBACK;

  const face: PromoPackage[] = [];
  const hair3: PromoPackage[] = [];
  const hair2: PromoPackage[] = [];
  const basic: PromoPackage[] = [];
  const seenKeys = new Set<string>();

  for (const r of rules) {
    const all = [...r.antecedent, ...r.consequent];
    const key = [...all].sort().join('|');
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    const hasFace = all.some(s => ['Facial', 'Totok Wajah'].includes(s));
    const hairItems = ['Coloring', 'Hair Mask', 'Vitamin Rambut'];
    const hairCount = all.filter(s => hairItems.includes(s)).length;
    const hasBasic = all.some(s => ['Potong Rambut', 'Cuci Blow'].includes(s));

    const conf = Math.round(r.confidence * 100);
    const ant = r.antecedent.join(', ');
    const con = r.consequent.join(', ');
    const layanan = all.join(' + ');

    if (hasFace && face.length === 0) {
      face.push({ namaPaket: 'Paket "BEAUTY FACE"', layanan, strategi: `Bundling wajah eksklusif (Confidence ${conf}%, Lift ${r.lift.toFixed(2)}). Karyawan wajib menawarkan ${con} saat pelanggan memesan ${ant}. Cocok dijadikan paket hemat dengan diskon 10-15%.` });
    } else if (!hasFace && hairCount >= 3 && hair3.length === 0) {
      hair3.push({ namaPaket: 'Paket "HAIR GLOW"', layanan, strategi: `Paket perawatan rambut lengkap (Confidence ${conf}%, Lift ${r.lift.toFixed(2)}). Bundling layanan dengan harga spesial. Tawarkan ${con} saat pelanggan memilih ${ant}.` });
    } else if (!hasFace && hairCount >= 1 && hairCount < 3 && hair2.length === 0) {
      hair2.push({ namaPaket: 'Paket "HAIR GLOW"', layanan, strategi: `Paket perawatan rambut (Confidence ${conf}%, Lift ${r.lift.toFixed(2)}). Tawarkan ${con} saat pelanggan memilih ${ant}. Buat paket bundling dengan harga spesial.` });
    } else if (hasBasic && !hasFace && hairCount === 0 && basic.length === 0) {
      basic.push({ namaPaket: 'Paket "BASIC CARE"', layanan, strategi: `Paket rutin harian (Confidence ${conf}%, Lift ${r.lift.toFixed(2)}). Cross-selling: tawarkanlah ${con} saat pelanggan memilih ${ant}. Jadikan paket combo terjangkau untuk pelanggan reguler.` });
    }
  }

  const result = [...face, ...(hair3.length ? hair3 : hair2), ...basic];
  return result.length ? result : FALLBACK;
}

// ─── PDF Preview — Lift Ratio ──────────────────────────────────────────────────
function PdfPreviewLiftRatio({ forwardRef }: { forwardRef: React.RefObject<HTMLDivElement | null> }) {
  const { associationRules, transactions, params, fileName } = useAppStore();
  const rules = associationRules.length > 0 ? associationRules : [
    { id: 'Rule_1',  antecedent: ['Coloring', 'Vitamin Rambut'],        consequent: ['Hair Mask'],                   confidence: 1.00, supportB: 0.29, lift: 3.51, keterangan: 'Valid' as const },
    { id: 'Rule_2',  antecedent: ['Coloring', 'Hair Mask'],              consequent: ['Vitamin Rambut'],              confidence: 1.00, supportB: 0.30, lift: 3.37, keterangan: 'Valid' as const },
    { id: 'Rule_3',  antecedent: ['Hair Mask', 'Vitamin Rambut'],        consequent: ['Coloring'],                    confidence: 1.00, supportB: 0.29, lift: 3.44, keterangan: 'Valid' as const },
    { id: 'Rule_4',  antecedent: ['Hair Mask'],                          consequent: ['Vitamin Rambut'],              confidence: 0.99, supportB: 0.30, lift: 3.33, keterangan: 'Valid' as const },
    { id: 'Rule_5',  antecedent: ['Hair Mask'],                          consequent: ['Coloring', 'Vitamin Rambut'], confidence: 0.99, supportB: 0.28, lift: 3.51, keterangan: 'Valid' as const },
    { id: 'Rule_6',  antecedent: ['Hair Mask'],                          consequent: ['Coloring'],                    confidence: 0.99, supportB: 0.29, lift: 3.40, keterangan: 'Valid' as const },
    { id: 'Rule_7',  antecedent: ['Facial'],                             consequent: ['Totok Wajah'],                 confidence: 0.98, supportB: 0.25, lift: 3.96, keterangan: 'Valid' as const },
    { id: 'Rule_8',  antecedent: ['Coloring'],                           consequent: ['Hair Mask', 'Vitamin Rambut'],confidence: 0.97, supportB: 0.28, lift: 3.44, keterangan: 'Valid' as const },
    { id: 'Rule_9',  antecedent: ['Coloring'],                           consequent: ['Hair Mask'],                   confidence: 0.97, supportB: 0.29, lift: 3.40, keterangan: 'Valid' as const },
    { id: 'Rule_10', antecedent: ['Coloring'],                           consequent: ['Vitamin Rambut'],              confidence: 0.97, supportB: 0.30, lift: 3.26, keterangan: 'Valid' as const },
    { id: 'Rule_11', antecedent: ['Cuci Blow'],                          consequent: ['Potong Rambut'],               confidence: 0.97, supportB: 0.39, lift: 2.46, keterangan: 'Valid' as const },
    { id: 'Rule_12', antecedent: ['Potong Rambut'],                      consequent: ['Cuci Blow'],                   confidence: 0.96, supportB: 0.39, lift: 2.46, keterangan: 'Valid' as const },
    { id: 'Rule_13', antecedent: ['Totok Wajah'],                        consequent: ['Facial'],                      confidence: 0.96, supportB: 0.24, lift: 3.96, keterangan: 'Valid' as const },
    { id: 'Rule_14', antecedent: ['Vitamin Rambut'],                     consequent: ['Hair Mask'],                   confidence: 0.95, supportB: 0.29, lift: 3.33, keterangan: 'Valid' as const },
    { id: 'Rule_15', antecedent: ['Vitamin Rambut'],                     consequent: ['Coloring', 'Hair Mask'],       confidence: 0.95, supportB: 0.28, lift: 3.37, keterangan: 'Valid' as const },
    { id: 'Rule_16', antecedent: ['Vitamin Rambut'],                     consequent: ['Coloring'],                    confidence: 0.95, supportB: 0.29, lift: 3.26, keterangan: 'Valid' as const },
  ];

  const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  const totalTx = transactions.length || 1247;

  const cell: React.CSSProperties = { ...F, border: '1px solid #d1d5db', padding: '7px 10px', fontSize: '11px', wordBreak: 'break-word', whiteSpace: 'normal' };

  return (
    <div ref={forwardRef} style={{ ...F, width: '960px', padding: '40px', backgroundColor: '#ffffff', color: '#111111' }}>
      {/* Header — solid color, no flex, no gradient */}
      <div style={{ backgroundColor: '#0f766e', padding: '20px 24px', marginBottom: '24px', borderRadius: '8px' }}>
        <p style={{ ...F, fontSize: '11px', color: '#ccfbf1', margin: '0 0 6px 0' }}>Laporan Hasil Analisis Algoritma Apriori</p>
        <p style={{ ...F, fontSize: '20px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 10px 0' }}>Analisis Association Rules &amp; Lift Ratio</p>
        <p style={{ ...F, fontSize: '11px', color: '#ccfbf1', margin: 0 }}>
          Sumber Data: {fileName || 'transaksi_salon.xlsx'} &nbsp;|&nbsp;
          Total Transaksi: {totalTx.toLocaleString('id-ID')} &nbsp;|&nbsp;
          Min Support: {(params.minSupport * 100).toFixed(0)}% &nbsp;|&nbsp;
          Min Confidence: {(params.minConfidence * 100).toFixed(0)}% &nbsp;|&nbsp;
          Tanggal Cetak: {today}
        </p>
      </div>

      <p style={{ ...F, textAlign: 'center', fontSize: '13px', fontWeight: 'bold', marginBottom: '12px', color: '#1e3a5f' }}>
        Tabel Hasil Pengujian Lift Ratio
      </p>

      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '10%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '11%' }} />
          <col style={{ width: '11%' }} />
          <col style={{ width: '11%' }} />
          <col style={{ width: '11%' }} />
        </colgroup>
        <thead>
          <tr style={{ backgroundColor: '#0f766e', color: '#ffffff' }}>
            {['Kode Aturan', 'Antecedent (Jika Memilih...)', 'Consequent (...Maka Memilih)', 'Confidence', 'Support B', 'Lift Ratio', 'Keterangan'].map(h => (
              <th key={h} style={{ ...cell, border: '1px solid #0d9488', color: '#ffffff', fontWeight: 'bold', textAlign: 'center', backgroundColor: '#0f766e' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rules.map((rule, idx) => (
            <tr key={rule.id} style={{ backgroundColor: idx % 2 === 0 ? '#f0fdf4' : '#ffffff' }}>
              <td style={{ ...cell, textAlign: 'center', fontWeight: 'bold', color: '#0f766e' }}>{rule.id}</td>
              <td style={{ ...cell }}>{rule.antecedent.join(', ')}</td>
              <td style={{ ...cell }}>{rule.consequent.join(', ')}</td>
              <td style={{ ...cell, textAlign: 'center' }}>{(rule.confidence * 100).toFixed(0)}%</td>
              <td style={{ ...cell, textAlign: 'center' }}>{(rule.supportB * 100).toFixed(0)}%</td>
              <td style={{ ...cell, textAlign: 'center', fontWeight: 'bold', color: '#1d4ed8' }}>{rule.lift.toFixed(2)}</td>
              <td style={{ ...cell, textAlign: 'center', fontWeight: 'bold', color: rule.keterangan === 'Valid' ? '#15803d' : '#dc2626' }}>{rule.keterangan}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ ...F, marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '10px', fontSize: '10px', color: '#94a3b8' }}>
        <span>DataMine Apriori Analytics — Laporan otomatis</span>
        <span style={{ float: 'right' }}>{today}</span>
      </div>
    </div>
  );
}

// ─── PDF Preview — Promo Strategy ─────────────────────────────────────────────
function PdfPreviewPromoStrategy({ forwardRef }: { forwardRef: React.RefObject<HTMLDivElement | null> }) {
  const { associationRules, transactions, params, fileName } = useAppStore();
  const packages = derivePromoPackages(associationRules);
  const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  const totalTx = transactions.length || 1247;

  const cell: React.CSSProperties = { ...F, padding: '12px 14px', fontSize: '12px', verticalAlign: 'top', wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: '1.6' };

  return (
    <div ref={forwardRef} style={{ ...F, width: '960px', padding: '40px', backgroundColor: '#ffffff', color: '#111111' }}>
      {/* Header — solid color, no flex, no gradient */}
      <div style={{ backgroundColor: '#c2410c', padding: '20px 24px', marginBottom: '24px', borderRadius: '8px' }}>
        <p style={{ ...F, fontSize: '11px', color: '#fed7aa', margin: '0 0 6px 0' }}>Laporan Hasil Analisis Algoritma Apriori</p>
        <p style={{ ...F, fontSize: '18px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 10px 0' }}>Rekomendasi Strategi Promosi Berbasis Hasil Apriori</p>
        <p style={{ ...F, fontSize: '11px', color: '#fed7aa', margin: 0 }}>
          Sumber Data: {fileName || 'transaksi_salon.xlsx'} &nbsp;|&nbsp;
          Total Transaksi: {totalTx.toLocaleString('id-ID')} &nbsp;|&nbsp;
          Min Support: {(params.minSupport * 100).toFixed(0)}% &nbsp;|&nbsp;
          Min Confidence: {(params.minConfidence * 100).toFixed(0)}% &nbsp;|&nbsp;
          Tanggal Cetak: {today}
        </p>
      </div>

      {/* Section title bar */}
      <div style={{ backgroundColor: '#c2410c', padding: '11px 18px', borderRadius: '6px 6px 0 0' }}>
        <span style={{ ...F, color: '#ffffff', fontWeight: 'bold', fontSize: '12px' }}>
          💡 REKOMENDASI STRATEGI PROMOSI BERBASIS HASIL APRIORI
        </span>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '20%' }} />
          <col style={{ width: '25%' }} />
          <col style={{ width: '55%' }} />
        </colgroup>
        <thead>
          <tr style={{ backgroundColor: '#ea580c' }}>
            {['NAMA PAKET', 'LAYANAN YANG DIGABUNGKAN', 'STRATEGI PROMOSI'].map(h => (
              <th key={h} style={{ ...cell, border: '1px solid #c2410c', color: '#ffffff', fontWeight: 'bold', textAlign: 'center', fontSize: '11px', padding: '10px 14px', backgroundColor: '#ea580c' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {packages.map((pkg, idx) => (
            <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#fff7ed' : '#ffffff' }}>
              <td style={{ ...cell, border: '1px solid #fed7aa', fontWeight: 'bold', textAlign: 'center', color: '#9a3412' }}>{pkg.namaPaket}</td>
              <td style={{ ...cell, border: '1px solid #fed7aa', textAlign: 'center', color: '#374151' }}>{pkg.layanan}</td>
              <td style={{ ...cell, border: '1px solid #fed7aa', color: '#1f2937' }}>{pkg.strategi}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ ...F, marginTop: '20px', borderTop: '1px solid #fed7aa', paddingTop: '10px', fontSize: '10px', color: '#94a3b8' }}>
        <span>DataMine Apriori Analytics — Laporan otomatis</span>
        <span style={{ float: 'right' }}>{today}</span>
      </div>
    </div>
  );
}

// ─── Main ExportReport Component ───────────────────────────────────────────────
export function ExportReport() {
  const { isDataLoaded, associationRules } = useAppStore();
  const liftRatioRef = useRef<HTMLDivElement | null>(null);
  const promoStrategyRef = useRef<HTMLDivElement | null>(null);
  const [activeExport, setActiveExport] = useState<ExportType>('lift-ratio');
  const [isGenerating, setIsGenerating] = useState(false);

  const configs = {
    'lift-ratio': {
      label: 'Tabel Hasil Pengujian Lift Ratio',
      shortLabel: 'Lift Ratio',
      fileName: 'Laporan_Apriori_Lift_Ratio.pdf',
      ref: liftRatioRef,
      icon: <LayoutList size={20} />,
      description: 'Laporan PDF berisi <strong>Tabel Hasil Pengujian Lift Ratio</strong> — Kode Aturan, Antecedent, Consequent, Confidence, Support B, Lift Ratio, dan Keterangan.',
      chips: ['Kode Aturan', 'Antecedent & Consequent', 'Confidence & Support B', 'Lift Ratio & Keterangan'],
      badge: isDataLoaded ? `${associationRules.length} aturan` : '16 aturan (contoh)',
    },
    'promo-strategy': {
      label: 'Rekomendasi Strategi Promosi',
      shortLabel: 'Strategi Promosi',
      fileName: 'Laporan_Strategi_Promosi_Apriori.pdf',
      ref: promoStrategyRef,
      icon: <Star size={20} />,
      description: 'Laporan PDF berisi <strong>Rekomendasi Strategi Promosi Berbasis Hasil Apriori</strong> — Nama Paket, Layanan yang Digabungkan, dan Strategi Promosi.',
      chips: ['Nama Paket', 'Layanan yang Digabungkan', 'Strategi Promosi'],
      badge: isDataLoaded ? `${derivePromoPackages(associationRules).length} paket` : '3 paket (contoh)',
    },
  } as const;

  const active = configs[activeExport];

  const handleExportPDF = async () => {
    const ref = active.ref;
    if (!ref.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(ref.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        // Ensure correct font rendering
        onclone: (doc) => {
          const el = doc.querySelector('[data-pdf-root]') as HTMLElement;
          if (el) el.style.fontFamily = 'Arial, Helvetica, sans-serif';
        },
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const ratio = pdfW / canvas.width;
      const scaledH = canvas.height * ratio;
      let yOffset = 0, page = 0;
      while (yOffset < scaledH) {
        if (page > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -yOffset, pdfW, scaledH);
        yOffset += pdfH;
        page++;
      }
      pdf.save(active.fileName);
    } catch (e) {
      console.error('PDF export error:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1.5 flex gap-1.5">
        {(Object.entries(configs) as [ExportType, typeof configs[ExportType]][]).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setActiveExport(key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeExport === key
                ? 'bg-gradient-to-r from-teal-500 to-blue-600 text-white shadow-md'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
          >
            {cfg.icon}
            <span className="hidden sm:inline">{cfg.label}</span>
            <span className="sm:hidden">{cfg.shortLabel}</span>
          </button>
        ))}
      </div>

      {/* Action Card */}
      <div className="bg-gradient-to-br from-teal-50 via-white to-blue-50 rounded-xl p-8 shadow-sm border border-teal-100">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <FileText size={32} className="text-white" />
          </div>
          <h3 className="text-2xl text-gray-800 mb-3">Ekspor Laporan Analisis</h3>
          <p className="text-gray-600 mb-8" dangerouslySetInnerHTML={{ __html: active.description }} />
          <button
            onClick={handleExportPDF}
            disabled={isGenerating}
            className="flex items-center gap-3 mx-auto px-8 py-4 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-xl hover:from-teal-600 hover:to-blue-700 transition-all shadow-lg text-base disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isGenerating
              ? <><Loader2 size={22} className="animate-spin" /> Membuat PDF...</>
              : <><Download size={22} /> Unduh PDF — {active.label}</>}
          </button>
          {!isDataLoaded && (
            <p className="mt-4 text-sm text-amber-600">
              ⚠ PDF akan menggunakan data contoh. Import Excel terlebih dahulu untuk data nyata.
            </p>
          )}
          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-gray-500 flex-wrap">
            {active.chips.map(chip => <span key={chip}>✓ {chip}</span>)}
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h4 className="text-lg text-gray-800">Pratinjau PDF — {active.label}</h4>
          <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{active.badge}</span>
        </div>
        <div className="overflow-x-auto p-4 bg-gray-50">
          <div style={{ transform: 'scale(0.72)', transformOrigin: 'top left', width: '139%' }}>
            {activeExport === 'lift-ratio'
              ? <PdfPreviewLiftRatio forwardRef={liftRatioRef} />
              : <PdfPreviewPromoStrategy forwardRef={promoStrategyRef} />}
          </div>
        </div>
      </div>

      {/* Hidden full-size renders for html2canvas capture */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, pointerEvents: 'none' }}>
        <PdfPreviewLiftRatio forwardRef={liftRatioRef} />
        <PdfPreviewPromoStrategy forwardRef={promoStrategyRef} />
      </div>
    </div>
  );
}
