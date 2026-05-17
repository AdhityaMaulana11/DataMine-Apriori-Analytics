import {
  LayoutDashboard,
  Upload,
  Database,
  GitBranch,
  ArrowRightLeft,
  TrendingUp,
  BarChart3,
  FileText,
  Settings
} from 'lucide-react';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Ringkasan Dashboard', icon: LayoutDashboard },
    { id: 'import', label: 'Impor Data Excel', icon: Upload },
    { id: 'transactions', label: 'Data Transaksi', icon: Database },
    { id: 'itemsets', label: 'Analisis Itemset', icon: GitBranch },
    { id: 'rules', label: 'Aturan Asosiasi', icon: ArrowRightLeft },
    { id: 'recommendations', label: 'Cross-Selling', icon: TrendingUp },
    { id: 'visualization', label: 'Analisis Rasio Lift', icon: BarChart3 },
    { id: 'reports', label: 'Laporan / Ekspor', icon: FileText },
    { id: 'settings', label: 'Pengaturan', icon: Settings },
  ];

  return (
    <div className="w-64 bg-gradient-to-b from-[#0d9488] to-[#0f766e] h-screen fixed left-0 top-0 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <h1 className="text-white text-xl font-semibold">DataMine</h1>
        <p className="text-teal-100 text-sm mt-1">Apriori Analitik</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all ${
                isActive
                  ? 'bg-white/20 text-white shadow-lg'
                  : 'text-teal-50 hover:bg-white/10'
              }`}
            >
              <Icon size={20} />
              <span className="text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
