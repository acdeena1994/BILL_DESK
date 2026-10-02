import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
  View,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Spacing, BorderRadius, Shadows } from '../theme';
import { FONT_SCALE_LIMITS } from '../theme/typography';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  maxFontSizeMultiplier?: number;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  maxFontSizeMultiplier,
}) => {
  const getContainerStyle = () => {
    switch (variant) {
      case 'primary':
        // Strict Accent Blue #091540 reserved for primary actions
        return [styles.primaryContainer, Shadows.soft];
      case 'secondary':
        return styles.secondaryContainer;
      case 'outline':
        return styles.outlineContainer;
      case 'danger':
        return styles.dangerContainer;
      case 'ghost':
        return styles.ghostContainer;
      default:
        return styles.primaryContainer;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primaryText;
      case 'secondary':
        return styles.secondaryText;
      case 'outline':
        return styles.outlineText;
      case 'danger':
        return styles.dangerText;
      case 'ghost':
        return styles.ghostText;
      default:
        return styles.primaryText;
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'sm':
        return styles.sizeSm;
      case 'lg':
        return styles.sizeLg;
      default:
        return styles.sizeMd;
    }
  };

  const effectiveMultiplier =
    maxFontSizeMultiplier !== undefined
      ? maxFontSizeMultiplier
      : FONT_SCALE_LIMITS.button;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        getContainerStyle(),
        getSizeStyle(),
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? Colors.textLight : Colors.accent}
        />
      ) : (
        <View style={styles.contentRow}>
          {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
          <Text
            allowFontScaling={true}
            maxFontSizeMultiplier={effectiveMultiplier}
            style={[styles.textBase, getTextStyle(), textStyle]}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 38,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: Spacing.sm,
  },
  // Variant containers
  primaryContainer: {
    backgroundColor: Colors.accent, // #091540
  },
  secondaryContainer: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  outlineContainer: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
  },
  dangerContainer: {
    backgroundColor: Colors.dangerBg,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  ghostContainer: {
    backgroundColor: 'transparent',
  },
  // Sizes
  sizeSm: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
  },
  sizeMd: {
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
  },
  sizeLg: {
    paddingVertical: 15,
    paddingHorizontal: Spacing.xl,
  },
  // Texts
  textBase: {
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  primaryText: {
    color: Colors.textLight,
  },
  secondaryText: {
    color: Colors.textPrimary,
  },
  outlineText: {
    color: Colors.textPrimary,
  },
  dangerText: {
    color: Colors.danger,
  },
  ghostText: {
    color: Colors.textSecondary,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default Button;
