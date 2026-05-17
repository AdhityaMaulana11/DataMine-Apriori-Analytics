import { create } from 'zustand';
import { runApriori } from '../utils/apriori';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  date: string;
  services: string[];
}

export interface FrequentItemset {
  itemset: string[];
  support: number;
  frequency: number;
}

export interface AssociationRule {
  id: string;
  antecedent: string[];
  consequent: string[];
  supportA: number;   // support antecedent (fraction)
  supportB: number;   // support consequent (fraction)
  support: number;    // support rule (fraction)
  confidence: number; // fraction 0-1
  lift: number;
  keterangan: 'Valid' | 'Tidak Valid';
}

export interface AlgorithmParams {
  minSupport: number;     // fraction 0-1
  minConfidence: number;  // fraction 0-1
  dateFrom: string;
  dateTo: string;
}

// ─── Store Interface ──────────────────────────────────────────────────────────

interface AppState {
  // Raw data
  transactions: Transaction[];
  fileName: string;

  // Algorithm params
  params: AlgorithmParams;

  // Results
  frequentItemsets: FrequentItemset[];
  associationRules: AssociationRule[];

  // UI state
  isProcessing: boolean;
  isDataLoaded: boolean;
  processingStep: string;

  // Actions
  setTransactions: (data: Transaction[], fileName: string) => void;
  setParams: (params: Partial<AlgorithmParams>) => void;
  setFrequentItemsets: (itemsets: FrequentItemset[]) => void;
  setAssociationRules: (rules: AssociationRule[]) => void;
  setIsProcessing: (v: boolean) => void;
  setProcessingStep: (step: string) => void;
  clearData: () => void;
  runAnalysis: () => void;
  // CRUD
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, updates: Partial<Omit<Transaction, 'id'>>) => void;
  deleteTransaction: (id: string) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>((set, get) => ({
  transactions: [],
  fileName: '',
  params: {
    minSupport: 0.20,
    minConfidence: 0.70,
    dateFrom: '',
    dateTo: '',
  },
  frequentItemsets: [],
  associationRules: [],
  isProcessing: false,
  isDataLoaded: false,
  processingStep: '',

  setTransactions: (data, fileName) =>
    set({ transactions: data, fileName, isDataLoaded: true }),

  setParams: (params) =>
    set((s) => ({ params: { ...s.params, ...params } })),

  setFrequentItemsets: (itemsets) => set({ frequentItemsets: itemsets }),
  setAssociationRules: (rules) => set({ associationRules: rules }),
  setIsProcessing: (v) => set({ isProcessing: v }),
  setProcessingStep: (step) => set({ processingStep: step }),

  clearData: () =>
    set({
      transactions: [],
      fileName: '',
      isDataLoaded: false,
      frequentItemsets: [],
      associationRules: [],
    }),

  addTransaction: (tx) => {
    const state = get();
    const newId = `TXN-${String(state.transactions.length + 1).padStart(3, '0')}`;
    const newTx: Transaction = { id: newId, ...tx };
    set({ transactions: [...state.transactions, newTx], isDataLoaded: true });
    get().runAnalysis();
  },

  updateTransaction: (id, updates) => {
    set((s) => ({
      transactions: s.transactions.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    }));
    get().runAnalysis();
  },

  deleteTransaction: (id) => {
    set((s) => ({
      transactions: s.transactions.filter((t) => t.id !== id),
      isDataLoaded: s.transactions.length - 1 > 0,
    }));
    get().runAnalysis();
  },

  runAnalysis: () => {
    // Always read fresh state at call time
    const currentState = get();
    if (!currentState.transactions.length) {
      get().setIsProcessing(false);
      return;
    }

    get().setIsProcessing(true);
    get().setProcessingStep('Menghitung frequent itemsets...');

    // Defer so React can paint the loading indicator first
    setTimeout(() => {
      // Re-read transactions and params in case they changed during the timeout
      const { transactions, params } = get();
      try {
        const { frequentItemsets, associationRules } = runApriori(
          transactions,
          params.minSupport,
          params.minConfidence
        );
        get().setFrequentItemsets(frequentItemsets);
        get().setAssociationRules(associationRules);
      } catch (e) {
        console.error('Apriori error:', e);
      } finally {
        get().setIsProcessing(false);
        get().setProcessingStep('');
      }
    }, 80);
  },
}));
