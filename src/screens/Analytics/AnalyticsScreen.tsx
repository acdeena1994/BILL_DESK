import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BarChart } from 'react-native-gifted-charts';
import { Calendar, Share2, Eye } from 'lucide-react-native';
import { RootStackParamList } from '../../navigation/types';
import { Colors } from '../../theme/colors';
import { Spacing, BorderRadius, Shadows } from '../../theme';
import { AppHeader } from '../../components/AppHeader';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { DatePickerModal } from '../../components/DatePickerModal';
import {
  getSalesAnalytics,
  getBillsByDateRange,
  Bill,
} from '../../db/billQueries';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useBillingStore } from '../../store/useBillingStore';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatReadableDate, todayFormatted } from '../../utils/formatters';
import { generateSalesRegisterPdf } from '../../utils/pdfGenerator';
import { generateSalesRegisterExcel } from '../../utils/excelGenerator';

export const AnalyticsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useTranslation();
  const { settings } = useSettingsStore();
  const lastBillSavedTimestamp = useBillingStore((s) => s.lastBillSavedTimestamp);
  const currency = settings.currency_symbol || '₹';

  // Period filter state
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [chartData, setChartData] = useState<Array<{ label: string; value: number }>>([]);
  const [isChartLoading, setIsChartLoading] = useState(false);

  // Date range for PDF & Excel export (synchronized with active filter range)
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(todayFormatted());

  // Date picker modal state
  const [activePicker, setActivePicker] = useState<'from' | 'to' | null>(null);

  // Bills list & export loading states
  const [recentBills, setRecentBills] = useState<Bill[]>([]);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Fetch sales chart data
  const loadChart = useCallback(async (selectedPeriod: 'daily' | 'weekly' | 'monthly') => {
    setIsChartLoading(true);
    try {
      const data = await getSalesAnalytics(selectedPeriod);
      setChartData(data);
    } catch (err) {
      console.error('Failed to load chart analytics:', err);
    } finally {
      setIsChartLoading(false);
    }
  }, []);

  // Fetch bills in date range
  const loadBillsInRange = useCallback(async () => {
    try {
      const bills = await getBillsByDateRange(fromDate, toDate);
      setRecentBills(bills);
    } catch (err) {
      console.error('Failed to load bills in range:', err);
    }
  }, [fromDate, toDate]);

  // Tab switcher that updates active date filter range accordingly
  const handleSelectPeriod = (p: 'daily' | 'weekly' | 'monthly') => {
    setPeriod(p);
    const to = todayFormatted();
    const d = new Date();
    if (p === 'daily') {
      d.setDate(d.getDate() - 7);
    } else if (p === 'weekly') {
      d.setDate(d.getDate() - 42);
    } else {
      d.setMonth(d.getMonth() - 6);
    }
    setFromDate(d.toISOString().split('T')[0]);
    setToDate(to);
  };

  useEffect(() => {
    loadChart(period);
  }, [period, loadChart]);

  useEffect(() => {
    loadBillsInRange();
  }, [fromDate, toDate, loadBillsInRange]);

  // Real-time refresh immediately when a bill is saved in Billing module
  useEffect(() => {
    if (lastBillSavedTimestamp > 0) {
      loadChart(period);
      loadBillsInRange();
    }
  }, [lastBillSavedTimestamp, period, loadChart, loadBillsInRange]);

  // Refresh data whenever user navigates / focuses this screen
  useFocusEffect(
    useCallback(() => {
      loadChart(period);
      loadBillsInRange();
    }, [period, loadChart, loadBillsInRange])
  );

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const bills = await getBillsByDateRange(fromDate, toDate);
      if (bills.length === 0) {
        Alert.alert(
          'No Bills Found',
          `There are no bills found between ${formatReadableDate(fromDate)} and ${formatReadableDate(toDate)}.`
        );
        setIsExportingPdf(false);
        return;
      }

      await generateSalesRegisterPdf({
        settings,
        bills,
        fromDate,
        toDate,
      });
    } catch (err: any) {
      Alert.alert('Export Error', err.message || 'Failed to generate PDF document');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadExcel = async () => {
    setIsExportingExcel(true);
    try {
      const bills = await getBillsByDateRange(fromDate, toDate);
      if (bills.length === 0) {
        Alert.alert(
          'No Bills Found',
          `There are no bills found between ${formatReadableDate(fromDate)} and ${formatReadableDate(toDate)}.`
        );
        setIsExportingExcel(false);
        return;
      }

      await generateSalesRegisterExcel({
        settings,
        bills,
        fromDate,
        toDate,
      });
    } catch (err: any) {
      Alert.alert('Export Error', err.message || 'Failed to generate Excel document');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Compute total sales in current chart view
  const totalSalesInPeriod = chartData.reduce((sum, item) => sum + item.value, 0);

  // Prepare Gifted Charts formatted data
  const formattedChartData = chartData.map((d) => ({
    value: d.value,
    label: d.label,
    frontColor: Colors.accent, // Accent Blue #091540
    topLabelComponent: () =>
      d.value > 0 ? (
        <Text style={styles.chartValueLabel}>
          {Math.round(d.value)}
        </Text>
      ) : null,
  }));

  return (
    <View style={styles.container}>
      <AppHeader
        title={t('analytics.title', 'Sales Analytics')}
        subtitle={t('analytics.subtitle', 'Sales graphs and official PDF bill registers')}
      />

      <ScrollView style={styles.content}>
        {/* Period Filter Tabs */}
        <View style={styles.filterBar}>
          {(['daily', 'weekly', 'monthly'] as const).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.filterTab, period === p && styles.filterTabActive]}
              onPress={() => handleSelectPeriod(p)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  period === p && styles.filterTabTextActive,
                ]}
              >
                {t(`analytics.${p}`, p.charAt(0).toUpperCase() + p.slice(1))}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sales Overview Card */}
        <Card padding="md" style={styles.graphCard}>
          <View style={styles.graphHeader}>
            <View>
              <Text style={styles.cardSubtitle}>
                {t('analytics.totalSales', 'Total Sales')} ({t(`analytics.${period}`, period)})
              </Text>
              <Text style={styles.totalAmountText}>
                {formatCurrency(totalSalesInPeriod, currency)}
              </Text>
            </View>
            <View style={styles.graphBadge}>
              <Text style={styles.graphBadgeText}>Live Sync</Text>
            </View>
          </View>

          {isChartLoading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={Colors.accent} />
            </View>
          ) : (
            <View style={styles.chartWrapper}>
              {chartData.length > 0 ? (
                <BarChart
                  data={formattedChartData}
                  barWidth={24}
                  spacing={18}
                  roundedTop
                  roundedBottom
                  hideRules={false}
                  rulesColor={Colors.border}
                  yAxisColor={Colors.borderStrong}
                  xAxisColor={Colors.borderStrong}
                  yAxisTextStyle={{ color: Colors.textSecondary, fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: Colors.textSecondary, fontSize: 10 }}
                  noOfSections={4}
                  initialSpacing={10}
                  height={180}
                />
              ) : (
                <Text style={styles.noDataText}>
                  {t('analytics.noBillsFound', 'No sales recorded for this period')}
                </Text>
              )}
            </View>
          )}
        </Card>

        {/* Date Range Export Card */}
        <Card padding="md" style={styles.exportCard}>
          <Text style={styles.sectionTitle}>{t('analytics.dateRangeExport', 'Download Bill Register')}</Text>
          <Text style={styles.sectionSubtitle}>
            {t('analytics.subtitle', 'Select date range to generate official PDF or Excel sales register.')}
          </Text>

          <View style={styles.datePickerRow}>
            {/* From Date */}
            <View style={{ flex: 1, marginRight: Spacing.sm }}>
              <Text style={styles.inputLabel}>{t('analytics.from', 'From Date')}</Text>
              <TouchableOpacity
                style={styles.dateBox}
                onPress={() => setActivePicker('from')}
              >
                <Text style={styles.dateBoxText}>{formatReadableDate(fromDate)}</Text>
                <Calendar size={14} color={Colors.accent} />
              </TouchableOpacity>
            </View>

            {/* To Date */}
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
              <Text style={styles.inputLabel}>{t('analytics.to', 'To Date')}</Text>
              <TouchableOpacity
                style={styles.dateBox}
                onPress={() => setActivePicker('to')}
              >
                <Text style={styles.dateBoxText}>{formatReadableDate(toDate)}</Text>
                <Calendar size={14} color={Colors.accent} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Dual Export Buttons: Share PDF and Share Excel */}
          <View style={styles.exportButtonsRow}>
            <Button
              title={isExportingPdf ? t('analytics.generatingPdf', 'Generating PDF...') : t('analytics.downloadPdf', 'Download PDF')}
              variant="primary" // Accent Blue #091540
              size="md"
              icon={<Share2 size={16} color={Colors.textLight} />}
              loading={isExportingPdf}
              disabled={isExportingPdf || isExportingExcel}
              onPress={handleDownloadPdf}
              style={{ flex: 1, marginRight: Spacing.xs }}
            />
            <Button
              title={isExportingExcel ? t('analytics.generatingExcel', 'Generating Excel...') : t('analytics.downloadExcel', 'Download Excel')}
              variant="outline"
              size="md"
              icon={<Share2 size={16} color={Colors.accent} />}
              loading={isExportingExcel}
              disabled={isExportingPdf || isExportingExcel}
              onPress={handleDownloadExcel}
              style={{ flex: 1, marginLeft: Spacing.xs }}
            />
          </View>
        </Card>

        {/* Bills in Date Range Summary List */}
        <View style={styles.recentBillsHeader}>
          <Text style={styles.sectionTitle}>
            {t('analytics.recentBills', 'Recent Bills')} ({recentBills.length})
          </Text>
        </View>

        {recentBills.length === 0 ? (
          <Card padding="md">
            <Text style={styles.noBillsText}>
              No bills found between {formatReadableDate(fromDate)} and {formatReadableDate(toDate)}.
            </Text>
          </Card>
        ) : (
          recentBills.map((b) => (
            <Card key={b.id || b.bill_no} padding="md" style={styles.billItemCard}>
              <View style={styles.billRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.billNumber}>{b.bill_no}</Text>
                  <Text style={styles.billCustomer}>
                    {b.customer_name || 'Walk-in'} • Dr. {b.doctor_name || 'Self'}
                  </Text>
                  <Text style={styles.billDate}>{formatReadableDate(b.date)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.billAmount}>
                    {formatCurrency(b.total_amount, currency)}
                  </Text>
                  <Text style={styles.billItemsCount}>
                    {b.items?.length || 1} items
                  </Text>
                </View>
              </View>

              {/* Preview Bill action button */}
              <View style={styles.billCardFooter}>
                <TouchableOpacity
                  style={styles.previewBillActionBtn}
                  onPress={() => navigation.navigate('BillPreview', { mode: 'view', bill: b })}
                >
                  <Eye size={13} color={Colors.accent} style={{ marginRight: 5 }} />
                  <Text style={styles.previewBillActionBtnText}>Preview Bill</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      {/* Date Picker Modals */}
      <DatePickerModal
        visible={activePicker === 'from'}
        title="Select From Date"
        initialDate={fromDate}
        onClose={() => setActivePicker(null)}
        onSelectDate={(d) => {
          setFromDate(d);
          setActivePicker(null);
        }}
      />

      <DatePickerModal
        visible={activePicker === 'to'}
        title="Select To Date"
        initialDate={toDate}
        onClose={() => setActivePicker(null)}
        onSelectDate={(d) => {
          setToDate(d);
          setActivePicker(null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background, // Off-white #F8F9FA
  },
  content: {
    padding: Spacing.md,
  },
  filterBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    padding: 4,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  filterTabActive: {
    backgroundColor: Colors.accent, // Accent Blue #091540
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterTabTextActive: {
    color: Colors.textLight,
    fontWeight: '700',
  },
  graphCard: {
    marginBottom: Spacing.md,
  },
  graphHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  cardSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  totalAmountText: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.accent,
    marginTop: 2,
  },
  graphBadge: {
    backgroundColor: Colors.accentLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  graphBadgeText: {
    fontSize: 10,
    color: Colors.accent,
    fontWeight: '700',
  },
  chartWrapper: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  chartValueLabel: {
    color: Colors.accent,
    fontSize: 9,
    fontWeight: '600',
    marginBottom: 2,
  },
  loaderContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 13,
    color: Colors.textSecondary,
    paddingVertical: 40,
  },
  exportCard: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.accent,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginBottom: Spacing.md,
  },
  datePickerRow: {
    flexDirection: 'row',
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  dateBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    height: 44,
  },
  dateBoxText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  recentBillsHeader: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  billItemCard: {
    marginBottom: Spacing.xs,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.accent,
  },
  billCustomer: {
    fontSize: 12,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  billDate: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  billAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  billItemsCount: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  noBillsText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 10,
  },
  exportButtonsRow: {
    flexDirection: 'row',
    marginTop: Spacing.md,
  },
  billCardFooter: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceAlt,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  previewBillActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accentLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.sm,
  },
  previewBillActionBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.accent,
  },
});

export default AnalyticsScreen;
