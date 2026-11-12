// Test Cosine Similarity & Category Gate logic
function normalizeVietnamese(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectCategoryGate(query, reply) {
  const qNorm = normalizeVietnamese(query);
  const rNorm = normalizeVietnamese(reply || '');

  if (/(dien thoai|smartphone|di dong|phone|iphone|galaxy s|z fold|xiaomi 14|flagship|may gap)\b/i.test(qNorm)) {
    return 'Điện thoại';
  }
  if (/(tai nghe|headphone|earphone|airpods|galaxy buds|wf 1000|wh 1000|loa bluetooth|am thanh)\b/i.test(qNorm)) {
    return 'Âm thanh';
  }
  if (/(laptop|may tinh xach tay|macbook|vivobook|rog strix|ideapad|redmibook|xps 13)\b/i.test(qNorm)) {
    return 'Laptop & Máy tính';
  }
  if (/(may tinh bang|tablet|ipad|galaxy tab|pad 6)\b/i.test(qNorm)) {
    return 'Máy tính bảng';
  }
  if (/(dong ho|smartwatch|smart band|watch series|galaxy watch)\b/i.test(qNorm)) {
    return 'Đồng hồ thông minh';
  }
  if (/(chuot|ban phim|keyboard|mouse|mx master|mx mechanical|gear|phu kien)\b/i.test(qNorm)) {
    return 'Phụ kiện & Gear';
  }

  return null;
}

function tokenizeWords(text) {
  return normalizeVietnamese(text).split(/\s+/).filter((w) => w.length >= 2);
}

function computeCosineSimilarity(vecA, vecB) {
  let dot = 0, normA = 0, normB = 0;
  for (const [term, valA] of vecA.entries()) {
    normA += valA * valA;
    const valB = vecB.get(term) || 0;
    if (valB > 0) dot += valA * valB;
  }
  for (const valB of vecB.values()) {
    normB += valB * valB;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function rankProductsWithCosineSimilarity(allProducts, query, reply, aiProductIds, explicitCategory, topK = 5) {
  const categoryGate = explicitCategory || detectCategoryGate(query, reply);
  console.log('-> Detected Category Gate:', categoryGate);

  let candidatePool = allProducts;
  if (categoryGate) {
    const gated = allProducts.filter((p) => p.category === categoryGate);
    if (gated.length > 0) candidatePool = gated;
  }

  const qTokens = tokenizeWords(query);
  const rTokens = tokenizeWords(reply);
  const queryVector = new Map();
  for (const t of qTokens) queryVector.set(t, (queryVector.get(t) || 0) + 3.0);
  for (const t of rTokens) queryVector.set(t, (queryVector.get(t) || 0) + 1.0);

  const aiIdSet = new Set((aiProductIds || []).map((id) => id.toLowerCase()));
  const replyNorm = normalizeVietnamese(reply);

  const scored = candidatePool.map((p) => {
    const docVector = new Map();
    for (const t of tokenizeWords(p.name)) docVector.set(t, (docVector.get(t) || 0) + 3.5);
    for (const t of tokenizeWords(p.category || '')) docVector.set(t, (docVector.get(t) || 0) + 3.0);
    for (const t of tokenizeWords(p.description || '')) docVector.set(t, (docVector.get(t) || 0) + 1.0);

    let score = computeCosineSimilarity(queryVector, docVector);
    if (aiIdSet.has(p.id.toLowerCase())) score += 0.6;
    if (replyNorm.includes(normalizeVietnamese(p.name))) score += 0.5;

    return { product: p, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map((s) => s.product);
}

// Giả lập danh mục sản phẩm bao gồm cả tai nghe, máy tính bảng và điện thoại
const mockProducts = [
  { id: 'samsung-galaxy-buds-3-pro', name: 'Tai nghe Samsung Galaxy Buds 3 Pro', category: 'Âm thanh' },
  { id: 'samsung-galaxy-tab-s9-fe', name: 'Máy tính bảng Samsung Galaxy Tab S9 FE', category: 'Máy tính bảng' },
  { id: 'apple-airpods-pro-2-usbc', name: 'Tai nghe Apple AirPods Pro 2', category: 'Âm thanh' },
  { id: 'apple-iphone-16-pro-max', name: 'iPhone 16 Pro Max 256GB', category: 'Điện thoại' },
  { id: 'apple-iphone-16', name: 'iPhone 16 128GB', category: 'Điện thoại' },
  { id: 'samsung-galaxy-s24-ultra', name: 'Điện thoại Samsung Galaxy S24 Ultra', category: 'Điện thoại' },
  { id: 'samsung-galaxy-z-fold-6', name: 'Điện thoại Samsung Galaxy Z Fold 6', category: 'Điện thoại' },
  { id: 'xiaomi-14-ultra', name: 'Điện thoại Xiaomi 14 Ultra Leica', category: 'Điện thoại' },
];

console.log('--- TEST CASE: Khách hỏi "có điện thoại không" ---');
const userQuery = 'có điện thoại không';
const aiReply = 'Có đủ cả bạn ơi! Shop đang có dàn điện thoại từ flagship đến máy gập: iPhone 16 Pro Max 256GB, iPhone 16 128GB, Samsung Galaxy S24 Ultra, Xiaomi 14 Ultra Leica và Samsung Galaxy Z Fold 6...';

const results = rankProductsWithCosineSimilarity(mockProducts, userQuery, aiReply, [], null, 5);

console.log('\nKẾT QUẢ TOP 5 SẢN PHẨM:');
results.forEach((p, idx) => {
  console.log(`${idx + 1}. [${p.category}] ${p.name} (ID: ${p.id})`);
});

const hasWrongCategory = results.some(p => p.category !== 'Điện thoại');
if (hasWrongCategory) {
  console.error('\n❌ THẤT BẠI: Vẫn còn sản phẩm sai danh mục lọt vào!');
  process.exit(1);
} else {
  console.log('\n✅ THÀNH CÔNG RỰC RỠ: 100% sản phẩm trả về là ĐIỆN THOẠI, tuyệt đối không có Tai nghe hay Tablet!');
}
