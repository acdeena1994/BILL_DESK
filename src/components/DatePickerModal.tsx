import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Spacing, BorderRadius, Shadows } from '../theme';
import { FONT_SCALE_LIMITS } from '../theme/typography';
import { Button } from './Button';
import { useTranslation } from 'react-i18next';

interface DatePickerModalProps {
  visible: boolean;
  title: string;
  initialDate?: string; // YYYY-MM-DD
  onClose: () => void;
  onSelectDate: (date: string) => void;
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  title,
  initialDate,
  onClose,
  onSelectDate,
}) => {
  const { t } = useTranslation();

  const parseDate = (dStr?: string) => {
    if (dStr && /^\d{4}-\d{2}-\d{2}$/.test(dStr)) {
      const parts = dStr.split('-').map(Number);
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return new Date();
  };

  const [selectedDate, setSelectedDate] = useState<Date>(parseDate(initialDate));

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const daysCount = getDaysInMonth(selectedDate.getFullYear(), selectedDate.getMonth());
  const days = Array.from({ length: daysCount }, (_, i) => i + 1);

  const handleConfirm = () => {
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    onSelectDate(`${y}-${m}-${d}`);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <Text
            allowFontScaling={true}
            maxFontSizeMultiplier={FONT_SCALE_LIMITS.header}
            style={styles.title}
          >
            {title}
          </Text>

          {/* Year Selector */}
          <Text
            allowFontScaling={true}
            maxFontSizeMultiplier={FONT_SCALE_LIMITS.caption}
            style={styles.sectionLabel}
          >
            Year
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
            {years.map((yr) => (
              <TouchableOpacity
                key={yr}
                onPress={() => {
                  const d = new Date(selectedDate);
                  d.setFullYear(yr);
                  setSelectedDate(d);
                }}
                style={[
                  styles.pill,
                  selectedDate.getFullYear() === yr && styles.activePill,
                ]}
              >
                <Text
                  allowFontScaling={true}
                  maxFontSizeMultiplier={FONT_SCALE_LIMITS.button}
                  style={[
                    styles.pillText,
                    selectedDate.getFullYear() === yr && styles.activePillText,
                  ]}
                >
                  {yr}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Month Selector */}
          <Text
            allowFontScaling={true}
            maxFontSizeMultiplier={FONT_SCALE_LIMITS.caption}
            style={styles.sectionLabel}
          >
            Month
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
            {months.map((m, idx) => (
              <TouchableOpacity
                key={m}
                onPress={() => {
                  const d = new Date(selectedDate);
                  d.setMonth(idx);
                  setSelectedDate(d);
                }}
                style={[
                  styles.pill,
                  selectedDate.getMonth() === idx && styles.activePill,
                ]}
              >
                <Text
                  allowFontScaling={true}
                  maxFontSizeMultiplier={FONT_SCALE_LIMITS.button}
                  style={[
                    styles.pillText,
                    selectedDate.getMonth() === idx && styles.activePillText,
                  ]}
                >
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Day Selector */}
          <Text
            allowFontScaling={true}
            maxFontSizeMultiplier={FONT_SCALE_LIMITS.caption}
            style={styles.sectionLabel}
          >
            Day
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
            {days.map((dy) => (
              <TouchableOpacity
                key={dy}
                onPress={() => {
                  const d = new Date(selectedDate);
                  d.setDate(dy);
                  setSelectedDate(d);
                }}
                style={[
                  styles.pill,
                  selectedDate.getDate() === dy && styles.activePill,
                ]}
              >
                <Text
                  allowFontScaling={true}
                  maxFontSizeMultiplier={FONT_SCALE_LIMITS.button}
                  style={[
                    styles.pillText,
                    selectedDate.getDate() === dy && styles.activePillText,
                  ]}
                >
                  {dy}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.buttonRow}>
            <Button
              title={t('common.cancel', 'Cancel')}
              variant="outline"
              size="sm"
              onPress={onClose}
              style={{ flex: 1, marginRight: Spacing.sm }}
            />
            <Button
              title={t('common.confirm', 'Confirm')}
              variant="primary"
              size="sm"
              onPress={handleConfirm}
              style={{ flex: 1, marginLeft: Spacing.sm }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 21, 64, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.modal,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.accent,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceAlt,
    marginRight: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activePill: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  pillText: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  activePillText: {
    color: Colors.textLight,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});

export default DatePickerModal;
