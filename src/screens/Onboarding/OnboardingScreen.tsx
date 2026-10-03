import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
  FlatList,
  Modal,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import PagerView from 'react-native-pager-view';
import { RootStackParamList } from '../../navigation/types';
import { Colors } from '../../theme/colors';
import { Spacing, BorderRadius } from '../../theme';
import { useOnboarding } from '../../hooks/useOnboarding';
import { SUPPORTED_LANGUAGES, changeAppLanguage } from '../../localization/i18n';
import { useSettingsStore } from '../../store/useSettingsStore';
import { BootstrapIcon, BootstrapIconName } from '../../components/BootstrapIcon';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type OnboardingNavProp = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

interface BulletItem {
  labelKey: string;
  label: string;
  textKey: string;
  text: string;
}

interface SlideItem {
  id: string;
  iconName: BootstrapIconName;
  iconColor: string;
  subtitleKey: string;
  subtitle: string;
  titleKey: string;
  title: string;
  descKey: string;
  description: string;
  bullets: BulletItem[];
  badge1Icon: BootstrapIconName;
  badge1Key: string;
  badge1Text: string;
  badge2Icon: BootstrapIconName;
  badge2Key: string;
  badge2Text: string;
  accentBg: string;
  accentColor: string;
}

export const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation<OnboardingNavProp>();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const { completeOnboarding } = useOnboarding();
  const { updateSettings } = useSettingsStore();

  const [currentPage, setCurrentPage] = useState(0);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const pagerRef = useRef<PagerView>(null);
  const flatListRef = useRef<FlatList>(null);

  // Looping animation values for illustration elements
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Gentle floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1600,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatAnim, pulseAnim]);

  const slides: SlideItem[] = [
    {
      id: 'billing',
      iconName: 'receipt-cutoff',
      iconColor: '#091540',
      subtitleKey: 'onboarding.slide1.subtitle',
      subtitle: 'QUICK INVOICING',
      titleKey: 'onboarding.slide1.title',
      title: 'Billing Page',
      descKey: 'onboarding.slide1.description',
      description: 'Search and add medications directly from inventory, add new medicines on the fly, and review complete invoices before saving.',
      bullets: [
        {
          labelKey: 'onboarding.slide1.bullet1_label',
          label: 'Direct Stock Pull',
          textKey: 'onboarding.slide1.bullet1_text',
          text: 'Search and add medications directly from your existing inventory.',
        },
        {
          labelKey: 'onboarding.slide1.bullet2_label',
          label: 'Instant Creation',
          textKey: 'onboarding.slide1.bullet2_text',
          text: 'Add completely new medicines to mobile right from the billing screen.',
        },
        {
          labelKey: 'onboarding.slide1.bullet3_label',
          label: 'Preview & Edit',
          textKey: 'onboarding.slide1.bullet3_text',
          text: 'Review the complete invoice and modify stored items before saving the final bill.',
        },
      ],
      badge1Icon: 'lightning-charge-fill',
      badge1Key: 'onboarding.slide1.badge1',
      badge1Text: 'Direct Stock Pull',
      badge2Icon: 'file-earmark-check-fill',
      badge2Key: 'onboarding.slide1.badge2',
      badge2Text: 'Instant Invoicing',
      accentBg: '#EEF2FF',
      accentColor: '#2563EB',
    },
    {
      id: 'stock',
      iconName: 'boxes',
      iconColor: '#065F46',
      subtitleKey: 'onboarding.slide2.subtitle',
      subtitle: 'STOCK MANAGEMENT',
      titleKey: 'onboarding.slide2.title',
      title: 'Stock Page',
      descKey: 'onboarding.slide2.description',
      description: 'Supports storage and management of up to 2.5L+ medicine records with instant stock updates and flexible management.',
      bullets: [
        {
          labelKey: 'onboarding.slide2.bullet1_label',
          label: 'Massive Capacity',
          textKey: 'onboarding.slide2.bullet1_text',
          text: 'Supports storage and management of up to 2.5L+ medicine records.',
        },
        {
          labelKey: 'onboarding.slide2.bullet2_label',
          label: 'Inventory Control',
          textKey: 'onboarding.slide2.bullet2_text',
          text: 'Add new stock or update existing quantities instantly.',
        },
        {
          labelKey: 'onboarding.slide2.bullet3_label',
          label: 'Flexible Management',
          textKey: 'onboarding.slide2.bullet3_text',
          text: 'Modify stored medicine details anytime to maintain accurate records.',
        },
      ],
      badge1Icon: 'box-seam-fill',
      badge1Key: 'onboarding.slide2.badge1',
      badge1Text: '2.5L+ Capacity',
      badge2Icon: 'check-circle-fill',
      badge2Key: 'onboarding.slide2.badge2',
      badge2Text: 'Inventory Control',
      accentBg: '#ECFDF5',
      accentColor: '#059669',
    },
    {
      id: 'analytics',
      iconName: 'bar-chart-line-fill',
      iconColor: '#9A3412',
      subtitleKey: 'onboarding.slide3.subtitle',
      subtitle: 'BUSINESS INTELLIGENCE',
      titleKey: 'onboarding.slide3.title',
      title: 'Analytics Page',
      descKey: 'onboarding.slide3.description',
      description: 'Tracks precise, time-stamped purchase and sales histories with comprehensive drug details and simplified compliance.',
      bullets: [
        {
          labelKey: 'onboarding.slide3.bullet1_label',
          label: 'Chronological Ledger',
          textKey: 'onboarding.slide3.bullet1_text',
          text: 'Tracks precise, time-stamped purchase and sales histories.',
        },
        {
          labelKey: 'onboarding.slide3.bullet2_label',
          label: 'Comprehensive Records',
          textKey: 'onboarding.slide3.bullet2_text',
          text: 'Captures drug name, batch number, expiry date, price, and supplier/buyer details.',
        },
        {
          labelKey: 'onboarding.slide3.bullet3_label',
          label: 'Simplified Compliance',
          textKey: 'onboarding.slide3.bullet3_text',
          text: 'Streamlines data maintenance to make updating official medical registers effortless.',
        },
      ],
      badge1Icon: 'graph-up',
      badge1Key: 'onboarding.slide3.badge1',
      badge1Text: 'Revenue Charts',
      badge2Icon: 'file-earmark-arrow-down-fill',
      badge2Key: 'onboarding.slide3.badge2',
      badge2Text: 'Audit Registers',
      accentBg: '#FFF7ED',
      accentColor: '#EA580C',
    },
    {
      id: 'settings',
      iconName: 'shield-check',
      iconColor: '#4C1D95',
      subtitleKey: 'onboarding.slide4.subtitle',
      subtitle: 'LOCAL FIRST & SECURE',
      titleKey: 'onboarding.slide4.title',
      title: 'Settings Page',
      descKey: 'onboarding.slide4.description',
      description: 'Securely manages your data locally without requiring external internet connectivity, ensuring complete privacy.',
      bullets: [
        {
          labelKey: 'onboarding.slide4.bullet1_label',
          label: 'Local Architecture',
          textKey: 'onboarding.slide4.bullet1_text',
          text: 'Securely manages your data locally without requiring any external internet connectivity.',
        },
        {
          labelKey: 'onboarding.slide4.bullet2_label',
          label: 'Privacy Controls',
          textKey: 'onboarding.slide4.bullet2_text',
          text: 'Enhances data security through a self-contained local storage structure with a complete privacy guarantee.',
        },
        {
          labelKey: 'onboarding.slide4.bullet3_label',
          label: 'Store Customisation',
          textKey: 'onboarding.slide4.bullet3_text',
          text: 'Modifies shop information, details, and print headers effortlessly.',
        },
        {
          labelKey: 'onboarding.slide4.bullet4_label',
          label: 'Language Localisation',
          textKey: 'onboarding.slide4.bullet4_text',
          text: 'Changes the system language dynamically to suit your operational needs.',
        },
        {
          labelKey: 'onboarding.slide4.bullet5_label',
          label: 'Bill Counter Reset',
          textKey: 'onboarding.slide4.bullet5_text',
          text: 'Utilises a secure bill counter reset option to restart invoice numbering from 0 anytime.',
        },
      ],
      badge1Icon: 'shield-lock-fill',
      badge1Key: 'onboarding.slide4.badge1',
      badge1Text: '100% Private',
      badge2Icon: 'database-fill-check',
      badge2Key: 'onboarding.slide4.badge2',
      badge2Text: 'Local Architecture',
      accentBg: '#F5F3FF',
      accentColor: '#7C3AED',
    },
  ];

  const handleComplete = async () => {
    await completeOnboarding();
    navigation.replace('Main');
  };

  const handleNext = () => {
    if (currentPage < slides.length - 1) {
      const nextIndex = currentPage + 1;
      if (Platform.OS === 'web') {
        flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      } else {
        pagerRef.current?.setPage(nextIndex);
      }
      setCurrentPage(nextIndex);
    } else {
      handleComplete();
    }
  };

  const handleLanguageSelect = async (code: string) => {
    try {
      await changeAppLanguage(code);
      await updateSettings({ language: code });
    } catch (err) {
      console.warn('Language change error in onboarding:', err);
    } finally {
      setShowLanguageModal(false);
    }
  };

  const currentLangLabel =
    SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language)?.label || 'English';

  const renderIllustration = (item: SlideItem) => {
    return (
      <View style={styles.illustrationContainer}>
        {/* Glow pulsing ring */}
        <Animated.View
          style={[
            styles.glowRing,
            {
              backgroundColor: item.accentBg,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />

        {/* Central Card with Bootstrap Icon */}
        <Animated.View
          style={[
            styles.iconCard,
            {
              transform: [{ translateY: floatAnim }],
            },
          ]}
        >
          <BootstrapIcon name={item.iconName} size={54} color={item.iconColor} />
        </Animated.View>

        {/* Floating Badge 1 - Bootstrap Icon without emojis */}
        <Animated.View
          style={[
            styles.badgeLeft,
            {
              transform: [{ translateY: Animated.multiply(floatAnim, -0.6) }],
            },
          ]}
        >
          <View style={styles.badgeContent}>
            <BootstrapIcon
              name={item.badge1Icon}
              size={13}
              color={item.accentColor}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.badgeText}>{t(item.badge1Key, item.badge1Text)}</Text>
          </View>
        </Animated.View>

        {/* Floating Badge 2 - Bootstrap Icon without emojis */}
        <Animated.View
          style={[
            styles.badgeRight,
            {
              transform: [{ translateY: Animated.multiply(floatAnim, 0.7) }],
            },
          ]}
        >
          <View style={styles.badgeContent}>
            <BootstrapIcon
              name={item.badge2Icon}
              size={13}
              color={item.accentColor}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.badgeText}>{t(item.badge2Key, item.badge2Text)}</Text>
          </View>
        </Animated.View>
      </View>
    );
  };

  const renderSlideContent = (item: SlideItem) => {
    return (
      <View style={styles.slide} key={item.id}>
        {renderIllustration(item)}

        <View style={styles.textContainer}>
          <Text style={styles.subtitle}>{t(item.subtitleKey, item.subtitle)}</Text>
          <Text style={styles.title}>{t(item.titleKey, item.title)}</Text>

          {item.bullets && item.bullets.length > 0 ? (
            <View style={styles.bulletList}>
              {item.bullets.map((bullet, idx) => (
                <View key={idx} style={styles.bulletRow}>
                  <Text style={[styles.bulletDot, { color: item.accentColor }]}>•</Text>
                  <Text style={styles.bulletText}>
                    <Text style={styles.bulletLabel}>{t(bullet.labelKey, bullet.label)}: </Text>
                    {t(bullet.textKey, bullet.text)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.description}>{t(item.descKey, item.description)}</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.languageButton}
          onPress={() => setShowLanguageModal(true)}
          activeOpacity={0.7}
        >
          <BootstrapIcon name="globe2" size={15} color={Colors.accent} style={{ marginRight: 6 }} />
          <Text style={styles.languageButtonText} numberOfLines={1}>
            {currentLangLabel}
          </Text>
        </TouchableOpacity>

        {currentPage < slides.length - 1 ? (
          <TouchableOpacity style={styles.skipButton} onPress={handleComplete} activeOpacity={0.7}>
            <Text style={styles.skipText}>{t('onboarding.skip', 'Skip')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.skipButtonPlaceholder} />
        )}
      </View>

      {/* Main Slides: PagerView on Native, FlatList on Web */}
      <View style={styles.pagerContainer}>
        {Platform.OS === 'web' ? (
          <FlatList
            ref={flatListRef}
            data={slides}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={{ width: SCREEN_WIDTH }}>{renderSlideContent(item)}</View>
            )}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setCurrentPage(index);
            }}
          />
        ) : (
          <PagerView
            ref={pagerRef}
            style={styles.pagerView}
            initialPage={0}
            onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
          >
            {slides.map((item) => renderSlideContent(item))}
          </PagerView>
        )}
      </View>

      {/* Bottom Controls */}
      <View style={styles.footer}>
        {/* Pagination Dots */}
        <View style={styles.paginationDots}>
          {slides.map((_, idx) => {
            const isActive = idx === currentPage;
            return (
              <View
                key={idx}
                style={[
                  styles.dot,
                  isActive ? styles.dotActive : styles.dotInactive,
                ]}
              />
            );
          })}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            currentPage === slides.length - 1 && styles.actionButtonFinal,
          ]}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          {currentPage === slides.length - 1 ? (
            <>
              <Text style={styles.actionButtonText}>
                {t('onboarding.getStarted', 'Get Started')}
              </Text>
              <BootstrapIcon name="check-circle-fill" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
            </>
          ) : (
            <>
              <Text style={styles.actionButtonText}>{t('onboarding.next', 'Next')}</Text>
              <BootstrapIcon name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <BootstrapIcon name="globe2" size={18} color={Colors.accent} style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>
                  {t('onboarding.chooseLanguage', 'Select Language')}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowLanguageModal(false)}
              >
                <BootstrapIcon name="x-lg" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.langList} showsVerticalScrollIndicator={false}>
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = i18n.language === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[styles.langItem, isSelected && styles.langItemActive]}
                    onPress={() => handleLanguageSelect(lang.code)}
                  >
                    <Text
                      style={[styles.langItemText, isSelected && styles.langItemTextActive]}
                    >
                      {lang.label}
                    </Text>
                    {isSelected ? <BootstrapIcon name="check-lg" size={16} color={Colors.accent} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxWidth: 170,
  },
  languageButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.accent,
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  skipButtonPlaceholder: {
    width: 50,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  pagerContainer: {
    flex: 1,
  },
  pagerView: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  illustrationContainer: {
    width: 220,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    position: 'relative',
  },
  glowRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  iconCard: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#091540',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  badgeLeft: {
    position: 'absolute',
    top: 12,
    left: -10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  badgeRight: {
    position: 'absolute',
    bottom: 12,
    right: -10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    width: '100%',
    maxWidth: 360,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: Colors.accent,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 28,
  },
  bulletList: {
    width: '100%',
    marginTop: 2,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  bulletDot: {
    fontSize: 14,
    lineHeight: 18,
    marginRight: 6,
    marginTop: -1,
  },
  bulletText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
  },
  bulletLabel: {
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  description: {
    fontSize: 13.5,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paginationDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.accent,
  },
  dotInactive: {
    width: 7,
    backgroundColor: '#CBD5E1',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: BorderRadius.full,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonFinal: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 26,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalCloseBtn: {
    padding: 4,
  },
  langList: {
    marginVertical: 4,
  },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.md,
    marginBottom: 4,
  },
  langItemActive: {
    backgroundColor: '#EEF2FF',
  },
  langItemText: {
    fontSize: 14.5,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  langItemTextActive: {
    fontWeight: '700',
    color: Colors.accent,
  },
});

export default OnboardingScreen;
