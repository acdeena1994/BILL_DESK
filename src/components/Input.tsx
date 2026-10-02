import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Spacing, BorderRadius } from '../theme';
import { FONT_SCALE_LIMITS } from '../theme/typography';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  rightIcon?: React.ReactNode;
  leftIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  containerStyle,
  inputStyle,
  rightIcon,
  leftIcon,
  onFocus,
  onBlur,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text
          allowFontScaling={true}
          maxFontSizeMultiplier={FONT_SCALE_LIMITS.input}
          style={styles.label}
        >
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.focusedBorder,
          error ? styles.errorBorder : null,
        ]}
      >
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
        <TextInput
          placeholderTextColor={Colors.textPlaceholder}
          allowFontScaling={true}
          maxFontSizeMultiplier={FONT_SCALE_LIMITS.input}
          style={[styles.input, inputStyle]}
          onFocus={(e) => {
            setIsFocused(true);
            if (onFocus) onFocus(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            if (onBlur) onBlur(e);
          }}
          {...rest}
        />
        {rightIcon ? <View style={styles.rightIcon}>{rightIcon}</View> : null}
      </View>
      {error ? (
        <Text
          allowFontScaling={true}
          maxFontSizeMultiplier={FONT_SCALE_LIMITS.caption}
          style={styles.errorText}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    minHeight: 48,
    paddingVertical: 4,
  },
  focusedBorder: {
    borderColor: Colors.accent, // Accent Blue border when focused
  },
  errorBorder: {
    borderColor: Colors.danger,
  },
  input: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    paddingHorizontal: 0,
  },
  leftIcon: {
    marginRight: Spacing.sm,
  },
  rightIcon: {
    marginLeft: Spacing.sm,
  },
  errorText: {
    fontSize: 11,
    color: Colors.danger,
    marginTop: 4,
  },
});

export default Input;
