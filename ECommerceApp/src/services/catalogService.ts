import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import {
  Brand,
  Category,
  Product,
  Review,
  ShippingMethod,
} from '../types';
import { apiError, mapFirebaseError } from './http';
import { logger } from '../utils/logger';

export interface Paged<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export type ProductSort = 'popular' | 'new' | 'priceAsc' | 'priceDesc' | 'rating';

export interface ProductQuery {
  q?: string;
  category?: string;
  categories?: string[];
  brands?: string[];
  minPrice?: number | null;
  maxPrice?: number | null;
  minRating?: number | null;
  sort?: ProductSort;
  page?: number;
  limit?: number;
}

const STANDARD_SHIPPING_METHODS: ShippingMethod[] = [
  {
    id: 'ship-standard',
    type: 'standard',
    name: 'Giao hàng tiêu chuẩn',
    description: 'Nhận hàng sau 3-5 ngày làm việc',
    estimatedDays: '3 - 5 ngày',
    fee: 30000,
    freeOver: 500000,
  },
  {
    id: 'ship-express',
    type: 'express',
    name: 'Giao hàng hỏa tốc',
    description: 'Nhận hàng trong 24 giờ',
    estimatedDays: '1 ngày',
    fee: 55000,
    freeOver: 1000000,
  },
  {
    id: 'ship-same-day',
    type: 'sameDay',
    name: 'Giao hàng siêu tốc 2h',
    description: 'Nhận hàng ngay trong 2 giờ',
    estimatedDays: '2 giờ',
    fee: 80000,
    freeOver: 2000000,
  },
];

function normalizeCategoryText(str?: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/^cat-/, '')
    .replace(/[&/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesProductCategory(product: Product, targetCategory: string): boolean {
  if (!targetCategory) return true;
  const targetNorm = normalizeCategoryText(targetCategory);
  if (!targetNorm) return true;

  const rawCat = (product.category ?? '');
  const rawCatId = ((product as any).categoryId ?? '');

  if (rawCat === targetCategory || rawCatId === targetCategory) return true;

  const pCatNorm = normalizeCategoryText(rawCat);
  const pCatIdNorm = normalizeCategoryText(rawCatId);

  if (pCatIdNorm === targetNorm || pCatNorm === targetNorm) return true;

  const targetStem = targetNorm.replace(/s$/, '');
  const pCatStem = pCatNorm.replace(/s$/, '');
  const pCatIdStem = pCatIdNorm.replace(/s$/, '');

  if (pCatIdStem === targetStem || pCatStem === targetStem) return true;
  if (pCatNorm.includes(targetStem) || targetNorm.includes(pCatStem)) return true;

  if (targetStem === 'laptop') {
    if (pCatNorm.includes('may tinh bang') || pCatIdNorm.includes('tablet')) return false;
    if (pCatNorm.includes('laptop') || pCatIdNorm.includes('laptop') || pCatNorm.includes('may tinh')) {
      return true;
    }
  }
  if (targetStem === 'phone' && (pCatNorm.includes('dien thoai') || pCatIdNorm.includes('phone'))) {
    return true;
  }
  if (targetStem === 'tablet' && (pCatNorm.includes('may tinh bang') || pCatIdNorm.includes('tablet'))) {
    return true;
  }
  if (targetStem === 'audio' && (pCatNorm.includes('am thanh') || pCatNorm.includes('tai nghe') || pCatIdNorm.includes('audio'))) {
    return true;
  }
  if (targetStem === 'watche' || targetStem === 'watch') {
    if (pCatNorm.includes('dong ho') || pCatIdNorm.includes('watch')) return true;
  }
  if (targetStem === 'accessorie' || targetStem === 'accessory') {
    if (pCatNorm.includes('phu kien') || pCatIdNorm.includes('accessories')) return true;
  }
  if (targetStem === 'gaming') {
    if (pCatNorm.includes('gaming') || pCatIdNorm.includes('gaming') || normalizeCategoryText(product.name).includes('gaming')) {
      return true;
    }
  }

  return false;
}

export const CORE_STORE_CATEGORIES: Category[] = [
  { id: 'phones', name: 'Điện thoại', icon: 'phone-portrait-outline' },
  { id: 'laptops', name: 'Laptop', icon: 'laptop-outline' },
  { id: 'tablets', name: 'Máy tính bảng', icon: 'tablet-portrait-outline' },
  { id: 'audio', name: 'Âm thanh', icon: 'headset-outline' },
  { id: 'watches', name: 'Đồng hồ', icon: 'watch-outline' },
  { id: 'accessories', name: 'Phụ kiện', icon: 'hardware-chip-outline' },
  { id: 'gaming', name: 'Gaming', icon: 'game-controller-outline' },
];

export const CatalogService = {
  async syncCoreCategories(): Promise<void> {
    try {
      const snap = await getDocs(collection(db, 'categories'));
      const coreIds = new Set(CORE_STORE_CATEGORIES.map((c) => c.id));
      for (const d of snap.docs) {
        if (!coreIds.has(d.id)) {
          await deleteDoc(doc(db, 'categories', d.id));
        }
      }
      for (const cat of CORE_STORE_CATEGORIES) {
        await setDoc(doc(db, 'categories', cat.id), {
          name: cat.name,
          icon: cat.icon,
        });
      }
    } catch (err: unknown) {
      logger.warn('Sync core categories failed:', err);
    }
  },

  async getCategories(): Promise<Category[]> {
    try {
      const snap = await getDocs(collection(db, 'categories'));
      if (snap.empty) {
        await this.syncCoreCategories();
        return CORE_STORE_CATEGORIES;
      }
      const allCats = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Category, 'id'>) }));
      const orderMap = new Map(CORE_STORE_CATEGORIES.map((c, idx) => [c.id, idx]));
      return allCats.sort((a, b) => {
        const orderA = orderMap.has(a.id) ? orderMap.get(a.id)! : 99;
        const orderB = orderMap.has(b.id) ? orderMap.get(b.id)! : 99;
        return orderA - orderB;
      });
    } catch (err: unknown) {
      throw mapFirebaseError(err, 'Không thể tải danh mục sản phẩm từ Firestore.');
    }
  },

  async getBrands(): Promise<Brand[]> {
    try {
      const snap = await getDocs(collection(db, 'brands'));
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Brand, 'id'>) }));
    } catch (err: unknown) {
      throw mapFirebaseError(err, 'Không thể tải thương hiệu từ Firestore.');
    }
  },

  async getShippingMethods(): Promise<ShippingMethod[]> {
    try {
      const snap = await getDocs(collection(db, 'shippingMethods'));
      if (!snap.empty) {
        return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ShippingMethod, 'id'>) }));
      }
      return STANDARD_SHIPPING_METHODS;
    } catch {
      return STANDARD_SHIPPING_METHODS;
    }
  },

  async getProducts(productQuery: ProductQuery = {}): Promise<Paged<Product>> {
    const page = productQuery.page ?? 1;
    const limitNum = productQuery.limit ?? 10;
    const q = (productQuery.q ?? '').trim().toLowerCase();

    let allProducts: Product[] = [];
    try {
      const snap = await getDocs(collection(db, 'products'));
      allProducts = snap.docs.map((d) => {
        const raw = d.data() as any;
        return {
          id: d.id,
          ...raw,
          imageUrl: raw.imageUrl || raw.image || raw.images?.[0] || '',
        };
      });
    } catch (err: unknown) {
      throw mapFirebaseError(err, 'Không thể tải sản phẩm từ Firestore.');
    }

    let filtered = allProducts.filter((p) => {
      if (q) {
        const haystack = `${p.name} ${p.brandName ?? ''} ${(p.tags ?? []).join(' ')}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (productQuery.category && !matchesProductCategory(p, productQuery.category)) {
        return false;
      }

      if (productQuery.categories && productQuery.categories.length > 0) {
        const matchCat = productQuery.categories.some((cat) => matchesProductCategory(p, cat));
        if (!matchCat) return false;
      }

      if (productQuery.brands && productQuery.brands.length > 0) {
        const matchBrand = productQuery.brands.includes(p.brandId ?? '') ||
          productQuery.brands.includes(p.brandName ?? '');
        if (!matchBrand) return false;
      }

      if (productQuery.minPrice != null && p.price < productQuery.minPrice) return false;
      if (productQuery.maxPrice != null && p.price > productQuery.maxPrice) return false;

      if (productQuery.minRating != null && (p.rating ?? 0) < productQuery.minRating) return false;

      return true;
    });

    switch (productQuery.sort ?? 'popular') {
      case 'priceAsc':
        filtered = [...filtered].sort((a, b) => a.price - b.price);
        break;
      case 'priceDesc':
        filtered = [...filtered].sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filtered = [...filtered].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
      case 'new':
        filtered = [...filtered].sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
        break;
      case 'popular':
      default:
        filtered = [...filtered].sort((a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0));
    }

    const total = filtered.length;
    const start = (page - 1) * limitNum;
    const pagedItems = filtered.slice(start, start + limitNum);

    return {
      items: pagedItems,
      page,
      limit: limitNum,
      total,
      hasMore: start + limitNum < total,
    };
  },

  async getProductById(id: string): Promise<Product> {
    try {
      const snap = await getDoc(doc(db, 'products', id));
      if (snap.exists()) {
        const raw = snap.data() as any;
        let rating = Number(raw.rating ?? 5.0);
        let reviewCount = Number(raw.reviewCount ?? 0);

        try {
          const rq = query(collection(db, 'reviews'), where('productId', '==', id));
          const rSnap = await getDocs(rq);
          if (!rSnap.empty) {
            let sum = 0;
            let count = 0;
            rSnap.forEach((rd) => {
              const rVal = Number((rd.data() as any)?.rating);
              if (Number.isFinite(rVal) && rVal >= 1 && rVal <= 5) {
                sum += rVal;
                count += 1;
              }
            });
            if (count > 0) {
              rating = Math.round((sum / count) * 10) / 10;
              reviewCount = count;
            }
          }
        } catch {}

        return {
          id: snap.id,
          ...raw,
          rating,
          reviewCount,
          imageUrl: raw.imageUrl || raw.image || raw.images?.[0] || '',
        };
      }
      apiError('PRODUCT_NOT_FOUND', `Không tìm thấy sản phẩm #${id}.`);
    } catch (err: unknown) {
      if ((err as any)?.code === 'PRODUCT_NOT_FOUND') throw err;
      throw mapFirebaseError(err, `Không tìm thấy sản phẩm #${id}.`);
    }
  },

  async getProductReviews(productId: string): Promise<Review[]> {
    try {
      const reviewsMap = new Map<string, Review>();

      try {
        const reviewsQuery = query(collection(db, 'reviews'), where('productId', '==', productId));
        const reviewsSnap = await getDocs(reviewsQuery);
        reviewsSnap.docs.forEach((d) => {
          const data = d.data() as any;
          reviewsMap.set(d.id, {
            id: d.id,
            productId,
            orderId: data.orderId,
            userId: data.userId || 'user_demo',
            userName: data.userName || 'Khách hàng',
            userAvatar: data.userAvatar,
            rating: Number(data.rating || 5),
            comment: data.comment || '',
            createdAt: typeof data.createdAt === 'number' ? new Date(data.createdAt).toISOString() : String(data.createdAt || new Date().toISOString()),
            images: Array.isArray(data.images) ? data.images : undefined,
          });
        });
      } catch {}

      try {
        const subSnap = await getDocs(collection(db, 'products', productId, 'reviews'));
        subSnap.docs.forEach((d) => {
          if (!reviewsMap.has(d.id)) {
            const data = d.data() as any;
            reviewsMap.set(d.id, {
              id: d.id,
              productId,
              userId: data.userId || 'user_demo',
              userName: data.userName || 'Khách hàng',
              userAvatar: data.userAvatar,
              rating: Number(data.rating || 5),
              comment: data.comment || '',
              createdAt: String(data.createdAt || new Date().toISOString()),
              images: Array.isArray(data.images) ? data.images : undefined,
            });
          }
        });
      } catch {}

      return Array.from(reviewsMap.values()).sort((a, b) =>
        String(b.createdAt).localeCompare(String(a.createdAt))
      );
    } catch {
      return [];
    }
  },

  async addProductReview(
    productId: string,
    review: Omit<Review, 'id' | 'productId'>,
  ): Promise<Review> {
    const newReview: Review = {
      id: `rev-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      productId,
      ...review,
      createdAt: review.createdAt || new Date().toISOString(),
    };

    try {
      const ref = doc(collection(db, 'reviews'), newReview.id);
      await setDoc(ref, newReview);
      return newReview;
    } catch (err: unknown) {
      throw mapFirebaseError(err, 'Không thể gửi đánh giá sản phẩm.');
    }
  },

  async deleteProductReview(productId: string, reviewId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
    } catch (err: unknown) {
      throw mapFirebaseError(err, 'Không thể xoá đánh giá sản phẩm.');
    }
  },

  async getProductAttributes(productId: string): Promise<Array<{ id: string; productId: string; type: string; name: string; value: string }>> {
    try {
      const { query, where } = await import('firebase/firestore');
      const q = query(collection(db, 'product_attributes'), where('productId', '==', productId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    } catch {
      return [];
    }
  },
};
