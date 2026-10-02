import React from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CircleCheck } from 'lucide-react-native';
import { Colors } from '../../theme/colors';
import { Spacing, BorderRadius, Shadows } from '../../theme';
import { FONT_SCALE_LIMITS } from '../../theme/typography';
import { Button } from '../../components/Button';
import { formatCurrency } from '../../utils/formatters';
import { useSettingsStore } from '../../store/useSettingsStore';

interface BillSuccessModalProps {
  visible: boolean;
  billNo: string;
  totalAmount: number;
  onViewPdf: () => void;
  onNewBill: () => void;
}

export const BillSuccessModal: React.FC<BillSuccessModalProps> = ({
  visible,
  billNo,
  totalAmount,
  onViewPdf,
  onNewBill,
}) => {
  const { t } = useTranslation();
  const { settings } = useSettingsStore();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.content}>
          {/* Bootstrap-like Success Check Badge */}
          <View style={styles.iconCircle}>
            <CircleCheck size={36} color={Colors.success} strokeWidth={2.2} />
          </View>

          <Text
            allowFontScaling={true}
            maxFontSizeMultiplier={FONT_SCALE_LIMITS.header}
            style={styles.title}
          >
            {t('billing.billSavedSuccess', 'Bill Saved Successfully!')}
          </Text>
          <Text
            allowFontScaling={true}
            maxFontSizeMultiplier={FONT_SCALE_LIMITS.body}
            style={styles.subtitle}
          >
            {t('settings.savedSuccess', 'Invoice has been recorded in mobile.')}
          </Text>

          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={FONT_SCALE_LIMITS.caption}
                style={styles.detailLabel}
              >
                {t('billing.billNo', 'Invoice No')}:
              </Text>
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={FONT_SCALE_LIMITS.body}
                style={styles.detailValue}
              >
                {billNo}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={FONT_SCALE_LIMITS.caption}
                style={styles.detailLabel}
              >
                {t('billing.totalAmount', 'Total Amount')}:
              </Text>
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={FONT_SCALE_LIMITS.header}
                style={styles.totalValue}
              >
                {formatCurrency(totalAmount, settings.currency_symbol)}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <Button
            title={t('billing.viewPdf', 'View & Print PDF')}
            variant="primary" // Accent #091540
            size="md"
            onPress={onViewPdf}
            style={styles.actionBtn}
          />

          <Button
            title={t('billing.newBill', 'Create New Bill')}
            variant="outline"
            size="md"
            onPress={onNewBill}
            style={styles.actionBtn}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 21, 64, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  content: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.modal,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.success,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.accent,
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  detailsCard: {
    width: '100%',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.accent,
  },
  actionBtn: {
    width: '100%',
    marginBottom: Spacing.sm,
  },
});

export default BillSuccessModal;
