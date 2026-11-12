import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, setDoc, getDocs, collection, writeBatch } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('ECommerceApp/.env');
const envContent = fs.existsSync(envPath)
  ? fs.readFileSync(envPath, 'utf8')
  : fs.readFileSync('.env', 'utf8');

const env = {};
envContent.split('\n').forEach((line) => {
  const parts = line.trim().split('=');
  if (parts.length >= 2) env[parts[0]] = parts.slice(1).join('=');
});

const app = initializeApp({
  apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.EXPO_PUBLIC_FIREBASE_APP_ID,
});

const db = getFirestore(app);

// Danh mục variants chuẩn hóa cho từng sản phẩm
const PRODUCT_VARIANTS_MAP = {
  'apple-airpods-pro-2-usbc': [
    { id: 'color-white', name: 'Trắng', type: 'color', inStock: 50 },
    { id: 'opt-wireless', name: 'Bản Không Dây (USB-C MagSafe)', type: 'size', inStock: 35 },
    { id: 'opt-standard', name: 'Bản Tiêu Chuẩn', type: 'size', inStock: 15 },
  ],
  'apple-iphone-16-pro-max': [
    { id: 'color-desert-titan', name: 'Titan Sa Mạc', type: 'color', inStock: 25 },
    { id: 'color-natural-titan', name: 'Titan Tự Nhiên', type: 'color', inStock: 20 },
    { id: 'color-white-titan', name: 'Titan Trắng', type: 'color', inStock: 18 },
    { id: 'color-black-titan', name: 'Titan Đen', type: 'color', inStock: 30 },
    { id: 'storage-256gb', name: '256GB', type: 'storage', inStock: 45 },
    { id: 'storage-512gb', name: '512GB', type: 'storage', inStock: 30 },
    { id: 'storage-1tb', name: '1TB', type: 'storage', inStock: 18 },
  ],
  'apple-iphone-16': [
    { id: 'color-ultramarine', name: 'Xanh Lưu Ly', type: 'color', inStock: 30 },
    { id: 'color-teal', name: 'Xanh Mòng Két', type: 'color', inStock: 25 },
    { id: 'color-pink', name: 'Hồng Nhạt', type: 'color', inStock: 20 },
    { id: 'color-white', name: 'Trắng', type: 'color', inStock: 35 },
    { id: 'color-black', name: 'Đen', type: 'color', inStock: 40 },
    { id: 'storage-128gb', name: '128GB', type: 'storage', inStock: 60 },
    { id: 'storage-256gb', name: '256GB', type: 'storage', inStock: 50 },
    { id: 'storage-512gb', name: '512GB', type: 'storage', inStock: 40 },
  ],
  'samsung-galaxy-s24-ultra': [
    { id: 'color-titan-gray', name: 'Xám Titan', type: 'color', inStock: 25 },
    { id: 'color-titan-black', name: 'Đen Titan', type: 'color', inStock: 30 },
    { id: 'color-titan-violet', name: 'Tím Titan', type: 'color', inStock: 20 },
    { id: 'color-titan-yellow', name: 'Vàng Titan', type: 'color', inStock: 15 },
    { id: 'storage-256gb', name: '256GB', type: 'storage', inStock: 50 },
    { id: 'storage-512gb', name: '512GB', type: 'storage', inStock: 40 },
  ],
  'samsung-galaxy-z-fold-6': [
    { id: 'color-silver-shadow', name: 'Xám Silver', type: 'color', inStock: 15 },
    { id: 'color-navy', name: 'Xanh Navy', type: 'color', inStock: 20 },
    { id: 'color-pink', name: 'Hồng Rosé', type: 'color', inStock: 10 },
    { id: 'storage-256gb', name: '256GB', type: 'storage', inStock: 25 },
    { id: 'storage-512gb', name: '512GB', type: 'storage', inStock: 20 },
  ],
  'xiaomi-14-ultra': [
    { id: 'color-black', name: 'Đen Huyền Bí', type: 'color', inStock: 20 },
    { id: 'color-white', name: 'Trắng Tinh Khôi', type: 'color', inStock: 15 },
    { id: 'storage-512gb', name: '16GB / 512GB', type: 'storage', inStock: 25 },
    { id: 'storage-1tb', name: '16GB / 1TB', type: 'storage', inStock: 10 },
  ],
  'apple-macbook-pro-14-m3': [
    { id: 'color-space-black', name: 'Đen Không Gian', type: 'color', inStock: 15 },
    { id: 'color-silver', name: 'Bạc', type: 'color', inStock: 15 },
    { id: 'storage-512gb', name: '18GB RAM / 512GB SSD', type: 'storage', inStock: 18 },
    { id: 'storage-1tb', name: '18GB RAM / 1TB SSD', type: 'storage', inStock: 12 },
  ],
  'apple-macbook-air-m3-13': [
    { id: 'color-midnight', name: 'Xanh Midnight', type: 'color', inStock: 25 },
    { id: 'color-starlight', name: 'Ánh Sao (Starlight)', type: 'color', inStock: 20 },
    { id: 'color-space-gray', name: 'Xám Không Gian', type: 'color', inStock: 30 },
    { id: 'color-silver', name: 'Bạc', type: 'color', inStock: 20 },
    { id: 'storage-256gb', name: '16GB RAM / 256GB SSD', type: 'storage', inStock: 50 },
    { id: 'storage-512gb', name: '16GB RAM / 512GB SSD', type: 'storage', inStock: 45 },
  ],
  'asus-rog-strix-g16': [
    { id: 'color-eclipse-gray', name: 'Xám Eclipse', type: 'color', inStock: 20 },
    { id: 'storage-16gb-512gb', name: '16GB / 512GB SSD', type: 'storage', inStock: 12 },
    { id: 'storage-32gb-1tb', name: '32GB / 1TB SSD', type: 'storage', inStock: 8 },
  ],
  'asus-vivobook-15-oled': [
    { id: 'color-cool-silver', name: 'Bạc Ánh Kim', type: 'color', inStock: 25 },
    { id: 'color-indie-black', name: 'Đen Indie', type: 'color', inStock: 20 },
    { id: 'storage-16gb-512gb', name: '16GB / 512GB SSD', type: 'storage', inStock: 45 },
  ],
  'dell-xps-13-plus': [
    { id: 'color-platinum', name: 'Bạch Kim (Platinum)', type: 'color', inStock: 15 },
    { id: 'color-graphite', name: 'Than Chì (Graphite)', type: 'color', inStock: 15 },
    { id: 'storage-16gb-512gb', name: '16GB / 512GB SSD', type: 'storage', inStock: 20 },
    { id: 'storage-32gb-1tb', name: '32GB / 1TB SSD', type: 'storage', inStock: 10 },
  ],
  'lenovo-ideapad-slim-3': [
    { id: 'color-arctic-grey', name: 'Xám Bắc Cực', type: 'color', inStock: 35 },
    { id: 'color-abyss-blue', name: 'Xanh Biển Sâu', type: 'color', inStock: 25 },
    { id: 'storage-8gb-256gb', name: '8GB / 256GB SSD', type: 'storage', inStock: 30 },
    { id: 'storage-16gb-512gb', name: '16GB / 512GB SSD', type: 'storage', inStock: 30 },
  ],
  'xiaomi-redmibook-pro-15': [
    { id: 'color-starry-gray', name: 'Xám Ánh Sao', type: 'color', inStock: 25 },
    { id: 'storage-16gb-512gb', name: '16GB / 512GB SSD', type: 'storage', inStock: 15 },
    { id: 'storage-32gb-1tb', name: '32GB / 1TB SSD', type: 'storage', inStock: 10 },
  ],
  'apple-ipad-pro-m4-11': [
    { id: 'color-space-black', name: 'Đen Không Gian', type: 'color', inStock: 20 },
    { id: 'color-silver', name: 'Bạc', type: 'color', inStock: 20 },
    { id: 'storage-wifi-256gb', name: '256GB Wi-Fi', type: 'storage', inStock: 25 },
    { id: 'storage-wifi-512gb', name: '512GB Wi-Fi', type: 'storage', inStock: 15 },
  ],
  'samsung-galaxy-tab-s9-fe': [
    { id: 'color-mint', name: 'Xanh Mint', type: 'color', inStock: 20 },
    { id: 'color-gray', name: 'Xám Tự Nhiên', type: 'color', inStock: 25 },
    { id: 'color-silver', name: 'Bạc Ánh Khói', type: 'color', inStock: 15 },
    { id: 'storage-128gb', name: '128GB Wi-Fi', type: 'storage', inStock: 35 },
    { id: 'storage-256gb', name: '256GB Wi-Fi', type: 'storage', inStock: 25 },
  ],
  'xiaomi-pad-6': [
    { id: 'color-gravity-gray', name: 'Xám Khói', type: 'color', inStock: 20 },
    { id: 'color-gold', name: 'Vàng Champagne', type: 'color', inStock: 20 },
    { id: 'color-mist-blue', name: 'Xanh Sương Mù', type: 'color', inStock: 25 },
    { id: 'storage-128gb', name: '6GB / 128GB', type: 'storage', inStock: 35 },
    { id: 'storage-256gb', name: '8GB / 256GB', type: 'storage', inStock: 30 },
  ],
  'samsung-galaxy-buds-3-pro': [
    { id: 'color-silver', name: 'Bạc Ánh Kim', type: 'color', inStock: 30 },
    { id: 'color-white', name: 'Trắng', type: 'color', inStock: 35 },
    { id: 'opt-wireless', name: 'Bản Không Dây (Wireless Charging)', type: 'size', inStock: 45 },
    { id: 'opt-standard', name: 'Bản Tiêu Chuẩn', type: 'size', inStock: 20 },
  ],
  'sony-wf-1000xm5': [
    { id: 'color-black', name: 'Đen Nhám', type: 'color', inStock: 25 },
    { id: 'color-silver', name: 'Bạc Bạch Kim', type: 'color', inStock: 20 },
    { id: 'opt-wireless', name: 'Bản Không Dây ANC', type: 'size', inStock: 30 },
    { id: 'opt-standard', name: 'Bản Tiêu Chuẩn', type: 'size', inStock: 15 },
  ],
  'sony-wh-1000xm5': [
    { id: 'color-black', name: 'Đen Cổ Điển', type: 'color', inStock: 25 },
    { id: 'color-silver', name: 'Bạc Bạch Kim', type: 'color', inStock: 20 },
    { id: 'color-midnight-blue', name: 'Xanh Midnight', type: 'color', inStock: 15 },
    { id: 'opt-wireless', name: 'Bản Không Dây Chống Ồn', type: 'size', inStock: 40 },
    { id: 'opt-standard', name: 'Bản Tiêu Chuẩn', type: 'size', inStock: 20 },
  ],
  'p-01': [
    { id: 'color-white', name: 'Trắng', type: 'color', inStock: 40 },
    { id: 'color-black', name: 'Đen', type: 'color', inStock: 30 },
    { id: 'opt-wireless', name: 'Bản Không Dây', type: 'size', inStock: 50 },
    { id: 'opt-standard', name: 'Bản Tiêu Chuẩn', type: 'size', inStock: 20 },
  ],
  'apple-watch-series-10': [
    { id: 'color-jet-black', name: 'Đen Bóng (Jet Black)', type: 'color', inStock: 25 },
    { id: 'color-rose-gold', name: 'Vàng Hồng', type: 'color', inStock: 20 },
    { id: 'color-silver', name: 'Bạc Nhôm', type: 'color', inStock: 25 },
    { id: 'size-42mm', name: '42mm (GPS)', type: 'size', inStock: 35 },
    { id: 'size-46mm', name: '46mm (GPS)', type: 'size', inStock: 35 },
  ],
  'samsung-galaxy-watch-7': [
    { id: 'color-green', name: 'Xanh Quân Đội', type: 'color', inStock: 20 },
    { id: 'color-silver', name: 'Bạc Ánh Kim', type: 'color', inStock: 25 },
    { id: 'color-cream', name: 'Kem Thanh Lịch', type: 'color', inStock: 15 },
    { id: 'size-40mm', name: '40mm Bluetooth', type: 'size', inStock: 30 },
    { id: 'size-44mm', name: '44mm Bluetooth', type: 'size', inStock: 30 },
  ],
  'xiaomi-smart-band-8': [
    { id: 'color-black', name: 'Đen Huyền Bí', type: 'color', inStock: 50 },
    { id: 'color-gold', name: 'Vàng Ánh Kim', type: 'color', inStock: 40 },
    { id: 'opt-silicone', name: 'Dây Silicone Thể Thao', type: 'size', inStock: 60 },
    { id: 'opt-leather', name: 'Dây Da Cao Cấp', type: 'size', inStock: 30 },
  ],
  'logitech-mx-master-3s': [
    { id: 'color-graphite', name: 'Graphite (Đen)', type: 'color', inStock: 40 },
    { id: 'color-pale-gray', name: 'Pale Grey (Xám Trắng)', type: 'color', inStock: 30 },
    { id: 'opt-wireless', name: 'Bản Không Dây Logi Bolt', type: 'size', inStock: 50 },
    { id: 'opt-standard', name: 'Bản Tiêu Chuẩn', type: 'size', inStock: 20 },
  ],
  'logitech-mx-mechanical': [
    { id: 'color-graphite', name: 'Graphite Xám Đen', type: 'color', inStock: 30 },
    { id: 'opt-tactile', name: 'Tactile Quiet (Gõ Êm)', type: 'size', inStock: 15 },
    { id: 'opt-linear', name: 'Linear (Mượt Mà)', type: 'size', inStock: 10 },
    { id: 'opt-clicky', name: 'Clicky (Gõ Nảy)', type: 'size', inStock: 10 },
  ],
};

async function seedVariants() {
  console.log('🚀 Bắt đầu cập nhật biến thể (variants) cho tất cả sản phẩm trong Firestore...');
  const productsSnap = await getDocs(collection(db, 'products'));
  let updatedCount = 0;

  for (const prodDoc of productsSnap.docs) {
    const pId = prodDoc.id;
    let variants = PRODUCT_VARIANTS_MAP[pId];

    // Fallback nếu có sản phẩm mới chưa nằm trong map
    if (!variants || variants.length === 0) {
      variants = [
        { id: 'color-white', name: 'Trắng', type: 'color', inStock: 30 },
        { id: 'color-black', name: 'Đen', type: 'color', inStock: 30 },
        { id: 'opt-wireless', name: 'Bản Không Dây', type: 'size', inStock: 40 },
        { id: 'opt-standard', name: 'Bản Tiêu Chuẩn', type: 'size', inStock: 20 },
      ];
    }

    await updateDoc(doc(db, 'products', pId), { variants });
    console.log(`   ✅ [${pId}] -> Cập nhật ${variants.length} biến thể (${variants.map(v => v.name).join(', ')})`);
    updatedCount++;
  }
  console.log(`🎉 Đã cập nhật thành công biến thể cho ${updatedCount} sản phẩm!`);
}

async function syncPromosAndVouchers() {
  console.log('\n🚀 Bắt đầu đồng bộ danh mục mã giảm giá (promos -> vouchers)...');
  const promosSnap = await getDocs(collection(db, 'promos'));
  let count = 0;

  for (const promoDoc of promosSnap.docs) {
    const code = promoDoc.id.toUpperCase();
    const data = promoDoc.data();

    // Chuẩn hoá dữ liệu voucher
    const normalized = {
      ...data,
      id: code,
      code: code,
      title: data.title || data.description || `Mã giảm giá ${code}`,
      description: data.description || '',
      type: data.type || (data.discountPercent ? 'percent' : code.includes('FREESHIP') ? 'freeShip' : 'fixed'),
      value: data.value ?? data.discountPercent ?? (code.includes('FREESHIP') ? 30000 : 50000),
      discountPercent: data.discountPercent ?? (data.type === 'percent' ? data.value : 0),
      minOrderValue: data.minOrderValue ?? 0,
      usageLimit: data.usageLimit ?? 99999,
      usedCount: data.usedCount ?? 0,
      isActive: data.isActive !== false,
      startsAt: data.startsAt || '2026-01-01T00:00:00Z',
      expiresAt: data.expiresAt || '2026-12-31T23:59:59Z',
    };

    // Cập nhật cả 2 collection promos và vouchers
    await setDoc(doc(db, 'promos', code), normalized, { merge: true });
    await setDoc(doc(db, 'vouchers', code), normalized, { merge: true });
    console.log(`   🎁 [${code}] -> Đồng bộ thành công (Loại: ${normalized.type}, Giá trị: ${normalized.value})`);
    count++;
  }
  console.log(`🎉 Đã đồng bộ thành công ${count} mã giảm giá vào cả 2 collection 'promos' và 'vouchers'!`);
}

async function main() {
  await seedVariants();
  await syncPromosAndVouchers();
  console.log('\n✨ TẤT CẢ DỮ LIỆU ĐÃ ĐƯỢC CẬP NHẬT HOÀN TẤT VÀ SẴN SÀNG KIỂM THỬ!');
}

main().catch(err => {
  console.error('Lỗi thực thi:', err);
  process.exit(1);
});
