import { useState, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopNavbar } from './components/TopNavbar';
import { KPICard } from './components/KPICard';
import { DataImportPanel } from './components/DataImportPanel';
import { TransactionTable } from './components/TransactionTable';
import { ItemsetAnalysis } from './components/ItemsetAnalysis';
import { AssociationRules } from './components/AssociationRules';
import { CrossSellingRecommendations } from './components/CrossSellingRecommendations';
import { DataVisualization } from './components/DataVisualization';
import { FilterPanel } from './components/FilterPanel';
import { ExportReport } from './components/ExportReport';
import { ShoppingCart, Package, GitBranch, TrendingUp } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export default function App() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const { transactions, associationRules, frequentItemsets, isDataLoaded, params } = useAppStore();

  // ── Live KPI values ────────────────────────────────────────────────────────
  const kpiData = useMemo(() => {
    if (!isDataLoaded) return null;
    const totalTx = transactions.length;
    const uniqueServices = new Set(transactions.flatMap((t) => t.services)).size;
    const totalRules = associationRules.length;
    const topLift = associationRules.length > 0 ? associationRules[0].lift : 0;
    const topRule = associationRules.length > 0
      ? `${associationRules[0].antecedent.join(', ')} → ${associationRules[0].consequent.join(', ')}`
      : 'Jalankan analisis';
    return { totalTx, uniqueServices, totalRules, topLift, topRule };
  }, [transactions, associationRules, frequentItemsets, isDataLoaded]);

  const getSectionTitle = () => {
    const titles: Record<string, string> = {
      dashboard: 'Ringkasan Dashboard',
      import: 'Impor Data Excel',
      transactions: 'Data Transaksi',
      itemsets: 'Analisis Itemset',
      rules: 'Aturan Asosiasi',
      recommendations: 'Rekomendasi Cross-Selling',
      visualization: 'Analisis Rasio Lift',
      reports: 'Laporan & Ekspor',
      settings: 'Pengaturan',
    };
    return titles[activeSection] || 'Dashboard';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />

      <div className="ml-64">
        <TopNavbar 
          title={getSectionTitle()} 
          onNavigateToReports={() => setActiveSection('reports')}
        />

        <main className="p-8">
          {/* ── DASHBOARD ─────────────────────────────────────────────────── */}
          {activeSection === 'dashboard' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                  title="Total Transaksi"
                  value={kpiData ? kpiData.totalTx.toLocaleString('id-ID') : '—'}
                  icon={ShoppingCart}
                  iconColor="text-blue-600"
                  iconBg="bg-blue-100"
                  trend={kpiData ? `${kpiData.totalTx} transaksi dianalisis` : 'Belum ada data'}
                />
                <KPICard
                  title="Layanan Unik"
                  value={kpiData ? String(kpiData.uniqueServices) : '—'}
                  icon={Package}
                  iconColor="text-purple-600"
                  iconBg="bg-purple-100"
                  trend={kpiData ? `${kpiData.uniqueServices} jenis layanan` : 'Belum ada data'}
                />
                <KPICard
                  title="Aturan Asosiasi"
                  value={kpiData ? String(kpiData.totalRules) : '—'}
                  icon={GitBranch}
                  iconColor="text-teal-600"
                  iconBg="bg-teal-100"
                  trend={kpiData ? `Min confidence: ${(params.minConfidence * 100).toFixed(0)}%` : 'Belum ada data'}
                />
                <KPICard
                  title="Rasio Lift Tertinggi"
                  value={kpiData && kpiData.topLift > 0 ? kpiData.topLift.toFixed(2) : '—'}
                  icon={TrendingUp}
                  iconColor="text-green-600"
                  iconBg="bg-green-100"
                  trend={kpiData ? kpiData.topRule : 'Belum ada data'}
                />
              </div>

              <DataImportPanel />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <h3 className="text-lg text-gray-800 mb-4">Ringkasan Analisis</h3>
                  {!isDataLoaded ? (
                    <div className="py-8 text-center text-gray-400">
                      <p className="text-sm">Import data untuk melihat ringkasan analisis</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {[
                        { label: 'Total Transaksi', value: kpiData!.totalTx.toLocaleString('id-ID') },
                        { label: 'Layanan Unik', value: `${kpiData!.uniqueServices} jenis` },
                        { label: 'Frequent Itemset', value: `${frequentItemsets.length} itemset` },
                        { label: 'Aturan Asosiasi', value: `${kpiData!.totalRules} aturan` },
                        { label: 'Lift Ratio Tertinggi', value: kpiData!.topLift > 0 ? kpiData!.topLift.toFixed(2) : '—' },
                        { label: 'Min Support', value: `${(params.minSupport * 100).toFixed(0)}%` },
                        { label: 'Min Confidence', value: `${(params.minConfidence * 100).toFixed(0)}%` },
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                          <span className="text-sm text-gray-600">{item.label}</span>
                          <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-gradient-to-br from-teal-500 to-blue-600 rounded-xl p-6 shadow-lg text-white">
                  <h3 className="text-lg mb-3">💡 Wawasan Analisis</h3>
                  <div className="space-y-3">
                    {isDataLoaded && associationRules.length > 0 ? (
                      associationRules.slice(0, 3).map((r, i) => (
                        <p key={i} className="text-sm text-teal-50">
                          {i === 0 ? '💡' : i === 1 ? '📈' : '🎯'} Pelanggan yang memilih{' '}
                          <strong>{r.antecedent.join(' + ')}</strong>{' '}→{' '}
                          <strong>{r.consequent.join(' + ')}</strong> (Confidence: {(r.confidence * 100).toFixed(0)}%, Lift: {r.lift.toFixed(2)})
                        </p>
                      ))
                    ) : (
                      <>
                        <p className="text-sm text-teal-50">💡 Import data Excel dan jalankan analisis untuk mendapatkan wawasan nyata</p>
                        <p className="text-sm text-teal-50">📈 Algoritma Apriori akan menemukan pola pembelian tersembunyi</p>
                        <p className="text-sm text-teal-50">🎯 Hasil analisis akan tampil di sini secara otomatis</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'import' && <DataImportPanel />}
          {activeSection === 'transactions' && <TransactionTable />}
          {activeSection === 'itemsets' && <ItemsetAnalysis />}

          {activeSection === 'rules' && (
            <div className="space-y-6">
              <FilterPanel />
              <AssociationRules />
            </div>
          )}

          {activeSection === 'recommendations' && <CrossSellingRecommendations />}

          {activeSection === 'visualization' && (
            <div className="space-y-6">
              <FilterPanel />
              <DataVisualization />
            </div>
          )}

          {activeSection === 'reports' && (
            <div className="space-y-6">
              <ExportReport />
            </div>
          )}

          {activeSection === 'settings' && (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
              <h3 className="text-2xl text-gray-800 mb-6">Pengaturan</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Parameter Algoritma Default</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Min Support Default (%)</label>
                      <input type="number" defaultValue="25" min="1" max="100"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Min Confidence Default (%)</label>
                      <input type="number" defaultValue="60" min="1" max="100"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Pengaturan Ekspor</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="rounded accent-teal-600" />
                      <span className="text-sm text-gray-700">Sertakan tabel Lift Ratio dalam PDF</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="rounded accent-teal-600" />
                      <span className="text-sm text-gray-700">Hasilkan rekomendasi secara otomatis</span>
                    </label>
                  </div>
                </div>
                <button className="px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
                  Simpan Pengaturan
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}