import { useState, useEffect } from 'react';
import { SlidersHorizontal, Play, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export function FilterPanel() {
  const {
    params, setParams, runAnalysis,
    isDataLoaded, isProcessing,
    transactions, frequentItemsets, associationRules,
  } = useAppStore();

  const [localSupport, setLocalSupport] = useState(Math.round(params.minSupport * 100));
  const [localConfidence, setLocalConfidence] = useState(Math.round(params.minConfidence * 100));
  const [localDateFrom, setLocalDateFrom] = useState(params.dateFrom);
  const [localDateTo, setLocalDateTo] = useState(params.dateTo);
  const [hasRun, setHasRun] = useState(false);

  // Sync if store params change externally
  useEffect(() => {
    setLocalSupport(Math.round(params.minSupport * 100));
    setLocalConfidence(Math.round(params.minConfidence * 100));
  }, [params.minSupport, params.minConfidence]);

  const handleApply = () => {
    setParams({
      minSupport: localSupport / 100,
      minConfidence: localConfidence / 100,
      dateFrom: localDateFrom,
      dateTo: localDateTo,
    });
    setHasRun(true);
    // Small delay to let setParams commit before runAnalysis reads it
    setTimeout(() => runAnalysis(), 10);
  };

  const handleReset = () => {
    setLocalSupport(10);
    setLocalConfidence(50);
    setLocalDateFrom('');
    setLocalDateTo('');
    setParams({ minSupport: 0.10, minConfidence: 0.50, dateFrom: '', dateTo: '' });
    setHasRun(false);
    setTimeout(() => runAnalysis(), 10);
  };

  const noResults = hasRun && !isProcessing && isDataLoaded && frequentItemsets.length === 0;
  const hasResults = !isProcessing && isDataLoaded && associationRules.length > 0;

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
          <SlidersHorizontal size={20} className="text-teal-600" />
        </div>
        <div>
          <h3 className="text-xl text-gray-800">Filter Algoritma Apriori</h3>
          <p className="text-xs text-gray-500">
            {isDataLoaded
              ? `${transactions.length.toLocaleString('id-ID')} transaksi siap dianalisis`
              : 'Import data terlebih dahulu'}
          </p>
        </div>
      </div>

      {/* Parameters grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* Min Support */}
        <div>
          <label className="block text-sm text-gray-700 mb-2">
            Minimum Support
            <span className="ml-2 font-semibold text-teal-600">{localSupport}%</span>
          </label>
          <input
            type="range" min="1" max="100" step="1" value={localSupport}
            onChange={(e) => setLocalSupport(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>1%</span><span>100%</span>
          </div>
          <input
            type="number" min="1" max="100" value={localSupport}
            onChange={(e) => setLocalSupport(Math.min(100, Math.max(1, Number(e.target.value))))}
            className="mt-2 w-full px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>

        {/* Min Confidence */}
        <div>
          <label className="block text-sm text-gray-700 mb-2">
            Minimum Confidence
            <span className="ml-2 font-semibold text-teal-600">{localConfidence}%</span>
          </label>
          <input
            type="range" min="1" max="100" step="1" value={localConfidence}
            onChange={(e) => setLocalConfidence(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>1%</span><span>100%</span>
          </div>
          <input
            type="number" min="1" max="100" value={localConfidence}
            onChange={(e) => setLocalConfidence(Math.min(100, Math.max(1, Number(e.target.value))))}
            className="mt-2 w-full px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>

        {/* Date From */}
        <div>
          <label className="block text-sm text-gray-700 mb-2">Tanggal Mulai</label>
          <input
            type="date" value={localDateFrom}
            onChange={(e) => setLocalDateFrom(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">Kosongkan = semua tanggal</p>
        </div>

        {/* Date To */}
        <div>
          <label className="block text-sm text-gray-700 mb-2">Tanggal Akhir</label>
          <input
            type="date" value={localDateTo}
            onChange={(e) => setLocalDateTo(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">Kosongkan = semua tanggal</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleApply}
          disabled={!isDataLoaded || isProcessing}
          className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg hover:from-teal-600 hover:to-teal-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          {isProcessing
            ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Memproses...</>
            : <><Play size={16} /> Jalankan Analisis</>
          }
        </button>
        <button
          onClick={handleReset}
          disabled={isProcessing}
          className="px-6 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40"
        >
          Atur Ulang (10% / 50%)
        </button>

        {!isDataLoaded && (
          <span className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">
            ⚠ Import data Excel terlebih dahulu
          </span>
        )}
      </div>

      {/* Result feedback */}
      {noResults && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-700">
            <p className="font-semibold mb-1">Tidak ada frequent itemset ditemukan.</p>
            <p>
              Coba kurangi nilai <strong>Min Support</strong> (misal ke 5–10%) atau{' '}
              <strong>Min Confidence</strong> (misal ke 30–50%). Saat ini support {localSupport}% artinya
              sebuah layanan harus muncul minimal di{' '}
              <strong>{Math.ceil((localSupport / 100) * transactions.length)} transaksi</strong>{' '}
              dari {transactions.length} total.
            </p>
          </div>
        </div>
      )}

      {hasResults && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-lg">
          <CheckCircle2 size={18} className="text-green-600" />
          <p className="text-sm text-green-700">
            Analisis selesai — ditemukan <strong>{frequentItemsets.length} frequent itemset</strong> dan{' '}
            <strong>{associationRules.length} aturan asosiasi</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
