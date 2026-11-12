import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
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

// 12 Collections chuẩn theo tài liệu kiến trúc SDS
const SDS_12_COLLECTIONS = [
  'users',
  'products',
  'categories',
  'brands',
  'orders',
  'shippingMethods',
  'paymentMethods',
  'promos',
  'banners',
  'reviews',
  'notifications',
  'supports',
];

async function verify() {
  console.log('🔍 KIỂM TRA ĐỐI CHIẾU 12 COLLECTIONS TRONG FIRESTORE THEO TÀI LIỆU SDS:\n');
  let activeCount = 0;

  for (const colName of SDS_12_COLLECTIONS) {
    const snap = await getDocs(collection(db, colName));
    console.log(`   📂 [${colName}]: ${snap.size} documents ${snap.size > 0 ? '✅' : '⚠️'}`);
    if (snap.size > 0) activeCount++;
  }

  console.log('\n🔍 KIỂM TRA COLLECTION "vouchers":');
  const vouchersSnap = await getDocs(collection(db, 'vouchers'));
  console.log(`   ❌ [vouchers]: ${vouchersSnap.size} documents (Đã xóa sạch: ${vouchersSnap.size === 0 ? 'HOÀN TOÀN BIẾN MẤT ✅' : 'Vẫn còn ❌'})`);

  console.log(`\n🎉 TỔNG KẾT: Có chính xác ${activeCount}/12 Root Collections theo đúng tài liệu SDS.`);
}

verify().catch(console.error);
