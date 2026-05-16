import { useState, useMemo } from 'react';
import { ArrowRight, Search, FileSpreadsheet } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

const PAGE_SIZE = 15;

export function AssociationRules() {
  const { associationRules, isDataLoaded, isProcessing, params } = useAppStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<'confidence' | 'lift' | 'support'>('lift');

  const filtered = useMemo(() => {
    let rows = associationRules.filter((r) => {
      const text = [...r.antecedent, ...r.consequent].join(' ').toLowerCase();
      return text.includes(search.toLowerCase());
    });
    return [...rows].sort((a, b) => b[sortKey] - a[sortKey]);
  }, [associationRules, search, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const SortBtn = ({ k, label }: { k: typeof sortKey; label: string }) => (
    <button
      onClick={() => { setSortKey(k); setPage(1); }}
      className={`px-3 py-1 rounded-full text-xs border transition-colors ${
        sortKey === k ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-200 text-gray-600 hover:border-teal-300'
      }`}
    >
      {label}
    </button>
  );

  // Empty state
  if (!isDataLoaded && !isProcessing) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 text-center">
        <FileSpreadsheet size={48} className="text-gray-300 mx-auto mb-4" />
        <h4 className="text-gray-500 mb-2">Belum ada aturan asosiasi</h4>
        <p className="text-sm text-gray-400">Import data transaksi dan jalankan analisis untuk melihat aturan asosiasi.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-xl text-gray-800">Aturan Asosiasi</h3>
            <p className="text-sm text-gray-500 mt-1">
              {isProcessing
                ? 'Menghitung aturan...'
                : `${filtered.length} aturan ditemukan — Support ≥ ${(params.minSupport * 100).toFixed(0)}%, Confidence ≥ ${(params.minConfidence * 100).toFixed(0)}%`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">Urutkan:</span>
            <SortBtn k="lift" label="Lift Ratio" />
            <SortBtn k="confidence" label="Confidence" />
            <SortBtn k="support" label="Support" />
          </div>
        </div>
        {isDataLoaded && (
          <div className="mt-3 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari antecedent atau consequent..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg w-full md:w-80 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
        )}
      </div>

      {isProcessing ? (
        <div className="p-12 text-center text-gray-400">Memproses algoritma Apriori...</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-gray-400">
          Tidak ada aturan dengan parameter saat ini. Coba kurangi Min Support / Confidence.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Kode Aturan</th>
                <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Antecedent (Jika Memilih...)</th>
                <th className="px-4 py-3 text-center text-xs text-gray-600 uppercase tracking-wider"></th>
                <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Consequent (...Maka Memilih)</th>
                <th className="px-4 py-3 text-center text-xs text-gray-600 uppercase tracking-wider">Confidence (%)</th>
                <th className="px-4 py-3 text-center text-xs text-gray-600 uppercase tracking-wider">Support B (%)</th>
                <th className="px-4 py-3 text-center text-xs text-gray-600 uppercase tracking-wider">Lift Ratio</th>
                <th className="px-4 py-3 text-center text-xs text-gray-600 uppercase tracking-wider">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageData.map((rule) => (
                <tr key={rule.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{rule.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{rule.antecedent.join(', ')}</td>
                  <td className="px-4 py-3 text-center">
                    <ArrowRight size={16} className="text-teal-600 mx-auto" />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{rule.consequent.join(', ')}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-1 bg-teal-100 text-teal-700 rounded-full text-xs font-medium">
                      {(rule.confidence * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-700">
                    {(rule.supportB * 100).toFixed(0)}%
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      rule.lift >= 2 ? 'bg-green-100 text-green-700'
                      : rule.lift >= 1.5 ? 'bg-teal-100 text-teal-700'
                      : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {rule.lift.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      rule.keterangan === 'Valid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {rule.keterangan}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-600">Halaman {page} dari {totalPages} · {filtered.length} aturan</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40">‹</button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40">›</button>
          </div>
        </div>
      )}
    </div>
  );
}
