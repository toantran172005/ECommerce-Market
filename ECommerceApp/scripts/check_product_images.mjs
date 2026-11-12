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

const snap = await getDocs(collection(db, 'products'));
const imageMap = {};
const productDetails = [];

snap.forEach((d) => {
  const p = d.data();
  productDetails.push({
    id: d.id,
    name: p.name,
    imageUrl: p.imageUrl,
    images: p.images || [],
    variants: p.variants || [],
  });

  if (!imageMap[p.imageUrl]) imageMap[p.imageUrl] = [];
  imageMap[p.imageUrl].push({ id: d.id, name: p.name });
});

console.log('=== DANH SÁCH ẢNH CỦA 25 SẢN PHẨM ===');
productDetails.forEach((p, idx) => {
  console.log(`\n${idx + 1}. [${p.id}] ${p.name}`);
  console.log(`   imageUrl: ${p.imageUrl}`);
  console.log(`   images (${p.images.length}):`, p.images);
  console.log(`   variants (${p.variants.length}):`, p.variants.map((v) => `${v.name} (${v.type}${v.imageUrl ? ' - có ảnh' : ' - KO ẢNH'})`).join(', '));
});

console.log('\n=== CÁC SẢN PHẨM BỊ TRÙNG ẢNH imageUrl ===');
for (const [url, prods] of Object.entries(imageMap)) {
  if (prods.length > 1) {
    console.log(`⚠️ URL TRÙNG LẶP: ${url}`);
    prods.forEach((p) => console.log(`   - [${p.id}] ${p.name}`));
  }
}
