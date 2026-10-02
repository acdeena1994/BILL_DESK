import { create } from 'zustand';
import { getAllStock, deleteStockItem, StockItem } from '../db/stockQueries';

interface StockState {
  stockList: StockItem[];
  isLoading: boolean;
  searchQuery: string;
  selectedLetter: string;
  loadStock: (search?: string, letter?: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedLetter: (letter: string) => void;
  deleteStock: (id: number) => Promise<void>;
}

export const useStockStore = create<StockState>((set, get) => ({
  stockList: [],
  isLoading: false,
  searchQuery: '',
  selectedLetter: '',

  loadStock: async (search?: string, letter?: string) => {
    set({ isLoading: true });
    try {
      const query = search !== undefined ? search : get().searchQuery;
      const letFilter = letter !== undefined ? letter : get().selectedLetter;
      const data = await getAllStock(query, letFilter);
      set({ stockList: data, isLoading: false });
    } catch (err) {
      console.error('Failed to load stock:', err);
      set({ isLoading: false });
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
    get().loadStock(query, get().selectedLetter);
  },

  setSelectedLetter: (letter: string) => {
    // If the same letter is clicked again or 'ALL', toggle to clear
    const newLetter = get().selectedLetter === letter || letter === 'ALL' ? '' : letter;
    set({ selectedLetter: newLetter });
    get().loadStock(get().searchQuery, newLetter);
  },

  deleteStock: async (id: number) => {
    try {
      await deleteStockItem(id);
      await get().loadStock();
    } catch (err) {
      console.error('Failed to delete stock item:', err);
      throw err;
    }
  },
}));
