import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { CircleCheck, AlertTriangle, Trash2, Compass, Check, Database, Download, Upload, ShieldCheck } from 'lucide-react-native';
import { Colors } from '../../theme/colors';
import { Spacing, BorderRadius } from '../../theme';
import { AppHeader } from '../../components/AppHeader';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useBillingStore } from '../../store/useBillingStore';
import { resetAllBills } from '../../db/billQueries';
import { SUPPORTED_LANGUAGES, changeAppLanguage } from '../../localization/i18n';
import {
  getDatabaseStats,
  exportDatabaseBackup,
  restoreDatabaseFromBackup,
  DatabaseStats,
} from '../../services/backupService';

const COMMON_CURRENCIES = ['₹', '$', '€', '£', 'AED', '¥'];

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { t, i18n } = useTranslation();
  const { settings, loadSettings, updateSettings } = useSettingsStore();

  const [shopName, setShopName] = useState(settings.shop_name);
  const [shopLogo, setShopLogo] = useState(settings.shop_logo);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [gstNumber, setGstNumber] = useState(settings.gst_number);
  const [drugLicenceNumber, setDrugLicenceNumber] = useState(settings.drug_licence_number || '');
  const [currencySymbol, setCurrencySymbol] = useState(settings.currency_symbol || '₹');
  const [selectedLang, setSelectedLang] = useState(i18n.language || settings.language || 'en');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const refreshDbStats = async () => {
    try {
      const stats = await getDatabaseStats();
      setDbStats(stats);
    } catch (e) {
      console.warn('[Settings] Failed to fetch database stats:', e);
    }
  };

  useEffect(() => {
    refreshDbStats();
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    setShopName(settings.shop_name);
    setShopLogo(settings.shop_logo);
    setAddress(settings.address);
    setPhone(settings.phone);
    setGstNumber(settings.gst_number);
    setDrugLicenceNumber(settings.drug_licence_number || '');
    setCurrencySymbol(settings.currency_symbol || '₹');
    setSelectedLang(i18n.language || settings.language || 'en');
  }, [settings, i18n.language]);

  const handlePickLogo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setShopLogo(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('Logo Picker Error', err.message || 'Failed to pick image');
    }
  };

  const handleRemoveLogo = () => {
    setShopLogo('');
  };

  const handleLanguageChange = async (langCode: string) => {
    setSelectedLang(langCode);
    try {
      await changeAppLanguage(langCode);
      await updateSettings({ language: langCode });
    } catch (err: any) {
      Alert.alert('Language Error', err.message || 'Failed to switch language');
    }
  };

  const handleSaveSettings = async () => {
    if (!shopName.trim()) {
      Alert.alert('Validation Error', 'Shop/Pharmacy name cannot be empty.');
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await updateSettings({
        shop_name: shopName.trim(),
        shop_logo: shopLogo,
        address: address.trim(),
        phone: phone.trim(),
        gst_number: gstNumber.trim(),
        drug_licence_number: drugLicenceNumber.trim(),
        currency_symbol: currencySymbol.trim() || '₹',
        language: selectedLang,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      Alert.alert(
        t('common.success', 'Success'),
        t('settings.savedSuccess', 'Settings saved and synced to mobile!')
      );
    } catch (err: any) {
      Alert.alert('Save Error', err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetBills = () => {
    Alert.alert(
      t('settings.resetConfirmTitle', 'Reset All Bills?'),
      t(
        'settings.resetConfirmMsg',
        'This will permanently delete all bill records and their line items from mobile, and reset the bill number counter to 0001.\n\nThis action cannot be undone.'
      ),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('settings.resetBills', 'Reset Bill (to 0001)'),
          style: 'destructive',
          onPress: async () => {
            setIsResetting(true);
            try {
              await resetAllBills();
              useBillingStore.getState().clearBill();
              refreshDbStats();
              Alert.alert(
                t('common.success', 'Success'),
                'All bill records have been deleted. Next bill number will restart at 0001.'
              );
            } catch (err: any) {
              Alert.alert('Reset Error', err.message || 'Failed to reset bills');
            } finally {
              setIsResetting(false);
            }
          },
        },
      ]
    );
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const res = await exportDatabaseBackup();
      if (res.success) {
        Alert.alert(
          t('settings.backupSuccessTitle', 'Backup Export Ready'),
          t(
            'settings.backupSuccessMsg',
            `Your pharmacy backup has been prepared on mobile (${res.fileName}).\n\nSave it to Google Drive, Downloads, or send it to your email for safe-keeping.`
          )
        );
      } else if (res.error) {
        Alert.alert(t('common.error', 'Error'), res.error);
      }
    } catch (err: any) {
      Alert.alert(t('common.error', 'Error'), err.message || 'Failed to export backup');
    } finally {
      setIsExporting(false);
      refreshDbStats();
    }
  };

  const handleRestoreBackup = () => {
    Alert.alert(
      t('settings.restoreConfirmTitle', 'Restore Mobile Backup?'),
      t(
        'settings.restoreConfirmMsg',
        'Restoring will replace all current pharmacy bills, custom medicines, and shop settings with the data in the selected backup file.\n\nAre you sure you want to proceed?'
      ),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('settings.selectFile', 'Select Backup File'),
          style: 'destructive',
          onPress: async () => {
            setIsRestoring(true);
            try {
              const res = await restoreDatabaseFromBackup();
              if (res.success) {
                Alert.alert(
                  t('common.success', 'Restore Successful'),
                  `Successfully restored ${res.billsCount ?? 0} bill(s) and ${(res.stockCount ?? 0).toLocaleString()} inventory item(s)!\n\nYour shop settings and records have been refreshed.`
                );
                await loadSettings();
                refreshDbStats();
              } else if (!res.canceled && res.error) {
                Alert.alert(t('common.error', 'Restore Failed'), res.error);
              }
            } catch (err: any) {
              Alert.alert(t('common.error', 'Restore Failed'), err.message || 'Failed to restore backup');
            } finally {
              setIsRestoring(false);
            }
          },
        },
      ]
    );
  };

  const handleRevisitGuide = () => {
    navigation.navigate('Onboarding');
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title={t('settings.title', 'Settings & Configuration')}
        subtitle={t('settings.subtitle', 'Configure shop branding, language, and currency')}
      />

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {saveSuccess ? (
          <View style={styles.successBanner}>
            <CircleCheck size={16} color={Colors.success} style={{ marginRight: 6 }} />
            <Text style={styles.successBannerText}>
              {t('settings.savedSuccess', 'Settings saved and synced to mobile!')}
            </Text>
          </View>
        ) : null}

        
        {/* Pharmacy / Shop Details Card */}
        <Card padding="md">
          <Text style={styles.sectionTitle}>
            {t('settings.shopDetails', 'Pharmacy / Shop Profile')}
          </Text>
          <Text style={styles.sectionSubtitle}>
            {t(
              'settings.shopDetailsSubtitle',
              'These details are printed at the top of every generated PDF bill and sales register.'
            )}
          </Text>

          {/* Logo Picker */}
          <View style={styles.logoSection}>
            <Text style={styles.inputLabel}>{t('settings.shopLogo', 'Pharmacy Logo')}</Text>
            <View style={styles.logoRow}>
              {shopLogo ? (
                <Image source={{ uri: shopLogo }} style={styles.logoPreview} />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Text style={styles.logoPlaceholderText}>
                    {t('settings.noLogo', 'No Logo')}
                  </Text>
                </View>
              )}
              <View style={styles.logoButtons}>
                <TouchableOpacity style={styles.pickLogoBtn} onPress={handlePickLogo}>
                  <Text style={styles.pickLogoBtnText}>
                    {t('settings.selectLogo', 'Choose Logo Image')}
                  </Text>
                </TouchableOpacity>
                {shopLogo ? (
                  <TouchableOpacity style={styles.removeLogoBtn} onPress={handleRemoveLogo}>
                    <Text style={styles.removeLogoBtnText}>
                      {t('settings.removeLogo', 'Remove')}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>

          <Input
            label={t('settings.shopName', 'Shop / Pharmacy Name *')}
            placeholder="e.g. Apex Medico & Surgical"
            value={shopName}
            onChangeText={setShopName}
          />

          <Input
            label={t('settings.address', 'Shop Address')}
            placeholder="Shop address, Street, City & Pincode"
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={2}
            inputStyle={{ height: 60, textAlignVertical: 'top', paddingTop: 8 }}
          />

          <Input
            label={t('settings.phone', 'Contact Phone Number')}
            placeholder="+91 98765 43210"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <View style={{ flexDirection: 'row' }}>
            <View style={{ flex: 1, marginRight: Spacing.xs }}>
              <Input
                label={t('settings.gst', 'GST Number')}
                placeholder="33AABCU9603R1ZM"
                value={gstNumber}
                onChangeText={setGstNumber}
                autoCapitalize="characters"
              />
            </View>
            <View style={{ flex: 1, marginLeft: Spacing.xs }}>
              <Input
                label={t('settings.drugLicence', 'Drug Licence Number')}
                placeholder="DL-20B/21B-TN/12345"
                value={drugLicenceNumber}
                onChangeText={setDrugLicenceNumber}
                autoCapitalize="characters"
              />
            </View>
          </View>
        </Card>


        {/* App Language Localization Card (Top priority for user convenience) */}
        <Card padding="md">
          <Text style={styles.sectionTitle}>{t('settings.appLanguage', 'App Language')}</Text>
          <Text style={styles.sectionSubtitle}>
            {t(
              'settings.appLanguageSubtitle',
              'Select the interface language for Bill Desk. Changes take effect immediately.'
            )}
          </Text>

          <View style={styles.langRow}>
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = selectedLang === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.langPill, isSelected && styles.langPillActive]}
                  onPress={() => handleLanguageChange(lang.code)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.langPillText, isSelected && styles.langPillTextActive]}
                  >
                    {lang.label}
                  </Text>
                  {isSelected ? (
                    <Check size={14} color="#FFFFFF" style={{ marginLeft: 5 }} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* App Tour / Onboarding Revisit Card */}
        <Card padding="md">
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Compass size={18} color={Colors.accent} style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle}>
              {t('settings.revisitGuide', 'Take app tour again')}
            </Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            {t(
              'settings.revisitGuideSubtitle',
              'See the Bill Desk guide again to understand how to use the app effectively.'
            )}
          </Text>

          <Button
            title={t('settings.openGuide', 'Open Guide')}
            variant="outline"
            size="md"
            icon={<Compass size={16} color={Colors.accent} />}
            onPress={handleRevisitGuide}
            style={{ marginTop: Spacing.xs }}
          />
        </Card>



        {/* Currency Configuration Card */}
        <Card padding="md">
          <Text style={styles.sectionTitle}>
            {t('settings.currencySymbol', 'Currency Symbol')}
          </Text>
          <Text style={styles.sectionSubtitle}>
            {t(
              'settings.currencySubtitle',
              'This currency symbol will be used everywhere prices appear (Billing, Analytics, PDFs).'
            )}
          </Text>

          <View style={styles.currencyPillRow}>
            {COMMON_CURRENCIES.map((cur) => (
              <TouchableOpacity
                key={cur}
                style={[
                  styles.curPill,
                  currencySymbol === cur && styles.curPillActive,
                ]}
                onPress={() => setCurrencySymbol(cur)}
              >
                <Text
                  style={[
                    styles.curPillText,
                    currencySymbol === cur && styles.curPillTextActive,
                  ]}
                >
                  {cur}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label={t('settings.customCurrency', 'Or Custom Currency Symbol')}
            placeholder="e.g. ₹ or $"
            value={currencySymbol}
            onChangeText={setCurrencySymbol}
            containerStyle={{ marginTop: Spacing.xs, marginBottom: 0 }}
          />
        </Card>

        {/* Primary Action Button: Save Settings */}
        <View style={styles.saveContainer}>
          <Button
            title={
              isSaving
                ? t('common.loading', 'Loading...')
                : t('settings.saveSettings', 'Save Settings')
            }
            variant="primary"
            size="lg"
            loading={isSaving}
            onPress={handleSaveSettings}
            style={{ width: '100%' }}
          />
        </View>

        {/* Database Backup & Data Safety Card */}
        <Card padding="md" style={styles.backupCard}>
          <View style={styles.backupHeader}>
            <Database size={18} color={Colors.accent} style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>
              {t('settings.backupTitle', 'Mobile Backup & Data Protection')}
            </Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            {t(
              'settings.backupSubtitle',
              'Export a complete backup of all bills, stock, and settings to Google Drive, Downloads, or WhatsApp. You can restore your data anytime if you reinstall the app or switch phones.'
            )}
          </Text>

          {/* Database Metrics */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{dbStats?.billsCount ?? 0}</Text>
              <Text style={styles.statLabel}>{t('settings.billsCount', 'Bills Saved')}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{(dbStats?.stockCount ?? 0).toLocaleString()}</Text>
              <Text style={styles.statLabel}>{t('settings.medicinesCount', 'Medicines')}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{dbStats?.sizeFormatted ?? '...'}</Text>
              <Text style={styles.statLabel}>{t('settings.dbSize', 'Mobile Storage')}</Text>
            </View>
          </View>

          <View style={styles.backupActions}>
            <Button
              title={
                isExporting
                  ? t('common.loading', 'Exporting...')
                  : t('settings.exportBackup', 'Backup Mobile Data')
              }
              variant="primary"
              size="md"
              icon={<Download size={16} color={Colors.textLight} />}
              loading={isExporting}
              disabled={isExporting || isRestoring}
              onPress={handleExportBackup}
              style={{ flex: 1, marginRight: Spacing.xs }}
            />
            <Button
              title={
                isRestoring
                  ? t('common.loading', 'Restoring...')
                  : t('settings.restoreBackup', 'Restore Backup')
              }
              variant="outline"
              size="md"
              icon={<Upload size={16} color={Colors.accent} />}
              loading={isRestoring}
              disabled={isExporting || isRestoring}
              onPress={handleRestoreBackup}
              style={{ flex: 1, marginLeft: Spacing.xs }}
            />
          </View>
        </Card>

        {/* Danger Zone: Data Management */}
        <Card padding="md" style={styles.dangerCard}>
          <View style={styles.dangerHeader}>
            <AlertTriangle size={18} color={Colors.danger} style={{ marginRight: 8 }} />
            <Text style={styles.dangerTitle}>{t('settings.dangerZone', 'Danger Zone')}</Text>
          </View>
          <Text style={styles.dangerSubtitle}>
            {t(
              'settings.dangerSubtitle',
              'Delete all bill records and their line items from mobile, and reset the bill numbering sequence back to 0001 immediately.'
            )}
          </Text>

          <Button
            title={
              isResetting
                ? t('common.loading', 'Loading...')
                : t('settings.resetBills', 'Reset Bill (to 0001)')
            }
            variant="outline"
            size="md"
            icon={<Trash2 size={16} color={Colors.danger} />}
            loading={isResetting}
            disabled={isResetting}
            onPress={handleResetBills}
            style={styles.resetButton}
            textStyle={{ color: Colors.danger, fontWeight: '700' }}
          />
        </Card>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
  },
  successBanner: {
    backgroundColor: Colors.successBg,
    borderColor: Colors.success,
    borderWidth: 1,
    padding: 10,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBannerText: {
    color: Colors.success,
    fontWeight: '700',
    fontSize: 13,
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
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  logoSection: {
    marginBottom: Spacing.md,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoPreview: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.md,
  },
  logoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  logoPlaceholderText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  logoButtons: {
    flexDirection: 'column',
  },
  pickLogoBtn: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 4,
  },
  pickLogoBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  removeLogoBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  removeLogoBtnText: {
    fontSize: 11,
    color: Colors.danger,
    fontWeight: '600',
  },
  langRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceAlt,
    marginRight: Spacing.sm,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  langPillActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  langPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  langPillTextActive: {
    color: Colors.textLight,
    fontWeight: '700',
  },
  currencyPillRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  curPill: {
    width: 44,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceAlt,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  curPillActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  curPillText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  curPillTextActive: {
    color: Colors.textLight,
  },
  saveContainer: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  backupCard: {
    borderColor: '#BFDBFE',
    borderWidth: 1.5,
    backgroundColor: '#F8FAFC',
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  backupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.accent,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  backupActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dangerCard: {
    borderColor: '#FECACA',
    borderWidth: 1.5,
    backgroundColor: '#FFF5F5',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  dangerTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: Colors.danger,
  },
  dangerSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginBottom: Spacing.md,
  },
  resetButton: {
    borderColor: Colors.danger,
    backgroundColor: '#FFFFFF',
  },
});

export default SettingsScreen;
