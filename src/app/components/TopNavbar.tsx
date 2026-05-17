import { Search, FileDown } from 'lucide-react';

interface TopNavbarProps {
  title: string;
  onNavigateToReports?: () => void;
}

export function TopNavbar({ title, onNavigateToReports }: TopNavbarProps) {
  return (
    <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm">
      <h2 className="text-2xl text-gray-800">{title}</h2>

      <div className="flex items-center gap-4">
        {/* Search Bar */}
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari transaksi..."
            className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>

        {/* Reports Navigation Button */}
        <button 
          onClick={onNavigateToReports}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg hover:from-teal-600 hover:to-teal-700 transition-all shadow-sm"
        >
          <FileDown size={18} />
          <span className="text-sm">Ke Laporan / Ekspor</span>
        </button>
      </div>
    </div>
  );
}
