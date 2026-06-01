import { useRef, useState } from 'react';
import { FileText, Download, Loader2, LayoutList, Star } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAppStore } from '../../store/useAppStore';

// ─── Types ─────────────────────────────────────────────────────────────────────
type ExportType = 'lift-ratio' | 'promo-strategy';

// ─── Promo Strategy derivation helpers ─────────────────────────────────────────
interface PromoPackage {
  namaPaket: string;
  layanan: string;
  strategi: string;
}

function derivePromoPackages(
  rules: ReturnType<typeof useAppStore.getState>['associationRules']
): PromoPackage[] {
  if (rules.length === 0) {
    // fallback sample data matching the image
    return [
      {
        namaPaket: 'Paket "BEAUTY FACE"',
        layanan: 'Facial + Totok Wajah',
        strategi:
          'Bundling wajah eksklusif. Karyawan wajib menawarkan Totok Wajah saat pelanggan memesan Facial. Cocok dijadikan paket hemat dengan diskon 10–15%.',
      },
      {
        namaPaket: 'Paket "HAIR GLOW"',
        layanan: 'Coloring + Hair Mask + Vitamin Rambut',
        strategi:
          'Paket perawatan rambut lengkap. Strategi: bundling 3 layanan dengan harga spesial untuk mendorong perawatan rambut menyeluruh dalam 1 kunjungan.',
      },
      {
        namaPaket: 'Paket "BASIC CARE"',
        layanan: 'Potong Rambut + Cuci Blow',
        strategi:
          'Paket rutin harian. Cross-selling: tawarkanlah Potong Rambut saat pelanggan memilih Cuci Blow. Jadikan sebagai paket combo terjangkau untuk pelanggan reguler.',
      },
    ];
  }

  // Build promo packages from real association rules
  const seen = new Set<string>();
  const packages: PromoPackage[] = [];

  for (const rule of rules) {
    const layananArr = [...rule.antecedent, ...rule.consequent];
    const key = [...layananArr].sort().join('|');
    if (seen.has(key)) continue;
    seen.add(key);

    const layanan = layananArr.join(' + ');
    const isHair = layananArr.some((s) =>
      ['Coloring', 'Hair Mask', 'Vitamin Rambut', 'Cuci Blow', 'Potong Rambut'].includes(s)
    );
    const isFace = layananArr.some((s) => ['Facial', 'Totok Wajah'].includes(s));

    let namaPaket = `Paket "${layananArr[0].toUpperCase()}"`;
    if (isFace && layananArr.length >= 2) namaPaket = 'Paket "BEAUTY FACE"';
    else if (isHair && layananArr.length >= 3) namaPaket = 'Paket "HAIR GLOW"';
    else if (
      layananArr.includes('Potong Rambut') ||
      layananArr.includes('Cuci Blow')
    )
      namaPaket = 'Paket "BASIC CARE"';

    const conf = Math.round(rule.confidence * 100);
    const antecedent = rule.antecedent.join(', ');
    const consequent = rule.consequent.join(', ');
    const strategi = `Cross-selling berbasis asosiasi (Confidence ${conf}%, Lift ${rule.lift.toFixed(2)}). Tawarkan ${consequent} saat pelanggan memilih ${antecedent}. Buat paket bundling dengan harga spesial untuk meningkatkan nilai transaksi.`;

    packages.push({ namaPaket, layanan, strategi });
    if (packages.length >= 6) break;
  }

  return packages;
}

// ─── PDF Preview — Lift Ratio Table ────────────────────────────────────────────
function PdfPreviewLiftRatio({
  forwardRef,
}: {
  forwardRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { associationRules, transactions, params, fileName } = useAppStore();

  const rules =
    associationRules.length > 0
      ? associationRules
      : [
          { id: 'Rule_1', antecedent: ['Coloring', 'Vitamin Rambut'], consequent: ['Hair Mask'], confidence: 1.0, supportB: 0.29, lift: 3.51, keterangan: 'Valid' as const },
          { id: 'Rule_2', antecedent: ['Coloring', 'Hair Mask'], consequent: ['Vitamin Rambut'], confidence: 1.0, supportB: 0.3, lift: 3.37, keterangan: 'Valid' as const },
          { id: 'Rule_3', antecedent: ['Hair Mask', 'Vitamin Rambut'], consequent: ['Coloring'], confidence: 1.0, supportB: 0.29, lift: 3.44, keterangan: 'Valid' as const },
          { id: 'Rule_4', antecedent: ['Hair Mask'], consequent: ['Vitamin Rambut'], confidence: 0.99, supportB: 0.3, lift: 3.33, keterangan: 'Valid' as const },
          { id: 'Rule_5', antecedent: ['Hair Mask'], consequent: ['Coloring', 'Vitamin Rambut'], confidence: 0.99, supportB: 0.28, lift: 3.51, keterangan: 'Valid' as const },
          { id: 'Rule_6', antecedent: ['Hair Mask'], consequent: ['Coloring'], confidence: 0.99, supportB: 0.29, lift: 3.4, keterangan: 'Valid' as const },
          { id: 'Rule_7', antecedent: ['Facial'], consequent: ['Totok Wajah'], confidence: 0.98, supportB: 0.25, lift: 3.96, keterangan: 'Valid' as const },
          { id: 'Rule_8', antecedent: ['Coloring'], consequent: ['Hair Mask', 'Vitamin Rambut'], confidence: 0.97, supportB: 0.28, lift: 3.44, keterangan: 'Valid' as const },
          { id: 'Rule_9', antecedent: ['Coloring'], consequent: ['Hair Mask'], confidence: 0.97, supportB: 0.29, lift: 3.4, keterangan: 'Valid' as const },
          { id: 'Rule_10', antecedent: ['Coloring'], consequent: ['Vitamin Rambut'], confidence: 0.97, supportB: 0.3, lift: 3.26, keterangan: 'Valid' as const },
          { id: 'Rule_11', antecedent: ['Cuci Blow'], consequent: ['Potong Rambut'], confidence: 0.97, supportB: 0.39, lift: 2.46, keterangan: 'Valid' as const },
          { id: 'Rule_12', antecedent: ['Potong Rambut'], consequent: ['Cuci Blow'], confidence: 0.96, supportB: 0.39, lift: 2.46, keterangan: 'Valid' as const },
          { id: 'Rule_13', antecedent: ['Totok Wajah'], consequent: ['Facial'], confidence: 0.96, supportB: 0.24, lift: 3.96, keterangan: 'Valid' as const },
          { id: 'Rule_14', antecedent: ['Vitamin Rambut'], consequent: ['Hair Mask'], confidence: 0.95, supportB: 0.29, lift: 3.33, keterangan: 'Valid' as const },
          { id: 'Rule_15', antecedent: ['Vitamin Rambut'], consequent: ['Coloring', 'Hair Mask'], confidence: 0.95, supportB: 0.28, lift: 3.37, keterangan: 'Valid' as const },
          { id: 'Rule_16', antecedent: ['Vitamin Rambut'], consequent: ['Coloring'], confidence: 0.95, supportB: 0.29, lift: 3.26, keterangan: 'Valid' as const },
        ];

  const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  const totalTx = transactions.length || 1247;

  return (
    <div
      ref={forwardRef}
      style={{
        width: '900px',
        padding: '48px 40px',
        fontFamily: 'Times New Roman, serif',
        backgroundColor: '#ffffff',
        color: '#111111',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px', borderBottom: '2px solid #333', paddingBottom: '16px' }}>
        <p style={{ fontSize: '12px', marginBottom: '4px' }}>Laporan Hasil Analisis Algoritma Apriori</p>
        <h1 style={{ fontSize: '16px', fontWeight: 'bold', margin: '4px 0' }}>
          Analisis Association Rules &amp; Lift Ratio
        </h1>
        <p style={{ fontSize: '11px', color: '#555' }}>
          Sumber Data: {fileName || 'transaksi_salon.xlsx'} &nbsp;|&nbsp; Total Transaksi:{' '}
          {totalTx.toLocaleString('id-ID')} &nbsp;|&nbsp; Min Support:{' '}
          {(params.minSupport * 100).toFixed(0)}% &nbsp;|&nbsp; Min Confidence:{' '}
          {(params.minConfidence * 100).toFixed(0)}% &nbsp;|&nbsp; Tanggal Cetak: {today}
        </p>
      </div>

      {/* Table Title */}
      <p style={{ textAlign: 'center', fontSize: '13px', fontWeight: 'bold', marginBottom: '10px' }}>
        Tabel Hasil Pengujian Lift Ratio
      </p>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
        <thead>
          <tr style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>
            {['Kode Aturan', 'Antecedent (Jika Memilih...)', 'Consequent (...Maka Memilih)', 'Confidence (%)', 'Support B (%)', 'Lift Ratio', 'Keterangan'].map((h) => (
              <th key={h} style={{ border: '1px solid #555', padding: '7px 10px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rules.map((rule, idx) => (
            <tr key={rule.id} style={{ backgroundColor: idx % 2 === 0 ? '#f9f9f9' : '#ffffff' }}>
              <td style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'center' }}>{rule.id}</td>
              <td style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'left' }}>{rule.antecedent.join(', ')}</td>
              <td style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'left' }}>{rule.consequent.join(', ')}</td>
              <td style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'center' }}>
                {(rule.confidence * 100).toFixed(0)}%
              </td>
              <td style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'center' }}>
                {(rule.supportB * 100).toFixed(0)}%
              </td>
              <td style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'center' }}>
                {rule.lift.toFixed(2).replace('.', ',')}
              </td>
              <td style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'center', color: rule.keterangan === 'Valid' ? '#166534' : '#991b1b', fontWeight: 'bold' }}>
                {rule.keterangan}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div style={{ marginTop: '24px', borderTop: '1px solid #ccc', paddingTop: '12px', fontSize: '10px', color: '#777', display: 'flex', justifyContent: 'space-between' }}>
        <span>DataMine Apriori Analytics — Laporan otomatis</span>
        <span>{today}</span>
      </div>
    </div>
  );
}

// ─── PDF Preview — Promo Strategy Table ────────────────────────────────────────
function PdfPreviewPromoStrategy({
  forwardRef,
}: {
  forwardRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { associationRules, transactions, params, fileName } = useAppStore();
  const packages = derivePromoPackages(associationRules);
  const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  const totalTx = transactions.length || 1247;

  return (
    <div
      ref={forwardRef}
      style={{
        width: '900px',
        padding: '48px 40px',
        fontFamily: 'Times New Roman, serif',
        backgroundColor: '#ffffff',
        color: '#111111',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px', borderBottom: '2px solid #333', paddingBottom: '16px' }}>
        <p style={{ fontSize: '12px', marginBottom: '4px' }}>Laporan Hasil Analisis Algoritma Apriori</p>
        <h1 style={{ fontSize: '16px', fontWeight: 'bold', margin: '4px 0' }}>
          Rekomendasi Strategi Promosi Berbasis Hasil Apriori
        </h1>
        <p style={{ fontSize: '11px', color: '#555' }}>
          Sumber Data: {fileName || 'transaksi_salon.xlsx'} &nbsp;|&nbsp; Total Transaksi:{' '}
          {totalTx.toLocaleString('id-ID')} &nbsp;|&nbsp; Min Support:{' '}
          {(params.minSupport * 100).toFixed(0)}% &nbsp;|&nbsp; Min Confidence:{' '}
          {(params.minConfidence * 100).toFixed(0)}% &nbsp;|&nbsp; Tanggal Cetak: {today}
        </p>
      </div>

      {/* Section title bar — mimicking the image's orange header */}
      <div style={{
        backgroundColor: '#c2410c',
        color: '#ffffff',
        padding: '10px 16px',
        fontSize: '13px',
        fontWeight: 'bold',
        letterSpacing: '0.04em',
        marginBottom: '0',
      }}>
        💡 REKOMENDASI STRATEGI PROMOSI BERBASIS HASIL APRIORI
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
        <thead>
          <tr style={{ backgroundColor: '#ea580c', color: '#ffffff' }}>
            {['NAMA PAKET', 'LAYANAN YANG DIGABUNGKAN', 'STRATEGI PROMOSI'].map((h) => (
              <th
                key={h}
                style={{
                  border: '1px solid #c2410c',
                  padding: '9px 12px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: '11px',
                  letterSpacing: '0.03em',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {packages.map((pkg, idx) => (
            <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#fff7ed' : '#ffffff' }}>
              <td style={{ border: '1px solid #fed7aa', padding: '10px 12px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', verticalAlign: 'top', width: '18%' }}>
                {pkg.namaPaket}
              </td>
              <td style={{ border: '1px solid #fed7aa', padding: '10px 12px', textAlign: 'center', fontSize: '11px', verticalAlign: 'top', width: '22%' }}>
                {pkg.layanan}
              </td>
              <td style={{ border: '1px solid #fed7aa', padding: '10px 12px', textAlign: 'left', fontSize: '11px', verticalAlign: 'top', lineHeight: '1.5' }}>
                {pkg.strategi}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div style={{ marginTop: '24px', borderTop: '1px solid #ccc', paddingTop: '12px', fontSize: '10px', color: '#777', display: 'flex', justifyContent: 'space-between' }}>
        <span>DataMine Apriori Analytics — Laporan otomatis</span>
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

  const exportConfigs: Record<
    ExportType,
    { label: string; fileName: string; ref: React.RefObject<HTMLDivElement | null>; icon: React.ReactNode; description: string; chips: string[] }
  > = {
    'lift-ratio': {
      label: 'Tabel Hasil Pengujian Lift Ratio',
      fileName: 'Laporan_Apriori_Lift_Ratio.pdf',
      ref: liftRatioRef,
      icon: <LayoutList size={22} />,
      description:
        'Hasilkan laporan PDF berisi tabel <strong>Hasil Pengujian Lift Ratio</strong> lengkap dengan kolom Kode Aturan, Antecedent, Consequent, Confidence, Support B, Lift Ratio, dan Keterangan.',
      chips: ['Kode Aturan', 'Antecedent & Consequent', 'Confidence & Support B', 'Lift Ratio & Keterangan'],
    },
    'promo-strategy': {
      label: 'Rekomendasi Strategi Promosi',
      fileName: 'Laporan_Strategi_Promosi_Apriori.pdf',
      ref: promoStrategyRef,
      icon: <Star size={22} />,
      description:
        'Hasilkan laporan PDF berisi tabel <strong>Rekomendasi Strategi Promosi Berbasis Hasil Apriori</strong> dengan kolom Nama Paket, Layanan yang Digabungkan, dan Strategi Promosi.',
      chips: ['Nama Paket', 'Layanan yang Digabungkan', 'Strategi Promosi'],
    },
  };

  const activeConfig = exportConfigs[activeExport];

  const handleExportPDF = async () => {
    const ref = activeConfig.ref;
    if (!ref.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(ref.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgW = canvas.width;
      const imgH = canvas.height;

      const ratio = pdfW / imgW;
      const scaledH = imgH * ratio;

      let yOffset = 0;
      let page = 0;
      while (yOffset < scaledH) {
        if (page > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -yOffset, pdfW, scaledH);
        yOffset += pdfH;
        page++;
      }

      pdf.save(activeConfig.fileName);
    } catch (e) {
      console.error('PDF export error:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Type Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 flex gap-2">
        {(Object.entries(exportConfigs) as [ExportType, typeof exportConfigs[ExportType]][]).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setActiveExport(key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeExport === key
                ? 'bg-gradient-to-r from-teal-500 to-blue-600 text-white shadow-md'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
            }`}
          >
            {cfg.icon}
            <span className="hidden sm:inline">{cfg.label}</span>
            <span className="sm:hidden">
              {key === 'lift-ratio' ? 'Lift Ratio' : 'Strategi Promosi'}
            </span>
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
          <p
            className="text-gray-600 mb-8"
            dangerouslySetInnerHTML={{ __html: activeConfig.description }}
          />

          <button
            onClick={handleExportPDF}
            disabled={isGenerating}
            className="flex items-center gap-3 mx-auto px-8 py-4 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-xl hover:from-teal-600 hover:to-blue-700 transition-all shadow-lg text-base disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <><Loader2 size={22} className="animate-spin" /> Membuat PDF...</>
            ) : (
              <><Download size={22} /> Unduh PDF — {activeConfig.label}</>
            )}
          </button>

          {!isDataLoaded && (
            <p className="mt-4 text-sm text-amber-600">
              ⚠ PDF akan menggunakan data contoh. Import Excel terlebih dahulu untuk data nyata.
            </p>
          )}

          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-gray-500 flex-wrap">
            {activeConfig.chips.map((chip) => (
              <span key={chip}>✓ {chip}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h4 className="text-lg text-gray-800">Pratinjau PDF — {activeConfig.label}</h4>
          <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {isDataLoaded
              ? activeExport === 'lift-ratio'
                ? `${associationRules.length} aturan`
                : `${derivePromoPackages(associationRules).length} paket`
              : activeExport === 'lift-ratio'
              ? '16 aturan (contoh)'
              : '3 paket (contoh)'}
          </span>
        </div>
        <div className="overflow-x-auto p-4 bg-gray-50">
          <div className="origin-top-left" style={{ transform: 'scale(0.75)', transformOrigin: 'top left', width: '133%' }}>
            {activeExport === 'lift-ratio' ? (
              <PdfPreviewLiftRatio forwardRef={liftRatioRef} />
            ) : (
              <PdfPreviewPromoStrategy forwardRef={promoStrategyRef} />
            )}
          </div>
        </div>
      </div>

      {/* Hidden full-size renders for PDF capture (both always mounted) */}
      <div style={{ position: 'absolute', left: '-9999px', top: '0', pointerEvents: 'none' }}>
        <PdfPreviewLiftRatio forwardRef={liftRatioRef} />
        <PdfPreviewPromoStrategy forwardRef={promoStrategyRef} />
      </div>
    </div>
  );
}
