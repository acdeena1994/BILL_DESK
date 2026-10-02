import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../theme/colors';
import { Spacing, BorderRadius, Shadows } from '../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  padding?: keyof typeof Spacing;
}

export const Card: React.FC<CardProps> = ({ children, style, padding = 'md' }) => {
  return (
    <View style={[styles.card, { padding: Spacing[padding] }, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
    marginBottom: Spacing.md,
  },
});

export default Card;
