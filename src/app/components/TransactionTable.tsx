import { useState, useMemo } from 'react';
import { Edit2, Trash2, Plus, ChevronLeft, ChevronRight, Search, X, Save, AlertTriangle } from 'lucide-react';
import { useAppStore, type Transaction } from '../../store/useAppStore';

const PAGE_SIZE = 10;

// ─── Modal Types ──────────────────────────────────────────────────────────────
type ModalMode = 'add' | 'edit' | null;

interface FormState {
  date: string;
  servicesRaw: string; // comma-separated string
}

const emptyForm = (): FormState => ({
  date: new Date().toISOString().slice(0, 10),
  servicesRaw: '',
});

// ─── Transaction Modal ────────────────────────────────────────────────────────
function TransactionModal({
  mode,
  initial,
  onSave,
  onClose,
}: {
  mode: ModalMode;
  initial?: Transaction;
  onSave: (form: FormState) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(
    initial
      ? { date: initial.date, servicesRaw: initial.services.join(', ') }
      : emptyForm()
  );
  const [errors, setErrors] = useState<{ date?: string; services?: string }>({});

  const validate = () => {
    const errs: typeof errors = {};
    if (!form.date) errs.date = 'Tanggal wajib diisi';
    const svcs = form.servicesRaw.split(',').map((s) => s.trim()).filter(Boolean);
    if (svcs.length === 0) errs.services = 'Minimal satu layanan wajib diisi';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-teal-500 to-teal-600">
          <h3 className="text-lg text-white font-semibold">
            {mode === 'add' ? 'Tambah Transaksi Baru' : 'Edit Transaksi'}
          </h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors">
            <X size={18} className="text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* ID (read-only on edit) */}
          {initial && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">ID Transaksi</label>
              <input value={initial.id} readOnly
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 cursor-not-allowed" />
            </div>
          )}

          {/* Date */}
          <div>
            <label className="block text-sm text-gray-700 mb-1 font-medium">
              Tanggal Transaksi <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 ${
                errors.date ? 'border-red-400 bg-red-50' : 'border-gray-200'
              }`}
            />
            {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
          </div>

          {/* Services */}
          <div>
            <label className="block text-sm text-gray-700 mb-1 font-medium">
              Layanan Dibeli <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={form.servicesRaw}
              onChange={(e) => setForm({ ...form, servicesRaw: e.target.value })}
              placeholder="Potong Rambut, Sampo, Coloring"
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none ${
                errors.services ? 'border-red-400 bg-red-50' : 'border-gray-200'
              }`}
            />
            {errors.services
              ? <p className="text-xs text-red-500 mt-1">{errors.services}</p>
              : <p className="text-xs text-gray-400 mt-1">Pisahkan setiap layanan dengan koma (,)</p>
            }
            {/* Preview chips */}
            {form.servicesRaw && (
              <div className="flex flex-wrap gap-1 mt-2">
                {form.servicesRaw.split(',').map((s) => s.trim()).filter(Boolean).map((s, i) => (
                  <span key={i} className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded text-xs border border-teal-100">{s}</span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm">
              Batal
            </button>
            <button type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm">
              <Save size={16} />
              {mode === 'add' ? 'Simpan Transaksi' : 'Perbarui'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirmation ──────────────────────────────────────────────────────
function DeleteConfirmModal({ txId, onConfirm, onClose }: {
  txId: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 text-center">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={28} className="text-red-500" />
        </div>
        <h3 className="text-lg text-gray-800 font-semibold mb-2">Hapus Transaksi?</h3>
        <p className="text-sm text-gray-500 mb-6">
          Transaksi <strong>{txId}</strong> akan dihapus permanen. Analisis Apriori akan dijalankan ulang otomatis.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            Batal
          </button>
          <button onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm">
            Ya, Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function TransactionTable() {
  const {
    transactions, isDataLoaded, isProcessing,
    addTransaction, updateTransaction, deleteTransaction,
  } = useAppStore();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editTarget, setEditTarget] = useState<Transaction | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return transactions.filter(
      (t) =>
        t.id.toLowerCase().includes(q) ||
        t.date.includes(q) ||
        t.services.some((s) => s.toLowerCase().includes(q))
    );
  }, [transactions, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openAdd = () => { setEditTarget(undefined); setModalMode('add'); };
  const openEdit = (tx: Transaction) => { setEditTarget(tx); setModalMode('edit'); };
  const closeModal = () => { setModalMode(null); setEditTarget(undefined); };

  const handleSave = (form: FormState) => {
    const services = form.servicesRaw.split(',').map((s) => s.trim()).filter(Boolean);
    if (modalMode === 'add') {
      addTransaction({ date: form.date, services });
    } else if (modalMode === 'edit' && editTarget) {
      updateTransaction(editTarget.id, { date: form.date, services });
    }
    closeModal();
  };

  const handleDelete = () => {
    if (deleteTarget) {
      deleteTransaction(deleteTarget);
      setDeleteTarget(null);
      // Adjust page if needed
      const newTotal = Math.max(1, Math.ceil((transactions.length - 1) / PAGE_SIZE));
      if (page > newTotal) setPage(newTotal);
    }
  };

  return (
    <>
      {/* Modals */}
      {modalMode && (
        <TransactionModal
          mode={modalMode}
          initial={editTarget}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          txId={deleteTarget}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-xl text-gray-800">Data Transaksi</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {isDataLoaded
                ? `${filtered.length.toLocaleString('id-ID')} dari ${transactions.length.toLocaleString('id-ID')} transaksi`
                : 'Belum ada data — import Excel atau tambah manual'}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {isDataLoaded && (
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari transaksi..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
            )}
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm"
            >
              <Plus size={18} />
              Tambah Transaksi
            </button>
          </div>
        </div>

        {/* Processing indicator */}
        {isProcessing && (
          <div className="px-6 py-2 bg-teal-50 border-b border-teal-100 text-xs text-teal-700">
            ⚙ Menjalankan ulang algoritma Apriori...
          </div>
        )}

        {/* Empty state */}
        {!isDataLoaded ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus size={28} className="text-gray-400" />
            </div>
            <h4 className="text-gray-600 mb-2">Belum ada transaksi</h4>
            <p className="text-sm text-gray-400 mb-6">
              Import file Excel di halaman "Impor Data Excel" atau tambah transaksi secara manual.
            </p>
            <button onClick={openAdd}
              className="px-5 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm">
              + Tambah Transaksi Manual
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">No</th>
                    <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">ID Transaksi</th>
                    <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Tanggal</th>
                    <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Layanan Dibeli</th>
                    <th className="px-5 py-3 text-center text-xs text-gray-600 uppercase tracking-wider">Jumlah Item</th>
                    <th className="px-5 py-3 text-right text-xs text-gray-600 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pageData.map((txn, idx) => (
                    <tr key={txn.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-5 py-3 text-sm text-gray-400">
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-800 font-medium">{txn.id}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{txn.date}</td>
                      <td className="px-5 py-3 text-sm text-gray-700">
                        <div className="flex flex-wrap gap-1">
                          {txn.services.map((s) => (
                            <span key={s} className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded text-xs border border-teal-100">
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                          {txn.services.length}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(txn)}
                            title="Edit"
                            className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors group"
                          >
                            <Edit2 size={15} className="text-gray-400 group-hover:text-blue-600" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(txn.id)}
                            title="Hapus"
                            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors group"
                          >
                            <Trash2 size={15} className="text-gray-400 group-hover:text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Halaman {page} dari {totalPages} &nbsp;·&nbsp; {filtered.length} transaksi
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40"
                  >
                    <ChevronLeft size={16} className="text-gray-600" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const num = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                    return (
                      <button key={num} onClick={() => setPage(num)}
                        className={`px-3 py-1.5 rounded-lg text-sm ${
                          num === page ? 'bg-teal-600 text-white' : 'border border-gray-200 hover:bg-gray-50 text-gray-700'
                        }`}>
                        {num}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40"
                  >
                    <ChevronRight size={16} className="text-gray-600" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
