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

console.log('--- Checking promos ---');
const promosSnap = await getDocs(collection(db, 'promos'));
console.log('promos count:', promosSnap.size);
promosSnap.forEach(d => console.log('promo doc id:', d.id, 'data:', JSON.stringify(d.data())));

console.log('--- Checking vouchers ---');
const vouchersSnap = await getDocs(collection(db, 'vouchers'));
console.log('vouchers count:', vouchersSnap.size);
vouchersSnap.forEach(d => console.log('voucher doc id:', d.id, 'data:', JSON.stringify(d.data())));
