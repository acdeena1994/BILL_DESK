import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Clock, ShoppingCart, User, Stethoscope } from 'lucide-react-native';
import { Colors } from '../theme/colors';
import { Spacing, BorderRadius, Shadows } from '../theme';
import { FONT_SCALE_LIMITS } from '../theme/typography';
import { Button } from './Button';
import { BillingDraft } from '../services/billingDraftService';
import { formatCurrency } from '../utils/formatters';

interface ResumeDraftModalProps {
  visible: boolean;
  draft: BillingDraft | null;
  onContinue: () => void;
  onStartFresh: () => void;
}

export const ResumeDraftModal: React.FC<ResumeDraftModalProps> = ({
  visible,
  draft,
  onContinue,
  onStartFresh,
}) => {
  if (!draft) return null;

  const itemCount = draft.items?.length || 0;
  const totalAmount = Math.round(
    ((draft.items || []).reduce(
      (sum, it) => sum + (parseFloat(String(it.price)) || 0) * (Number(it.quantity) || 0),
      0
    ) + Number.EPSILON) * 100
  ) / 100;

  const formattedDate = draft.savedAt
    ? new Date(draft.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.contentCard}>
          {/* Header Icon */}
          <View style={styles.iconCircle}>
            <Clock size={32} color={Colors.accent} strokeWidth={2.2} />
          </View>

          {/* Title and Subtitle */}
          <Text
            style={styles.title}
            maxFontSizeMultiplier={FONT_SCALE_LIMITS.header}
          >
            We saved your progress. Would you like to continue?
          </Text>
          <Text
            style={styles.subtitle}
            maxFontSizeMultiplier={FONT_SCALE_LIMITS.body}
          >
            Your in-progress billing invoice was safely autosaved. You can resume editing where you left off or start a fresh bill.
          </Text>

          {/* Draft Summary Details */}
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryLabelRow}>
                <ShoppingCart size={13} color={Colors.textSecondary} style={{ marginRight: 5 }} />
                <Text
                  style={styles.summaryLabel}
                  maxFontSizeMultiplier={FONT_SCALE_LIMITS.caption}
                >
                  Items:
                </Text>
              </View>
              <Text
                style={styles.summaryValue}
                maxFontSizeMultiplier={FONT_SCALE_LIMITS.body}
              >
                {itemCount} {itemCount === 1 ? 'medicine' : 'medicines'}
              </Text>
            </View>

            {totalAmount > 0 ? (
              <View style={styles.summaryRow}>
                <Text
                  style={styles.summaryLabel}
                  maxFontSizeMultiplier={FONT_SCALE_LIMITS.caption}
                >
                  Estimated Total:
                </Text>
                <Text
                  style={[styles.summaryValue, styles.totalHighlight]}
                  maxFontSizeMultiplier={FONT_SCALE_LIMITS.body}
                >
                  {formatCurrency(totalAmount, '₹')}
                </Text>
              </View>
            ) : null}

            {draft.customerName ? (
              <View style={styles.summaryRow}>
                <View style={styles.summaryLabelRow}>
                  <User size={13} color={Colors.textSecondary} style={{ marginRight: 5 }} />
                  <Text
                    style={styles.summaryLabel}
                    maxFontSizeMultiplier={FONT_SCALE_LIMITS.caption}
                  >
                    Customer:
                  </Text>
                </View>
                <Text
                  style={styles.summaryValue}
                  numberOfLines={1}
                  maxFontSizeMultiplier={FONT_SCALE_LIMITS.body}
                >
                  {draft.customerName}
                </Text>
              </View>
            ) : null}

            {draft.doctorName ? (
              <View style={styles.summaryRow}>
                <View style={styles.summaryLabelRow}>
                  <Stethoscope size={13} color={Colors.textSecondary} style={{ marginRight: 5 }} />
                  <Text
                    style={styles.summaryLabel}
                    maxFontSizeMultiplier={FONT_SCALE_LIMITS.caption}
                  >
                    Doctor:
                  </Text>
                </View>
                <Text
                  style={styles.summaryValue}
                  numberOfLines={1}
                  maxFontSizeMultiplier={FONT_SCALE_LIMITS.body}
                >
                  {draft.doctorName}
                </Text>
              </View>
            ) : null}

            {formattedDate ? (
              <View style={[styles.summaryRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                <Text
                  style={styles.savedAtText}
                  maxFontSizeMultiplier={FONT_SCALE_LIMITS.caption}
                >
                  Autosaved at {formattedDate}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              title="Continue"
              variant="primary"
              size="lg"
              onPress={onContinue}
              style={styles.actionBtn}
            />

            <Button
              title="Start Fresh"
              variant="outline"
              size="md"
              onPress={onStartFresh}
              style={[styles.actionBtn, { marginTop: Spacing.sm }]}
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
    backgroundColor: 'rgba(9, 21, 64, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  contentCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.modal,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.accent,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  summaryBox: {
    width: '100%',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  summaryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  totalHighlight: {
    color: Colors.accent,
    fontWeight: '700',
  },
  savedAtText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  buttonContainer: {
    width: '100%',
  },
  actionBtn: {
    width: '100%',
  },
});

export default ResumeDraftModal;
