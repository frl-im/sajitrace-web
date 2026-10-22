import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readDb, writeDb, resetDb, logAction } from './db.js';

const app = express();
const PORT = process.env.PORT || 4000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.json({ limit: '1mb' }));

const makeId = (prefix) => `${prefix}-${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;
const today = () => new Date().toISOString().slice(0, 10);
const bad = (res, message, status = 400) => res.status(status).json({ error: message });

app.get('/api/health', (_req, res) => res.json({ status: 'ok', app: 'SajiTrace API', time: new Date().toISOString() }));

app.get('/api/summary', (_req, res) => {
  const db = readDb();
  const openCases = db.cases.filter((c) => !['Selesai', 'Ditutup'].includes(c.status));
  const activeDistributions = db.distributions.filter((d) => !['Diterima', 'Dibatalkan'].includes(d.status));
  const expiring = db.materials.filter((m) => m.expiryDate && (new Date(m.expiryDate) - new Date(today())) / 86400000 <= 7 && new Date(m.expiryDate) >= new Date(today()));
  const affectedProductions = new Set(openCases.flatMap((c) => db.productions.filter((p) => p.materials.some((m) => m.materialId === c.materialId)).map((p) => p.id)));
  const affectedDestinations = new Set(db.distributions.filter((d) => affectedProductions.has(d.productionId)).map((d) => d.destination));
  res.json({
    materials: db.materials.length,
    productionToday: db.productions.filter((p) => p.date === today()).length,
    portionsToday: db.productions.filter((p) => p.date === today()).reduce((sum, p) => sum + Number(p.portions || 0), 0),
    distributionsPending: activeDistributions.length,
    openCases: openCases.length,
    expiringMaterials: expiring.length,
    affectedDestinations: affectedDestinations.size,
    recentAudit: db.audit.slice(0, 5)
  });
});

app.get('/api/materials', (_req, res) => res.json(readDb().materials));
app.post('/api/materials', (req, res) => {
  const { name, category, supplier, supplierLot, receivedDate, expiryDate, quantity, unit, condition, notes } = req.body;
  if (!name?.trim() || !supplier?.trim() || !supplierLot?.trim() || !quantity || Number(quantity) <= 0) return bad(res, 'Nama bahan, pemasok, kode lot, dan jumlah wajib diisi.');
  const db = readDb();
  if (db.materials.some((m) => m.supplierLot.toLowerCase() === supplierLot.trim().toLowerCase())) return bad(res, 'Kode lot pemasok sudah digunakan. Gunakan kode unik.');
  const material = { id: makeId('MAT'), name: name.trim(), category: category || 'Lainnya', supplier: supplier.trim(), supplierLot: supplierLot.trim(), receivedDate: receivedDate || today(), expiryDate: expiryDate || '', quantity: Number(quantity), unit: unit || 'kg', condition: condition || 'Perlu pemeriksaan', notes: notes || '', createdAt: new Date().toISOString() };
  db.materials.unshift(material); writeDb(db); logAction('Bahan pangan ditambahkan', `${material.name} · ${material.supplierLot}`);
  res.status(201).json(material);
});
app.put('/api/materials/:id', (req, res) => {
  const db = readDb(); const idx = db.materials.findIndex((m) => m.id === req.params.id);
  if (idx < 0) return bad(res, 'Bahan tidak ditemukan.', 404);
  db.materials[idx] = { ...db.materials[idx], ...req.body, id: db.materials[idx].id, quantity: Number(req.body.quantity ?? db.materials[idx].quantity) };
  writeDb(db); logAction('Data bahan diperbarui', db.materials[idx].supplierLot); res.json(db.materials[idx]);
});

app.get('/api/productions', (_req, res) => {
  const db = readDb();
  res.json(db.productions.map((p) => ({ ...p, materialDetails: p.materials.map((x) => ({ ...x, material: db.materials.find((m) => m.id === x.materialId) })).filter((x) => x.material) })));
});
app.post('/api/productions', (req, res) => {
  const { code, date, menu, portions, status, notes, materials } = req.body;
  if (!menu?.trim() || !portions || Number(portions) <= 0 || !Array.isArray(materials) || materials.length === 0) return bad(res, 'Menu, jumlah porsi, dan minimal satu bahan wajib diisi.');
  const db = readDb();
  const useMaterials = materials.map((m) => ({ materialId: m.materialId, quantity: Number(m.quantity), unit: m.unit || db.materials.find((x) => x.id === m.materialId)?.unit || 'kg' }));
  for (const use of useMaterials) {
    const found = db.materials.find((m) => m.id === use.materialId);
    if (!found) return bad(res, `Bahan ${use.materialId} tidak ditemukan.`);
    if (use.quantity <= 0) return bad(res, 'Jumlah bahan harus lebih besar dari 0.');
  }
  const production = { id: makeId('PRD'), code: code?.trim() || `B-${Date.now().toString().slice(-5)}`, date: date || today(), menu: menu.trim(), portions: Number(portions), status: status || 'Dalam proses', notes: notes || '', materials: useMaterials, createdAt: new Date().toISOString() };
  if (db.productions.some((p) => p.code.toLowerCase() === production.code.toLowerCase())) return bad(res, 'Kode batch produksi sudah ada.');
  db.productions.unshift(production); writeDb(db); logAction('Batch produksi dibuat', `${production.code} · ${production.menu}`);
  res.status(201).json(production);
});
app.put('/api/productions/:id', (req, res) => {
  const db = readDb(); const idx = db.productions.findIndex((p) => p.id === req.params.id);
  if (idx < 0) return bad(res, 'Batch produksi tidak ditemukan.', 404);
  db.productions[idx] = { ...db.productions[idx], ...req.body, id: db.productions[idx].id, portions: Number(req.body.portions ?? db.productions[idx].portions) };
  writeDb(db); logAction('Batch produksi diperbarui', db.productions[idx].code); res.json(db.productions[idx]);
});

app.get('/api/distributions', (_req, res) => {
  const db = readDb();
  res.json(db.distributions.map((d) => ({ ...d, production: db.productions.find((p) => p.id === d.productionId) || null })));
});
app.post('/api/distributions', (req, res) => {
  const { productionId, destination, address, recipientType, portions, dispatchTime, status, receiver, notes } = req.body;
  if (!productionId || !destination?.trim() || !portions || Number(portions) <= 0) return bad(res, 'Batch produksi, tujuan, dan jumlah porsi wajib diisi.');
  const db = readDb(); const production = db.productions.find((p) => p.id === productionId);
  if (!production) return bad(res, 'Batch produksi tidak ditemukan.');
  const distributed = db.distributions.filter((d) => d.productionId === productionId && d.status !== 'Dibatalkan').reduce((s, d) => s + Number(d.portions), 0);
  if (distributed + Number(portions) > Number(production.portions)) return bad(res, `Jumlah distribusi melebihi porsi batch. Tersisa ${Math.max(0, production.portions - distributed)} porsi.`);
  const distribution = { id: makeId('DST'), code: `DST-${Date.now().toString().slice(-6)}`, productionId, destination: destination.trim(), address: address || '', recipientType: recipientType || 'Sekolah', portions: Number(portions), dispatchTime: dispatchTime || new Date().toISOString().slice(0, 16), status: status || 'Disiapkan', receiver: receiver || '', notes: notes || '', createdAt: new Date().toISOString() };
  db.distributions.unshift(distribution); writeDb(db); logAction('Distribusi dicatat', `${distribution.destination} · ${distribution.code}`); res.status(201).json(distribution);
});
app.put('/api/distributions/:id', (req, res) => {
  const db = readDb(); const idx = db.distributions.findIndex((d) => d.id === req.params.id);
  if (idx < 0) return bad(res, 'Data distribusi tidak ditemukan.', 404);
  const next = { ...db.distributions[idx], ...req.body, id: db.distributions[idx].id, portions: Number(req.body.portions ?? db.distributions[idx].portions) };
  if (next.status === 'Diterima' && !next.receiver?.trim()) return bad(res, 'Nama petugas penerima wajib diisi untuk konfirmasi penerimaan.');
  db.distributions[idx] = next; writeDb(db); logAction('Status distribusi diperbarui', `${next.destination} · ${next.status}`); res.json(next);
});

function traceMaterial(db, material) {
  const productions = db.productions.filter((p) => p.materials.some((x) => x.materialId === material.id));
  const productionIds = new Set(productions.map((p) => p.id));
  const distributions = db.distributions.filter((d) => productionIds.has(d.productionId)).map((d) => ({ ...d, production: db.productions.find((p) => p.id === d.productionId) }));
  return { material, productions: productions.map((p) => ({ ...p, linkedMaterials: p.materials.map((x) => ({ ...x, material: db.materials.find((m) => m.id === x.materialId) })).filter((x) => x.material) })), distributions, relatedCases: db.cases.filter((c) => c.materialId === material.id), summary: { productionCount: productions.length, distributionCount: distributions.length, totalPortions: distributions.reduce((s, d) => s + Number(d.portions), 0), destinations: [...new Set(distributions.map((d) => d.destination))] } };
}
app.get('/api/trace', (req, res) => {
  const term = String(req.query.q || '').trim().toLowerCase();
  if (!term) return bad(res, 'Masukkan kode lot, nama bahan, atau pemasok.');
  const db = readDb();
  const material = db.materials.find((m) => [m.supplierLot, m.name, m.supplier, m.id].some((v) => String(v).toLowerCase() === term) || [m.supplierLot, m.name, m.supplier, m.id].some((v) => String(v).toLowerCase().includes(term)));
  if (!material) return res.status(404).json({ error: 'Lot atau bahan tidak ditemukan. Periksa kode lot dan coba lagi.' });
  res.json(traceMaterial(db, material));
});
app.get('/api/trace/:lotCode', (req, res) => {
  const db = readDb(); const code = decodeURIComponent(req.params.lotCode).toLowerCase();
  const material = db.materials.find((m) => m.supplierLot.toLowerCase() === code || m.id.toLowerCase() === code);
  if (!material) return bad(res, 'Lot tidak ditemukan.', 404);
  res.json(traceMaterial(db, material));
});

app.get('/api/cases', (_req, res) => {
  const db = readDb();
  res.json(db.cases.map((c) => {
    const material = db.materials.find((m) => m.id === c.materialId);
    const productionIds = new Set(db.productions.filter((p) => p.materials.some((x) => x.materialId === c.materialId)).map((p) => p.id));
    const distributions = db.distributions.filter((d) => productionIds.has(d.productionId));
    return { ...c, material, affectedProductions: productionIds.size, affectedDestinations: [...new Set(distributions.map((d) => d.destination))], affectedPortions: distributions.reduce((s, d) => s + Number(d.portions), 0) };
  }));
});
app.post('/api/cases', (req, res) => {
  const { materialId, type, severity, description, action } = req.body;
  if (!materialId || !type?.trim() || !description?.trim()) return bad(res, 'Lot bahan, jenis kasus, dan deskripsi wajib diisi.');
  const db = readDb(); const material = db.materials.find((m) => m.id === materialId);
  if (!material) return bad(res, 'Bahan tidak ditemukan.');
  const item = { id: makeId('CAS'), code: `RISK-${Date.now().toString().slice(-5)}`, materialId, type: type.trim(), severity: severity || 'Sedang', status: 'Baru', description: description.trim(), action: action || '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  db.cases.unshift(item); writeDb(db); logAction('Kasus risiko dibuat', `${item.type} · ${material.supplierLot}`); res.status(201).json(item);
});
app.put('/api/cases/:id', (req, res) => {
  const db = readDb(); const idx = db.cases.findIndex((c) => c.id === req.params.id);
  if (idx < 0) return bad(res, 'Kasus tidak ditemukan.', 404);
  db.cases[idx] = { ...db.cases[idx], ...req.body, id: db.cases[idx].id, updatedAt: new Date().toISOString() };
  writeDb(db); logAction('Penanganan kasus diperbarui', `${db.cases[idx].code} · ${db.cases[idx].status}`); res.json(db.cases[idx]);
});

app.get('/api/verify/:code', (req, res) => {
  const db = readDb();
  const code = decodeURIComponent(req.params.code).toLowerCase();
  const production = db.productions.find((p) => p.code.toLowerCase() === code || p.id.toLowerCase() === code);
  if (!production) return bad(res, 'Kode batch tidak ditemukan dalam catatan demo.', 404);
  const linkedMaterials = production.materials.map((item) => {
    const material = db.materials.find((m) => m.id === item.materialId);
    return material ? { name: material.name, supplierLot: material.supplierLot, condition: material.condition } : null;
  }).filter(Boolean);
  const distributions = db.distributions.filter((d) => d.productionId === production.id).map((d) => ({ code: d.code, destination: d.destination, portions: d.portions, dispatchTime: d.dispatchTime, status: d.status }));
  res.json({ code: production.code, date: production.date, menu: production.menu, portions: production.portions, status: production.status, materials: linkedMaterials, distributions });
});

app.get('/api/audit', (_req, res) => res.json(readDb().audit));
app.post('/api/reset-demo', (_req, res) => { const db = resetDb(); res.json({ ok: true, summary: { materials: db.materials.length, productions: db.productions.length, distributions: db.distributions.length } }); });

const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(distPath, 'index.html'), (err) => { if (err) res.status(404).send('Build frontend belum tersedia. Jalankan npm run dev untuk mode pengembangan.'); });
});

app.listen(PORT, () => console.log(`SajiTrace API berjalan di http://localhost:${PORT}`));
