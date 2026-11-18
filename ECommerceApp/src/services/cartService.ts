import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { CartItem } from '../types';
import { logger } from '../utils/logger';
import { mapFirebaseError } from './http';

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  const result: any = Array.isArray(obj) ? [] : {};
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    if (value !== undefined) {
      if (Array.isArray(value)) {
        result[key] = value.map((item) =>
          typeof item === 'object' && item !== null ? stripUndefined(item) : item
        );
      } else if (typeof value === 'object' && value !== null) {
        result[key] = stripUndefined(value);
      } else {
        result[key] = value;
      }
    }
  });
  return result;
}

export const CartService = {
  async listCartItems(uid: string): Promise<CartItem[]> {
    if (!uid) return [];
    try {
      const snap = await getDocs(collection(db, 'users', uid, 'cart'));
      if (snap.empty) return [];
      return snap.docs.map((d) => {
        const data = d.data() as CartItem;
        return {
          ...data,
          id: d.id,
          selected: data.selected !== false,
        };
      });
    } catch (err: unknown) {
      logger.warn('[CartService] listCartItems error:', err);
      return [];
    }
  },

  async saveCartItem(uid: string, item: CartItem): Promise<void> {
    if (!uid || !item?.id) return;
    try {
      const itemRef = doc(db, 'users', uid, 'cart', item.id);
      await setDoc(itemRef, stripUndefined({
        ...item,
        updatedAt: new Date().toISOString(),
      }), { merge: true });
    } catch (err: unknown) {
      throw mapFirebaseError(err, 'Không thể cập nhật sản phẩm trong giỏ hàng.');
    }
  },

  async syncCart(uid: string, items: CartItem[]): Promise<void> {
    if (!uid) return;
    try {
      const snap = await getDocs(collection(db, 'users', uid, 'cart'));
      const batch = writeBatch(db);
      const newIds = new Set(items.map((i) => i.id));
      snap.docs.forEach((d) => {
        if (!newIds.has(d.id)) {
          batch.delete(d.ref);
        }
      });
      items.forEach((item) => {
        const itemRef = doc(collection(db, 'users', uid, 'cart'), item.id);
        batch.set(itemRef, stripUndefined(item), { merge: true });
      });
      await batch.commit();
    } catch (err: unknown) {
      logger.warn('[CartService] syncCart error:', err);
    }
  },

  async removeCartItem(uid: string, itemId: string): Promise<void> {
    if (!uid || !itemId) return;
    try {
      const itemRef = doc(db, 'users', uid, 'cart', itemId);
      await deleteDoc(itemRef);
    } catch (err: unknown) {
      throw mapFirebaseError(err, 'Không thể xoá sản phẩm khỏi giỏ hàng.');
    }
  },

  async clearCart(uid: string): Promise<void> {
    if (!uid) return;
    try {
      const snap = await getDocs(collection(db, 'users', uid, 'cart'));
      if (snap.empty) return;
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    } catch (err: unknown) {
      logger.warn('[CartService] clearCart error:', err);
    }
  },
};
