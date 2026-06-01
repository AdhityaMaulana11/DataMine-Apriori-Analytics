import { useRef, useState } from 'react';
import { FileText, Download, Loader2, LayoutList, Star } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAppStore } from '../../store/useAppStore';

type ExportType = 'lift-ratio' | 'promo-strategy';

interface PromoPackage { namaPaket: string; layanan: string; strategi: string; }

// Derives at most one entry per semantic group (face / hair-3 / hair-2 / basic).
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

  // Group rules into semantic buckets
  const buckets: Record<string, { layananSet: Set<string>; bestConf: number; bestLift: number; ant: string; con: string }> = {
    face: { layananSet: new Set(), bestConf: 0, bestLift: 0, ant: '', con: '' },
    hair3: { layananSet: new Set(['Coloring', 'Hair Mask', 'Vitamin Rambut']), bestConf: 0, bestLift: 0, ant: '', con: '' },
    hair2: { layananSet: new Set(), bestConf: 0, bestLift: 0, ant: '', con: '' },
    basic: { layananSet: new Set(), bestConf: 0, bestLift: 0, ant: '', con: '' },
  };

  for (const r of rules) {
    const all = [...r.antecedent, ...r.consequent];
    const hasFace = all.some(s => ['Facial', 'Totok Wajah'].includes(s));
    const hairItems = ['Coloring', 'Hair Mask', 'Vitamin Rambut'];
    const hairCount = all.filter(s => hairItems.includes(s)).length;
    const hasBasic = all.some(s => ['Potong Rambut', 'Cuci Blow'].includes(s));

    const update = (bucket: typeof buckets['face']) => {
      if (r.confidence > bucket.bestConf) {
        bucket.bestConf = r.confidence;
        bucket.bestLift = r.lift;
        bucket.ant = r.antecedent.join(', ');
        bucket.con = r.consequent.join(', ');
        all.forEach(s => bucket.layananSet.add(s));
      }
    };

    if (hasFace) update(buckets.face);
    else if (hairCount >= 3) update(buckets.hair3);
    else if (hairCount >= 1) update(buckets.hair2);
    else if (hasBasic) update(buckets.basic);
  }

  const result: PromoPackage[] = [];

  if (buckets.face.bestConf > 0) {
    const conf = Math.round(buckets.face.bestConf * 100);
    result.push({
      namaPaket: 'Paket "BEAUTY FACE"',
      layanan: [...buckets.face.layananSet].join(' + ') || 'Facial + Totok Wajah',
      strategi: `Bundling wajah eksklusif (Confidence ${conf}%, Lift ${buckets.face.bestLift.toFixed(2)}). Karyawan wajib menawarkan ${buckets.face.con} saat pelanggan memesan ${buckets.face.ant}. Cocok dijadikan paket hemat dengan diskon 10-15%.`,
    });
  }

  if (buckets.hair3.bestConf > 0 || buckets.hair2.bestConf > 0) {
    const b = buckets.hair3.bestConf >= buckets.hair2.bestConf ? buckets.hair3 : buckets.hair2;
    const conf = Math.round(b.bestConf * 100);
    result.push({
      namaPaket: 'Paket "HAIR GLOW"',
      layanan: [...b.layananSet].join(' + ') || 'Coloring + Hair Mask + Vitamin Rambut',
      strategi: `Paket perawatan rambut lengkap (Confidence ${conf}%, Lift ${b.bestLift.toFixed(2)}). Bundling layanan dengan harga spesial untuk mendorong perawatan rambut menyeluruh dalam 1 kunjungan. Tawarkan ${b.con} saat pelanggan memilih ${b.ant}.`,
    });
  }

  if (buckets.basic.bestConf > 0) {
    const conf = Math.round(buckets.basic.bestConf * 100);
    result.push({
      namaPaket: 'Paket "BASIC CARE"',
      layanan: [...buckets.basic.layananSet].join(' + ') || 'Potong Rambut + Cuci Blow',
      strategi: `Paket rutin harian (Confidence ${conf}%, Lift ${buckets.basic.bestLift.toFixed(2)}). Cross-selling: tawarkanlah ${buckets.basic.con} saat pelanggan memilih ${buckets.basic.ant}. Jadikan paket combo terjangkau untuk pelanggan reguler.`,
    });
  }

  return result.length ? result : FALLBACK;
}

// Shared base font — MUST be Arial to avoid html2canvas character-spacing bug
const BASE: React.CSSProperties = { fontFamily: 'Arial, Helvetica, sans-serif' };

// ─── PDF Preview — Lift Ratio ──────────────────────────────────────────────────
function PdfPreviewLiftRatio({ forwardRef }: { forwardRef: React.RefObject<HTMLDivElement | null> }) {
  const { associationRules, transactions, params, fileName } = useAppStore();
  const rules = associationRules.length > 0 ? associationRules : [
    { id: 'Rule_1',  antecedent: ['Coloring', 'Vitamin Rambut'],   consequent: ['Hair Mask'],              confidence: 1.00, supportB: 0.29, lift: 3.51, keterangan: 'Valid' as const },
    { id: 'Rule_2',  antecedent: ['Coloring', 'Hair Mask'],         consequent: ['Vitamin Rambut'],         confidence: 1.00, supportB: 0.30, lift: 3.37, keterangan: 'Valid' as const },
    { id: 'Rule_3',  antecedent: ['Hair Mask', 'Vitamin Rambut'],   consequent: ['Coloring'],               confidence: 1.00, supportB: 0.29, lift: 3.44, keterangan: 'Valid' as const },
    { id: 'Rule_4',  antecedent: ['Hair Mask'],                     consequent: ['Vitamin Rambut'],         confidence: 0.99, supportB: 0.30, lift: 3.33, keterangan: 'Valid' as const },
    { id: 'Rule_5',  antecedent: ['Hair Mask'],                     consequent: ['Coloring', 'Vitamin Rambut'], confidence: 0.99, supportB: 0.28, lift: 3.51, keterangan: 'Valid' as const },
    { id: 'Rule_6',  antecedent: ['Hair Mask'],                     consequent: ['Coloring'],               confidence: 0.99, supportB: 0.29, lift: 3.40, keterangan: 'Valid' as const },
    { id: 'Rule_7',  antecedent: ['Facial'],                        consequent: ['Totok Wajah'],            confidence: 0.98, supportB: 0.25, lift: 3.96, keterangan: 'Valid' as const },
    { id: 'Rule_8',  antecedent: ['Coloring'],                      consequent: ['Hair Mask', 'Vitamin Rambut'], confidence: 0.97, supportB: 0.28, lift: 3.44, keterangan: 'Valid' as const },
    { id: 'Rule_9',  antecedent: ['Coloring'],                      consequent: ['Hair Mask'],              confidence: 0.97, supportB: 0.29, lift: 3.40, keterangan: 'Valid' as const },
    { id: 'Rule_10', antecedent: ['Coloring'],                      consequent: ['Vitamin Rambut'],         confidence: 0.97, supportB: 0.30, lift: 3.26, keterangan: 'Valid' as const },
    { id: 'Rule_11', antecedent: ['Cuci Blow'],                     consequent: ['Potong Rambut'],          confidence: 0.97, supportB: 0.39, lift: 2.46, keterangan: 'Valid' as const },
    { id: 'Rule_12', antecedent: ['Potong Rambut'],                 consequent: ['Cuci Blow'],              confidence: 0.96, supportB: 0.39, lift: 2.46, keterangan: 'Valid' as const },
    { id: 'Rule_13', antecedent: ['Totok Wajah'],                   consequent: ['Facial'],                 confidence: 0.96, supportB: 0.24, lift: 3.96, keterangan: 'Valid' as const },
    { id: 'Rule_14', antecedent: ['Vitamin Rambut'],                consequent: ['Hair Mask'],              confidence: 0.95, supportB: 0.29, lift: 3.33, keterangan: 'Valid' as const },
    { id: 'Rule_15', antecedent: ['Vitamin Rambut'],                consequent: ['Coloring', 'Hair Mask'],  confidence: 0.95, supportB: 0.28, lift: 3.37, keterangan: 'Valid' as const },
    { id: 'Rule_16', antecedent: ['Vitamin Rambut'],                consequent: ['Coloring'],               confidence: 0.95, supportB: 0.29, lift: 3.26, keterangan: 'Valid' as const },
  ];

  const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  const totalTx = transactions.length || 1247;

  const tdBase: React.CSSProperties = { border: '1px solid #d1d5db', padding: '7px 10px', ...BASE, fontSize: '11px', wordBreak: 'break-word' };

  return (
    <div ref={forwardRef} style={{ width: '960px', padding: '40px', backgroundColor: '#ffffff', color: '#111', ...BASE }}>
      {/* Header band */}
      <div style={{ background: 'linear-gradient(135deg,#0f766e 0%,#1d4ed8 100%)', borderRadius: '10px', padding: '20px 28px', marginBottom: '28px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ ...BASE, fontSize: '11px', opacity: 0.8, marginBottom: '4px' }}>Laporan Hasil Analisis Algoritma Apriori</p>
          <h1 style={{ ...BASE, fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Analisis Association Rules &amp; Lift Ratio</h1>
        </div>
        <div style={{ textAlign: 'right', fontSize: '11px', opacity: 0.85, ...BASE }}>
          <p style={{ margin: '2px 0' }}>Sumber Data: {fileName || 'transaksi_salon.xlsx'}</p>
          <p style={{ margin: '2px 0' }}>Total Transaksi: {totalTx.toLocaleString('id-ID')}</p>
          <p style={{ margin: '2px 0' }}>Min Support: {(params.minSupport * 100).toFixed(0)}% | Min Confidence: {(params.minConfidence * 100).toFixed(0)}%</p>
          <p style={{ margin: '2px 0' }}>Tanggal Cetak: {today}</p>
        </div>
      </div>

      {/* Table title */}
      <p style={{ ...BASE, textAlign: 'center', fontSize: '13px', fontWeight: 'bold', marginBottom: '12px', color: '#1e3a5f', letterSpacing: '0.02em' }}>
        Tabel Hasil Pengujian Lift Ratio
      </p>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'linear-gradient(90deg,#0f766e,#1d4ed8)', color: '#fff' }}>
            {['Kode Aturan', 'Antecedent (Jika Memilih...)', 'Consequent (...Maka Memilih)', 'Confidence', 'Support B', 'Lift Ratio', 'Keterangan'].map(h => (
              <th key={h} style={{ ...tdBase, border: '1px solid #0f766e', color: '#fff', fontWeight: 'bold', textAlign: 'center', padding: '9px 10px' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rules.map((rule, idx) => (
            <tr key={rule.id} style={{ backgroundColor: idx % 2 === 0 ? '#f0fdf4' : '#ffffff' }}>
              <td style={{ ...tdBase, textAlign: 'center', fontWeight: 'bold', color: '#0f766e' }}>{rule.id}</td>
              <td style={{ ...tdBase }}>{rule.antecedent.join(', ')}</td>
              <td style={{ ...tdBase }}>{rule.consequent.join(', ')}</td>
              <td style={{ ...tdBase, textAlign: 'center' }}>{(rule.confidence * 100).toFixed(0)}%</td>
              <td style={{ ...tdBase, textAlign: 'center' }}>{(rule.supportB * 100).toFixed(0)}%</td>
              <td style={{ ...tdBase, textAlign: 'center', fontWeight: 'bold', color: '#1d4ed8' }}>{rule.lift.toFixed(2)}</td>
              <td style={{ ...tdBase, textAlign: 'center', fontWeight: 'bold', color: rule.keterangan === 'Valid' ? '#15803d' : '#dc2626' }}>{rule.keterangan}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div style={{ marginTop: '20px', borderTop: '2px solid #e2e8f0', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8', ...BASE }}>
        <span>DataMine Apriori Analytics — Laporan otomatis dihasilkan oleh sistem</span>
        <span>{today}</span>
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

  const tdBase: React.CSSProperties = { ...BASE, fontSize: '12px', padding: '14px 16px', verticalAlign: 'top', wordBreak: 'break-word', lineHeight: '1.6' };

  return (
    <div ref={forwardRef} style={{ width: '960px', padding: '40px', backgroundColor: '#ffffff', color: '#111', ...BASE }}>
      {/* Header band */}
      <div style={{ background: 'linear-gradient(135deg,#c2410c 0%,#ea580c 100%)', borderRadius: '10px', padding: '20px 28px', marginBottom: '28px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ ...BASE, fontSize: '11px', opacity: 0.85, marginBottom: '4px' }}>Laporan Hasil Analisis Algoritma Apriori</p>
          <h1 style={{ ...BASE, fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Rekomendasi Strategi Promosi Berbasis Hasil Apriori</h1>
        </div>
        <div style={{ textAlign: 'right', fontSize: '11px', opacity: 0.9, ...BASE }}>
          <p style={{ margin: '2px 0' }}>Sumber Data: {fileName || 'transaksi_salon.xlsx'}</p>
          <p style={{ margin: '2px 0' }}>Total Transaksi: {totalTx.toLocaleString('id-ID')}</p>
          <p style={{ margin: '2px 0' }}>Min Support: {(params.minSupport * 100).toFixed(0)}% | Min Confidence: {(params.minConfidence * 100).toFixed(0)}%</p>
          <p style={{ margin: '2px 0' }}>Tanggal Cetak: {today}</p>
        </div>
      </div>

      {/* Orange section title bar */}
      <div style={{ backgroundColor: '#c2410c', borderRadius: '6px 6px 0 0', padding: '11px 18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '14px' }}>💡</span>
        <span style={{ ...BASE, color: '#ffffff', fontWeight: 'bold', fontSize: '12px', letterSpacing: '0.06em' }}>
          REKOMENDASI STRATEGI PROMOSI BERBASIS HASIL APRIORI
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
              <th key={h} style={{ ...tdBase, border: '1px solid #c2410c', color: '#ffffff', fontWeight: 'bold', textAlign: 'center', fontSize: '11px', padding: '10px 14px', letterSpacing: '0.04em' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {packages.map((pkg, idx) => (
            <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#fff7ed' : '#ffffff' }}>
              <td style={{ ...tdBase, border: '1px solid #fed7aa', fontWeight: 'bold', textAlign: 'center', color: '#9a3412' }}>{pkg.namaPaket}</td>
              <td style={{ ...tdBase, border: '1px solid #fed7aa', textAlign: 'center', color: '#374151' }}>{pkg.layanan}</td>
              <td style={{ ...tdBase, border: '1px solid #fed7aa', color: '#1f2937' }}>{pkg.strategi}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div style={{ marginTop: '20px', borderTop: '2px solid #fed7aa', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8', ...BASE }}>
        <span>DataMine Apriori Analytics — Laporan otomatis dihasilkan oleh sistem</span>
        <span>{today}</span>
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
      const canvas = await html2canvas(ref.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
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
            {isGenerating ? <><Loader2 size={22} className="animate-spin" /> Membuat PDF...</> : <><Download size={22} /> Unduh PDF — {active.label}</>}
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
