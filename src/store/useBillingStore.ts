import { create } from 'zustand';
import { StockItem } from '../db/stockQueries';
import { createBill } from '../db/billQueries';
import { todayFormatted, isExpiryDateValid } from '../utils/formatters';
import { clearSavedBillingDraft } from '../services/billingDraftService';

export interface BillCartItem {
  id?: string;
  item_no: number;
  medicine_name: string;
  batch_number: string;
  brand_name: string;
  exp_date: string;
  price: number | string;
  quantity: number | undefined;
}

interface BillingState {
  billNo: string;
  date: string;
  customerName: string;
  doctorName: string;
  cardExpiryDate: string;
  items: BillCartItem[];
  isSaving: boolean;
  lastBillSavedTimestamp: number;

  setCustomerName: (name: string) => void;
  setDoctorName: (name: string) => void;
  setDate: (date: string) => void;
  setCardExpiryDate: (date: string) => void;
  addItemFromStock: (stock: StockItem) => void;
  addNewBlankItem: () => void;
  updateItem: (index: number, updates: Partial<BillCartItem>) => void;
  removeItem: (index: number) => void;
  clearBill: () => void;
  loadDraft: (draft: Partial<{ customerName: string; doctorName: string; cardExpiryDate: string; date: string; items: BillCartItem[] }>) => void;
  getTotalAmount: () => number;
  saveCurrentBill: () => Promise<{ billId: number; billNo: string }>;
}

export const useBillingStore = create<BillingState>((set, get) => ({
  billNo: '',
  date: todayFormatted(),
  customerName: '',
  doctorName: '',
  cardExpiryDate: '',
  items: [],
  isSaving: false,
  lastBillSavedTimestamp: 0,

  setCustomerName: (name: string) => set({ customerName: name }),
  setDoctorName: (name: string) => set({ doctorName: name }),
  setDate: (date: string) => set({ date }),
  setCardExpiryDate: (date: string) => set({ cardExpiryDate: date }),

  addItemFromStock: (stock: StockItem) => {
    const current = get().items;
    const newItem: BillCartItem = {
      id: `${Date.now()}-${Math.random()}`,
      item_no: current.length + 1,
      medicine_name: stock.brand_name || stock.medicine_name,
      batch_number: stock.batch_number || '',
      brand_name: stock.manufacturer || stock.brand_name || '',
      exp_date: stock.exp_date || '',
      price: '', // starts blank/empty by default as specified
      quantity: undefined, // starts blank as specified
    };
    set({ items: [...current, newItem] });
  },

  addNewBlankItem: () => {
    const current = get().items;
    const newItem: BillCartItem = {
      id: `${Date.now()}-${Math.random()}`,
      item_no: current.length + 1,
      medicine_name: '',
      batch_number: '',
      brand_name: '',
      exp_date: '',
      price: '',
      quantity: undefined, // starts blank as specified
    };
    set({ items: [...current, newItem] });
  },

  updateItem: (index: number, updates: Partial<BillCartItem>) => {
    const current = [...get().items];
    if (current[index]) {
      current[index] = { ...current[index], ...updates };
      set({ items: current });
    }
  },

  removeItem: (index: number) => {
    const current = get().items.filter((_, i) => i !== index);
    // Re-index remaining items
    const reindexed = current.map((it, idx) => ({ ...it, item_no: idx + 1 }));
    set({ items: reindexed });
  },

  clearBill: () => {
    set({
      billNo: '',
      date: todayFormatted(),
      customerName: '',
      doctorName: '',
      cardExpiryDate: '',
      items: [],
    });
    clearSavedBillingDraft().catch((err) =>
      console.warn('Failed to clear saved draft on clearBill:', err)
    );
  },

  loadDraft: (draft) => {
    set({
      customerName: draft.customerName || '',
      doctorName: draft.doctorName || '',
      cardExpiryDate: draft.cardExpiryDate || '',
      date: draft.date || todayFormatted(),
      items: draft.items || [],
    });
  },

  getTotalAmount: () => {
    const rawTotal = get().items.reduce((sum, it) => {
      const p = parseFloat(String(it.price)) || 0;
      const q = Number(it.quantity) || 0;
      return sum + p * q;
    }, 0);
    return Math.round((rawTotal + Number.EPSILON) * 100) / 100;
  },

  saveCurrentBill: async () => {
    const { date, customerName, doctorName, cardExpiryDate, items, getTotalAmount } = get();
    if (items.length === 0) {
      throw new Error('Please add at least one medicine to the bill');
    }

    // Backend validation: Re-validate expiry date if provided against chosen calendar date
    if (cardExpiryDate && !isExpiryDateValid(cardExpiryDate, date)) {
      throw new Error('Medicine has expired. Please enter a future expiry date.');
    }

    // Validate that items have a medicine name, valid quantity, and non-expired exp_date relative to chosen calendar date
    for (let i = 0; i < items.length; i++) {
      if (!items[i].medicine_name || items[i].medicine_name.trim() === '') {
        throw new Error(`Item #${i + 1} must have a medicine name`);
      }
      const q = Number(items[i].quantity);
      if (items[i].quantity === undefined || items[i].quantity === null || isNaN(q) || q < 1) {
        throw new Error(`Item #${i + 1} must have a valid quantity (1 or more)`);
      }
      const exp = items[i].exp_date?.trim();
      if (exp && !isExpiryDateValid(exp, date)) {
        throw new Error('Medicine has expired. Please enter a future expiry date.');
      }
    }

    set({ isSaving: true });
    try {
      const total = getTotalAmount();
      const result = await createBill(
        {
          bill_no: '',
          date,
          customer_name: customerName,
          doctor_name: doctorName,
          card_expiry_date: cardExpiryDate,
          total_amount: total,
        },
        items.map((it) => ({
          item_no: it.item_no,
          medicine_name: it.medicine_name,
          batch_number: it.batch_number || '',
          brand_name: it.brand_name,
          exp_date: it.exp_date,
          price: parseFloat(String(it.price)) || 0,
          quantity: Number(it.quantity) || 1,
        }))
      );

      // Once saved to SQLite, clear uncommitted draft from storage
      await clearSavedBillingDraft().catch(() => {});

      set({ isSaving: false, lastBillSavedTimestamp: Date.now() });
      return result;
    } catch (err) {
      set({ isSaving: false });
      throw err;
    }
  },
}));
