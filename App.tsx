import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useBillingStore } from './src/store/useBillingStore';
import { SESSION_TIMEOUT_MS } from './src/constants/session';
import {
  BillingDraft,
  hasActiveDraft,
  saveBillingDraft,
  getSavedBillingDraft,
  clearSavedBillingDraft,
  saveLastBackgroundedAt,
  getCleanLastBackgroundedAt,
  purgeStaleSessionTimestamps,
  clearLastBackgroundedAt,
} from './src/services/billingDraftService';
import { ResumeDraftModal } from './src/components/ResumeDraftModal';
import './src/i18n'; // Initialize i18next

export default function App() {
  const navigationRef = useNavigationContainerRef();
  const backgroundTimeRef = useRef<number | null>(null);

  // Resume prompt state
  const [resumeDraft, setResumeDraft] = useState<BillingDraft | null>(null);
  const [showResumeModal, setShowResumeModal] = useState(false);

  // Cold-start tracking refs
  const pendingColdStartDraftRef = useRef<BillingDraft | null>(null);
  const hasPromptedColdStartRef = useRef(false);

  // Helper to trigger cold start prompt once navigation leaves Splash
  const triggerColdStartPromptIfReady = useCallback(() => {
    if (
      !hasPromptedColdStartRef.current &&
      pendingColdStartDraftRef.current &&
      navigationRef.isReady()
    ) {
      const currentRoute = navigationRef.getCurrentRoute()?.name;
      if (currentRoute && currentRoute !== 'Splash') {
        hasPromptedColdStartRef.current = true;
        setResumeDraft(pendingColdStartDraftRef.current);
        setShowResumeModal(true);
      }
    }
  }, [navigationRef]);

  // Check for existing draft on initial app launch (cold start)
  useEffect(() => {
    const checkColdStartDraft = async () => {
      try {
        // Purge any stale background timestamps (> 7 days) from prior uninstalls/reinstalls
        await purgeStaleSessionTimestamps();

        const draft = await getSavedBillingDraft();
        if (hasActiveDraft(draft)) {
          pendingColdStartDraftRef.current = draft;
          triggerColdStartPromptIfReady();
        }
      } catch (err) {
        console.warn('[App] Cold start draft check error:', err);
      }
    };

    checkColdStartDraft();
  }, [triggerColdStartPromptIfReady]);

  // Handle AppState changes (background, inactive, active)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background') {
        // App is backgrounded - always measure from the last background transition
        const now = Date.now();
        backgroundTimeRef.current = now;
        await saveLastBackgroundedAt(now);

        // Autosave uncommitted billing draft if active
        const billingState = useBillingStore.getState();
        if (hasActiveDraft(billingState)) {
          const currentRoute = navigationRef.isReady()
            ? navigationRef.getCurrentRoute()?.name
            : undefined;

          await saveBillingDraft(
            {
              customerName: billingState.customerName,
              doctorName: billingState.doctorName,
              date: billingState.date,
              items: billingState.items,
              savedAt: now,
              lastRouteName: currentRoute,
            },
            currentRoute
          );
        }
      } else if (nextAppState === 'active') {
        // App resumed to foreground - retrieve validated, non-stale background timestamp
        const backgroundedAt =
          backgroundTimeRef.current ?? (await getCleanLastBackgroundedAt());

        if (backgroundedAt) {
          const elapsedMs = Date.now() - backgroundedAt;

          if (elapsedMs >= SESSION_TIMEOUT_MS) {
            // Over timeout: Do NOT silently wipe data!
            // Retrieve draft and display lightweight resume prompt
            const draft = await getSavedBillingDraft();
            const billingState = useBillingStore.getState();

            const effectiveDraft =
              draft ||
              (hasActiveDraft(billingState)
                ? {
                    customerName: billingState.customerName,
                    doctorName: billingState.doctorName,
                    date: billingState.date,
                    items: billingState.items,
                    savedAt: backgroundedAt,
                  }
                : null);

            if (effectiveDraft && hasActiveDraft(effectiveDraft)) {
              setResumeDraft(effectiveDraft);
              setShowResumeModal(true);
            }
          }
          // Under timeout (< SESSION_TIMEOUT_MS): resume exactly where user left off, no reset, no dialog

          // Reset background timer
          backgroundTimeRef.current = null;
          await clearLastBackgroundedAt();
        }
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [navigationRef]);

  // Handle "Continue" - restore draft and navigation state
  const handleContinue = useCallback(() => {
    setShowResumeModal(false);
    if (resumeDraft) {
      // Restore draft into billing store
      useBillingStore.getState().loadDraft(resumeDraft);

      // Restore navigation state
      if (navigationRef.isReady()) {
        if (resumeDraft.lastRouteName === 'BillPreview') {
          (navigationRef as any).navigate('BillPreview', { mode: 'new' });
        } else {
          const currentRoute = navigationRef.getCurrentRoute()?.name;
          if (currentRoute !== 'Billing') {
            (navigationRef as any).navigate('Main', { screen: 'Billing' });
          }
        }
      }
    }
    setResumeDraft(null);
    pendingColdStartDraftRef.current = null;
  }, [navigationRef, resumeDraft]);

  // Handle "Start Fresh" - user-confirmed deletion and reset to Splash
  const handleStartFresh = useCallback(async () => {
    setShowResumeModal(false);
    setResumeDraft(null);
    pendingColdStartDraftRef.current = null;

    // Explicitly clear draft from local storage & memory store
    await clearSavedBillingDraft();
    await clearLastBackgroundedAt();
    useBillingStore.getState().clearBill();

    // Reset navigation stack back to Splash
    if (navigationRef.isReady()) {
      navigationRef.reset({
        index: 0,
        routes: [{ name: 'Splash' as never }],
      });
    }
  }, [navigationRef]);

  // Monitor navigation state transitions to show cold-start prompt once Splash completes
  const handleNavigationStateChange = () => {
    triggerColdStartPromptIfReady();
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer
        ref={navigationRef}
        onStateChange={handleNavigationStateChange}
      >
        <StatusBar style="dark" translucent backgroundColor="transparent" />
        <RootNavigator />
      </NavigationContainer>

      {/* Lightweight Resume Draft Prompt */}
      <ResumeDraftModal
        visible={showResumeModal}
        draft={resumeDraft}
        onContinue={handleContinue}
        onStartFresh={handleStartFresh}
      />
    </SafeAreaProvider>
  );
}
