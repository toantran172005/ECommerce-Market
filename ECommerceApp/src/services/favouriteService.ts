import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  writeBatch,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Product } from '../types';
import { mapFirebaseError } from './http';
import { logger } from '../utils/logger';

export const FavouriteService = {
  async listFavourites(uid: string): Promise<Product[]> {
    if (!uid) return [];
    try {
      const snap = await getDocs(collection(db, 'users', uid, 'favourites'));
      if (!snap.empty) {
        return snap.docs.map((d) => {
          const data = d.data() as Product;
          return { ...data, id: d.id };
        });
      }

      const q = query(collection(db, 'user_favourites'), where('userId', '==', uid));
      const rootSnap = await getDocs(q);
      if (rootSnap.empty) return [];

      const productIds = rootSnap.docs.map((d) => d.data().productId as string);
      const productDocs = await Promise.all(
        productIds.map(async (pid) => {
          try {
            const { getDoc } = await import('firebase/firestore');
            const pSnap = await getDoc(doc(db, 'products', pid));
            return pSnap.exists() ? ({ ...pSnap.data(), id: pSnap.id } as Product) : null;
          } catch {
            return null;
          }
        })
      );
      return productDocs.filter((p): p is Product => p !== null);
    } catch (err: unknown) {
      logger.warn('[FavouriteService] listFavourites error:', err);
      return [];
    }
  },

  async addFavourite(uid: string, product: Product): Promise<void> {
    if (!uid || !product?.id) return;
    try {
      const now = new Date().toISOString();
      const batch = writeBatch(db);

      const rootFavRef = doc(db, 'user_favourites', `${uid}_${product.id}`);
      batch.set(rootFavRef, {
        userId: uid,
        productId: product.id,
        addedAt: now,
      });

      const subFavRef = doc(db, 'users', uid, 'favourites', product.id);
      batch.set(subFavRef, {
        ...product,
        addedAt: now,
      }, { merge: true });

      await batch.commit();
    } catch (err: unknown) {
      throw mapFirebaseError(err, 'Không thể thêm vào danh sách yêu thích.');
    }
  },

  async removeFavourite(uid: string, productId: string): Promise<void> {
    if (!uid || !productId) return;
    try {
      const batch = writeBatch(db);

      const rootFavRef = doc(db, 'user_favourites', `${uid}_${productId}`);
      batch.delete(rootFavRef);

      const subFavRef = doc(db, 'users', uid, 'favourites', productId);
      batch.delete(subFavRef);

      await batch.commit();
    } catch (err: unknown) {
      throw mapFirebaseError(err, 'Không thể xoá khỏi danh sách yêu thích.');
    }
  },

  async clearFavourites(uid: string): Promise<void> {
    if (!uid) return;
    try {
      const batch = writeBatch(db);

      const q = query(collection(db, 'user_favourites'), where('userId', '==', uid));
      const rootSnap = await getDocs(q);
      rootSnap.docs.forEach((d) => batch.delete(d.ref));

      const subSnap = await getDocs(collection(db, 'users', uid, 'favourites'));
      subSnap.docs.forEach((d) => batch.delete(d.ref));

      await batch.commit();
    } catch (err: unknown) {
      logger.warn('[FavouriteService] clearFavourites error:', err);
    }
  },
};
