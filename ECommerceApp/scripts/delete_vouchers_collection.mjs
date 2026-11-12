import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';
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

async function purgeVouchers() {
  console.log('🗑️ Đang kiểm tra và xóa toàn bộ dữ liệu trong collection "vouchers"...');
  const snap = await getDocs(collection(db, 'vouchers'));
  console.log(`Tìm thấy ${snap.size} documents trong "vouchers".`);

  if (snap.size === 0) {
    console.log('✅ Collection "vouchers" đã hoàn toàn trống rỗng!');
    return;
  }

  const batch = writeBatch(db);
  snap.forEach((d) => {
    console.log(`   - Xóa doc: [${d.id}]`);
    batch.delete(doc(db, 'vouchers', d.id));
  });

  await batch.commit();
  console.log(`🎉 Đã xóa thành công ${snap.size} documents khỏi "vouchers"! Collection "vouchers" đã được dọn sạch hoàn toàn khỏi Firestore Console.`);
}

purgeVouchers().catch((err) => {
  console.error('Lỗi khi xóa vouchers:', err);
  process.exit(1);
});
