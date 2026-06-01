import { useRef, useState } from 'react';
import { FileText, Download, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAppStore } from '../../store/useAppStore';

// ─── PDF Preview Table (hidden div rendered to canvas) ────────────────────────
function PdfPreviewTable({ forwardRef }: { forwardRef: React.RefObject<HTMLDivElement | null> }) {
  const { associationRules, transactions, params, fileName } = useAppStore();

  const rules = associationRules.length > 0 ? associationRules : [
    { id: 'Rule_1', antecedent: ['Coloring', 'Vitamin Rambut'], consequent: ['Hair Mask'], confidence: 1.00, supportB: 0.29, lift: 3.51, keterangan: 'Valid' as const },
    { id: 'Rule_2', antecedent: ['Coloring', 'Hair Mask'], consequent: ['Vitamin Rambut'], confidence: 1.00, supportB: 0.30, lift: 3.37, keterangan: 'Valid' as const },
    { id: 'Rule_3', antecedent: ['Hair Mask', 'Vitamin Rambut'], consequent: ['Coloring'], confidence: 1.00, supportB: 0.29, lift: 3.44, keterangan: 'Valid' as const },
    { id: 'Rule_4', antecedent: ['Hair Mask'], consequent: ['Vitamin Rambut'], confidence: 0.99, supportB: 0.30, lift: 3.33, keterangan: 'Valid' as const },
    { id: 'Rule_5', antecedent: ['Hair Mask'], consequent: ['Coloring', 'Vitamin Rambut'], confidence: 0.99, supportB: 0.28, lift: 3.51, keterangan: 'Valid' as const },
    { id: 'Rule_6', antecedent: ['Hair Mask'], consequent: ['Coloring'], confidence: 0.99, supportB: 0.29, lift: 3.40, keterangan: 'Valid' as const },
    { id: 'Rule_7', antecedent: ['Facial'], consequent: ['Totok Wajah'], confidence: 0.98, supportB: 0.25, lift: 3.96, keterangan: 'Valid' as const },
    { id: 'Rule_8', antecedent: ['Coloring'], consequent: ['Hair Mask', 'Vitamin Rambut'], confidence: 0.97, supportB: 0.28, lift: 3.44, keterangan: 'Valid' as const },
    { id: 'Rule_9', antecedent: ['Coloring'], consequent: ['Hair Mask'], confidence: 0.97, supportB: 0.29, lift: 3.40, keterangan: 'Valid' as const },
    { id: 'Rule_10', antecedent: ['Coloring'], consequent: ['Vitamin Rambut'], confidence: 0.97, supportB: 0.30, lift: 3.26, keterangan: 'Valid' as const },
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
      {/* Cover / Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px', borderBottom: '2px solid #333', paddingBottom: '16px' }}>
        <p style={{ fontSize: '12px', marginBottom: '4px' }}>
          Laporan Hasil Analisis Algoritma Apriori
        </p>
        <h1 style={{ fontSize: '16px', fontWeight: 'bold', margin: '4px 0' }}>
          Analisis Association Rules &amp; Lift Ratio
        </h1>
        <p style={{ fontSize: '11px', color: '#555' }}>
          Sumber Data: {fileName || 'transaksi_salon.xlsx'} &nbsp;|&nbsp; Total Transaksi: {totalTx.toLocaleString('id-ID')} &nbsp;|&nbsp;
          Min Support: {(params.minSupport * 100).toFixed(0)}% &nbsp;|&nbsp;
          Min Confidence: {(params.minConfidence * 100).toFixed(0)}% &nbsp;|&nbsp;
          Tanggal Cetak: {today}
        </p>
      </div>

      {/* Table Title */}
      <p style={{ textAlign: 'center', fontSize: '13px', fontWeight: 'bold', marginBottom: '10px' }}>
        Tabel Hasil Pengujian Lift Ratio
      </p>

      {/* Association Rules Table */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '11px',
      }}>
        <thead>
          <tr style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>
            {['Kode Aturan', 'Antecedent (Jika Memilih...)', 'Consequent (...Maka Memilih)', 'Confidence (%)', 'Support B (%)', 'Lift Ratio', 'Keterangan'].map((h) => (
              <th key={h} style={{
                border: '1px solid #555',
                padding: '7px 10px',
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '11px',
              }}>{h}</th>
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

// ─── Main ExportReport Component ──────────────────────────────────────────────
export function ExportReport() {
  const { isDataLoaded, associationRules } = useAppStore();
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExportPDF = async () => {
    if (!previewRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(previewRef.current, {
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

      // Scale to fit page width, then paginate if taller
      const ratio = pdfW / imgW;
      const scaledH = imgH * ratio;
      const pageH = pdfH;

      let yOffset = 0;
      let page = 0;
      while (yOffset < scaledH) {
        if (page > 0) pdf.addPage();
        pdf.addImage(
          imgData, 'PNG',
          0, -(yOffset),            // shift image up per page
          pdfW, scaledH,            // full width, full scaled height
        );
        yOffset += pageH;
        page++;
      }

      pdf.save('Laporan_Apriori_Lift_Ratio.pdf');
    } catch (e) {
      console.error('PDF export error:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Card */}
      <div className="bg-gradient-to-br from-teal-50 via-white to-blue-50 rounded-xl p-8 shadow-sm border border-teal-100">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <FileText size={32} className="text-white" />
          </div>
          <h3 className="text-2xl text-gray-800 mb-3">Ekspor Laporan Analisis</h3>
          <p className="text-gray-600 mb-8">
            Hasilkan laporan PDF yang berisi tabel <strong>Hasil Pengujian Lift Ratio</strong> lengkap dengan
            kolom Kode Aturan, Antecedent, Consequent, Confidence, Support B, Lift Ratio, dan Keterangan.
          </p>

          <button
            onClick={handleExportPDF}
            disabled={isGenerating}
            className="flex items-center gap-3 mx-auto px-8 py-4 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-xl hover:from-teal-600 hover:to-blue-700 transition-all shadow-lg text-base disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <><Loader2 size={22} className="animate-spin" /> Membuat PDF...</>
            ) : (
              <><Download size={22} /> Unduh PDF — Hasil Pengujian Lift Ratio</>
            )}
          </button>

          {!isDataLoaded && (
            <p className="mt-4 text-sm text-amber-600">
              ⚠ PDF akan menggunakan data contoh. Import Excel terlebih dahulu untuk data nyata.
            </p>
          )}

          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-gray-500">
            <span>✓ Kode Aturan</span>
            <span>✓ Antecedent &amp; Consequent</span>
            <span>✓ Confidence &amp; Support B</span>
            <span>✓ Lift Ratio &amp; Keterangan</span>
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h4 className="text-lg text-gray-800">Pratinjau Tabel PDF</h4>
          <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {isDataLoaded ? `${associationRules.length} aturan` : '16 aturan (contoh)'}
          </span>
        </div>
        <div className="overflow-x-auto p-4 bg-gray-50">
          <div className="origin-top-left" style={{ transform: 'scale(0.75)', transformOrigin: 'top left', width: '133%' }}>
            <PdfPreviewTable forwardRef={previewRef} />
          </div>
        </div>
      </div>

      {/* Hidden full-size render for PDF capture */}
      <div style={{ position: 'absolute', left: '-9999px', top: '0', pointerEvents: 'none' }}>
        <PdfPreviewTable forwardRef={previewRef} />
      </div>
    </div>
  );
}
