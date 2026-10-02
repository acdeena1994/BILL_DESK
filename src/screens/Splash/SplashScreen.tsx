import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Animated, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { initDatabase, hasExistingBusinessData } from '../../db';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useOnboarding } from '../../hooks/useOnboarding';
import { initI18n } from '../../localization/i18n';

// Splash image located in assets folder
const splashImageSource = require('../../../assets/splash.png');

type SplashNavProp = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

export const SplashScreen: React.FC = () => {
  const navigation = useNavigation<SplashNavProp>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { loadSettings } = useSettingsStore();
  const { checkOnboarding, completeOnboarding } = useOnboarding();

  const [isReady, setIsReady] = useState(false);
  const [targetRoute, setTargetRoute] = useState<'Main' | 'Onboarding'>('Main');

  useEffect(() => {
    let isMounted = true;

    // Smooth fade-in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Parallel app preparation
    const prepareApp = async () => {
      try {
        const [, , , hasSeen] = await Promise.all([
          initI18n(),
          initDatabase(),
          loadSettings(),
          checkOnboarding(),
        ]);

        if (isMounted) {
          // Reinstall with "Keep App Data" detection:
          // If onboarding is unacknowledged in AsyncStorage, but existing SQLite data
          // (bills, custom shop profile, or user-managed stock) is present from a previous install,
          // automatically mark onboarding as complete and direct navigation to Main.
          const existingData = await hasExistingBusinessData();
          if (existingData && !hasSeen) {
            console.log('[Splash] Existing pharmacy data detected from previous install. Skipping onboarding.');
            await completeOnboarding();
            setTargetRoute('Main');
          } else {
            setTargetRoute(hasSeen ? 'Main' : 'Onboarding');
          }
          setIsReady(true);
        }
      } catch (e) {
        console.error('Error during app initialization in splash:', e);
        if (isMounted) {
          setIsReady(true);
        }
      }
    };

    prepareApp();

    return () => {
      isMounted = false;
    };
  }, [fadeAnim, loadSettings, checkOnboarding, completeOnboarding]);

  useEffect(() => {
    if (!isReady) return;

    // Transition smoothly after minimum splash display of 1.4s
    const timer = setTimeout(() => {
      navigation.replace(targetRoute);
    }, 1400);

    return () => clearTimeout(timer);
  }, [isReady, targetRoute, navigation]);

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />

      {/* Splash Image fitted and centered on mobile display */}
      <Animated.Image
        source={splashImageSource}
        style={[styles.splashImage, { opacity: fadeAnim }]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashImage: {
    width: '100%',
    height: '100%',
  },
});

export default SplashScreen;
