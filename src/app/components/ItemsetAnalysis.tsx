import { useState, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { FileSpreadsheet } from 'lucide-react';

type TabKey = '1' | '2' | '3+';

export function ItemsetAnalysis() {
  const { frequentItemsets, isDataLoaded, isProcessing } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabKey>('1');

  const grouped = useMemo(() => {
    const g: Record<TabKey, typeof frequentItemsets> = { '1': [], '2': [], '3+': [] };
    for (const fi of frequentItemsets) {
      if (fi.itemset.length === 1) g['1'].push(fi);
      else if (fi.itemset.length === 2) g['2'].push(fi);
      else g['3+'].push(fi);
    }
    for (const k of Object.keys(g) as TabKey[]) {
      g[k].sort((a, b) => b.support - a.support);
    }
    return g;
  }, [frequentItemsets]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: '1', label: '1-Itemset' },
    { key: '2', label: '2-Itemset' },
    { key: '3+', label: '3+-Itemset' },
  ];

  const data = grouped[activeTab] ?? [];

  // Empty state — no data loaded
  if (!isDataLoaded && !isProcessing) {
    return (
      <div className="space-y-6">
        <h3 className="text-2xl text-gray-800">Analisis Frequent Itemset</h3>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 text-center">
          <FileSpreadsheet size={48} className="text-gray-300 mx-auto mb-4" />
          <h4 className="text-gray-500 mb-2">Belum ada data untuk dianalisis</h4>
          <p className="text-sm text-gray-400">
            Import file Excel di halaman "Impor Data Excel" untuk menjalankan analisis itemset.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl text-gray-800">Analisis Frequent Itemset</h3>
        {isProcessing && (
          <span className="px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-xs animate-pulse">
            ⚙ Memproses...
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {tabs.map((t) => (
          <div key={t.key} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-2xl text-teal-600 font-semibold">{grouped[t.key].length}</p>
            <p className="text-sm text-gray-500 mt-1">{t.label}</p>
          </div>
        ))}
      </div>

      {/* Tab switcher + table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-200">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === t.key
                  ? 'text-teal-700 border-b-2 border-teal-600 bg-teal-50/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t.label} ({grouped[t.key].length})
            </button>
          ))}
        </div>

        {isProcessing ? (
          <div className="p-12 text-center text-gray-400">Menghitung itemset...</div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            Tidak ada frequent itemset pada kategori ini dengan nilai Min Support yang diatur.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">No</th>
                  <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Itemset</th>
                  <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Support (%)</th>
                  <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Frekuensi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-400">{idx + 1}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex flex-wrap gap-1">
                        {item.itemset.map((s) => (
                          <span key={s} className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded text-xs border border-teal-100">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-700 w-14">{(item.support * 100).toFixed(2)}%</span>
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden max-w-[120px]">
                          <div
                            className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full"
                            style={{ width: `${Math.min(100, item.support * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{item.frequency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
