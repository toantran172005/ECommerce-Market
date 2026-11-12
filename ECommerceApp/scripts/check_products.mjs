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
console.log('Total products in firestore:', snap.size);
let withVariants = 0;
const list = [];
snap.forEach((d) => {
  const data = d.data();
  if (data.variants && data.variants.length > 0) withVariants++;
  list.push({ id: d.id, name: data.name, category: data.category, variants: data.variants || null });
});
console.log('Products with variants:', withVariants);
console.log('All products:');
list.forEach(p => console.log(`- ${p.id} (${p.category}): variants =`, p.variants ? p.variants.map(v => v.name).join(', ') : 'NONE'));
