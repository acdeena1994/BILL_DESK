import React from 'react';
import { Text, TextProps, StyleSheet, TextStyle } from 'react-native';
import { Typography, FONT_SCALE_LIMITS, FontScaleCategory } from '../theme/typography';
import { Colors } from '../theme/colors';

export interface AppTextProps extends TextProps {
  variant?:
    | 'brandTitle'
    | 'screenTitle'
    | 'sectionTitle'
    | 'body'
    | 'bodyBold'
    | 'caption'
    | 'tableHeader'
    | 'tableCell'
    | 'numeric'
    | 'button'
    | 'badge';
  category?: FontScaleCategory;
  color?: string;
  weight?: '400' | '500' | '600' | '700' | '800';
}

const CATEGORY_MAP: Record<NonNullable<AppTextProps['variant']>, FontScaleCategory> = {
  brandTitle: 'header',
  screenTitle: 'header',
  sectionTitle: 'header',
  body: 'body',
  bodyBold: 'body',
  caption: 'caption',
  tableHeader: 'table',
  tableCell: 'table',
  numeric: 'table',
  button: 'button',
  badge: 'badge',
};

export const AppText: React.FC<AppTextProps> = ({
  variant = 'body',
  category,
  color,
  weight,
  style,
  allowFontScaling = true,
  maxFontSizeMultiplier,
  children,
  ...rest
}) => {
  const resolvedCategory = category || (variant ? CATEGORY_MAP[variant] : 'body');
  const defaultMultiplier = FONT_SCALE_LIMITS[resolvedCategory];
  const effectiveMultiplier = maxFontSizeMultiplier !== undefined ? maxFontSizeMultiplier : defaultMultiplier;

  let baseStyle: TextStyle = {};
  if (variant && variant in Typography.styles) {
    baseStyle = Typography.styles[variant as keyof typeof Typography.styles];
  } else if (variant === 'button') {
    baseStyle = {
      fontSize: 14,
      fontWeight: '600',
    };
  } else if (variant === 'badge') {
    baseStyle = {
      fontSize: 11,
      fontWeight: '700',
    };
  }

  return (
    <Text
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={effectiveMultiplier}
      style={[
        styles.defaultText,
        baseStyle,
        color ? { color } : null,
        weight ? { fontWeight: weight } : null,
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  defaultText: {
    color: Colors.textPrimary,
  },
});

export default AppText;
