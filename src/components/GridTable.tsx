import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Spacing, BorderRadius, Shadows } from '../theme';
import { FONT_SCALE_LIMITS } from '../theme/typography';
import { Button } from './Button';

export type DBField =
  | 'medicine_name'
  | 'brand_name'
  | 'exp_date'
  | 'price'
  | 'quantity'
  | 'item_no'
  | 'ignore';

export const FIELD_OPTIONS: Array<{ key: DBField; label: string }> = [
  { key: 'medicine_name', label: 'Medicine Name *' },
  { key: 'brand_name', label: 'Brand Name' },
  { key: 'exp_date', label: 'Exp Date' },
  { key: 'price', label: 'Price *' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'item_no', label: 'Item No' },
  { key: 'ignore', label: '— Ignore —' },
];

interface GridTableProps {
  headers: string[];
  rows: string[][];
  columnMapping: Record<number, DBField>;
  onMappingChange: (columnIndex: number, field: DBField) => void;
  onCellChange: (rowIndex: number, colIndex: number, value: string) => void;
  onDeleteRow: (rowIndex: number) => void;
  onAddRow: () => void;
}

export const GridTable: React.FC<GridTableProps> = ({
  headers,
  rows,
  columnMapping,
  onMappingChange,
  onCellChange,
  onDeleteRow,
  onAddRow,
}) => {
  const [editingCell, setEditingCell] = useState<{ row: number; col: number; text: string } | null>(null);
  const [mappingModalCol, setMappingModalCol] = useState<number | null>(null);

  const numCols = Math.max(headers.length, ...rows.map((r) => r.length), 3);

  const getFieldLabel = (field: DBField) => {
    return FIELD_OPTIONS.find((f) => f.key === field)?.label || 'Map Field';
  };

  return (
    <View style={styles.container}>
      <View style={styles.topInfoBar}>
        <Text
          allowFontScaling={true}
          maxFontSizeMultiplier={FONT_SCALE_LIMITS.caption}
          style={styles.infoText}
        >
          Total Rows: <Text style={{ fontWeight: '700' }}>{rows.length}</Text> • Columns:{' '}
          <Text style={{ fontWeight: '700' }}>{numCols}</Text>
        </Text>
        <TouchableOpacity style={styles.addRowBtn} onPress={onAddRow}>
          <Text
            allowFontScaling={true}
            maxFontSizeMultiplier={FONT_SCALE_LIMITS.button}
            style={styles.addRowBtnText}
          >
            + Add Row
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.horizontalScroll}>
        <View>
          {/* Mapping selector header */}
          <View style={[styles.row, styles.mappingHeaderRow]}>
            <View style={[styles.cell, styles.indexCell]}>
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={FONT_SCALE_LIMITS.table}
                style={styles.mappingLabelTitle}
              >
                Field:
              </Text>
            </View>
            {Array.from({ length: numCols }, (_, cIdx) => {
              const currentField = columnMapping[cIdx] || 'ignore';
              const isMapped = currentField !== 'ignore';
              return (
                <TouchableOpacity
                  key={`map-${cIdx}`}
                  style={[
                    styles.cell,
                    styles.mappingCell,
                    isMapped && styles.mappingCellActive,
                  ]}
                  onPress={() => setMappingModalCol(cIdx)}
                >
                  <Text
                    allowFontScaling={true}
                    maxFontSizeMultiplier={FONT_SCALE_LIMITS.table}
                    style={[
                      styles.mappingCellText,
                      isMapped && styles.mappingCellTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {getFieldLabel(currentField)}
                  </Text>
                  <Text
                    allowFontScaling={true}
                    maxFontSizeMultiplier={FONT_SCALE_LIMITS.badge}
                    style={styles.dropdownArrow}
                  >
                    ▼
                  </Text>
                </TouchableOpacity>
              );
            })}
            <View style={[styles.cell, styles.actionCell]} />
          </View>

          {/* Original raw headers */}
          <View style={[styles.row, styles.headerRow]}>
            <View style={[styles.cell, styles.indexCell]}>
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={FONT_SCALE_LIMITS.table}
                style={styles.headerText}
              >
                #
              </Text>
            </View>
            {Array.from({ length: numCols }, (_, cIdx) => (
              <View key={`hdr-${cIdx}`} style={[styles.cell, styles.headerCell]}>
                <Text
                  allowFontScaling={true}
                  maxFontSizeMultiplier={FONT_SCALE_LIMITS.table}
                  style={styles.headerText}
                  numberOfLines={1}
                >
                  {headers[cIdx] || `Col ${cIdx + 1}`}
                </Text>
              </View>
            ))}
            <View style={[styles.cell, styles.actionCell]}>
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={FONT_SCALE_LIMITS.table}
                style={styles.headerText}
              >
                Del
              </Text>
            </View>
          </View>

          {/* Table Data Rows */}
          <ScrollView style={styles.verticalScroll} nestedScrollEnabled>
            {rows.map((row, rIdx) => (
              <View
                key={`row-${rIdx}`}
                style={[
                  styles.row,
                  rIdx % 2 === 1 ? styles.altRow : null,
                ]}
              >
                {/* Row Index */}
                <View style={[styles.cell, styles.indexCell]}>
                  <Text
                    allowFontScaling={true}
                    maxFontSizeMultiplier={FONT_SCALE_LIMITS.table}
                    style={styles.indexText}
                  >
                    {rIdx + 1}
                  </Text>
                </View>

                {/* Data Cells */}
                {Array.from({ length: numCols }, (_, cIdx) => {
                  const val = row[cIdx] ?? '';
                  return (
                    <TouchableOpacity
                      key={`cell-${rIdx}-${cIdx}`}
                      style={styles.cell}
                      activeOpacity={0.7}
                      onPress={() => setEditingCell({ row: rIdx, col: cIdx, text: val })}
                    >
                      <Text
                        allowFontScaling={true}
                        maxFontSizeMultiplier={FONT_SCALE_LIMITS.table}
                        style={styles.cellText}
                        numberOfLines={1}
                      >
                        {val || <Text style={styles.emptyCell}>—</Text>}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {/* Row delete button */}
                <TouchableOpacity
                  style={[styles.cell, styles.actionCell]}
                  onPress={() => onDeleteRow(rIdx)}
                >
                  <Text
                    allowFontScaling={true}
                    maxFontSizeMultiplier={FONT_SCALE_LIMITS.table}
                    style={styles.deleteRowText}
                  >
                    ✕
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Modal for editing a specific cell */}
      {editingCell ? (
        <Modal transparent animationType="fade" visible={true} onRequestClose={() => setEditingCell(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.editModalContent}>
              <Text style={styles.modalTitle}>
                Edit Row {editingCell.row + 1}, Column {editingCell.col + 1}
              </Text>
              <TextInput
                value={editingCell.text}
                onChangeText={(t) => setEditingCell({ ...editingCell, text: t })}
                style={styles.modalInput}
                autoFocus
                placeholder="Enter value"
                placeholderTextColor={Colors.textPlaceholder}
              />
              <View style={styles.modalButtons}>
                <Button
                  title="Cancel"
                  variant="outline"
                  size="sm"
                  onPress={() => setEditingCell(null)}
                  style={{ flex: 1, marginRight: Spacing.sm }}
                />
                <Button
                  title="Apply"
                  variant="primary"
                  size="sm"
                  onPress={() => {
                    onCellChange(editingCell.row, editingCell.col, editingCell.text);
                    setEditingCell(null);
                  }}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      {/* Modal for column mapping picker */}
      {mappingModalCol !== null ? (
        <Modal transparent animationType="fade" visible={true} onRequestClose={() => setMappingModalCol(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.editModalContent}>
              <Text style={styles.modalTitle}>
                Map Column {mappingModalCol + 1} ({headers[mappingModalCol] || `Col ${mappingModalCol + 1}`})
              </Text>
              <Text style={styles.modalSubtitle}>Select target mobile field:</Text>

              {FIELD_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.mappingOptionItem,
                    columnMapping[mappingModalCol] === opt.key && styles.mappingOptionSelected,
                  ]}
                  onPress={() => {
                    onMappingChange(mappingModalCol, opt.key);
                    setMappingModalCol(null);
                  }}
                >
                  <Text
                    style={[
                      styles.mappingOptionText,
                      columnMapping[mappingModalCol] === opt.key && styles.mappingOptionTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {columnMapping[mappingModalCol] === opt.key ? <Text style={styles.checkmark}>✓</Text> : null}
                </TouchableOpacity>
              ))}

              <Button
                title="Cancel"
                variant="outline"
                size="sm"
                onPress={() => setMappingModalCol(null)}
                style={{ marginTop: Spacing.md }}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  topInfoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: Colors.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  addRowBtn: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
  },
  addRowBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  horizontalScroll: {
    maxHeight: 340,
  },
  verticalScroll: {
    maxHeight: 250,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  altRow: {
    backgroundColor: '#FAFCFF',
  },
  cell: {
    width: 130,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    justifyContent: 'center',
  },
  indexCell: {
    width: 45,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceAlt,
  },
  actionCell: {
    width: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mappingHeaderRow: {
    backgroundColor: Colors.accentLight,
  },
  mappingLabelTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.accent,
  },
  mappingCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
  },
  mappingCellActive: {
    backgroundColor: '#E0E7FF',
    borderColor: Colors.accent,
  },
  mappingCellText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    flex: 1,
  },
  mappingCellTextActive: {
    color: Colors.accent,
    fontWeight: '700',
  },
  dropdownArrow: {
    fontSize: 9,
    color: Colors.accent,
    marginLeft: 4,
  },
  headerRow: {
    backgroundColor: '#343A40',
  },
  headerCell: {
    backgroundColor: '#343A40',
  },
  headerText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textLight,
  },
  indexText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  cellText: {
    fontSize: 12,
    color: Colors.textPrimary,
  },
  emptyCell: {
    color: Colors.textPlaceholder,
  },
  deleteRowText: {
    color: Colors.danger,
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 21, 64, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  editModalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.modal,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.accent,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
  },
  mappingOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    marginBottom: 6,
    backgroundColor: Colors.surfaceAlt,
  },
  mappingOptionSelected: {
    backgroundColor: Colors.accentLight,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  mappingOptionText: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  mappingOptionTextSelected: {
    color: Colors.accent,
    fontWeight: '700',
  },
  checkmark: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '700',
  },
});

export default GridTable;
