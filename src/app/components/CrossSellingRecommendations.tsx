import { useMemo } from 'react';
import { TrendingUp, Sparkles, ArrowRight, FileSpreadsheet } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export function CrossSellingRecommendations() {
  const { associationRules, isDataLoaded, isProcessing } = useAppStore();

  const recommendations = useMemo(() => {
    if (!isDataLoaded || associationRules.length === 0) return [];
    const seen = new Set<string>();
    const recs: { service: string; recommend: string; confidence: number; lift: number; impact: string }[] = [];
    for (const rule of associationRules.slice(0, 50)) {
      const k = rule.consequent.join(', ');
      if (seen.has(k)) continue;
      seen.add(k);
      recs.push({
        service: rule.antecedent.join(', '),
        recommend: rule.consequent.join(', '),
        confidence: Math.round(rule.confidence * 100),
        lift: rule.lift,
        impact: rule.lift >= 2 ? 'tinggi' : rule.lift >= 1.5 ? 'menengah' : 'rendah',
      });
      if (recs.length >= 9) break;
    }
    return recs;
  }, [associationRules, isDataLoaded]);

  const impactColor = (impact: string) =>
    impact === 'tinggi' ? 'bg-green-100 text-green-700'
    : impact === 'menengah' ? 'bg-yellow-100 text-yellow-700'
    : 'bg-gray-100 text-gray-600';

  // Empty state
  if (!isDataLoaded && !isProcessing) {
    return (
      <div className="space-y-6">
        <h3 className="text-2xl text-gray-800">Rekomendasi Cross-Selling</h3>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 text-center">
          <FileSpreadsheet size={48} className="text-gray-300 mx-auto mb-4" />
          <h4 className="text-gray-500 mb-2">Belum ada data rekomendasi</h4>
          <p className="text-sm text-gray-400">
            Import data transaksi dan jalankan analisis Apriori untuk mendapatkan rekomendasi cross-selling otomatis.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-2xl text-gray-800">Rekomendasi Cross-Selling</h3>
          <p className="text-sm text-gray-500 mt-1">
            {isProcessing
              ? 'Menghitung rekomendasi...'
              : `${recommendations.length} rekomendasi teratas berdasarkan Lift Ratio`}
          </p>
        </div>
        <div className="px-4 py-2 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-lg flex items-center gap-2">
          <Sparkles size={18} /><span className="text-sm">Didukung oleh Apriori</span>
        </div>
      </div>

      {isProcessing ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-400 shadow-sm border border-gray-100">
          Memproses algoritma...
        </div>
      ) : recommendations.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <p className="text-gray-400">Tidak ada aturan asosiasi yang ditemukan dengan parameter saat ini.</p>
          <p className="text-sm text-gray-400 mt-2">Coba kurangi nilai Min Support atau Min Confidence.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendations.map((rec, idx) => (
            <div key={idx} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-teal-200 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-blue-500 rounded-xl flex items-center justify-center">
                  <TrendingUp size={24} className="text-white" />
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${impactColor(rec.impact)}`}>
                  DAMPAK {rec.impact.toUpperCase()}
                </span>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Jika pelanggan memilih</p>
                  <p className="text-sm text-gray-900 font-medium">{rec.service}</p>
                </div>
                <div className="flex items-center gap-2 text-teal-600">
                  <div className="h-px flex-1 bg-gradient-to-r from-teal-200 to-transparent"></div>
                  <ArrowRight size={16} />
                  <div className="h-px flex-1 bg-gradient-to-l from-teal-200 to-transparent"></div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Rekomendasikan</p>
                  <p className="text-base text-gray-900 font-semibold">{rec.recommend}</p>
                </div>
                <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
                  <div className="bg-teal-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-500">Confidence</p>
                    <p className="text-base text-teal-700 font-semibold">{rec.confidence}%</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-500">Lift Ratio</p>
                    <p className="text-base text-blue-700 font-semibold">{rec.lift.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
