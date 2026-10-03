import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Search, Calendar, Pill, Plus, X, Eye, AlertCircle } from 'lucide-react-native';
import { RootStackParamList } from '../../navigation/types';
import { Colors } from '../../theme/colors';
import { Spacing, BorderRadius, Shadows } from '../../theme';
import { FONT_SCALE_LIMITS } from '../../theme/typography';
import { AppHeader } from '../../components/AppHeader';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { DatePickerModal } from '../../components/DatePickerModal';
import { searchStock, StockItem } from '../../db/stockQueries';
import { useBillingStore } from '../../store/useBillingStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import {
  formatCurrency,
  formatReadableDate,
  formatExpiryDateInput,
  isExpiryDateValid,
  getExpiryDateError,
  isValidExpiryDate,
} from '../../utils/formatters';

const DROPDOWN_ITEM_HEIGHT = 56;
const DROPDOWN_VISIBLE_ROWS = 3;
const DROPDOWN_MAX_HEIGHT = DROPDOWN_ITEM_HEIGHT * DROPDOWN_VISIBLE_ROWS;

export const BillingScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useTranslation();
  const { settings } = useSettingsStore();

  const {
    date,
    customerName,
    doctorName,
    items,
    setCustomerName,
    setDoctorName,
    setDate,
    addItemFromStock,
    addNewBlankItem,
    updateItem,
    removeItem,
    clearBill,
    getTotalAmount,
  } = useBillingStore();

  // Autocomplete search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StockItem[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Date modal state
  const [showDateModal, setShowDateModal] = useState(false);

  // Query stock on typing
  useEffect(() => {
    let isMounted = true;
    if (searchQuery.trim().length >= 1) {
      searchStock(searchQuery.trim(), 8).then((res) => {
        if (isMounted) {
          setSearchResults(res);
          setShowResults(true);
        }
      });
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
    return () => {
      isMounted = false;
    };
  }, [searchQuery]);

  const handleSelectStock = (stock: StockItem) => {
    addItemFromStock(stock);
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  const handlePreviewBill = () => {
    if (items.length === 0) {
      Alert.alert(
        t('common.error', 'Error'),
        t('billing.emptyBillError', 'Please add at least one medicine item to the bill before previewing.')
      );
      return;
    }

    // 1. Validate medicine names
    for (let i = 0; i < items.length; i++) {
      if (!items[i].medicine_name || items[i].medicine_name.trim() === '') {
        Alert.alert(
          t('common.error', 'Error'),
          `#${items[i].item_no || i + 1}: ${t('billing.missingNameError', 'Item must have a medicine name.')}`
        );
        return;
      }
    }

    // 2. Validate quantities: must be >= 1 (blank, 0, or invalid blocks preview)
    const invalidQtyRows: number[] = [];
    items.forEach((it, idx) => {
      const q = Number(it.quantity);
      if (it.quantity === undefined || it.quantity === null || String(it.quantity).trim() === '' || isNaN(q) || q < 1) {
        invalidQtyRows.push(it.item_no || idx + 1);
      }
    });

    if (invalidQtyRows.length > 0) {
      Alert.alert(
        t('common.error', 'Error'),
        `${t('billing.invalidQtyError', 'Quantity must be at least 1.')} (Item #${invalidQtyRows.join(', #')})`
      );
      return;
    }

    // 3. Validate item expiry dates if entered (must be complete and not expired against chosen calendar date)
    for (let i = 0; i < items.length; i++) {
      const exp = items[i].exp_date?.trim();
      if (exp && !isValidExpiryDate(exp, date)) {
        const errorMsg = getExpiryDateError(exp, date);
        const displayMsg =
          errorMsg === 'Medicine has expired. Please enter a future expiry date.'
            ? t('billing.cardExpiredError', 'Medicine has expired. Please enter a future expiry date.')
            : errorMsg || t('billing.cardExpiredError', 'Medicine has expired. Please enter a future expiry date.');
        Alert.alert(
          t('common.error', 'Error'),
          `Item #${items[i].item_no || i + 1}: ${displayMsg}`
        );
        return;
      }
    }

    // Navigate to preview screen without committing to SQLite
    navigation.navigate('BillPreview', { mode: 'new' });
  };

  const currency = settings.currency_symbol || '₹';
  const grandTotal = getTotalAmount();
  const hasInvalidOrExpiredItems = items.some(
    (it) => Boolean(it.exp_date && it.exp_date.trim() !== '' && !isExpiryDateValid(it.exp_date, date))
  );

  return (
    <View style={styles.container}>
      <AppHeader
        title={t('billing.title', 'Billing Counter')}
        subtitle={t('billing.searchPlaceholder', 'Search stock and prepare customer invoice')}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Autocomplete Search Bar */}
          <Card padding="md" style={styles.searchCard}>
            <Text
              allowFontScaling={true}
              maxFontSizeMultiplier={FONT_SCALE_LIMITS.header}
              style={styles.sectionHeader}
            >
              {t('billing.searchPlaceholder', 'Type medicine or brand name...')}
            </Text>
            <Input
              placeholder={t('billing.searchPlaceholder', 'Type first few letters of medicine or brand...')}
              value={searchQuery}
              onChangeText={setSearchQuery}
              leftIcon={<Search size={16} color={Colors.textSecondary} />}
              containerStyle={{ marginBottom: 0 }}
            />

            {/* Live Dropdown Results */}
            {showResults && searchResults.length > 0 ? (
              <View style={styles.dropdownContainer}>
                <ScrollView
                  style={styles.dropdownScroll}
                  nestedScrollEnabled={true}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={true}
                  bounces={false}
                >
                  {searchResults.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.dropdownItem}
                      onPress={() => handleSelectStock(item)}
                    >
                      <View style={{ flex: 1, justifyContent: 'center' }}>
                        <Text
                          allowFontScaling={true}
                          maxFontSizeMultiplier={FONT_SCALE_LIMITS.body}
                          style={styles.dropdownMedName}
                          numberOfLines={1}
                        >
                          {item.medicine_name}
                        </Text>
                        <Text
                          allowFontScaling={true}
                          maxFontSizeMultiplier={FONT_SCALE_LIMITS.caption}
                          style={styles.dropdownBrand}
                          numberOfLines={1}
                        >
                          {item.brand_name || 'Generic'} • Exp: {item.exp_date || '-'}
                        </Text>
                      </View>
                      <View style={styles.dropdownRight}>
                        <Text
                          allowFontScaling={true}
                          maxFontSizeMultiplier={FONT_SCALE_LIMITS.body}
                          style={styles.dropdownPrice}
                          numberOfLines={1}
                        >
                          {formatCurrency(item.price, currency)}
                        </Text>
                        <Text
                          allowFontScaling={true}
                          maxFontSizeMultiplier={FONT_SCALE_LIMITS.caption}
                          style={styles.dropdownStock}
                          numberOfLines={1}
                        >
                          Qty: {item.quantity}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </Card>

          {/* Customer & Doctor Metadata Card */}
          <Card padding="md">
            <View style={styles.metaRow}>
              <View style={{ flex: 1, marginRight: Spacing.sm }}>
                <Input
                  label={t('billing.customerName', 'Customer Name')}
                  placeholder="e.g. Ramesh Kumar"
                  value={customerName}
                  onChangeText={setCustomerName}
                  containerStyle={{ marginBottom: 0 }}
                />
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <Input
                  label={t('billing.doctorName', 'Doctor Name')}
                  placeholder="e.g. Dr. S. Nair"
                  value={doctorName}
                  onChangeText={setDoctorName}
                  containerStyle={{ marginBottom: 0 }}
                />
              </View>
            </View>

            {/* Bill Date Selector */}
            <View style={styles.dateRow}>
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={FONT_SCALE_LIMITS.input}
                style={styles.dateLabel}
              >
                {t('billing.date', 'Bill Date')}:
              </Text>
              <TouchableOpacity
                style={styles.datePickerBtn}
                onPress={() => setShowDateModal(true)}
              >
                <Text
                  allowFontScaling={true}
                  maxFontSizeMultiplier={FONT_SCALE_LIMITS.input}
                  style={styles.datePickerText}
                >
                  {formatReadableDate(date)}
                </Text>
                <Calendar size={14} color={Colors.accent} />
              </TouchableOpacity>
            </View>
          </Card>

          {/* Cart Items List */}
          <View style={styles.itemsHeaderRow}>
            <Text
              allowFontScaling={true}
              maxFontSizeMultiplier={FONT_SCALE_LIMITS.header}
              style={styles.sectionHeader}
            >
              {t('billing.itemsInBill', 'Selected Items')} ({items.length})
            </Text>
            <TouchableOpacity onPress={addNewBlankItem} style={styles.addCustomBtn}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Plus size={13} color={Colors.accent} style={{ marginRight: 3 }} />
                <Text
                  allowFontScaling={true}
                  maxFontSizeMultiplier={FONT_SCALE_LIMITS.button}
                  style={styles.addCustomBtnText}
                >
                  {t('billing.addItem', 'Add Medicine')}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {items.length === 0 ? (
            <Card padding="lg" style={styles.emptyCartCard}>
              <Pill size={36} color={Colors.accent} strokeWidth={1.8} />
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={FONT_SCALE_LIMITS.header}
                style={styles.emptyCartTitle}
              >
                {t('billing.noItems', 'No medicines added yet. Search stock above to add.')}
              </Text>
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={FONT_SCALE_LIMITS.body}
                style={styles.emptyCartSub}
              >
                {t('billing.searchPlaceholder', 'Type in search bar or click Add Medicine')}
              </Text>
            </Card>
          ) : (
            items.map((item, index) => (
              <Card key={item.id || index} padding="md" style={styles.itemCard}>
                <View style={styles.itemCardHeader}>
                  <View style={styles.itemBadge}>
                    <Text
                      allowFontScaling={true}
                      maxFontSizeMultiplier={FONT_SCALE_LIMITS.badge}
                      style={styles.itemBadgeText}
                    >
                      #{item.item_no}
                    </Text>
                  </View>
                  <Text
                    allowFontScaling={true}
                    maxFontSizeMultiplier={FONT_SCALE_LIMITS.header}
                    style={styles.itemTitle}
                    numberOfLines={1}
                  >
                    {item.medicine_name || 'Unnamed Medicine'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeItem(index)}
                    style={styles.removeBtn}
                  >
                    <X size={14} color={Colors.danger} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>

                {/* Row 1: Medicine Name & Batch Number */}
                <View style={styles.twoCol}>
                  <View style={{ flex: 1.3, marginRight: 6 }}>
                    <Input
                      label={`${t('common.medicine', 'Medicine')} *`}
                      value={item.medicine_name}
                      onChangeText={(val) => updateItem(index, { medicine_name: val })}
                      placeholder="e.g. Paracetamol"
                      containerStyle={{ marginBottom: 8 }}
                    />
                  </View>
                  <View style={{ flex: 0.9, marginLeft: 6 }}>
                    <Input
                      label={t('stock.batchNumber', 'Batch Number')}
                      value={item.batch_number}
                      onChangeText={(val) => updateItem(index, { batch_number: val })}
                      placeholder="e.g. B204"
                      autoCapitalize="characters"
                      containerStyle={{ marginBottom: 8 }}
                    />
                  </View>
                </View>

                {/* Row 2: Brand Name & Exp Date */}
                <View style={styles.twoCol}>
                  <View style={{ flex: 1.2, marginRight: 6 }}>
                    <Input
                      label={t('common.brand', 'Brand')}
                      value={item.brand_name}
                      onChangeText={(val) => updateItem(index, { brand_name: val })}
                      placeholder="e.g. Cipla"
                      containerStyle={{ marginBottom: 8 }}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 6 }}>
                    <Input
                      label={t('common.exp', 'Exp Date (MM/YYYY)')}
                      value={item.exp_date}
                      keyboardType="numeric"
                      maxLength={7}
                      onChangeText={(val) =>
                        updateItem(index, { exp_date: formatExpiryDateInput(val, item.exp_date) })
                      }
                      placeholder="MM/YYYY"
                      error={
                        item.exp_date && item.exp_date.trim() !== ''
                          ? (getExpiryDateError(item.exp_date, date) || undefined)
                          : undefined
                      }
                      containerStyle={{ marginBottom: 8 }}
                    />
                  </View>
                </View>

                {/* Row 3: Price and Quantity */}
                <View style={styles.twoCol}>
                  <View style={{ flex: 1, marginRight: 6 }}>
                    <Input
                      label={t('common.price', 'Price')}
                      value={
                        item.price !== undefined &&
                        item.price !== null &&
                        item.price !== 'null' &&
                        item.price !== 'undefined'
                          ? String(item.price)
                          : ''
                      }
                      keyboardType="decimal-pad"
                      onChangeText={(val) => {
                        const cleaned = val.replace(/[^0-9.]/g, '');
                        const parts = cleaned.split('.');
                        const sanitized = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
                        updateItem(index, { price: sanitized });
                      }}
                      placeholder="0.00"
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 6 }}>
                    <Input
                      label={`${t('common.qty', 'Quantity')} *`}
                      value={item.quantity !== undefined && item.quantity !== null ? String(item.quantity) : ''}
                      keyboardType="numeric"
                      onChangeText={(val) => {
                        const trimmed = val.trim();
                        const parsed = trimmed === '' ? undefined : parseInt(trimmed, 10);
                        updateItem(index, { quantity: isNaN(parsed as number) ? undefined : parsed });
                      }}
                      placeholder="Qty"
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                </View>

                <View style={styles.itemTotalRow}>
                  <Text
                    allowFontScaling={true}
                    maxFontSizeMultiplier={FONT_SCALE_LIMITS.table}
                    style={styles.itemTotalLabel}
                  >
                    {t('common.total', 'Total')}:
                  </Text>
                  <Text
                    allowFontScaling={true}
                    maxFontSizeMultiplier={FONT_SCALE_LIMITS.table}
                    style={styles.itemTotalValue}
                  >
                    {formatCurrency(
                      Math.round(
                        (((parseFloat(String(item.price)) || 0) * (Number(item.quantity) || 0)) + Number.EPSILON) * 100
                      ) / 100,
                      currency
                    )}
                  </Text>
                </View>
              </Card>
            ))
          )}

          {/* Bill Summary & Preview Bar */}
          <Card padding="md" style={styles.summaryCard}>
            <View style={styles.summaryRow}>
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
            <View style={styles.summaryRow}>
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={FONT_SCALE_LIMITS.table}
                style={styles.summaryLabel}
              >
                {t('billing.totalAmount', 'Grand Total')}:
              </Text>
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={FONT_SCALE_LIMITS.header}
                style={styles.grandTotalText}
              >
                {formatCurrency(grandTotal, currency)}
              </Text>
            </View>

            <View style={styles.saveActionContainer}>
              {hasInvalidOrExpiredItems ? (
                <View style={styles.expiredWarningBanner}>
                  <AlertCircle size={15} color={Colors.danger} style={{ marginRight: 6 }} />
                  <Text
                    allowFontScaling={true}
                    maxFontSizeMultiplier={FONT_SCALE_LIMITS.caption}
                    style={styles.expiredWarningText}
                  >
                    {t(
                      'billing.expiredWarningNotice',
                      'One or more medicines have expired for the selected bill date. Please update expiry dates before previewing or saving.'
                    )}
                  </Text>
                </View>
              ) : null}

              <Button
                title={t('billing.previewBill', 'Preview & Save Bill')}
                variant="primary" // Primary Accent Blue #091540
                size="lg"
                icon={<Eye size={18} color={Colors.textLight} />}
                disabled={items.length === 0 || hasInvalidOrExpiredItems}
                onPress={handlePreviewBill}
                style={{ width: '100%' }}
              />
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={showDateModal}
        title="Select Bill Date"
        initialDate={date}
        onClose={() => setShowDateModal(false)}
        onSelectDate={setDate}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background, // Off-white #F8F9FA
  },
  scrollContent: {
    padding: Spacing.md,
  },
  searchCard: {
    position: 'relative',
    zIndex: 10,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.accent,
    marginBottom: 8,
  },
  dropdownContainer: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    marginTop: 6,
    overflow: 'hidden',
    ...Shadows.card,
  },
  dropdownScroll: {
    maxHeight: DROPDOWN_MAX_HEIGHT,
  },
  dropdownItem: {
    height: DROPDOWN_ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceAlt,
  },
  dropdownMedName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  dropdownBrand: {
    fontSize: 11.5,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  dropdownRight: {
    alignItems: 'flex-end',
  },
  dropdownPrice: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.accent,
  },
  dropdownStock: {
    fontSize: 10.5,
    color: '#10B981',
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  datePickerText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.accent,
    marginRight: 6,
  },
  calendarIcon: {
    fontSize: 13,
  },
  itemsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  addCustomBtn: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
  },
  addCustomBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.accent,
  },
  emptyCartCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    borderStyle: 'dashed',
  },
  emptyCartIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyCartTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  emptyCartSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  itemCard: {
    marginBottom: Spacing.sm,
  },
  itemCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemBadge: {
    backgroundColor: Colors.accentLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginRight: 8,
  },
  itemBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.accent,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    color: Colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  twoCol: {
    flexDirection: 'row',
  },
  threeCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  itemTotalLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  itemTotalValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.accent,
  },
  summaryCard: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xxl,
    backgroundColor: Colors.surface,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  grandTotalText: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.accent,
  },
  saveActionContainer: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  expiredWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerBg,
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    marginBottom: Spacing.sm,
  },
  expiredWarningText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.danger,
  },
});

export default BillingScreen;
