import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
const dbFile = path.join(dataDir, 'sajitrace.json');

function seed() {
  const today = new Date();
  const date = (offset) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  };
  return {
    materials: [
      { id: 'MAT-001', name: 'Ayam fillet', category: 'Protein hewani', supplier: 'Peternakan Sejahtera', supplierLot: 'LOT-001', receivedDate: date(-1), expiryDate: date(2), quantity: 42, unit: 'kg', condition: 'Perlu pemeriksaan', notes: 'Contoh lot untuk demo penelusuran', createdAt: new Date().toISOString() },
      { id: 'MAT-002', name: 'Beras medium', category: 'Karbohidrat', supplier: 'Tani Makmur Bersama', supplierLot: 'LOT-002', receivedDate: date(-2), expiryDate: date(180), quantity: 80, unit: 'kg', condition: 'Baik', notes: '', createdAt: new Date().toISOString() },
      { id: 'MAT-003', name: 'Wortel', category: 'Sayuran', supplier: 'Koperasi Tani Banyumas', supplierLot: 'LOT-003', receivedDate: date(-1), expiryDate: date(4), quantity: 24, unit: 'kg', condition: 'Baik', notes: '', createdAt: new Date().toISOString() },
      { id: 'MAT-004', name: 'Telur ayam', category: 'Protein hewani', supplier: 'CV Sumber Protein', supplierLot: 'LOT-004', receivedDate: date(-1), expiryDate: date(12), quantity: 360, unit: 'butir', condition: 'Baik', notes: '', createdAt: new Date().toISOString() },
      { id: 'MAT-005', name: 'Minyak goreng', category: 'Bahan pendukung', supplier: 'Pangan Jaya', supplierLot: 'LOT-005', receivedDate: date(-3), expiryDate: date(240), quantity: 20, unit: 'liter', condition: 'Baik', notes: '', createdAt: new Date().toISOString() }
    ],
    productions: [
      { id: 'PRD-101', code: 'B-101', date: date(0), menu: 'Nasi ayam wortel', portions: 180, status: 'Selesai', notes: 'Produksi pagi', materials: [{ materialId: 'MAT-001', quantity: 18, unit: 'kg' }, { materialId: 'MAT-002', quantity: 27, unit: 'kg' }, { materialId: 'MAT-003', quantity: 8, unit: 'kg' }], createdAt: new Date().toISOString() },
      { id: 'PRD-102', code: 'B-102', date: date(0), menu: 'Nasi ayam telur', portions: 140, status: 'Selesai', notes: 'Produksi gelombang kedua', materials: [{ materialId: 'MAT-001', quantity: 14, unit: 'kg' }, { materialId: 'MAT-002', quantity: 22, unit: 'kg' }, { materialId: 'MAT-004', quantity: 90, unit: 'butir' }], createdAt: new Date().toISOString() },
      { id: 'PRD-103', code: 'B-103', date: date(0), menu: 'Nasi telur sayur', portions: 120, status: 'Dalam proses', notes: '', materials: [{ materialId: 'MAT-002', quantity: 18, unit: 'kg' }, { materialId: 'MAT-003', quantity: 6, unit: 'kg' }, { materialId: 'MAT-004', quantity: 72, unit: 'butir' }], createdAt: new Date().toISOString() }
    ],
    distributions: [
      { id: 'DST-101', code: 'DST-101', productionId: 'PRD-101', destination: 'SD Negeri 1 Banyumas', address: 'Banyumas, Jawa Tengah', recipientType: 'Sekolah', portions: 100, dispatchTime: date(0) + 'T08:00', status: 'Diterima', receiver: 'Petugas sekolah', notes: 'Bukti penerimaan demo', createdAt: new Date().toISOString() },
      { id: 'DST-102', code: 'DST-102', productionId: 'PRD-101', destination: 'SD Negeri 2 Purwokerto', address: 'Purwokerto, Jawa Tengah', recipientType: 'Sekolah', portions: 80, dispatchTime: date(0) + 'T08:15', status: 'Dalam perjalanan', receiver: '', notes: '', createdAt: new Date().toISOString() },
      { id: 'DST-103', code: 'DST-103', productionId: 'PRD-102', destination: 'MI Cendekia Utama', address: 'Purwokerto, Jawa Tengah', recipientType: 'Sekolah', portions: 140, dispatchTime: date(0) + 'T08:30', status: 'Disiapkan', receiver: '', notes: '', createdAt: new Date().toISOString() }
    ],
    cases: [
      { id: 'CAS-001', code: 'RISK-001', materialId: 'MAT-003', type: 'Dokumen pemeriksaan belum lengkap', severity: 'Sedang', status: 'Dalam pemeriksaan', description: 'Lengkapi catatan pemeriksaan penerimaan sebelum batch digunakan.', action: 'Petugas gudang diminta melengkapi catatan dan bukti pemeriksaan.', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ],
    audit: [
      { id: 'LOG-001', action: 'Sistem demo diinisialisasi', detail: 'Data contoh SajiTrace berhasil dimuat.', time: new Date().toISOString(), actor: 'Sistem' }
    ]
  };
}

fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, JSON.stringify(seed(), null, 2));

let cache;
export function readDb() {
  if (!cache) cache = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
  return cache;
}
export function writeDb(next) {
  cache = next;
  const temp = dbFile + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(next, null, 2));
  fs.renameSync(temp, dbFile);
}
export function resetDb() {
  cache = seed();
  writeDb(cache);
  return cache;
}
export function logAction(action, detail, actor = 'Admin SPPG') {
  const db = readDb();
  db.audit.unshift({ id: `LOG-${Date.now()}`, action, detail, time: new Date().toISOString(), actor });
  db.audit = db.audit.slice(0, 150);
  writeDb(db);
}
