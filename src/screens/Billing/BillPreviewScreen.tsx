import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  BackHandler,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, User, Stethoscope, Calendar, Share2, CircleCheck } from 'lucide-react-native';
import { RootStackParamList } from '../../navigation/types';
import { Colors } from '../../theme/colors';
import { Spacing, BorderRadius, Shadows } from '../../theme';
import { FONT_SCALE_LIMITS } from '../../theme/typography';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { BillSuccessModal } from './BillSuccessModal';
import { useBillingStore } from '../../store/useBillingStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { formatCurrency, formatReadableDate } from '../../utils/formatters';
import { generateBillingBillPdf } from './billingSharePdf';
import { useTranslation } from 'react-i18next';
import { Bill } from '../../db/billQueries';

type BillPreviewNavProp = NativeStackNavigationProp<RootStackParamList, 'BillPreview'>;
type BillPreviewRouteProp = RouteProp<RootStackParamList, 'BillPreview'>;

export const BillPreviewScreen: React.FC = () => {
  const navigation = useNavigation<BillPreviewNavProp>();
  const route = useRoute<BillPreviewRouteProp>();
  const { t } = useTranslation();
  const { mode, bill: passedBill } = route.params;

  const { settings } = useSettingsStore();
  const currency = settings.currency_symbol || '₹';

  // Store billing state for 'new' mode
  const {
    date: draftDate,
    customerName: draftCustomer,
    doctorName: draftDoctor,
    items: draftItems,
    getTotalAmount,
    saveCurrentBill,
    clearBill,
  } = useBillingStore();

  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Hardware back press listener for Android
  useEffect(() => {
    const onBackPress = () => {
      navigation.goBack();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [navigation]);

  // Success modal state for after atomic SQLite commit
  const [savedBillData, setSavedBillData] = useState<{
    billNo: string;
    totalAmount: number;
    items: any[];
    date: string;
    customer_name: string;
    doctor_name: string;
  } | null>(null);

  // Resolve bill details based on mode
  const isViewMode = mode === 'view';
  const customerName = isViewMode ? passedBill?.customer_name || 'Walk-in Customer' : draftCustomer || 'Walk-in Customer';
  const doctorName = isViewMode ? passedBill?.doctor_name || 'Self / Direct' : draftDoctor || 'Self / Direct';
  const billDate = isViewMode ? passedBill?.date || '' : draftDate;
  const billNo = isViewMode ? passedBill?.bill_no : 'Draft (Pending Save)';

  const items = isViewMode ? (passedBill?.items || []) : draftItems;
  const grandTotal = isViewMode
    ? (passedBill?.total_amount ?? Math.round((items.reduce((s, it) => s + ((parseFloat(String(it.price)) || 0) * (it.quantity || 1)), 0) + Number.EPSILON) * 100) / 100)
    : getTotalAmount();

  const handleSaveAndStartNewBill = async () => {
    if (items.length === 0) {
      Alert.alert('Empty Bill', 'No items in this bill to save.');
      return;
    }

    setIsSaving(true);
    try {
      const currentItems = [...draftItems];
      const total = grandTotal;
      const res = await saveCurrentBill();

      setSavedBillData({
        billNo: res.billNo,
        totalAmount: total,
        items: currentItems,
        date: draftDate,
        customer_name: draftCustomer,
        doctor_name: draftDoctor,
      });
    } catch (err: any) {
      Alert.alert('Save Error', err.message || 'Failed to save bill to mobile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareSavedBillPdf = async () => {
    if (!passedBill) return;
    setIsSharing(true);
    try {
      await generateBillingBillPdf({
        settings,
        bill: {
          bill_no: passedBill.bill_no,
          date: passedBill.date,
          customer_name: passedBill.customer_name,
          doctor_name: passedBill.doctor_name,
          total_amount: passedBill.total_amount,
          items: passedBill.items || [],
        },
      });
    } catch (err: any) {
      Alert.alert('Share Error', err.message || 'Failed to share bill PDF');
    } finally {
      setIsSharing(false);
    }
  };

  const handleSuccessNewBill = () => {
    setSavedBillData(null);
    clearBill();
    navigation.goBack();
  };

  const handleSuccessViewPrint = async () => {
    if (!savedBillData) return;
    try {
      await generateBillingBillPdf({
        settings,
        bill: {
          bill_no: savedBillData.billNo,
          date: savedBillData.date,
          customer_name: savedBillData.customer_name,
          doctor_name: savedBillData.doctor_name,
          total_amount: savedBillData.totalAmount,
          items: savedBillData.items,
        },
      });
    } catch (err: any) {
      Alert.alert('PDF Error', err.message || 'Failed to generate PDF');
    } finally {
      setSavedBillData(null);
      clearBill();
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.navHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={22} color={Colors.accent} />
        </TouchableOpacity>
        <View style={styles.navTitleContainer}>
          <Text
            allowFontScaling={true}
            maxFontSizeMultiplier={FONT_SCALE_LIMITS.header}
            style={styles.navTitle}
          >
            {isViewMode ? `${t('preview.billNumber', 'Invoice #')}${passedBill?.bill_no}` : t('preview.title', 'Invoice Preview')}
          </Text>
          <Text
            allowFontScaling={true}
            maxFontSizeMultiplier={FONT_SCALE_LIMITS.caption}
            style={styles.navSubtitle}
          >
            {isViewMode
              ? t('preview.subtitle', 'Review & share saved invoice')
              : t('preview.subtitle', 'Verify invoice details before saving to mobile')}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
        {/* Pharmacy / Shop Profile Summary Card */}
        <Card padding="md" style={styles.shopCard}>
          <View style={styles.shopHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={FONT_SCALE_LIMITS.header}
                style={styles.shopName}
              >
                {settings.shop_name || 'Apex Medico & Pharmacy'}
              </Text>
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={FONT_SCALE_LIMITS.caption}
                style={styles.shopMeta}
              >
                {settings.address}
              </Text>
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={FONT_SCALE_LIMITS.caption}
                style={styles.shopMeta}
              >
                Ph: {settings.phone}
              </Text>
              <View style={styles.taxIdRow}>
                {settings.gst_number ? (
                  <Text
                    allowFontScaling={true}
                    maxFontSizeMultiplier={FONT_SCALE_LIMITS.caption}
                    style={styles.taxIdText}
                  >
                    GST: <Text style={styles.taxIdBold}>{settings.gst_number}</Text>
                  </Text>
                ) : null}
                {settings.drug_licence_number ? (
                  <Text
                    allowFontScaling={true}
                    maxFontSizeMultiplier={FONT_SCALE_LIMITS.caption}
                    style={[styles.taxIdText, { marginLeft: 10 }]}
                  >
                    DL No: <Text style={styles.taxIdBold}>{settings.drug_licence_number}</Text>
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        </Card>

        {/* Bill & Customer Metadata Card */}
        <Card padding="md" style={styles.metaCard}>
          <View style={styles.metaHeader}>
            <Text
              allowFontScaling={true}
              maxFontSizeMultiplier={FONT_SCALE_LIMITS.header}
              style={styles.metaTitle}
            >
              {t('preview.billSummary', 'Customer & Invoice Details')}
            </Text>
            <View style={[styles.badge, isViewMode ? styles.badgeSaved : styles.badgeDraft]}>
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={FONT_SCALE_LIMITS.badge}
                style={[styles.badgeText, isViewMode ? styles.badgeTextSaved : styles.badgeTextDraft]}
              >
                {isViewMode ? 'SAVED TO MOBILE' : 'DRAFT'}
              </Text>
            </View>
          </View>

          <View style={styles.metaGrid}>
            <View style={styles.metaGridItem}>
              <View style={styles.metaLabelRow}>
                <User size={13} color={Colors.textSecondary} style={{ marginRight: 4 }} />
                <Text
                  allowFontScaling={true}
                  maxFontSizeMultiplier={FONT_SCALE_LIMITS.caption}
                  style={styles.metaLabel}
                >
                  {t('preview.customer', 'Customer')}:
                </Text>
              </View>
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={FONT_SCALE_LIMITS.body}
                style={styles.metaValue}
              >
                {customerName}
              </Text>
            </View>

            <View style={styles.metaGridItem}>
              <View style={styles.metaLabelRow}>
                <Stethoscope size={13} color={Colors.textSecondary} style={{ marginRight: 4 }} />
                <Text
                  allowFontScaling={true}
                  maxFontSizeMultiplier={FONT_SCALE_LIMITS.caption}
                  style={styles.metaLabel}
                >
                  {t('preview.doctor', 'Doctor')}:
                </Text>
              </View>
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={FONT_SCALE_LIMITS.body}
                style={styles.metaValue}
              >
                {doctorName}
              </Text>
            </View>

            <View style={styles.metaGridItem}>
              <View style={styles.metaLabelRow}>
                <Calendar size={13} color={Colors.textSecondary} style={{ marginRight: 4 }} />
                <Text
                  allowFontScaling={true}
                  maxFontSizeMultiplier={FONT_SCALE_LIMITS.caption}
                  style={styles.metaLabel}
                >
                  {t('preview.date', 'Date')}:
                </Text>
              </View>
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={FONT_SCALE_LIMITS.body}
                style={styles.metaValue}
              >
                {formatReadableDate(billDate)}
              </Text>
            </View>

            <View style={styles.metaGridItem}>
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={FONT_SCALE_LIMITS.caption}
                style={styles.metaLabel}
              >
                {t('preview.billNumber', 'Invoice No')}:
              </Text>
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={FONT_SCALE_LIMITS.body}
                style={[styles.metaValue, { color: Colors.accent, fontWeight: '700' }]}
              >
                {billNo}
              </Text>
            </View>
          </View>
        </Card>

        {/* Itemized Table Card */}
        <Card padding="md" style={styles.tableCard}>
          <Text
            allowFontScaling={true}
            maxFontSizeMultiplier={FONT_SCALE_LIMITS.header}
            style={styles.tableSectionTitle}
          >
            {t('billing.itemsInBill', 'Purchased Items')} ({items.length})
          </Text>

          {/* Table Header */}
          <View style={styles.tableHeaderRow}>
            <Text allowFontScaling={true} maxFontSizeMultiplier={FONT_SCALE_LIMITS.table} style={[styles.th, { width: 28 }]}>{t('common.itemNo', '#')}</Text>
            <Text allowFontScaling={true} maxFontSizeMultiplier={FONT_SCALE_LIMITS.table} style={[styles.th, { flex: 1.4 }]}>{t('common.medicine', 'Medicine')}</Text>
            <Text allowFontScaling={true} maxFontSizeMultiplier={FONT_SCALE_LIMITS.table} style={[styles.th, { flex: 0.9 }]}>{t('stock.batchNumber', 'Batch')}</Text>
            <Text allowFontScaling={true} maxFontSizeMultiplier={FONT_SCALE_LIMITS.table} style={[styles.th, { flex: 1.1 }]}>{t('common.brand', 'Brand')}</Text>
            <Text allowFontScaling={true} maxFontSizeMultiplier={FONT_SCALE_LIMITS.table} style={[styles.th, { width: 55, textAlign: 'center' }]}>{t('common.exp', 'Exp')}</Text>
            <Text allowFontScaling={true} maxFontSizeMultiplier={FONT_SCALE_LIMITS.table} style={[styles.th, { width: 36, textAlign: 'center' }]}>{t('common.qty', 'Qty')}</Text>
            <Text allowFontScaling={true} maxFontSizeMultiplier={FONT_SCALE_LIMITS.table} style={[styles.th, { width: 56, textAlign: 'right' }]}>{t('common.price', 'Rate')}</Text>
            <Text allowFontScaling={true} maxFontSizeMultiplier={FONT_SCALE_LIMITS.table} style={[styles.th, { width: 64, textAlign: 'right' }]}>{t('common.total', 'Total')}</Text>
          </View>

          {/* Table Rows */}
          {items.map((it, idx) => {
            const price = parseFloat(String(it.price)) || 0;
            const qty = Number(it.quantity) || 1;
            const lineTotal = Math.round((price * qty + Number.EPSILON) * 100) / 100;

            return (
              <View
                key={it.id || idx}
                style={[
                  styles.tableDataRow,
                  idx % 2 === 1 && styles.tableDataRowAlt,
                ]}
              >
                <Text allowFontScaling={true} maxFontSizeMultiplier={FONT_SCALE_LIMITS.table} style={[styles.td, { width: 28, color: Colors.textSecondary }]}>
                  {it.item_no || idx + 1}
                </Text>
                <View style={{ flex: 1.4, paddingRight: 4 }}>
                  <Text
                    allowFontScaling={true}
                    maxFontSizeMultiplier={FONT_SCALE_LIMITS.body}
                    style={styles.medName}
                    numberOfLines={2}
                  >
                    {it.medicine_name}
                  </Text>
                </View>
                <Text allowFontScaling={true} maxFontSizeMultiplier={FONT_SCALE_LIMITS.table} style={[styles.td, { flex: 0.9, fontFamily: 'monospace', fontSize: 11 }]}>
                  {it.batch_number || '—'}
                </Text>
                <Text allowFontScaling={true} maxFontSizeMultiplier={FONT_SCALE_LIMITS.table} style={[styles.td, { flex: 1.1, color: Colors.textSecondary }]} numberOfLines={1}>
                  {it.brand_name || '—'}
                </Text>
                <Text allowFontScaling={true} maxFontSizeMultiplier={FONT_SCALE_LIMITS.table} style={[styles.td, { width: 55, textAlign: 'center', fontSize: 11 }]}>
                  {it.exp_date || '—'}
                </Text>
                <Text allowFontScaling={true} maxFontSizeMultiplier={FONT_SCALE_LIMITS.table} style={[styles.td, { width: 36, textAlign: 'center', fontWeight: '700' }]}>
                  {qty}
                </Text>
                <Text allowFontScaling={true} maxFontSizeMultiplier={FONT_SCALE_LIMITS.table} style={[styles.td, { width: 56, textAlign: 'right', fontSize: 11 }]}>
                  {formatCurrency(price, currency)}
                </Text>
                <Text allowFontScaling={true} maxFontSizeMultiplier={FONT_SCALE_LIMITS.table} style={[styles.td, { width: 64, textAlign: 'right', fontWeight: '700', color: Colors.accent }]}>
                  {formatCurrency(lineTotal, currency)}
                </Text>
              </View>
            );
          })}

          {/* Totals Box */}
          <View style={styles.billTotalSection}>
            <View style={styles.summaryLine}>
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={FONT_SCALE_LIMITS.table}
                style={styles.summaryLabel}
              >
                {t('stock.totalItems', 'Total Items')}:
              </Text>
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={FONT_SCALE_LIMITS.table}
                style={styles.summaryValue}
              >
                {items.length}
              </Text>
            </View>
            <View style={styles.grandTotalLine}>
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={FONT_SCALE_LIMITS.header}
                style={styles.grandTotalLabel}
              >
                {t('preview.grandTotal', 'Grand Total Amount')}:
              </Text>
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={FONT_SCALE_LIMITS.header}
                style={styles.grandTotalValue}
              >
                {formatCurrency(grandTotal, currency)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Bottom Action Area */}
        <View style={styles.actionContainer}>
          {isViewMode ? (
            <Button
              title={isSharing ? t('analytics.generatingPdf', 'Generating PDF...') : t('preview.printShare', 'Share Bill as PDF')}
              variant="primary"
              size="lg"
              icon={<Share2 size={18} color={Colors.textLight} />}
              loading={isSharing}
              disabled={isSharing}
              onPress={handleShareSavedBillPdf}
              style={{ width: '100%' }}
            />
          ) : (
            <Button
              title={isSaving ? t('common.loading', 'Loading...') : t('preview.saveAndPrint', 'Save Bill to Mobile')}
              variant="primary"
              size="lg"
              icon={<CircleCheck size={18} color={Colors.textLight} />}
              loading={isSaving}
              disabled={isSaving || items.length === 0}
              onPress={handleSaveAndStartNewBill}
              style={{ width: '100%' }}
            />
          )}

          <Button
            title={`← ${t('common.cancel', 'Back to Billing')}`}
            variant="outline"
            size="md"
            onPress={() => navigation.goBack()}
            style={{ width: '100%', marginTop: Spacing.sm }}
          />
        </View>
      </ScrollView>

      {/* Success Modal */}
      {savedBillData ? (
        <BillSuccessModal
          visible={true}
          billNo={savedBillData.billNo}
          totalAmount={savedBillData.totalAmount}
          onViewPdf={handleSuccessViewPrint}
          onNewBill={handleSuccessNewBill}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl + 8,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    ...Shadows.soft,
  },
  backBtn: {
    padding: 6,
    marginRight: Spacing.sm,
  },
  navTitleContainer: {
    flex: 1,
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.accent,
  },
  navSubtitle: {
    fontSize: 11.5,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  content: {
    padding: Spacing.md,
  },
  shopCard: {
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  shopHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  shopName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.accent,
    marginBottom: 3,
  },
  shopMeta: {
    fontSize: 11.5,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  taxIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceAlt,
  },
  taxIdText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  taxIdBold: {
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  metaCard: {
    marginBottom: Spacing.sm,
  },
  metaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceAlt,
  },
  metaTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.accent,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  badgeDraft: {
    backgroundColor: '#FEF3C7',
  },
  badgeSaved: {
    backgroundColor: '#D1FAE5',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  badgeTextDraft: {
    color: '#B45309',
  },
  badgeTextSaved: {
    color: '#065F46',
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metaGridItem: {
    width: '50%',
    paddingVertical: 4,
  },
  metaLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  metaLabel: {
    fontSize: 11.5,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  tableCard: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  tableSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.accent,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.sm,
    paddingVertical: 7,
    paddingHorizontal: 6,
    marginBottom: 4,
  },
  th: {
    color: Colors.textLight,
    fontSize: 10.5,
    fontWeight: '700',
  },
  tableDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceAlt,
  },
  tableDataRowAlt: {
    backgroundColor: '#F8FAFC',
  },
  td: {
    fontSize: 11.5,
    color: Colors.textPrimary,
  },
  medName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  billTotalSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1.5,
    borderTopColor: Colors.border,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  summaryLabel: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  grandTotalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.accentLight,
    paddingHorizontal: 4,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.accent,
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.accent,
  },
  actionContainer: {
    marginBottom: Spacing.xl,
  },
});

export default BillPreviewScreen;
