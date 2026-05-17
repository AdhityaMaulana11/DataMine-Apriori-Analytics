import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, Cell,
} from 'recharts';
import { useAppStore } from '../../store/useAppStore';
import { BarChart3 } from 'lucide-react';

export function DataVisualization() {
  const { transactions, associationRules, isDataLoaded, isProcessing } = useAppStore();

  // ── Service frequency ──────────────────────────────────────────────────────
  const serviceData = useMemo(() => {
    if (!isDataLoaded || transactions.length === 0) return [];
    const freq = new Map<string, number>();
    for (const tx of transactions) {
      for (const s of tx.services) {
        freq.set(s, (freq.get(s) ?? 0) + 1);
      }
    }
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([service, count]) => ({ service, count }));
  }, [transactions, isDataLoaded]);

  // ── Monthly trend ──────────────────────────────────────────────────────────
  const trendData = useMemo(() => {
    if (!isDataLoaded || transactions.length === 0) return [];
    const monthMap = new Map<string, number>();
    const monthNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    for (const tx of transactions) {
      const d = new Date(tx.date);
      if (isNaN(d.getTime())) continue;
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      monthMap.set(label, (monthMap.get(label) ?? 0) + 1);
    }
    return Array.from(monthMap.entries())
      .sort(([a], [b]) => new Date(`1 ${a}`) > new Date(`1 ${b}`) ? 1 : -1)
      .map(([month, transactions]) => ({ month, transactions }));
  }, [transactions, isDataLoaded]);

  // ── Lift ratio chart ────────────────────────────────────────────────────────
  const liftData = useMemo(() => {
    if (!isDataLoaded || associationRules.length === 0) return [];
    return associationRules.slice(0, 10).map((r) => ({
      pair: `${r.antecedent.join(', ')} → ${r.consequent.join(', ')}`,
      lift: parseFloat(r.lift.toFixed(2)),
    }));
  }, [associationRules, isDataLoaded]);

  const COLORS = ['#0d9488','#14b8a6','#2dd4bf','#5eead4','#0f766e','#0891b2','#06b6d4','#38bdf8','#7dd3fc','#99f6e4'];

  // Empty state
  if (!isDataLoaded && !isProcessing) {
    return (
      <div className="space-y-6">
        <h3 className="text-2xl text-gray-800">Visualisasi Data &amp; Analitik</h3>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 text-center">
          <BarChart3 size={48} className="text-gray-300 mx-auto mb-4" />
          <h4 className="text-gray-500 mb-2">Belum ada data untuk divisualisasikan</h4>
          <p className="text-sm text-gray-400">
            Import data transaksi dan jalankan analisis untuk melihat grafik frekuensi, tren, dan lift ratio.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl text-gray-800">Visualisasi Data &amp; Analitik</h3>
        {isProcessing && (
          <span className="text-xs text-teal-600 bg-teal-50 px-3 py-1 rounded-full animate-pulse">⚙ Memproses...</span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart – Service Frequency */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h4 className="text-lg text-gray-800 mb-4">
            10 Layanan Paling Populer
            <span className="text-sm text-gray-400 font-normal ml-2">({transactions.length} transaksi)</span>
          </h4>
          {serviceData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">Tidak ada data</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={serviceData} margin={{ bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="service" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                <Bar dataKey="count" name="Frekuensi" radius={[6,6,0,0]}>
                  {serviceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Line Chart – Monthly Trend */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h4 className="text-lg text-gray-800 mb-4">Tren Transaksi per Bulan</h4>
          {trendData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">Tidak ada data</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                <Legend />
                <Line name="Transaksi" type="monotone" dataKey="transactions"
                  stroke="#14B8A6" strokeWidth={3} dot={{ fill: '#14B8A6', r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Horizontal Bar – Lift Ratio */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 lg:col-span-2">
          <h4 className="text-lg text-gray-800 mb-1">
            Kekuatan Asosiasi Layanan (Lift Ratio)
            {associationRules.length > 0 && (
              <span className="text-sm text-gray-400 font-normal ml-2">— Top {liftData.length} aturan</span>
            )}
          </h4>
          <p className="text-xs text-gray-500 mb-4">Lift &gt; 1 berarti asosiasi lebih kuat dari kebetulan. Lift &gt; 2 sangat kuat.</p>
          {liftData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
              Jalankan analisis Apriori untuk melihat lift ratio
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(250, liftData.length * 40)}>
              <BarChart data={liftData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} domain={[0, 'auto']} />
                <YAxis dataKey="pair" type="category" tick={{ fontSize: 11 }} width={220} />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                <Bar dataKey="lift" name="Lift Ratio" radius={[0,6,6,0]}>
                  {liftData.map((entry, i) => (
                    <Cell key={i} fill={entry.lift >= 2 ? '#10b981' : entry.lift >= 1.5 ? '#14b8a6' : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
