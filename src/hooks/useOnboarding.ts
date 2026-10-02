import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const HAS_SEEN_ONBOARDING_KEY = 'hasSeenOnboarding';

interface OnboardingState {
  hasSeenOnboarding: boolean | null;
  isLoading: boolean;
  checkOnboarding: () => Promise<boolean>;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  hasSeenOnboarding: null,
  isLoading: true,

  checkOnboarding: async () => {
    try {
      set({ isLoading: true });
      const value = await AsyncStorage.getItem(HAS_SEEN_ONBOARDING_KEY);
      const hasSeen = value === 'true';
      set({ hasSeenOnboarding: hasSeen, isLoading: false });
      return hasSeen;
    } catch (err) {
      console.warn('Error reading hasSeenOnboarding from storage:', err);
      set({ hasSeenOnboarding: false, isLoading: false });
      return false;
    }
  },

  completeOnboarding: async () => {
    try {
      await AsyncStorage.setItem(HAS_SEEN_ONBOARDING_KEY, 'true');
      set({ hasSeenOnboarding: true, isLoading: false });
    } catch (err) {
      console.error('Error saving hasSeenOnboarding:', err);
      set({ hasSeenOnboarding: true, isLoading: false });
    }
  },

  resetOnboarding: async () => {
    try {
      await AsyncStorage.removeItem(HAS_SEEN_ONBOARDING_KEY);
      set({ hasSeenOnboarding: false, isLoading: false });
    } catch (err) {
      console.error('Error resetting hasSeenOnboarding:', err);
      set({ hasSeenOnboarding: false, isLoading: false });
    }
  },
}));

export const useOnboarding = () => {
  const store = useOnboardingStore();
  return store;
};

export default useOnboarding;
