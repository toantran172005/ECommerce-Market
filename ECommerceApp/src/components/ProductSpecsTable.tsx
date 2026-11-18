import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../types';
import { colors, radius, spacing } from '../constants/theme';

interface ProductSpecsTableProps {
  product: Product;
}

export function ProductSpecsTable({ product }: ProductSpecsTableProps) {
  const isOutOfStock = (product.stock ?? 0) <= 0;

  const categoryPath = product.categoryPath && product.categoryPath.length > 0
    ? product.categoryPath
    : ['Trang chủ', product.category || 'Công nghệ', product.name.split(' ')[0]];

  const detailRows: { label: string; value: string }[] = [];

  detailRows.push({
    label: 'Danh mục',
    value: categoryPath.join('  >  '),
  });

  if (product.brandName) {
    detailRows.push({
      label: 'Thương hiệu',
      value: product.brandName,
    });
  }

  detailRows.push({
    label: 'Kho hàng',
    value: isOutOfStock ? 'HẾT HÀNG' : `CÒN HÀNG (${product.stock ?? 0} sản phẩm)`,
  });

  if (product.promotionQuantity) {
    detailRows.push({
      label: 'Số lượng khuyến mãi',
      value: `${product.promotionQuantity} suất ưu đãi`,
    });
  }

  if (product.details && product.details.length > 0) {
    product.details.forEach((d) => {
      if (d.label && d.value) {
        detailRows.push(d);
      }
    });
  } else if (product.specs) {
    Object.entries(product.specs).forEach(([k, v]) => {
      detailRows.push({ label: k, value: String(v) });
    });
  }

  detailRows.push({
    label: 'Gửi từ',
    value: product.origin || 'Kho tổng E-Commerce, TP. Hà Nội',
  });

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.iconBadge}>
          <Ionicons name="list" size={16} color={colors.primary} />
        </View>
        <Text style={styles.headerTitle}>CHI TIẾT SẢN PHẨM</Text>
      </View>

      <View style={styles.table}>
        {detailRows.map((row, idx) => {
          const isStockRow = row.label === 'Kho hàng';
          const isCategoryRow = row.label === 'Danh mục';

          return (
            <View
              key={`${row.label}-${idx}`}
              style={[
                styles.row,
                idx === detailRows.length - 1 && styles.rowLast,
                idx % 2 === 1 && styles.rowAlternate,
              ]}
            >
              <Text style={styles.cellLabel}>{row.label}</Text>
              <View style={styles.cellValueWrap}>
                <Text
                  style={[
                    styles.cellValue,
                    isStockRow && (isOutOfStock ? styles.outOfStockText : styles.inStockText),
                    isCategoryRow && styles.categoryPathText,
                  ]}
                  numberOfLines={isCategoryRow ? 2 : 3}
                >
                  {row.value}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(238, 77, 45, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: colors.dark,
    letterSpacing: 0.2,
  },
  table: {
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  rowAlternate: {
    backgroundColor: '#FAFAFA',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  cellLabel: {
    width: 130,
    fontSize: 12.5,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  cellValueWrap: {
    flex: 1,
  },
  cellValue: {
    fontSize: 13,
    color: colors.dark,
    fontWeight: '600',
    lineHeight: 18,
  },
  inStockText: {
    color: colors.success,
    fontWeight: '700',
  },
  outOfStockText: {
    color: colors.danger,
    fontWeight: '700',
  },
  categoryPathText: {
    color: colors.primary,
    fontSize: 12,
  },
});
