import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Voucher } from '../types';
import { apiError, mapFirebaseError } from './http';
import { computeVoucherDiscount } from '../utils/pricing';

export const VoucherService = {
  async listVouchers(): Promise<Voucher[]> {
    try {
      const snap = await getDocs(collection(db, 'promos'));
      return snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Voucher, 'id'>) }))
        .filter((v) => v.isActive !== false);
    } catch (err: unknown) {
      throw mapFirebaseError(err, 'Không thể tải danh sách mã giảm giá từ Firestore.');
    }
  },

  async validateVoucher(
    code: string,
    subtotal: number,
    shippingFee = 0,
    cartCategoryIds?: string[],
  ): Promise<{ voucher: Voucher; discount: number }> {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      apiError('VOUCHER_INVALID', 'Vui lòng nhập mã giảm giá.');
    }

    let voucher: Voucher | null = null;

    try {
      const snap = await getDoc(doc(db, 'promos', normalized));
      if (snap.exists()) {
        voucher = { id: snap.id, ...(snap.data() as Omit<Voucher, 'id'>) };
      }
    } catch (err: unknown) {
      throw mapFirebaseError(err, 'Không thể xác thực mã giảm giá.');
    }

    if (!voucher) {
      apiError('VOUCHER_NOT_FOUND', `Mã giảm giá "${normalized}" không hợp lệ hoặc không tồn tại.`);
    }

    if (voucher.isActive === false) {
      apiError('VOUCHER_EXPIRED', `Mã giảm giá "${normalized}" đã hết hạn sử dụng.`);
    }

    if (voucher.expiresAt) {
      const expiry = new Date(voucher.expiresAt).getTime();
      if (!isNaN(expiry) && expiry < Date.now()) {
        apiError('VOUCHER_EXPIRED', `Mã giảm giá "${normalized}" đã hết hạn.`);
      }
    }

    if (voucher.usageLimit > 0 && voucher.usedCount >= voucher.usageLimit) {
      apiError('VOUCHER_OUT_OF_USAGE', `Mã giảm giá "${normalized}" đã được sử dụng hết lượt.`);
    }

    const minOrder = voucher.minOrderValue ?? 100000;
    if (subtotal < minOrder) {
      apiError(
        'VOUCHER_MIN_ORDER_NOT_MET',
        `Mã giảm giá không hợp lệ hoặc không đủ điều kiện áp dụng (Giá trị đơn hàng tối thiểu là ${minOrder.toLocaleString('vi-VN')}đ).`,
      );
    }

    if (voucher.applicableCategories && voucher.applicableCategories.length > 0) {
      if (cartCategoryIds && cartCategoryIds.length > 0) {
        const matched = cartCategoryIds.some((catId) =>
          voucher!.applicableCategories!.includes(catId),
        );
        if (!matched) {
          apiError(
            'VOUCHER_CATEGORY_MISMATCH',
            'Mã giảm giá không hợp lệ hoặc không đủ điều kiện áp dụng cho danh mục sản phẩm trong giỏ hàng.',
          );
        }
      }
    }

    if (voucher && (voucher as any).discountPercent && !voucher.value) {
      voucher.type = 'percent';
      voucher.value = (voucher as any).discountPercent;
    }

    const discount = computeVoucherDiscount(voucher, subtotal, shippingFee);
    return { voucher, discount };
  },
};
