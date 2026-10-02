import React from 'react';
import { View, Text, StyleSheet, Image, ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import { Spacing, BorderRadius, Shadows } from '../theme';
import { FONT_SCALE_LIMITS } from '../theme/typography';
import { useSettingsStore } from '../store/useSettingsStore';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
  bannerImage?: ImageSourcePropType;
  logoImage?: ImageSourcePropType;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  rightAction,
  bannerImage,
  logoImage,
}) => {
  const { settings } = useSettingsStore();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 14) + Spacing.sm }]}>
      {bannerImage ? (
        <View style={styles.bannerContainer}>
          <Image source={bannerImage} style={styles.bannerImage} resizeMode="cover" />
        </View>
      ) : null}

      <View style={styles.brandRow}>
        <View style={styles.leftSection}>
          {/* Logo: Custom logo image -> shop_logo -> or default emblem badge */}
          {logoImage ? (
            <Image source={logoImage} style={styles.headerLogoImage} resizeMode="contain" />
          ) : settings.shop_logo ? (
            <Image source={{ uri: settings.shop_logo }} style={styles.headerLogoImage} resizeMode="contain" />
          ) : (
            <View style={styles.logoBadge}>
              {/* Deliberate: icon emblem symbol '+' inside fixed 36x36 container */}
              <Text allowFontScaling={false} style={styles.logoCross}>+</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={FONT_SCALE_LIMITS.header}
                style={styles.appName}
              >
                Bill Desk
              </Text>
              <View style={styles.tag}>
                <Text
                  allowFontScaling={true}
                  maxFontSizeMultiplier={FONT_SCALE_LIMITS.badge}
                  style={styles.tagText}
                >
                  Rx
                </Text>
              </View>
            </View>
            <Text
              allowFontScaling={true}
              maxFontSizeMultiplier={FONT_SCALE_LIMITS.caption}
              style={styles.shopName}
              numberOfLines={1}
            >
              {settings.shop_name || 'Apex Medico & Pharmacy'}
            </Text>
          </View>
        </View>

        {rightAction ? <View style={styles.rightSection}>{rightAction}</View> : null}
      </View>

      {title ? (
        <View style={styles.pageTitleContainer}>
          <Text
            allowFontScaling={true}
            maxFontSizeMultiplier={FONT_SCALE_LIMITS.header}
            style={styles.pageTitle}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              allowFontScaling={true}
              maxFontSizeMultiplier={FONT_SCALE_LIMITS.caption}
              style={styles.pageSubtitle}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    ...Shadows.soft,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.accent, // Accent blue #091540
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  logoCross: {
    color: Colors.textLight,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.accent,
    letterSpacing: 0.3,
  },
  tag: {
    backgroundColor: Colors.accentLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BorderRadius.sm,
    marginLeft: 6,
  },
  tagText: {
    color: Colors.accent,
    fontSize: 10,
    fontWeight: '700',
  },
  shopName: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageTitleContainer: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  pageSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  headerLogoImage: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.md,
  },
  bannerContainer: {
    width: '100%',
    height: 80,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surfaceAlt,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
});

export default AppHeader;
