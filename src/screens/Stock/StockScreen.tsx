import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { FolderUp, Package, Search, Plus, Pencil, Trash2 } from 'lucide-react-native';
import { Colors } from '../../theme/colors';
import { Spacing, BorderRadius, Shadows } from '../../theme';
import { AppHeader } from '../../components/AppHeader';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useStockStore } from '../../store/useStockStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useTranslation } from 'react-i18next';
import {
  addStockItem,
  updateStockItem,
  upsertStockItems,
  StockItem,
} from '../../db/stockQueries';
import { parseExcelStockFile, saveBackupImportFile } from '../../utils/excelParser';
import { formatCurrency } from '../../utils/formatters';

const ALPHABET = ['ALL', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

export const StockScreen: React.FC = () => {
  const { t } = useTranslation();
  const {
    stockList,
    isLoading,
    searchQuery,
    selectedLetter,
    loadStock,
    setSearchQuery,
    setSelectedLetter,
    deleteStock,
  } = useStockStore();
  const { settings } = useSettingsStore();
  const currency = settings.currency_symbol || '₹';

  const [isImporting, setIsImporting] = useState(false);
  const [importStatusText, setImportStatusText] = useState('');
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);

  // Manual Add / Edit modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);

  const [formProductId, setFormProductId] = useState('');
  const [formBatchNumber, setFormBatchNumber] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formManufacturer, setFormManufacturer] = useState('');
  const [formPackUnit, setFormPackUnit] = useState('');
  const [formPackagingRaw, setFormPackagingRaw] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formQty, setFormQty] = useState('');

  useEffect(() => {
    loadStock();
  }, [loadStock]);

  const handleImportExcel = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
          'text/comma-separated-values',
          'application/json',
          'text/json',
          '*/*',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || !result.assets[0]) {
        return;
      }

      const file = result.assets[0];
      setIsImporting(true);
      setImportStatusText('Reading and parsing file...');

      // 1. Copy backup file to sandbox: FileSystem.documentDirectory + 'stock/imports/'
      let backupPath = '';
      try {
        backupPath = await saveBackupImportFile(file.uri, file.name);
      } catch (backupErr) {
        console.warn('Backup file copy error:', backupErr);
      }

      // 2. Parse 6 columns from Excel / CSV / JSON (optimized for 450,000+ rows)
      const rows = await parseExcelStockFile(file.uri, file.name);

      if (rows.length === 0) {
        Alert.alert('Empty File', 'No valid product rows were found in the selected file.');
        setIsImporting(false);
        setImportStatusText('');
        return;
      }

      setImportStatusText(`Saving 0 / ${rows.length.toLocaleString()} rows...`);

      // 3. Upsert into database in high-speed batches
      const count = await upsertStockItems(rows, (inserted, total) => {
        const pct = Math.round((inserted / total) * 100);
        setImportStatusText(`Saving ${inserted.toLocaleString()} / ${total.toLocaleString()} rows (${pct}%)...`);
      });

      await loadStock();
      setIsImporting(false);
      setImportStatusText('');

      Alert.alert(
        'Import Successful',
        `Successfully imported and updated ${count.toLocaleString()} product(s) into inventory!\n\nBackup saved to:\n${backupPath ? backupPath.split('/').pop() : 'stock/imports/'}`
      );
    } catch (err: any) {
      setIsImporting(false);
      setImportStatusText('');
      Alert.alert('Import Failed', err.message || 'Failed to parse and import file');
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormProductId('');
    setFormBatchNumber('');
    setFormBrand('');
    setFormManufacturer('');
    setFormPackUnit('');
    setFormPackagingRaw('');
    setFormPrice('');
    setFormQty('');
    setModalVisible(true);
  };

  const openEditModal = (item: StockItem) => {
    setEditingItem(item);
    setFormProductId(item.product_id || '');
    setFormBatchNumber(item.batch_number || '');
    setFormBrand(item.brand_name || item.medicine_name || '');
    setFormManufacturer(item.manufacturer || '');
    setFormPackUnit(item.pack_unit || '');
    setFormPackagingRaw(item.packaging_raw || '');
    setFormPrice(String(item.price || ''));
    setFormQty(String(item.quantity || ''));
    setModalVisible(true);
  };

  const handleSaveItem = async () => {
    if (!formBrand.trim()) {
      Alert.alert('Validation Error', 'Brand / Product Name is required.');
      return;
    }

    try {
      if (editingItem && editingItem.id) {
        await updateStockItem(editingItem.id, {
          product_id: formProductId.trim() || undefined,
          batch_number: formBatchNumber.trim() || undefined,
          brand_name: formBrand.trim(),
          medicine_name: formBrand.trim(),
          manufacturer: formManufacturer.trim() || undefined,
          pack_unit: formPackUnit.trim() || undefined,
          packaging_raw: formPackagingRaw.trim() || undefined,
          price: parseFloat(formPrice) || 0,
          quantity: parseInt(formQty, 10) || 0,
        });
      } else {
        await addStockItem({
          product_id: formProductId.trim() || undefined,
          batch_number: formBatchNumber.trim() || undefined,
          brand_name: formBrand.trim(),
          medicine_name: formBrand.trim(),
          manufacturer: formManufacturer.trim() || undefined,
          pack_unit: formPackUnit.trim() || undefined,
          packaging_raw: formPackagingRaw.trim() || undefined,
          price: parseFloat(formPrice) || 0,
          quantity: parseInt(formQty, 10) || 0,
        });
      }
      setModalVisible(false);
      loadStock();
    } catch (err: any) {
      Alert.alert('Save Error', err.message || 'Failed to save stock item');
    }
  };

  const handleDeleteItem = (item: StockItem) => {
    const displayName = item.brand_name || item.medicine_name || 'Item';
    Alert.alert(
      'Delete Product',
      `Are you sure you want to remove "${displayName}" from inventory?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (item.id) {
              await deleteStock(item.id);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title={t('stock.title', 'Stock & Inventory')}
        subtitle={t('stock.subtitle', 'Manage pharmacy medicine catalog and batches')}
      />

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* Quick Action Button for Excel Import */}
        <Card padding="md" style={styles.actionsCard}>
          <View style={styles.actionHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionCardTitle}>{t('stock.csvTitle', 'Stock Ingestion')}</Text>
              <Text style={styles.actionCardSubtitle}>
                {t('stock.ocrSubtitle', 'Import products from .xlsx, .xls, .csv, or .json files')}
              </Text>
            </View>
          </View>
          <Button
            title={isImporting ? (importStatusText || t('common.loading', 'Loading...')) : t('stock.importCsv', 'Import Excel / CSV / JSON')}
            variant="primary" // Accent Blue #091540
            size="md"
            icon={<FolderUp size={16} color={Colors.textLight} />}
            loading={isImporting}
            disabled={isImporting}
            onPress={() => setIsImportModalVisible(true)}
            style={{ width: '100%', marginTop: Spacing.xs }}
          />
          {isImporting && importStatusText ? (
            <Text
              style={{
                marginTop: 8,
                fontSize: 12,
                color: Colors.accent,
                fontWeight: '600',
                textAlign: 'center',
              }}
            >
              {importStatusText}
            </Text>
          ) : null}
        </Card>

        {/* Search & Add Manual Bar */}
        <View style={styles.searchBarRow}>
          <View style={{ flex: 1, marginRight: Spacing.sm }}>
            <Input
              placeholder={t('stock.searchPlaceholder', 'Search product, brand, or manufacturer...')}
              value={searchQuery}
              onChangeText={setSearchQuery}
              leftIcon={<Search size={16} color={Colors.textSecondary} />}
              containerStyle={{ marginBottom: 0 }}
            />
          </View>
          <Button
            title={t('stock.addManual', 'Add Medicine')}
            variant="outline"
            size="md"
            icon={<Plus size={14} color={Colors.accent} />}
            onPress={openAddModal}
          />
        </View>

        {/* A–Z Alphabetical Jump Index Strip */}
        <View style={styles.alphabetContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.alphabetScroll}
          >
            {ALPHABET.map((char) => {
              const isActive = (char === 'ALL' && !selectedLetter) || selectedLetter === char;
              return (
                <TouchableOpacity
                  key={char}
                  style={[styles.letterChip, isActive && styles.letterChipActive]}
                  onPress={() => setSelectedLetter(char)}
                >
                  <Text style={[styles.letterChipText, isActive && styles.letterChipTextActive]}>
                    {char}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Inventory Items List */}
        <View style={styles.listHeader}>
          <Text style={styles.listCount}>
            Inventory ({stockList.length} items)
            {selectedLetter ? ` • Letter: ${selectedLetter}` : ''}
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.accent} />
          </View>
        ) : stockList.length === 0 ? (
          <Card padding="lg" style={styles.emptyCard}>
            <Package size={38} color={Colors.accent} strokeWidth={1.8} />
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptySubtitle}>
              Tap "Import Excel" to import your product spreadsheet, or tap "+ Add Product" to add items manually.
            </Text>
          </Card>
        ) : (
          stockList.map((item) => (
            <Card key={item.id || item.product_id} padding="md" style={styles.itemCard}>
              <View style={styles.itemRow}>
                <View style={{ flex: 1, paddingRight: Spacing.sm }}>
                  <Text style={styles.itemName}>
                    {item.brand_name || item.medicine_name}
                  </Text>
                  {item.manufacturer ? (
                    <Text style={styles.itemManufacturer}>{item.manufacturer}</Text>
                  ) : null}

                  <View style={styles.tagRow}>
                    {item.product_id ? (
                      <View style={styles.idBadge}>
                        <Text style={styles.idBadgeText}>ID: {item.product_id}</Text>
                      </View>
                    ) : null}
                    {item.batch_number ? (
                      <View style={styles.batchBadge}>
                        <Text style={styles.batchBadgeText}>Batch: {item.batch_number}</Text>
                      </View>
                    ) : null}
                    {item.pack_unit ? (
                      <View style={styles.metaBadge}>
                        <Text style={styles.metaBadgeText}>Pack: {item.pack_unit}</Text>
                      </View>
                    ) : null}
                    {item.packaging_raw ? (
                      <View style={styles.metaBadge}>
                        <Text style={styles.metaBadgeText}>{item.packaging_raw}</Text>
                      </View>
                    ) : null}
                    {item.quantity > 0 ? (
                      <View style={styles.qtyBadge}>
                        <Text style={styles.qtyBadgeText}>Stock: {item.quantity}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <View style={styles.itemRight}>
                  {item.price > 0 ? (
                    <Text style={styles.itemPrice}>
                      {formatCurrency(item.price, currency)}
                    </Text>
                  ) : null}
                  <View style={styles.itemButtonsRow}>
                    <TouchableOpacity
                      onPress={() => openEditModal(item)}
                      style={styles.editBtn}
                    >
                      <Pencil size={11} color={Colors.textPrimary} style={{ marginRight: 3 }} />
                      <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteItem(item)}
                      style={styles.deleteBtn}
                    >
                      <Trash2 size={12} color={Colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Card>
          ))
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      {/* Modal for Manual Add / Edit */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingItem ? 'Edit Product' : 'Add New Product'}
            </Text>

            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1, marginRight: Spacing.xs }}>
                <Input
                  label="Product ID"
                  placeholder="e.g. PRD-1001"
                  value={formProductId}
                  onChangeText={setFormProductId}
                />
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.xs }}>
                <Input
                  label="Batch Number"
                  placeholder="e.g. B-902"
                  value={formBatchNumber}
                  autoCapitalize="characters"
                  onChangeText={setFormBatchNumber}
                />
              </View>
            </View>

            <Input
              label="Brand / Product Name *"
              placeholder="e.g. Dolo 650"
              value={formBrand}
              onChangeText={setFormBrand}
            />

            <Input
              label="Manufacturer"
              placeholder="e.g. Micro Labs Ltd."
              value={formManufacturer}
              onChangeText={setFormManufacturer}
            />

            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1, marginRight: Spacing.xs }}>
                <Input
                  label="Pack Unit"
                  placeholder="e.g. 15 tablets"
                  value={formPackUnit}
                  onChangeText={setFormPackUnit}
                />
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.xs }}>
                <Input
                  label="Packaging"
                  placeholder="e.g. Strip / Bottle"
                  value={formPackagingRaw}
                  onChangeText={setFormPackagingRaw}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1, marginRight: Spacing.xs }}>
                <Input
                  label={`Price (${currency})`}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  value={formPrice}
                  onChangeText={(val) => {
                    const cleaned = val.replace(/[^0-9.]/g, '');
                    const parts = cleaned.split('.');
                    const sanitized = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
                    setFormPrice(sanitized);
                  }}
                />
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.xs }}>
                <Input
                  label="Quantity"
                  placeholder="0"
                  keyboardType="numeric"
                  value={formQty}
                  onChangeText={setFormQty}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                size="md"
                onPress={() => setModalVisible(false)}
                style={{ flex: 1, marginRight: Spacing.sm }}
              />
              <Button
                title={editingItem ? 'Update Product' : 'Save to Stock'}
                variant="primary" // Accent Blue #091540
                size="md"
                onPress={handleSaveItem}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal for Import Column Order Instructions */}
      <Modal
        visible={isImportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsImportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {t('stock.importInstructionsTitle', 'Import Excel / JSON')}
            </Text>
            <Text style={styles.actionCardSubtitle}>
              {t('stock.importInstructionsSubtitle', 'Please ensure your file columns follow this required order:')}
            </Text>

            <View style={styles.columnOrderContainer}>
              <Text style={styles.columnOrderText} selectable>
                {t('stock.importColumnOrder', 'product_id  brand_name  manufacturer  pack_unit  packaging_raw')}
              </Text>
            </View>

            <View style={styles.modalActions}>
              <Button
                title={t('common.cancel', 'Cancel')}
                variant="outline"
                size="md"
                onPress={() => setIsImportModalVisible(false)}
                style={{ flex: 1, marginRight: Spacing.sm }}
              />
              <Button
                title={t('stock.continueImport', 'Choose File')}
                variant="primary" // Accent Blue #091540
                size="md"
                onPress={() => {
                  setIsImportModalVisible(false);
                  handleImportExcel();
                }}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  actionsCard: {
    marginBottom: Spacing.md,
  },
  actionHeaderRow: {
    marginBottom: Spacing.xs,
  },
  actionCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.accent,
    marginBottom: 2,
  },
  actionCardSubtitle: {
    fontSize: 11.5,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginBottom: Spacing.xs,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  listHeader: {
    marginBottom: Spacing.xs,
  },
  listCount: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.accent,
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    lineHeight: 18,
  },
  itemCard: {
    marginBottom: Spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  itemManufacturer: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 4,
  },
  idBadge: {
    backgroundColor: Colors.accentLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  idBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: Colors.accent,
  },
  metaBadge: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metaBadgeText: {
    fontSize: 10.5,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  qtyBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  qtyBadgeText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#059669',
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.accent,
    marginBottom: 6,
  },
  itemButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  deleteBtn: {
    width: 26,
    height: 26,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
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
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.accent,
    marginBottom: Spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: Spacing.md,
  },
  alphabetContainer: {
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  alphabetScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  letterChip: {
    width: 32,
    height: 30,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
    backgroundColor: Colors.surfaceAlt,
  },
  letterChipActive: {
    backgroundColor: Colors.accent,
  },
  letterChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  letterChipTextActive: {
    color: Colors.textLight,
  },
  batchBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: '#D8B4FE',
  },
  batchBadgeText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#7E22CE',
  },
  columnOrderContainer: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginVertical: Spacing.sm,
  },
  columnOrderText: {
    fontFamily: 'monospace',
    fontSize: 12.5,
    color: Colors.accent,
    fontWeight: '600',
    lineHeight: 18,
  },
});

export default StockScreen;
