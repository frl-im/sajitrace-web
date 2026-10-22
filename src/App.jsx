import { useCallback, useEffect, useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Activity, AlertCircle, AlertTriangle, ArrowRight, ArrowUpRight, Bell,
  CalendarDays, Check, CheckCircle2, ChevronDown, ChevronRight, CircleHelp,
  ClipboardCheck, ClipboardList, Clock3, CookingPot, FileClock, Filter, Home, Leaf,
  ListFilter, LoaderCircle, MapPin, Menu, Package, PackageCheck, Plus, QrCode,
  RefreshCw, Search, ShieldAlert, ShieldCheck, Truck, Utensils, X, Zap, Sprout,
  Printer, ExternalLink, Copy, Play, Sparkles
} from 'lucide-react';

const NAV = [
  { id: 'dashboard', label: 'Ringkasan', icon: Home, group: 'WORKSPACE' },
  { id: 'materials', label: 'Bahan pangan', icon: Package, group: 'WORKSPACE' },
  { id: 'production', label: 'Batch produksi', icon: CookingPot, group: 'WORKSPACE' },
  { id: 'distribution', label: 'Distribusi', icon: Truck, group: 'WORKSPACE' },
  { id: 'trace', label: 'Telusuri batch', icon: Activity, group: 'TRACEABILITY' },
  { id: 'cases', label: 'Pusat risiko', icon: ShieldAlert, group: 'TRACEABILITY' },
];

const CATEGORIES = [
  'Semua kategori',
  'Protein hewani',
  'Protein nabati',
  'Karbohidrat',
  'Sayuran',
  'Buah',
  'Bahan pendukung'
];

const fmtDate = (value, options = { day: '2-digit', month: 'short', year: 'numeric' }) => {
  if (!value) return '—';
  const parsed = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat('id-ID', options).format(parsed);
};

const number = (n) => new Intl.NumberFormat('id-ID').format(Number(n || 0));
const shortDate = (v) => fmtDate(v, { day: '2-digit', month: 'short' });

const statusTone = (status = '') => {
  const s = String(status).toLowerCase();
  if (['baik', 'selesai', 'diterima', 'terverifikasi', 'ditutup', 'rendah'].some((x) => s.includes(x))) return 'good';
  if (['perlu pemeriksaan', 'dalam pemeriksaan', 'perjalanan', 'dalam proses', 'sedang', 'menunggu konfirmasi'].some((x) => s.includes(x))) return 'warn';
  if (['baru', 'belum', 'kadaluwarsa', 'ditahan', 'risiko', 'gagal', 'tinggi'].some((x) => s.includes(x))) return 'danger';
  return 'neutral';
};

const api = async (path, options = {}) => {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Permintaan gagal. Silakan coba lagi.');
  return data;
};

function StatusPill({ children, tone }) {
  return (
    <span className={`status-pill ${tone || statusTone(children)}`}>
      <span className="status-dot" />
      {children}
    </span>
  );
}

function SectionTitle({ eyebrow, title, description, action }) {
  return (
    <div className="section-title">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

function Button({ children, variant = 'primary', size = '', onClick, disabled, type = 'button', icon: Icon, title }) {
  return (
    <button type={type} className={`btn ${variant} ${size}`} onClick={onClick} disabled={disabled} title={title}>
      {Icon && <Icon size={16} strokeWidth={2} />}
      {children}
    </button>
  );
}

function EmptyState({ icon: Icon = Package, title, description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Icon size={26} strokeWidth={1.75} /></div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

function StatCard({ label, value, note, icon: Icon, color = 'blue', trend }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <span className={`stat-icon ${color}`}><Icon size={20} strokeWidth={1.8} /></span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-bottom">
        <span className="stat-note">{note}</span>
        {trend && <span className="stat-trend"><ArrowUpRight size={13} strokeWidth={2.5} />{trend}</span>}
      </div>
    </div>
  );
}

function Modal({ title, description, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-heading">
        <div className="modal-header">
          <div>
            <h2 id="modal-heading">{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Tutup"><X size={19} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children, required, hint }) {
  return (
    <label className="field">
      <span className="field-label">{label}{required && <b> *</b>}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

function App() {
  const isVerifyPath = window.location.pathname.startsWith('/verifikasi/');
  if (isVerifyPath) {
    const code = decodeURIComponent(window.location.pathname.split('/').filter(Boolean).at(-1) || '');
    return <VerificationPage code={code} />;
  }
  return <MainApp />;
}

function MainApp() {
  const [page, setPage] = useState('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [summary, setSummary] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [productions, setProductions] = useState([]);
  const [distributions, setDistributions] = useState([]);
  const [cases, setCases] = useState([]);
  const [audit, setAudit] = useState([]);
  const [materialSearch, setMaterialSearch] = useState('');
  const [materialCategory, setMaterialCategory] = useState('Semua kategori');
  const [distributionFilter, setDistributionFilter] = useState('Semua status');
  const [traceTerm, setTraceTerm] = useState('LOT-001');
  const [traceResult, setTraceResult] = useState(null);
  const [traceError, setTraceError] = useState('');
  const [modal, setModal] = useState(null);
  const [selectedProductionForQr, setSelectedProductionForQr] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const flash = useCallback((message) => {
    setToast(message);
  }, []);

  const reload = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    setError('');
    try {
      const [s, m, p, d, c, a] = await Promise.all([
        api('/api/summary'),
        api('/api/materials'),
        api('/api/productions'),
        api('/api/distributions'),
        api('/api/cases'),
        api('/api/audit')
      ]);
      setSummary(s);
      setMaterials(m);
      setProductions(p);
      setDistributions(d);
      setCases(c);
      setAudit(a);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(''), 3500);
    return () => window.clearTimeout(id);
  }, [toast]);

  // Global Ctrl+K / Cmd+K handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[data-search]');
        if (searchInput) {
          searchInput.focus();
        } else {
          setPage('materials');
          setTimeout(() => {
            const input = document.querySelector('input[data-search]');
            if (input) input.focus();
          }, 100);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const runTrace = async (query = traceTerm) => {
    setTraceError('');
    setTraceResult(null);
    try {
      const result = await api(`/api/trace?q=${encodeURIComponent(query)}`);
      setTraceResult(result);
      setTraceTerm(query);
    } catch (e) {
      setTraceError(e.message);
    }
  };

  const navigate = useCallback((id) => {
    setPage(id);
    if (id === 'trace' && !traceResult && !traceError) {
      runTrace(traceTerm);
    }
  }, [traceResult, traceError, traceTerm]);

  const createResource = async (path, body, label) => {
    setSubmitting(true);
    try {
      await api(path, { method: 'POST', body });
      setModal(null);
      await reload(true);
      flash(label);
    } catch (e) {
      flash(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const updateResource = async (path, body, label) => {
    setSubmitting(true);
    try {
      await api(path, { method: 'PUT', body });
      setModal(null);
      await reload(true);
      if (page === 'trace' && traceTerm) {
        try {
          const result = await api(`/api/trace?q=${encodeURIComponent(traceTerm)}`);
          setTraceResult(result);
        } catch {}
      }
      flash(label);
    } catch (e) {
      flash(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const [simulationRunning, setSimulationRunning] = useState(false);
  const [simStepText, setSimStepText] = useState('');
  const simulationAbortRef = useRef(false);

  const startSimulation = useCallback(async () => {
    if (simulationRunning) return;
    setSimulationRunning(true);
    simulationAbortRef.current = false;

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const isAborted = () => simulationAbortRef.current;

    try {
      // 1. Dashboard Overview
      setSimStepText('Langkah 1/6: Meninjau Dasbor Operasional SPPG...');
      setPage('dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await sleep(1500);
      if (isAborted()) return;

      // 2. Go to Materials
      setSimStepText('Langkah 2/6: Membuka Inventaris Bahan & Mendaftarkan Daging Sapi (LOT-007)...');
      setPage('materials');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await sleep(1200);
      if (isAborted()) return;

      const newLotCode = 'LOT-007';
      const newMaterial = {
        name: 'Daging Sapi Segar',
        category: 'Protein hewani',
        supplier: 'CV Sumber Berkah Ternak',
        supplierLot: newLotCode,
        receivedDate: new Date().toISOString().slice(0, 10),
        expiryDate: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
        quantity: 35,
        unit: 'kg',
        condition: 'Baik',
        notes: 'Pemeriksaan suhu chiller 4°C - Lolos QC'
      };

      try {
        await api('/api/materials', { method: 'POST', body: newMaterial });
      } catch (e) {}
      await reload(true);
      flash(`Lot ${newLotCode} (Daging Sapi) berhasil dicatat.`);
      await sleep(1400);
      if (isAborted()) return;

      // 3. Go to Production
      setSimStepText('Langkah 3/6: Memproses Daging Sapi ke Batch Dapur B-104 (150 Porsi)...');
      setPage('production');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await sleep(1200);
      if (isAborted()) return;

      const currentMaterials = await api('/api/materials');
      const foundMat = currentMaterials.find((m) => m.supplierLot === newLotCode) || currentMaterials[0];
      const riceMat = currentMaterials.find((m) => m.name.toLowerCase().includes('beras')) || currentMaterials[1];

      const newBatchCode = 'B-104';
      const newProduction = {
        code: newBatchCode,
        date: new Date().toISOString().slice(0, 10),
        menu: 'Semur Daging Sapi + Nasi Sayur',
        portions: 150,
        status: 'Selesai',
        notes: 'Produksi menu makan siang gizi seimbang',
        materials: [
          { materialId: foundMat.id, quantity: 18, unit: 'kg' },
          ...(riceMat ? [{ materialId: riceMat.id, quantity: 22, unit: 'kg' }] : [])
        ]
      };

      let createdProd;
      try {
        createdProd = await api('/api/productions', { method: 'POST', body: newProduction });
      } catch (e) {
        const prods = await api('/api/productions');
        createdProd = prods.find((p) => p.code === newBatchCode) || prods[0];
      }
      await reload(true);
      flash(`Batch produksi ${newBatchCode} selesai diolah.`);
      await sleep(1400);
      if (isAborted()) return;

      // 4. Go to Distribution
      setSimStepText('Langkah 4/6: Mengalokasikan Pengiriman ke SD Negeri 4 Banyumas...');
      setPage('distribution');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await sleep(1200);
      if (isAborted()) return;

      const newDistribution = {
        productionId: createdProd.id,
        destination: 'SD Negeri 4 Banyumas',
        address: 'Kec. Banyumas, Kab. Banyumas',
        recipientType: 'Sekolah',
        portions: 150,
        dispatchTime: new Date().toISOString().slice(0, 16),
        status: 'Diterima',
        receiver: 'Bpk. Joko Santoso (Kepala Sekolah)',
        notes: 'Serah terima makanan hangat tepat waktu.'
      };

      try {
        await api('/api/distributions', { method: 'POST', body: newDistribution });
      } catch (e) {}
      await reload(true);
      flash('Distribusi 150 porsi dikonfirmasi diterima oleh Bpk. Joko.');
      await sleep(1400);
      if (isAborted()) return;

      // 5. Go to Traceability
      setSimStepText(`Langkah 5/6: Menjalankan Penelusuran 2-Arah untuk ${newLotCode}...`);
      setPage('trace');
      setTraceTerm(newLotCode);
      await runTrace(newLotCode);
      window.scrollTo({ top: 220, behavior: 'smooth' });
      await sleep(2000);
      if (isAborted()) return;

      window.scrollTo({ top: 520, behavior: 'smooth' });
      await sleep(2200);
      if (isAborted()) return;

      // 6. QR Code modal
      setSimStepText(`Langkah 6/6: Membuka QR Verifikasi Batch ${newBatchCode}...`);
      setSelectedProductionForQr(createdProd);
      await sleep(2400);
      setSelectedProductionForQr(null);
      if (isAborted()) return;

      setSimStepText('🎉 Simulasi Selesai! Seluruh alur (Bahan → Dapur → Distribusi → Trace) terverifikasi.');
      await sleep(3000);
    } finally {
      setSimulationRunning(false);
      setSimStepText('');
    }
  }, [simulationRunning, reload, flash]);

  useEffect(() => {
    window.startSajiTraceSimulation = startSimulation;
  }, [startSimulation]);

  const heading = NAV.find((n) => n.id === page)?.label || 'Ringkasan';
  const filteredMaterials = materials.filter((m) => {
    const matchesSearch = [m.name, m.supplier, m.supplierLot, m.category].join(' ').toLowerCase().includes(materialSearch.toLowerCase());
    const matchesCategory = materialCategory === 'Semua kategori' || m.category === materialCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredDistributions = distributions.filter((d) => distributionFilter === 'Semua status' || d.status === distributionFilter);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="brand-mark large"><Leaf size={28} /></div>
        <LoaderCircle className="spin" size={26} />
        <p>Menyiapkan sistem SajiTrace...</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Leaf size={22} /></div>
          <div>
            <strong>SajiTrace</strong>
            <span>FOOD TRACEABILITY</span>
          </div>
          <button className="icon-btn" style={{ marginLeft: 'auto', display: mobileNavOpen ? 'flex' : 'none' }} onClick={() => setMobileNavOpen(false)} aria-label="Tutup menu">
            <X size={18} />
          </button>
        </div>

        <div className="workspace-select">
          <div className="workspace-avatar">SP</div>
          <div className="workspace-text">
            <strong>SPPG Banyumas 01</strong>
            <span>Unit Dapur & Distribusi MBG</span>
          </div>
          <ChevronDown size={15} color="#94a3b8" />
        </div>

        <nav className="side-nav">
          {['WORKSPACE', 'TRACEABILITY'].map((group) => (
            <div className="nav-group" key={group}>
              <div className="nav-group-label">{group}</div>
              {NAV.filter((n) => n.group === group).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  className={`nav-item ${page === id ? 'active' : ''}`}
                  onClick={() => {
                    navigate(id);
                    setMobileNavOpen(false);
                  }}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                  {id === 'cases' && cases.some((c) => !['Selesai', 'Ditutup'].includes(c.status)) && (
                    <i className="nav-count">{cases.filter((c) => !['Selesai', 'Ditutup'].includes(c.status)).length}</i>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon"><CircleHelp size={18} /></div>
            <strong>Panduan Singkat Demo</strong>
            <p>Alur simulasi penelusuran lot ke batch dan tujuan sekolah.</p>
            <button onClick={() => setModal({ type: 'help' })}>
              Buka panduan <ArrowRight size={13} />
            </button>
          </div>

          <div className="sidebar-user">
            <div className="user-avatar">AD</div>
            <div className="user-info">
              <strong>Admin SPPG</strong>
              <span>Operasional Demo</span>
            </div>
            <button className="icon-btn" title="Info akun" onClick={() => setModal({ type: 'account' })}>
              <ChevronDown size={16} />
            </button>
          </div>
        </div>
      </aside>

      {mobileNavOpen && <button className="mobile-scrim" aria-label="Tutup navigasi" onClick={() => setMobileNavOpen(false)} />}

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-btn" style={{ marginRight: 6 }} onClick={() => setMobileNavOpen(true)} aria-label="Buka navigasi">
              <Menu size={20} />
            </button>
            <div className="breadcrumb">
              Workspace <ChevronRight size={13} /> <strong>{heading}</strong>
            </div>
          </div>

          <div className="topbar-actions">
            <Button
              variant={simulationRunning ? 'outline' : 'soft-primary'}
              size="sm"
              onClick={simulationRunning ? () => { simulationAbortRef.current = true; setSimulationRunning(false); } : startSimulation}
              icon={simulationRunning ? RefreshCw : Sparkles}
              title="Jalankan simulasi otomatis alur operasional"
            >
              {simulationRunning ? 'Hentikan Simulasi' : 'Mulai Simulasi Otomatis'}
            </Button>
            <div className="environment-pill">
              <span /> LINGKUNGAN DEMO SPPG
            </div>
            <button
              className="icon-btn notifications"
              onClick={() => setPage('cases')}
              title="Notifikasi insiden dan risiko"
              aria-label="Notifikasi insiden"
            >
              <Bell size={18} />
              {cases.some((c) => !['Selesai', 'Ditutup'].includes(c.status)) && <i />}
            </button>
            <div className="topbar-divider" />
            <button className="user-chip" onClick={() => setModal({ type: 'account' })}>
              <span className="user-avatar small">AD</span>
              <span>Admin SPPG</span>
              <ChevronDown size={14} color="#64748b" />
            </button>
          </div>
        </header>

        <div className="page-content">
          {error && (
            <div className="banner danger-banner">
              <AlertCircle size={20} />
              <div>
                <strong>Layanan API belum terhubung</strong>
                <p>{error}. Pastikan server backend sudah berjalan di port 4000.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => reload()} icon={RefreshCw}>
                Coba lagi
              </Button>
            </div>
          )}

          {page === 'dashboard' && (
            <Dashboard
              summary={summary}
              materials={materials}
              productions={productions}
              distributions={distributions}
              cases={cases}
              audit={audit}
              onNavigate={navigate}
              onAddMaterial={() => setModal({ type: 'material' })}
              onTrace={(q) => {
                setTraceTerm(q);
                setPage('trace');
                runTrace(q);
              }}
              onReset={async () => {
                if (!window.confirm('Kembalikan semua data ke data demo awal? Data yang ditambahkan akan hilang.')) return;
                try {
                  await api('/api/reset-demo', { method: 'POST' });
                  await reload(true);
                  setTraceResult(null);
                  flash('Data demo berhasil direset.');
                } catch (e) {
                  flash(e.message);
                }
              }}
            />
          )}

          {page === 'materials' && (
            <MaterialsPage
              materials={filteredMaterials}
              total={materials.length}
              search={materialSearch}
              onSearch={setMaterialSearch}
              category={materialCategory}
              onCategoryChange={setMaterialCategory}
              onAdd={() => setModal({ type: 'material' })}
              onEdit={(item) => setModal({ type: 'edit-material', item })}
              onTrace={(q) => {
                setPage('trace');
                setTraceTerm(q);
                runTrace(q);
              }}
            />
          )}

          {page === 'production' && (
            <ProductionPage
              productions={productions}
              materials={materials}
              onAdd={() => setModal({ type: 'production' })}
              onQr={(p) => setSelectedProductionForQr(p)}
            />
          )}

          {page === 'distribution' && (
            <DistributionPage
              distributions={filteredDistributions}
              productions={productions}
              filter={distributionFilter}
              setFilter={setDistributionFilter}
              onAdd={() => setModal({ type: 'distribution' })}
              onUpdate={(item) => setModal({ type: 'edit-distribution', item })}
            />
          )}

          {page === 'trace' && (
            <TracePage
              term={traceTerm}
              setTerm={setTraceTerm}
              result={traceResult}
              error={traceError}
              onSearch={(q) => runTrace(q)}
              onCreateCase={(material) => setModal({ type: 'case', item: material ? { materialId: material.id } : null })}
              onQr={(p) => setSelectedProductionForQr(p)}
            />
          )}

          {page === 'cases' && (
            <CasesPage
              cases={cases}
              materials={materials}
              onAdd={() => setModal({ type: 'case' })}
              onUpdate={(item) => setModal({ type: 'edit-case', item })}
              onTrace={(m) => {
                setTraceTerm(m.supplierLot);
                setPage('trace');
                runTrace(m.supplierLot);
              }}
            />
          )}
        </div>

        <footer className="app-footer">
          <span>© 2026 SajiTrace · Sistem Ketertelusuran Pangan SPPG</span>
          <span>
            <span className="footer-dot" /> Database Demo Lokal
            <span className="footer-sep">·</span>
            <button onClick={() => setModal({ type: 'about' })}>Tentang Aplikasi</button>
          </span>
        </footer>
      </main>

      {/* Modals */}
      {modal?.type === 'material' && (
        <Modal title="Tambah Lot Bahan Pangan" description="Catat bahan yang diterima beserta nomor lot dari pemasok." onClose={() => setModal(null)}>
          <MaterialForm submitting={submitting} onCancel={() => setModal(null)} onSubmit={(body) => createResource('/api/materials', body, 'Bahan pangan berhasil dicatat.')} />
        </Modal>
      )}

      {modal?.type === 'edit-material' && (
        <Modal title="Perbarui Bahan Pangan" description={`Perbarui catatan untuk lot ${modal.item.supplierLot}.`} onClose={() => setModal(null)}>
          <MaterialForm item={modal.item} submitting={submitting} onCancel={() => setModal(null)} onSubmit={(body) => updateResource(`/api/materials/${modal.item.id}`, body, 'Data bahan berhasil diperbarui.')} />
        </Modal>
      )}

      {modal?.type === 'production' && (
        <Modal title="Buat Batch Produksi Dapur" description="Hubungkan batch masakan dengan lot bahan baku yang digunakan." onClose={() => setModal(null)} wide>
          <ProductionForm materials={materials} submitting={submitting} onCancel={() => setModal(null)} onSubmit={(body) => createResource('/api/productions', body, 'Batch produksi berhasil dibuat.')} />
        </Modal>
      )}

      {modal?.type === 'distribution' && (
        <Modal title="Catat Pengiriman Distribusi" description="Alokasikan jumlah porsi dari batch produksi ke sekolah penerima." onClose={() => setModal(null)}>
          <DistributionForm productions={productions} distributions={distributions} submitting={submitting} onCancel={() => setModal(null)} onSubmit={(body) => createResource('/api/distributions', body, 'Distribusi berhasil dicatat.')} />
        </Modal>
      )}

      {modal?.type === 'edit-distribution' && (
        <Modal title="Perbarui Status Distribusi" description={`${modal.item.code} · ${modal.item.destination}`} onClose={() => setModal(null)}>
          <DistributionUpdateForm item={modal.item} submitting={submitting} onCancel={() => setModal(null)} onSubmit={(body) => updateResource(`/api/distributions/${modal.item.id}`, body, 'Status distribusi diperbarui.')} />
        </Modal>
      )}

      {modal?.type === 'case' && (
        <Modal title="Catat Temuan / Insiden Risiko" description="Dokumentasikan lot yang perlu diteliti dan telusuri potensi dampaknya." onClose={() => setModal(null)} wide>
          <CaseForm materials={materials} item={modal.item} submitting={submitting} onCancel={() => setModal(null)} onSubmit={(body) => createResource('/api/cases', body, 'Catatan risiko berhasil dibuat.')} />
        </Modal>
      )}

      {modal?.type === 'edit-case' && (
        <Modal title="Tindak Lanjuti Penanganan Risiko" description={`${modal.item.code} · ${modal.item.type}`} onClose={() => setModal(null)} wide>
          <CaseUpdateForm item={modal.item} submitting={submitting} onCancel={() => setModal(null)} onSubmit={(body) => updateResource(`/api/cases/${modal.item.id}`, body, 'Penanganan risiko diperbarui.')} />
        </Modal>
      )}

      {modal?.type === 'help' && (
        <Modal title="Panduan Alur Demo SajiTrace" description="Langkah-langkah yang direkomendasikan saat presentasi." onClose={() => setModal(null)}>
          <div className="help-steps">
            <div>
              <b>01</b>
              <span>
                <strong>Inventaris Bahan Masuk</strong>
                <small>Buka menu Bahan Pangan, amati kode lot pemasok unik (seperti LOT-001).</small>
              </span>
            </div>
            <div>
              <b>02</b>
              <span>
                <strong>Pengolahan Batch Dapur</strong>
                <small>Buka Batch Produksi untuk melihat menu masakan yang mengonsumsi lot tersebut.</small>
              </span>
            </div>
            <div>
              <b>03</b>
              <span>
                <strong>Distribusi & Serah Terima</strong>
                <small>Buka Distribusi untuk melihat alokasi porsi dan konfirmasi tanda terima sekolah.</small>
              </span>
            </div>
            <div>
              <b>04</b>
              <span>
                <strong>Simulasi Penelusuran Cepat (2-Arah)</strong>
                <small>Gunakan Telusuri Batch dengan query LOT-001 untuk memetakan seluruh rantai dan titik sekolah terdampak dalam hitungan detik.</small>
              </span>
            </div>
          </div>
          <div className="modal-actions">
            <Button variant="primary" onClick={() => { setModal(null); setPage('trace'); setTraceTerm('LOT-001'); runTrace('LOT-001'); }}>
              Coba Penelusuran LOT-001 <ArrowRight size={15} />
            </Button>
          </div>
        </Modal>
      )}

      {modal?.type === 'account' && (
        <Modal title="Informasi Ruang Kerja Demo" description="Status lingkungan prototipe SPPG." onClose={() => setModal(null)}>
          <div className="form-body" style={{ padding: '0 28px 24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Satuan Layanan</span>
                <strong style={{ fontSize: 13 }}>SPPG Banyumas 01</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Peran Aktif</span>
                <strong style={{ fontSize: 13 }}>Petugas Pengawas Dapur (Simulasi)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Database</span>
                <strong style={{ fontSize: 13 }}>File JSON Persisten Lokal</strong>
              </div>
            </div>
            <div className="form-notice">
              <AlertTriangle size={18} />
              <span>Sistem ini merupakan prototipe demonstrasi teknis untuk pembuktian konsep traceability batch pangan, bukan alat vonis keamanan pangan pengganti uji laboratorium.</span>
            </div>
          </div>
        </Modal>
      )}

      {modal?.type === 'about' && (
        <Modal title="Tentang SajiTrace" description="Sistem Ketertelusuran Pangan untuk SPPG / MBG" onClose={() => setModal(null)}>
          <div className="form-body" style={{ padding: '0 28px 24px' }}>
            <p style={{ fontSize: 14, color: 'var(--color-slate-700)', lineHeight: 1.6, margin: '0 0 16px' }}>
              <strong>SajiTrace</strong> dirancang untuk menyelesaikan titik buta (*blind spot*) dalam rantai pengolahan makanan massal program gizi anak sekolah. Ketika terjadi isu keamanan pangan atau bahan baku rusak, SajiTrace memungkinkan petugas menelusuri secara instan asal bahan baku, batch masakan terkait, serta sekolah penerima yang harus segera diamankan.
            </p>
            <div className="form-notice">
              <ShieldCheck size={18} />
              <span>Dibangun dengan React 19, Vite, Express.js, QR Verification Engine, serta arsitektur data relasional batch & lot.</span>
            </div>
          </div>
        </Modal>
      )}

      {selectedProductionForQr && (
        <Modal title="QR Code Verifikasi Batch" description={`Bagikan tautan verifikasi publik untuk ${selectedProductionForQr.code}.`} onClose={() => setSelectedProductionForQr(null)}>
          <div className="qr-panel">
            <div className="qr-frame">
              <QRCodeSVG
                value={`${window.location.origin}/verifikasi/${encodeURIComponent(selectedProductionForQr.code)}`}
                size={180}
                level="M"
                includeMargin
              />
            </div>
            <strong>{selectedProductionForQr.code}</strong>
            <span>{selectedProductionForQr.menu}</span>
            <div className="copy-link">
              <input readOnly value={`${window.location.origin}/verifikasi/${selectedProductionForQr.code}`} onFocus={(e) => e.target.select()} />
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(`${window.location.origin}/verifikasi/${selectedProductionForQr.code}`);
                  flash('Tautan verifikasi batch disalin ke clipboard.');
                }}
                icon={Copy}
              >
                Salin
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => window.open(`/verifikasi/${selectedProductionForQr.code}`, '_blank')}
                icon={ExternalLink}
              >
                Buka
              </Button>
            </div>
            <p>Pindai dengan kamera ponsel untuk membuka halaman ringkasan publik tanpa mengekspos data pribadi.</p>
          </div>
        </Modal>
      )}

      {simulationRunning && (
        <div className="sim-tour-bar" role="status" aria-live="polite">
          <span className="sim-step-dot" />
          <span>{simStepText}</span>
          <button type="button" onClick={() => { simulationAbortRef.current = true; setSimulationRunning(false); }}>
            Hentikan
          </button>
        </div>
      )}

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <CheckCircle2 size={18} />
          <span>{toast}</span>
          <button onClick={() => setToast('')} aria-label="Tutup notifikasi"><X size={15} /></button>
        </div>
      )}

      <button className="floating-refresh" title="Segarkan data terbaru" onClick={() => reload(true)} disabled={refreshing}>
        {refreshing ? <LoaderCircle size={18} className="spin" /> : <RefreshCw size={18} />}
      </button>
    </div>
  );
}

function Dashboard({ summary, materials, productions, distributions, cases, audit, onNavigate, onAddMaterial, onTrace, onReset }) {
  const today = new Date().toISOString().slice(0, 10);
  const todayProd = productions.filter((p) => p.date === today);
  const totalToday = todayProd.reduce((s, p) => s + Number(p.portions || 0), 0);
  const maxPortions = Math.max(...productions.map((p) => Number(p.portions) || 0), 1);
  const priorityCases = cases.filter((c) => !['Selesai', 'Ditutup'].includes(c.status));

  return (
    <>
      <div className="welcome-banner">
        <div className="welcome-copy">
          <div className="welcome-tag">
            <Sprout size={15} /> SISTEM KETERTELUSURAN PANGAN SPPG
          </div>
          <h1>
            Monitoring Rantai Pasok Pangan<span>.</span>
          </h1>
          <p>
            Catat lot bahan baku dari pemasok, pantau batch pengolahan dapur gizi, dan awasi distribusi serah terima ke sekolah secara transparan & akuntabel.
          </p>
          <div className="welcome-actions">
            <Button onClick={() => onNavigate('trace')} icon={Search}>
              Mulai Telusuri Lot
            </Button>
            <Button variant="soft-light" onClick={onAddMaterial} icon={Plus}>
              Input Bahan Masuk
            </Button>
            <Button variant="soft-light" onClick={() => onNavigate('production')} icon={CookingPot}>
              Kelola Produksi
            </Button>
          </div>
        </div>

        <div className="welcome-stats-pill">
          <div className="pill-row">
            <span>Status Ketertelusuran</span>
            <strong>AKTIF (2-ARAH)</strong>
          </div>
          <div className="pill-row">
            <span>Kesiapan Dapur SPPG</span>
            <strong>NORMAL</strong>
          </div>
          <div className="pill-row">
            <span>Rencana Masak Hari Ini</span>
            <strong>{number(totalToday)} Porsi</strong>
          </div>
          <div className="pill-row">
            <span>Kasus Terbuka</span>
            <strong style={{ color: priorityCases.length > 0 ? '#fca5a5' : '#86efac' }}>
              {priorityCases.length} Kasus
            </strong>
          </div>
        </div>
      </div>

      <div className="date-line">
        <span>
          <CalendarDays size={16} /> {fmtDate(today, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
        <span className="demo-label">
          <span /> SIMULASI OPERASIONAL SPPG
        </span>
        <button onClick={onReset} title="Kembalikan data ke awal">
          Reset Data Simulasi
        </button>
      </div>

      <div className="stat-grid">
        <StatCard
          label="Lot Bahan Terdata"
          value={number(summary?.materials ?? materials.length)}
          note="Lot bahan di gudang SPPG"
          icon={Package}
          color="blue"
          trend="Aktif"
        />
        <StatCard
          label="Batch Produksi Hari Ini"
          value={number(summary?.productionToday ?? todayProd.length)}
          note={`${number(totalToday)} porsi disiapkan`}
          icon={CookingPot}
          color="green"
          trend="Dapur"
        />
        <StatCard
          label="Distribusi Berjalan"
          value={number(summary?.distributionsPending ?? distributions.filter((d) => !['Diterima', 'Dibatalkan'].includes(d.status)).length)}
          note="Dalam proses kirim / disiapkan"
          icon={Truck}
          color="purple"
        />
        <StatCard
          label="Catatan Risiko Terbuka"
          value={number(summary?.openCases ?? priorityCases.length)}
          note={`${number(summary?.affectedDestinations ?? 0)} lokasi terdampak`}
          icon={ShieldAlert}
          color="orange"
        />
      </div>

      <div className="dashboard-grid">
        <section className="panel production-panel">
          <div className="panel-heading">
            <div>
              <h2>Volume Produksi Porsi Per Batch</h2>
              <p>Perbandingan alokasi porsi yang dimasak pada setiap batch masakan</p>
            </div>
            <button className="text-action" onClick={() => onNavigate('production')}>
              Lihat semua <ArrowRight size={14} />
            </button>
          </div>

          {productions.length ? (
            <div className="chart-area">
              <div className="chart-y-labels">
                <span>{number(maxPortions)}</span>
                <span>{number(Math.round(maxPortions * 0.75))}</span>
                <span>{number(Math.round(maxPortions * 0.5))}</span>
                <span>{number(Math.round(maxPortions * 0.25))}</span>
                <span>0</span>
              </div>
              <div className="bar-chart">
                {productions.slice(0, 6).map((p, idx) => (
                  <div className="bar-column" key={p.id}>
                    <div className="bar-value">{number(p.portions)}</div>
                    <div className="bar-track">
                      <div
                        className={`bar-fill ${idx === 0 ? 'highlight' : ''}`}
                        style={{ height: `${Math.max(6, (p.portions / maxPortions) * 100)}%` }}
                        title={`${p.code}: ${number(p.portions)} porsi`}
                      />
                    </div>
                    <div className="bar-caption">{p.code}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState icon={CookingPot} title="Belum ada batch produksi" description="Buat batch masakan pertama untuk memulai pencatatan dapur." />
          )}

          <div className="chart-footer">
            <span>
              <i className="legend-dot" /> Jumlah porsi masakan terdistribusi
            </span>
            <span className="chart-footnote">* Berdasarkan data simulasi dapur SPPG</span>
          </div>
        </section>

        <section className="panel quick-panel">
          <div className="panel-heading">
            <div>
              <h2>Aksi Cepat Operasional</h2>
              <p>Jalur pintas alur kerja harian petugas SPPG</p>
            </div>
            <span className="heading-icon"><Zap size={18} /></span>
          </div>
          <div className="quick-links">
            <button onClick={onAddMaterial}>
              <span className="quick-icon blue"><Package size={20} /></span>
              <span>
                <strong>Penerimaan Bahan Pangan</strong>
                <small>Input lot kedatangan & cek kedaluwarsa</small>
              </span>
              <ChevronRight size={18} />
            </button>
            <button onClick={() => onNavigate('production')}>
              <span className="quick-icon green"><CookingPot size={20} /></span>
              <span>
                <strong>Jadwal Masak Batch Dapur</strong>
                <small>Tautkan lot bahan baku ke menu porsi</small>
              </span>
              <ChevronRight size={18} />
            </button>
            <button onClick={() => onNavigate('distribution')}>
              <span className="quick-icon purple"><Truck size={20} /></span>
              <span>
                <strong>Kirim Distribusi Makanan</strong>
                <small>Tujuan sekolah & bukti serah terima</small>
              </span>
              <ChevronRight size={18} />
            </button>
            <button onClick={() => onNavigate('trace')}>
              <span className="quick-icon orange"><Activity size={20} /></span>
              <span>
                <strong>Penelusuran Jejak Lot</strong>
                <small>Cek rantai bahan ke sekolah dalam detik</small>
              </span>
              <ChevronRight size={18} />
            </button>
          </div>
        </section>
      </div>

      <div className="dashboard-grid bottom-grid">
        <section className="panel table-panel">
          <div className="panel-heading">
            <div>
              <h2>Batch Masakan Dapur Terkini</h2>
              <p>Pencatatan produksi menu makan bergizi terbaru</p>
            </div>
            <button className="text-action" onClick={() => onNavigate('production')}>
              Semua batch <ArrowRight size={14} />
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Kode Batch</th>
                  <th>Menu Masakan</th>
                  <th>Jumlah Porsi</th>
                  <th>Tanggal</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {productions.slice(0, 4).map((p) => (
                  <tr key={p.id}>
                    <td><strong className="code-text">{p.code}</strong></td>
                    <td>
                      <div className="item-name">{p.menu}</div>
                      <small className="muted">{p.materials?.length || p.materialDetails?.length || 0} lot bahan tertaut</small>
                    </td>
                    <td><strong>{number(p.portions)}</strong> <span className="muted">porsi</span></td>
                    <td>{shortDate(p.date)}</td>
                    <td><StatusPill>{p.status}</StatusPill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel risk-panel">
          <div className="panel-heading">
            <div>
              <h2>Perhatian & Tindak Lanjut</h2>
              <p>Catatan insiden atau temuan mutu bahan</p>
            </div>
            <span className="risk-count">{priorityCases.length}</span>
          </div>
          {priorityCases.length ? (
            <div className="risk-list">
              {priorityCases.slice(0, 3).map((c) => (
                <button className="risk-row" key={c.id} onClick={() => onNavigate('cases')}>
                  <span className={`risk-mark ${statusTone(c.severity)}`}>
                    <AlertTriangle size={18} />
                  </span>
                  <span className="risk-content">
                    <strong>{c.type}</strong>
                    <small>
                      {c.material?.supplierLot || materials.find((m) => m.id === c.materialId)?.supplierLot || 'Lot bahan'} · {shortDate(c.createdAt)}
                    </small>
                  </span>
                  <ChevronRight size={17} />
                </button>
              ))}
            </div>
          ) : (
            <EmptyState icon={CheckCircle2} title="Tidak Ada Kasus Terbuka" description="Seluruh lot bahan dan distribusi dalam status terkendali." />
          )}
          <button className="risk-footer" onClick={() => onNavigate('cases')}>
            Buka Pusat Risiko & Mutu <ArrowRight size={14} />
          </button>
        </section>
      </div>

      <div className="audit-strip">
        <div className="audit-heading">
          <span className="audit-icon"><FileClock size={19} /></span>
          <div>
            <strong>Jejak Aktivitas</strong>
            <small>Log audit sistem otomatis</small>
          </div>
        </div>
        <div className="audit-items">
          {audit.slice(0, 3).map((a) => (
            <div key={a.id} className="audit-item">
              <span className="audit-dot" />
              <div>
                <strong>{a.action}</strong>
                <small>{a.detail}</small>
              </div>
              <time>{new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(a.time))}</time>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function MaterialsPage({ materials, total, search, onSearch, category, onCategoryChange, onAdd, onEdit, onTrace }) {
  return (
    <>
      <SectionTitle
        eyebrow="INVENTARIS & RANTAI PASOK"
        title="Bahan Pangan Masuk"
        description="Dokumentasikan lot bahan baku dari pemasok, tanggal kedatangan, kondisi awal, serta masa kedaluwarsa untuk memastikan ketertelusuran."
        action={<Button onClick={onAdd} icon={Plus}>Tambah Bahan Masuk</Button>}
      />

      <div className="summary-line">
        <div>
          <strong>{total} Lot Bahan Terdaftar di Sistem</strong>
          <span>Gunakan kode lot pemasok unik untuk menjaga validitas penelusuran jika timbul insiden.</span>
        </div>
        <div className="legend-inline">
          <span><i className="status-dot green-dot" /> Kondisi Baik</span>
          <span><i className="status-dot yellow-dot" /> Perlu Pemeriksaan</span>
        </div>
      </div>

      <div className="panel table-panel full-panel">
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={18} />
            <input
              data-search="true"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Cari nama bahan, pemasok, kode lot..."
            />
            <kbd>Ctrl+K</kbd>
          </div>

          <div className="filter-pills">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`filter-pill ${category === cat ? 'active' : ''}`}
                onClick={() => onCategoryChange(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {materials.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Bahan & Kategori</th>
                  <th>Kode Lot Pemasok</th>
                  <th>Nama Pemasok</th>
                  <th>Diterima</th>
                  <th>Kedaluwarsa</th>
                  <th>Stok Tercatat</th>
                  <th>Kondisi Awal</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => {
                  const isExpiringSoon = m.expiryDate && new Date(`${m.expiryDate}T00:00:00`) < new Date(Date.now() + 7 * 86400000);
                  return (
                    <tr key={m.id}>
                      <td>
                        <div className="table-main">
                          <span className="table-icon"><Package size={18} /></span>
                          <div>
                            <strong>{m.name}</strong>
                            <small>{m.category}</small>
                          </div>
                        </div>
                      </td>
                      <td><span className="code-text">{m.supplierLot}</span></td>
                      <td>{m.supplier}</td>
                      <td>{shortDate(m.receivedDate)}</td>
                      <td>
                        <span className={isExpiringSoon ? 'text-warn' : ''}>
                          {shortDate(m.expiryDate)}
                          {isExpiringSoon && ' (Segera)'}
                        </span>
                      </td>
                      <td>
                        <strong>{number(m.quantity)}</strong> <span className="muted">{m.unit}</span>
                      </td>
                      <td><StatusPill>{m.condition}</StatusPill></td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                          <button className="icon-btn" title="Telusuri Rantai Lot Ini" onClick={() => onTrace(m.supplierLot)}>
                            <Search size={16} />
                          </button>
                          <button className="icon-btn" title="Edit Data Bahan" onClick={() => onEdit(m)}>
                            <ChevronRight size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Package}
            title="Bahan Pangan Tidak Ditemukan"
            description="Tidak ada data lot yang sesuai dengan kata kunci atau kategori yang dipilih."
            action={<Button onClick={() => { onSearch(''); onCategoryChange('Semua kategori'); }}>Reset Filter</Button>}
          />
        )}
      </div>

      <div className="inline-note">
        <CircleHelp size={18} />
        <span>
          <strong>Kaidah Keamanan Pangan:</strong> Jangan pernah menggabungkan dua penerimaan berbeda ke dalam satu kode lot. Kode lot pemasok adalah jangkar utama (*traceability anchor*) saat melacak asal bahan.
        </span>
      </div>
    </>
  );
}

function ProductionPage({ productions, materials, onAdd, onQr }) {
  const totalPortions = productions.reduce((s, p) => s + Number(p.portions || 0), 0);
  const usedLotIds = new Set(productions.flatMap((p) => p.materials.map((m) => m.materialId)));

  return (
    <>
      <SectionTitle
        eyebrow="DAPUR GIZI & PENGOLAHAN"
        title="Batch Produksi Masakan"
        description="Hubungkan bahan baku ber-lot ke dalam batch masakan harian dengan jumlah porsi yang terukur."
        action={<Button onClick={onAdd} icon={Plus}>Buat Batch Masakan</Button>}
      />

      <div className="mini-stats three">
        <div>
          <span>Total Batch Tercatat</span>
          <strong>{productions.length}</strong>
          <small>Batch masakan di dapur SPPG</small>
        </div>
        <div>
          <span>Akumulasi Porsi Dihasilkan</span>
          <strong>{number(totalPortions)}</strong>
          <small>Porsi siap distribusi</small>
        </div>
        <div>
          <span>Lot Bahan Terintegrasi</span>
          <strong>{usedLotIds.size}</strong>
          <small>Lot bahan baku aktif digunakan</small>
        </div>
      </div>

      {productions.length ? (
        <div className="production-card-grid">
          {productions.map((p) => (
            <article className="production-card" key={p.id}>
              <div className="production-card-top">
                <div className="production-card-icon"><CookingPot size={22} /></div>
                <StatusPill>{p.status}</StatusPill>
              </div>
              <div className="batch-code-label">KODE BATCH MASAKAN</div>
              <h3>{p.code}</h3>
              <p className="production-menu">{p.menu}</p>

              <div className="production-meta">
                <span><CalendarDays size={15} /> {fmtDate(p.date)}</span>
                <span><Utensils size={15} /> {number(p.portions)} porsi</span>
              </div>

              <div className="ingredient-block">
                <div className="ingredient-heading">
                  KOMPOSISI LOT BAHAN <span>{p.materials.length} LOT</span>
                </div>
                {p.materials.map((x) => {
                  const mat = materials.find((m) => m.id === x.materialId);
                  return (
                    <div className="ingredient-row" key={x.materialId}>
                      <span className="ingredient-dot" />
                      <div>
                        {mat?.name || 'Bahan tidak ditemukan'}
                        <small>{mat?.supplierLot || x.materialId}</small>
                      </div>
                      <strong>{number(x.quantity)} {x.unit || mat?.unit}</strong>
                    </div>
                  );
                })}
              </div>

              <div className="production-card-bottom">
                <span className="small-muted">Tercatat {shortDate(p.createdAt)}</span>
                <Button size="sm" variant="outline" onClick={() => onQr(p)} icon={QrCode}>
                  QR Verifikasi
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={CookingPot}
          title="Belum Ada Batch Produksi"
          description="Buat batch produksi untuk mulai menghubungkan lot bahan pangan ke menu masakan."
          action={<Button onClick={onAdd} icon={Plus}>Buat Batch Baru</Button>}
        />
      )}
    </>
  );
}

function DistributionPage({ distributions, productions, filter, setFilter, onAdd, onUpdate }) {
  const total = distributions.reduce((s, d) => s + Number(d.portions || 0), 0);
  const delivered = distributions.filter((d) => d.status === 'Diterima').length;

  return (
    <>
      <SectionTitle
        eyebrow="LOGISTIK & SERAH TERIMA"
        title="Distribusi Makanan Sekolah"
        description="Pantau keberangkatan makanan bergizi dari dapur SPPG hingga serah terima yang terkonfirmasi oleh petugas sekolah."
        action={<Button onClick={onAdd} icon={Plus}>Catat Distribusi Baru</Button>}
      />

      <div className="mini-stats three">
        <div>
          <span>Total Pengiriman</span>
          <strong>{distributions.length}</strong>
          <small>Rute distribusi sekolah</small>
        </div>
        <div>
          <span>Total Porsi Dialokasikan</span>
          <strong>{number(total)}</strong>
          <small>Porsi makanan menuju lokasi</small>
        </div>
        <div>
          <span>Terkonfirmasi Diterima</span>
          <strong>{delivered}</strong>
          <small>Pengiriman selesai serah terima</small>
        </div>
      </div>

      <div className="panel table-panel full-panel">
        <div className="table-toolbar">
          <div>
            <h2 style={{ fontSize: 16, margin: 0, fontWeight: 700 }}>Daftar Pengiriman Sekolah</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0' }}>Setiap titik distribusi terhubung langsung ke batch dapur pengolah.</p>
          </div>

          <div className="filter-pills">
            {['Semua status', 'Disiapkan', 'Dalam perjalanan', 'Diterima', 'Dibatalkan'].map((st) => (
              <button
                key={st}
                type="button"
                className={`filter-pill ${filter === st ? 'active' : ''}`}
                onClick={() => setFilter(st)}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {distributions.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tujuan Penerima</th>
                  <th>Batch Masakan</th>
                  <th>Waktu Berangkat</th>
                  <th>Jumlah Porsi</th>
                  <th>Status</th>
                  <th>Petugas Penerima</th>
                  <th style={{ textAlign: 'right' }}>Konfirmasi</th>
                </tr>
              </thead>
              <tbody>
                {distributions.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div className="table-main">
                        <span className="table-icon purple"><MapPin size={18} /></span>
                        <div>
                          <strong>{d.destination}</strong>
                          <small>{d.address || d.recipientType}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="code-text">{d.production?.code || '—'}</span>
                      <small className="sub-under">{d.production?.menu || ''}</small>
                    </td>
                    <td>
                      {fmtDate(d.dispatchTime, { day: '2-digit', month: 'short' })}
                      <small className="sub-under">{d.dispatchTime?.slice(11, 16) || ''} WIB</small>
                    </td>
                    <td><strong>{number(d.portions)}</strong> <span className="muted">porsi</span></td>
                    <td><StatusPill>{d.status}</StatusPill></td>
                    <td>
                      {d.receiver ? (
                        <span style={{ color: 'var(--primary-700)', fontWeight: 600 }}>{d.receiver}</span>
                      ) : (
                        <span className="muted">Menunggu serah terima</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Button size="sm" variant="outline" onClick={() => onUpdate(d)}>
                        Update Status
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Truck}
            title="Tidak Ada Data Distribusi"
            description="Ubah filter status atau catat alokasi distribusi baru."
            action={<Button onClick={onAdd} icon={Plus}>Catat Distribusi</Button>}
          />
        )}
      </div>

      <div className="inline-note">
        <AlertCircle size={18} />
        <span>
          <strong>Prosedur Serah Terima:</strong> Petugas sekolah wajib memverifikasi kondisi fisik wadah makanan dan mencatat nama penerima secara akurat saat barang tiba.
        </span>
      </div>
    </>
  );
}

function TracePage({ term, setTerm, result, error, onSearch, onCreateCase, onQr }) {
  const printReport = () => {
    window.print();
  };

  return (
    <>
      <SectionTitle
        eyebrow="MESIN KETERTELUSURAN"
        title="Penelusuran Rantai Pangan (2-Arah)"
        description="Lacak riwayat lengkap lot bahan baku: dari penerimaan pemasok, diolah ke batch mana saja, hingga ke sekolah dan porsi mana saja yang sampai."
        action={
          result && (
            <Button variant="outline" onClick={printReport} icon={Printer}>
              Cetak Laporan Penelusuran
            </Button>
          )
        }
      />

      <div className="trace-search-panel">
        <div className="trace-search-icon"><Search size={24} /></div>
        <div className="trace-search-content">
          <h2>Mulai Penelusuran Batch / Lot</h2>
          <p>Ketik kode lot pemasok (contoh: LOT-001) atau nama bahan untuk memetakan seluruh alur produksi dan distribusi.</p>
          <form
            className="trace-search-form"
            onSubmit={(e) => {
              e.preventDefault();
              onSearch();
            }}
          >
            <div className="trace-input">
              <Search size={18} />
              <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Masukkan kode lot (contoh: LOT-001, LOT-002)..."
              />
              <button type="button" onClick={() => setTerm('LOT-001')}>Contoh</button>
            </div>
            <Button type="submit" icon={Search}>
              Telusuri Sekarang
            </Button>
          </form>

          <div className="example-terms">
            <span>Uji Coba Cepat:</span>
            {['LOT-001', 'LOT-002', 'LOT-003', 'LOT-004'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTerm(t);
                  onSearch(t);
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="banner danger-banner">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="trace-result">
          <div className="trace-result-heading">
            <div>
              <div className="eyebrow"><Sprout size={13} /> HASIL PENELUSURAN LOT</div>
              <h2>
                {result.material.name} <span className="code-text">{result.material.supplierLot}</span>
              </h2>
              <p>
                Diterima dari pemasok <strong>{result.material.supplier}</strong> pada tanggal {fmtDate(result.material.receivedDate)}.
              </p>
            </div>
            <div className="trace-actions">
              <StatusPill>{result.material.condition}</StatusPill>
              <Button variant="outline" size="sm" onClick={() => onCreateCase(result.material)} icon={AlertTriangle}>
                Catat Potensi Risiko
              </Button>
            </div>
          </div>

          <div className="trace-summary-grid">
            <div>
              <span>Batch Masakan Dapur</span>
              <strong>{result.summary.productionCount} Batch</strong>
            </div>
            <div>
              <span>Catatan Pengiriman</span>
              <strong>{result.summary.distributionCount} Titik</strong>
            </div>
            <div>
              <span>Total Porsi Terdampak</span>
              <strong>{number(result.summary.totalPortions)} Porsi</strong>
            </div>
            <div>
              <span>Titik Sekolah Unik</span>
              <strong>{result.summary.destinations.length} Sekolah</strong>
            </div>
          </div>

          <div className="trace-flow">
            {/* Step 1: Source */}
            <div className="flow-column">
              <div className="flow-head">
                <span className="flow-step">01</span>
                <div>
                  <small>SUMBER PENERIMAAN</small>
                  <strong>Lot Bahan Baku</strong>
                </div>
              </div>

              <div className="flow-card source-card">
                <div className="flow-card-icon"><Package size={20} /></div>
                <strong>{result.material.name}</strong>
                <span className="supplier-lot-tag">{result.material.supplierLot}</span>
                <div style={{ marginTop: 10 }}><StatusPill>{result.material.condition}</StatusPill></div>

                <div className="flow-divider" />
                <div className="flow-detail">
                  <span>Pemasok</span>
                  <strong>{result.material.supplier}</strong>
                </div>
                <div className="flow-detail">
                  <span>Jumlah Masuk</span>
                  <strong>{number(result.material.quantity)} {result.material.unit}</strong>
                </div>
                <div className="flow-detail">
                  <span>Kedaluwarsa</span>
                  <strong>{fmtDate(result.material.expiryDate)}</strong>
                </div>
              </div>
            </div>

            {/* Connector 1 */}
            <div className="flow-connector">
              <span />
              <ArrowRight size={18} strokeWidth={2.5} />
              <small>Diolah Dapur</small>
            </div>

            {/* Step 2: Production */}
            <div className="flow-column">
              <div className="flow-head">
                <span className="flow-step">02</span>
                <div>
                  <small>PENGOLAHAN DAPUR</small>
                  <strong>Batch Masakan SPPG</strong>
                </div>
              </div>

              {result.productions.length ? (
                <div className="flow-stack">
                  {result.productions.map((p) => {
                    const usage = p.materials.find((m) => m.materialId === result.material.id);
                    return (
                      <div className="flow-card production-flow-card" key={p.id}>
                        <div className="flow-card-top">
                          <span className="flow-card-icon green"><CookingPot size={18} /></span>
                          <StatusPill>{p.status}</StatusPill>
                        </div>
                        <strong style={{ fontSize: 14 }}>{p.code} · {p.menu}</strong>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', margin: '4px 0 8px' }}>
                          {fmtDate(p.date)} · Total {number(p.portions)} porsi
                        </span>

                        <div className="flow-material-chip">
                          <Package size={14} color="var(--primary-600)" />
                          <span>
                            Mengonsumsi <strong>{number(usage?.quantity)} {usage?.unit || result.material.unit}</strong> {result.material.name}
                          </span>
                        </div>

                        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                          <Button size="sm" variant="ghost" onClick={() => onQr(p)} icon={QrCode}>
                            QR Batch
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flow-card" style={{ textAlign: 'center', padding: 24 }}>
                  <PackageCheck size={28} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Belum ada batch masakan yang menggunakan lot ini.</span>
                </div>
              )}
            </div>

            {/* Connector 2 */}
            <div className="flow-connector">
              <span />
              <ArrowRight size={18} strokeWidth={2.5} />
              <small>Didistribusikan</small>
            </div>

            {/* Step 3: Destination */}
            <div className="flow-column">
              <div className="flow-head">
                <span className="flow-step">03</span>
                <div>
                  <small>SERAH TERIMA</small>
                  <strong>Sekolah Penerima</strong>
                </div>
              </div>

              {result.distributions.length ? (
                <div className="flow-stack">
                  {result.distributions.map((d) => (
                    <div className="flow-card destination-card" key={d.id}>
                      <div className="flow-card-top">
                        <span className="flow-card-icon purple"><MapPin size={18} /></span>
                        <StatusPill>{d.status}</StatusPill>
                      </div>
                      <strong style={{ fontSize: 14 }}>{d.destination}</strong>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', margin: '4px 0 8px' }}>
                        Batch {d.production?.code} · {fmtDate(d.dispatchTime, { day: '2-digit', month: 'short' })}
                      </span>

                      <div className="destination-portions">
                        <Utensils size={15} />
                        <span>Alokasi: <strong>{number(d.portions)} porsi</strong></span>
                      </div>

                      {d.receiver && (
                        <div className="receiver-confirmed">
                          <CheckCircle2 size={14} /> Diterima oleh {d.receiver}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flow-card" style={{ textAlign: 'center', padding: 24 }}>
                  <Truck size={28} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Belum ada distribusi dari batch masakan terkait.</span>
                </div>
              )}
            </div>
          </div>

          <div className="trace-disclaimer">
            <ShieldCheck size={18} />
            <p>
              <strong>Laporan Rantai Ketertelusuran Berdasarkan Database SPPG.</strong> Diagram di atas secara otomatis mengkalkulasi seluruh batch dan sekolah yang terhubung dengan lot ini. Bila ada peringatan penarikan bahan (*food recall*), gunakan daftar sekolah di atas sebagai sasaran isolasi batch.
            </p>
          </div>
        </div>
      )}

      <div className="trace-bottom-grid">
        <div className="panel trace-tip">
          <div className="tip-icon"><Zap size={20} /></div>
          <div>
            <h3>Mengapa Penelusuran 2-Arah Sangat Krusial?</h3>
            <p>
              Jika terdapat 1 bahan baku yang dicurigai (misal ayam tidak segar), petugas tidak perlu menebak makanan apa saja yang terdampak. SajiTrace langsung memetakan batch masakan dan sekolah tujuannya dalam hitungan detik.
            </p>
          </div>
        </div>

        <div className="panel trace-tip">
          <div className="tip-icon green"><QrCode size={20} /></div>
          <div>
            <h3>Transparansi Digital dengan QR Code</h3>
            <p>
              Setiap batch masakan dapat dicetak QR Code-nya pada kotak distribusi. Kepala sekolah, guru, atau komite gizi dapat memindai untuk memeriksa transparansi menu dan bahan baku.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function CasesPage({ cases, materials, onAdd, onUpdate, onTrace }) {
  const openCases = cases.filter((c) => !['Selesai', 'Ditutup'].includes(c.status));
  const inProgressCases = cases.filter((c) => c.status === 'Dalam pemeriksaan');
  const closedCases = cases.filter((c) => ['Selesai', 'Ditutup'].includes(c.status));

  return (
    <>
      <SectionTitle
        eyebrow="PENGAWASAN & MITIGASI MUTU"
        title="Pusat Risiko & Insiden"
        description="Dokumentasikan temuan mutu bahan baku, investigasi rantai masakan, serta tindakan korektif untuk memastikan keamanan pangan."
        action={<Button onClick={onAdd} icon={Plus}>Catat Temuan Risiko</Button>}
      />

      <div className="risk-summary-grid">
        <div className="risk-summary-card">
          <span className="risk-summary-icon"><AlertTriangle size={22} /></span>
          <div>
            <span>Kasus Terbuka</span>
            <strong>{openCases.length}</strong>
            <small>Menunggu tindakan korektif</small>
          </div>
        </div>

        <div className="risk-summary-card orange">
          <span className="risk-summary-icon"><Clock3 size={22} /></span>
          <div>
            <span>Dalam Pemeriksaan</span>
            <strong>{inProgressCases.length}</strong>
            <small>Investigasi laboratorium / fisik</small>
          </div>
        </div>

        <div className="risk-summary-card green">
          <span className="risk-summary-icon"><CheckCircle2 size={22} /></span>
          <div>
            <span>Selesai / Ditutup</span>
            <strong>{closedCases.length}</strong>
            <small>Telah dimitigasi & didokumentasikan</small>
          </div>
        </div>
      </div>

      <div className="case-list">
        {cases.map((c) => {
          const mat = c.material || materials.find((m) => m.id === c.materialId);
          return (
            <article className="case-card" key={c.id}>
              <div className={`case-symbol ${statusTone(c.severity)}`}>
                <AlertTriangle size={22} />
              </div>

              <div className="case-main">
                <div className="case-overline">
                  <span>{c.code}</span>
                  <span>•</span>
                  <span>{fmtDate(c.createdAt)}</span>
                </div>

                <h3>{c.type}</h3>
                <p>{c.description}</p>

                <div className="case-meta">
                  <span className="case-material">
                    <Package size={15} color="var(--primary-600)" />
                    {mat?.name || 'Bahan tidak ditemukan'}: <strong>{mat?.supplierLot || c.materialId}</strong>
                  </span>
                  <StatusPill tone={statusTone(c.severity)}>Prioritas {c.severity}</StatusPill>
                  <StatusPill>{c.status}</StatusPill>
                </div>

                {c.action && (
                  <div className="case-action-note">
                    <ClipboardCheck size={16} />
                    <span><strong>Tindakan Terverifikasi:</strong> {c.action}</span>
                  </div>
                )}

                <div className="case-impact">
                  <div>
                    <small>BATCH TERDAMPAK</small>
                    <strong>{c.affectedProductions ?? 0}</strong>
                  </div>
                  <div>
                    <small>TUJUAN SEKOLAH</small>
                    <strong>{c.affectedDestinations?.length ?? 0}</strong>
                  </div>
                  <div>
                    <small>TOTAL PORSI WASPADA</small>
                    <strong>{number(c.affectedPortions ?? 0)} Porsi</strong>
                  </div>
                </div>
              </div>

              <div className="case-actions">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (mat) onTrace(mat);
                  }}
                  icon={Search}
                >
                  Telusuri Alur
                </Button>
                <Button size="sm" onClick={() => onUpdate(c)} icon={ClipboardCheck}>
                  Tindak Lanjuti
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      {cases.length === 0 && (
        <EmptyState
          icon={ShieldCheck}
          title="Tidak Ada Catatan Risiko"
          description="Bagus! Saat ini tidak ada laporan insiden atau temuan mutu pada lot bahan pangan."
          action={<Button onClick={onAdd} icon={Plus}>Catat Temuan Baru</Button>}
        />
      )}

      <div className="inline-note">
        <ShieldCheck size={18} />
        <span>
          <strong>Protokol Tanggap Darurat:</strong> Setiap catatan risiko tingkat Tinggi (*High Severity*) wajib ditindaklanjuti dalam waktu 30 menit dengan menghentikan distribusi batch terkait dan menghubungi koordinator sekolah.
        </span>
      </div>
    </>
  );
}

/* Forms */
function MaterialForm({ item, onSubmit, onCancel, submitting }) {
  const [form, setForm] = useState({
    name: item?.name || '',
    category: item?.category || 'Protein hewani',
    supplier: item?.supplier || '',
    supplierLot: item?.supplierLot || '',
    receivedDate: item?.receivedDate || new Date().toISOString().slice(0, 10),
    expiryDate: item?.expiryDate || '',
    quantity: item?.quantity || '',
    unit: item?.unit || 'kg',
    condition: item?.condition || 'Baik',
    notes: item?.notes || ''
  });

  const change = (key, value) => setForm((old) => ({ ...old, [key]: value }));

  return (
    <form
      className="form-body"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
    >
      <div className="form-grid">
        <Field label="Nama Bahan Pangan" required>
          <input
            required
            value={form.name}
            onChange={(e) => change('name', e.target.value)}
            placeholder="Contoh: Daging Ayam Fillet"
          />
        </Field>

        <Field label="Kategori Gizi" required>
          <select value={form.category} onChange={(e) => change('category', e.target.value)}>
            <option>Protein hewani</option>
            <option>Protein nabati</option>
            <option>Karbohidrat</option>
            <option>Sayuran</option>
            <option>Buah</option>
            <option>Bahan pendukung</option>
            <option>Lainnya</option>
          </select>
        </Field>

        <Field label="Nama Pemasok / Produsen" required>
          <input
            required
            value={form.supplier}
            onChange={(e) => change('supplier', e.target.value)}
            placeholder="Contoh: PT Ternak Unggas Makmur"
          />
        </Field>

        <Field label="Kode Lot Pemasok" required hint="Wajib unik sesuai label kemasan">
          <input
            required
            value={form.supplierLot}
            onChange={(e) => change('supplierLot', e.target.value)}
            placeholder="Contoh: LOT-009"
          />
        </Field>

        <Field label="Tanggal Diterima di Dapur" required>
          <input
            required
            type="date"
            value={form.receivedDate}
            onChange={(e) => change('receivedDate', e.target.value)}
          />
        </Field>

        <Field label="Tanggal Kedaluwarsa">
          <input
            type="date"
            value={form.expiryDate}
            onChange={(e) => change('expiryDate', e.target.value)}
          />
        </Field>

        <div className="field-span-row">
          <Field label="Jumlah Kedatangan" required>
            <input
              required
              type="number"
              step="0.01"
              min="0.01"
              value={form.quantity}
              onChange={(e) => change('quantity', e.target.value)}
              placeholder="0.00"
            />
          </Field>

          <Field label="Satuan">
            <select value={form.unit} onChange={(e) => change('unit', e.target.value)}>
              <option>kg</option>
              <option>gram</option>
              <option>liter</option>
              <option>ml</option>
              <option>butir</option>
              <option>buah</option>
              <option>dus</option>
              <option>pak</option>
            </select>
          </Field>
        </div>

        <Field label="Kondisi Fisik Saat Tiba">
          <select value={form.condition} onChange={(e) => change('condition', e.target.value)}>
            <option>Baik</option>
            <option>Perlu pemeriksaan</option>
            <option>Ditahan</option>
          </select>
        </Field>

        <div className="field-full">
          <Field label="Catatan Tambahan">
            <input
              value={form.notes}
              onChange={(e) => change('notes', e.target.value)}
              placeholder="Suhu freezer, nomor kendaraan pengangkut, dll (opsional)"
            />
          </Field>
        </div>
      </div>

      <div className="form-notice">
        <AlertCircle size={17} />
        <span>Pastikan kode lot dicocokkan dengan dokumen surat jalan atau faktur fisik pemasok.</span>
      </div>

      <div className="modal-actions">
        <Button variant="outline" onClick={onCancel}>Batal</Button>
        <Button type="submit" disabled={submitting} icon={submitting ? LoaderCircle : Check}>
          {submitting ? 'Menyimpan...' : item ? 'Simpan Perubahan' : 'Simpan Bahan Masuk'}
        </Button>
      </div>
    </form>
  );
}

function ProductionForm({ materials, onSubmit, onCancel, submitting }) {
  const [form, setForm] = useState({
    code: '',
    date: new Date().toISOString().slice(0, 10),
    menu: '',
    portions: '',
    status: 'Dalam proses',
    notes: '',
    uses: [{ materialId: materials[0]?.id || '', quantity: '', unit: materials[0]?.unit || 'kg' }]
  });

  const set = (key, val) => setForm((old) => ({ ...old, [key]: val }));
  const setUse = (index, key, val) =>
    setForm((old) => ({
      ...old,
      uses: old.uses.map((u, i) => (i === index ? { ...u, [key]: val } : u))
    }));

  const addUse = () =>
    set('uses', [
      ...form.uses,
      {
        materialId: materials.find((m) => !form.uses.some((u) => u.materialId === m.id))?.id || materials[0]?.id || '',
        quantity: '',
        unit: 'kg'
      }
    ]);

  const removeUse = (index) => set('uses', form.uses.filter((_, i) => i !== index));

  return (
    <form
      className="form-body"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          code: form.code,
          date: form.date,
          menu: form.menu,
          portions: Number(form.portions),
          status: form.status,
          notes: form.notes,
          materials: form.uses
            .filter((u) => u.materialId && Number(u.quantity) > 0)
            .map((u) => ({
              materialId: u.materialId,
              quantity: Number(u.quantity),
              unit: materials.find((m) => m.id === u.materialId)?.unit || u.unit
            }))
        });
      }}
    >
      <div className="form-grid">
        <Field label="Kode Batch Masakan" hint="Kosongkan untuk otomatisasi kode">
          <input
            value={form.code}
            onChange={(e) => set('code', e.target.value)}
            placeholder="Contoh: B-105"
          />
        </Field>

        <Field label="Tanggal Produksi Dapur" required>
          <input
            required
            type="date"
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
          />
        </Field>

        <Field label="Nama Menu Makanan Bergizi" required>
          <input
            required
            value={form.menu}
            onChange={(e) => set('menu', e.target.value)}
            placeholder="Contoh: Nasi Ayam Bumbu Kuning + Sayur Sop"
          />
        </Field>

        <Field label="Target Jumlah Porsi" required>
          <input
            required
            type="number"
            min="1"
            value={form.portions}
            onChange={(e) => set('portions', e.target.value)}
            placeholder="Contoh: 250"
          />
        </Field>

        <Field label="Status Pengolahan">
          <select value={form.status} onChange={(e) => set('status', e.target.value)}>
            <option>Dalam proses</option>
            <option>Selesai</option>
            <option>Ditahan</option>
          </select>
        </Field>

        <Field label="Catatan Tambahan">
          <input
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Shift juru masak, catatan higienitas, dll (opsional)"
          />
        </Field>
      </div>

      <div className="form-section-heading">
        <div>
          <h3>Komposisi Lot Bahan Baku yang Digunakan</h3>
          <p>Tautkan setiap bahan yang dimasak ke lot penerimaan yang tersedia.</p>
        </div>
        <Button variant="outline" size="sm" onClick={addUse} icon={Plus}>
          Tambah Bahan
        </Button>
      </div>

      <div className="material-use-list">
        {form.uses.map((u, idx) => {
          const mat = materials.find((m) => m.id === u.materialId);
          return (
            <div className="material-use-row" key={idx}>
              <div className="material-use-index">{String(idx + 1).padStart(2, '0')}</div>
              <Field label="Pilih Bahan & Lot">
                <select required value={u.materialId} onChange={(e) => setUse(idx, 'materialId', e.target.value)}>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} · Lot {m.supplierLot} ({m.supplier})
                    </option>
                  ))}
                </select>
                {mat && <span className="field-hint">Tersedia di catatan: {number(mat.quantity)} {mat.unit}</span>}
              </Field>

              <Field label="Takaran Digunakan">
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={u.quantity}
                  onChange={(e) => setUse(idx, 'quantity', e.target.value)}
                  placeholder="0.00"
                />
              </Field>

              <div className="material-use-remove">
                {form.uses.length > 1 && (
                  <button
                    type="button"
                    className="icon-btn danger-icon"
                    onClick={() => removeUse(idx)}
                    title="Hapus baris bahan"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="form-notice">
        <AlertCircle size={17} />
        <span>SajiTrace menyimpan relasi bahan ini agar saat terjadi evaluasi mutu, semua porsi batch ini dapat terlacak secara instan.</span>
      </div>

      <div className="modal-actions">
        <Button variant="outline" onClick={onCancel}>Batal</Button>
        <Button type="submit" disabled={submitting || materials.length === 0} icon={submitting ? LoaderCircle : Check}>
          {submitting ? 'Menyimpan...' : 'Simpan Batch Produksi'}
        </Button>
      </div>
    </form>
  );
}

function DistributionForm({ productions, distributions, onSubmit, onCancel, submitting }) {
  const available = productions
    .map((p) => {
      const distributed = distributions
        .filter((d) => d.productionId === p.id && d.status !== 'Dibatalkan')
        .reduce((s, d) => s + Number(d.portions), 0);
      return { ...p, remaining: p.portions - distributed };
    })
    .filter((p) => p.remaining > 0);

  const [form, setForm] = useState({
    productionId: available[0]?.id || '',
    destination: '',
    address: '',
    recipientType: 'Sekolah',
    portions: '',
    dispatchTime: new Date().toISOString().slice(0, 16),
    status: 'Disiapkan',
    receiver: '',
    notes: ''
  });

  const p = productions.find((x) => x.id === form.productionId);
  const remaining = available.find((x) => x.id === form.productionId)?.remaining || 0;
  const set = (key, val) => setForm((old) => ({ ...old, [key]: val }));

  return (
    <form
      className="form-body"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
    >
      <Field label="Pilih Batch Produksi Masakan" required>
        <select required value={form.productionId} onChange={(e) => set('productionId', e.target.value)}>
          {available.map((x) => (
            <option key={x.id} value={x.id}>
              {x.code} · {x.menu} (Tersisa {number(x.remaining)} porsi)
            </option>
          ))}
        </select>
      </Field>

      {p && (
        <div className="form-notice" style={{ marginTop: 8, marginBottom: 16 }}>
          <Utensils size={16} />
          <span>Batch <strong>{p.code}</strong> memiliki sisa kuota <strong>{number(remaining)} porsi</strong> yang belum dialokasikan.</span>
        </div>
      )}

      <Field label="Nama Sekolah / Titik Penerima" required>
        <input
          required
          value={form.destination}
          onChange={(e) => set('destination', e.target.value)}
          placeholder="Contoh: SD Negeri 1 Banyumas"
        />
      </Field>

      <Field label="Alamat / Wilayah">
        <input
          value={form.address}
          onChange={(e) => set('address', e.target.value)}
          placeholder="Desa/Kelurahan, Kecamatan, Kabupaten"
        />
      </Field>

      <div className="form-grid" style={{ marginTop: 12 }}>
        <Field label="Tipe Titik Penerima">
          <select value={form.recipientType} onChange={(e) => set('recipientType', e.target.value)}>
            <option>Sekolah</option>
            <option>Posyandu</option>
            <option>Pondok Pesantren</option>
            <option>Lokasi lain</option>
          </select>
        </Field>

        <Field label="Jumlah Porsi Dikirim" required>
          <input
            required
            type="number"
            min="1"
            max={remaining}
            value={form.portions}
            onChange={(e) => set('portions', e.target.value)}
            placeholder={`Maksimal ${remaining}`}
          />
        </Field>

        <Field label="Waktu Keberangkatan">
          <input
            type="datetime-local"
            value={form.dispatchTime}
            onChange={(e) => set('dispatchTime', e.target.value)}
          />
        </Field>

        <Field label="Status Awal Distribusi">
          <select value={form.status} onChange={(e) => set('status', e.target.value)}>
            <option>Disiapkan</option>
            <option>Dalam perjalanan</option>
          </select>
        </Field>
      </div>

      <div className="field-full" style={{ marginTop: 12 }}>
        <Field label="Catatan Logistik">
          <textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows="2"
            placeholder="Nama pengemudi kurir, nomor wadah boks, dll (opsional)"
          />
        </Field>
      </div>

      <div className="modal-actions">
        <Button variant="outline" onClick={onCancel}>Batal</Button>
        <Button type="submit" disabled={submitting || available.length === 0} icon={submitting ? LoaderCircle : Check}>
          {submitting ? 'Menyimpan...' : 'Simpan Distribusi'}
        </Button>
      </div>
    </form>
  );
}

function DistributionUpdateForm({ item, onSubmit, onCancel, submitting }) {
  const [form, setForm] = useState({
    status: item.status,
    receiver: item.receiver || '',
    notes: item.notes || ''
  });

  const set = (key, val) => setForm((old) => ({ ...old, [key]: val }));

  return (
    <form
      className="form-body"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 14, background: 'var(--color-slate-50)', borderRadius: 'var(--radius-md)', marginBottom: 18 }}>
        <div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Titik Tujuan</span>
          <strong style={{ display: 'block', fontSize: 14, color: 'var(--color-slate-900)', marginTop: 2 }}>{item.destination}</strong>
        </div>
        <div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Alokasi Makanan</span>
          <strong style={{ display: 'block', fontSize: 14, color: 'var(--color-slate-900)', marginTop: 2 }}>{number(item.portions)} Porsi</strong>
        </div>
      </div>

      <Field label="Status Distribusi Terkini" required>
        <select value={form.status} onChange={(e) => set('status', e.target.value)}>
          <option>Disiapkan</option>
          <option>Dalam perjalanan</option>
          <option>Diterima</option>
          <option>Dibatalkan</option>
        </select>
      </Field>

      {form.status === 'Diterima' && (
        <div style={{ marginTop: 14 }}>
          <Field label="Nama Petugas Penerima di Sekolah" required hint="Nama guru piket / komite sekolah yang menerima">
            <input
              required
              value={form.receiver}
              onChange={(e) => set('receiver', e.target.value)}
              placeholder="Contoh: Ibu Rina (Wali Kelas 3)"
            />
          </Field>
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <Field label="Catatan Serah Terima">
          <textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows="3"
            placeholder="Kondisi makanan saat diterima, kesesuaian jumlah boks, suhu makanan hangat/dingin, dll"
          />
        </Field>
      </div>

      <div className="modal-actions">
        <Button variant="outline" onClick={onCancel}>Batal</Button>
        <Button type="submit" disabled={submitting} icon={submitting ? LoaderCircle : Check}>
          {submitting ? 'Menyimpan...' : 'Perbarui Status'}
        </Button>
      </div>
    </form>
  );
}

function CaseForm({ materials, item, onSubmit, onCancel, submitting }) {
  const [form, setForm] = useState({
    materialId: item?.materialId || materials[0]?.id || '',
    type: 'Dokumen pemeriksaan belum lengkap',
    severity: 'Sedang',
    description: '',
    action: ''
  });

  const set = (key, val) => setForm((old) => ({ ...old, [key]: val }));

  return (
    <form
      className="form-body"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
    >
      <div className="form-grid">
        <Field label="Pilih Lot Bahan Terkait" required>
          <select required value={form.materialId} onChange={(e) => set('materialId', e.target.value)}>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.supplierLot} · {m.name} ({m.supplier})
              </option>
            ))}
          </select>
        </Field>

        <Field label="Jenis Temuan / Masalah" required>
          <select value={form.type} onChange={(e) => set('type', e.target.value)}>
            <option>Dokumen pemeriksaan belum lengkap</option>
            <option>Indikasi kondisi fisik bahan meragukan</option>
            <option>Ketidaksesuaian jumlah / bobot timbang</option>
            <option>Mendekati masa kedaluwarsa</option>
            <option>Laporan komplain dari sekolah penerima</option>
            <option>Lainnya</option>
          </select>
        </Field>

        <Field label="Tingkat Prioritas Risiko" required>
          <select value={form.severity} onChange={(e) => set('severity', e.target.value)}>
            <option>Rendah</option>
            <option>Sedang</option>
            <option>Tinggi</option>
          </select>
        </Field>

        <div className="field-full">
          <Field label="Deskripsi Temuan Faktual" required>
            <textarea
              required
              rows="3"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Jelaskan kondisi faktual yang ditemukan petugas saat inspeksi."
            />
          </Field>
        </div>

        <div className="field-full">
          <Field label="Rencana Tindak Lanjut Awal">
            <textarea
              rows="2"
              value={form.action}
              onChange={(e) => set('action', e.target.value)}
              placeholder="Contoh: Karantina lot bahan di chiller terpisah dan hubungi pemasok untuk klarifikasi."
            />
          </Field>
        </div>
      </div>

      <div className="form-notice">
        <AlertTriangle size={17} />
        <span>Pencatatan risiko ini akan secara otomatis menghitung batch masakan dan sekolah yang terkait untuk analisis dampak.</span>
      </div>

      <div className="modal-actions">
        <Button variant="outline" onClick={onCancel}>Batal</Button>
        <Button type="submit" disabled={submitting || materials.length === 0} icon={submitting ? LoaderCircle : Check}>
          {submitting ? 'Menyimpan...' : 'Simpan Catatan Risiko'}
        </Button>
      </div>
    </form>
  );
}

function CaseUpdateForm({ item, onSubmit, onCancel, submitting }) {
  const [form, setForm] = useState({
    status: item.status,
    severity: item.severity,
    action: item.action || '',
    description: item.description || ''
  });

  const set = (key, val) => setForm((old) => ({ ...old, [key]: val }));

  return (
    <form
      className="form-body"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
    >
      <div className="form-grid">
        <Field label="Status Penanganan" required>
          <select value={form.status} onChange={(e) => set('status', e.target.value)}>
            <option>Baru</option>
            <option>Dalam pemeriksaan</option>
            <option>Menunggu konfirmasi</option>
            <option>Selesai</option>
            <option>Ditutup</option>
          </select>
        </Field>

        <Field label="Tingkat Keparahan" required>
          <select value={form.severity} onChange={(e) => set('severity', e.target.value)}>
            <option>Rendah</option>
            <option>Sedang</option>
            <option>Tinggi</option>
          </select>
        </Field>

        <div className="field-full">
          <Field label="Rincian / Hasil Pemeriksaan" required>
            <textarea
              required
              rows="3"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </Field>
        </div>

        <div className="field-full">
          <Field label="Tindakan Mitigasi / Solusi yang Dilakukan" required>
            <textarea
              required
              rows="3"
              value={form.action}
              onChange={(e) => set('action', e.target.value)}
              placeholder="Tindakan nyata yang telah dilaksanakan (misal: penggantian bahan dengan lot baru, penarikan batch, dll)"
            />
          </Field>
        </div>
      </div>

      <div className="form-notice">
        <ClipboardCheck size={17} />
        <span>Setiap pembaruan status akan tercatat di audit log sistem sebagai bentuk akuntabilitas audit keamanan pangan.</span>
      </div>

      <div className="modal-actions">
        <Button variant="outline" onClick={onCancel}>Batal</Button>
        <Button type="submit" disabled={submitting} icon={submitting ? LoaderCircle : Check}>
          {submitting ? 'Menyimpan...' : 'Simpan Tindak Lanjut'}
        </Button>
      </div>
    </form>
  );
}

function VerificationPage({ code }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api(`/api/verify/${encodeURIComponent(code)}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [code]);

  return (
    <div className="verify-page">
      <header className="verify-header">
        <div className="brand" style={{ borderBottom: 0, padding: 0 }}>
          <div className="brand-mark"><Leaf size={22} /></div>
          <div>
            <strong>SajiTrace</strong>
            <span>VERIFIKASI BATCH PUBLIK</span>
          </div>
        </div>
        <div className="environment-pill">
          <span /> INFORMASI RESMI SPPG
        </div>
      </header>

      <main className="verify-container">
        <div className="verify-icon"><QrCode size={28} /></div>
        <div className="eyebrow" style={{ textAlign: 'center', display: 'block' }}>
          SERTIFIKAT KETERTELUSURAN MAKANAN BERGIZI
        </div>
        <h1>Informasi Batch Masakan</h1>
        <p className="verify-lead">
          Halaman ini menampilkan transparansi rantai bahan baku dan alokasi sekolah yang diolah oleh dapur SPPG resmi.
        </p>

        {loading ? (
          <div className="verify-card" style={{ textAlign: 'center', padding: 48 }}>
            <LoaderCircle className="spin" size={28} color="var(--primary-600)" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Memverifikasi data batch dari sistem...</p>
          </div>
        ) : error ? (
          <div className="verify-card" style={{ textAlign: 'center', padding: 48 }}>
            <AlertCircle size={32} color="var(--rose-600)" style={{ margin: '0 auto 12px' }} />
            <h2 style={{ fontSize: 18, margin: '0 0 6px', color: 'var(--color-slate-900)' }}>Batch Tidak Ditemukan</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 18 }}>{error}</p>
            <a href="/" style={{ color: 'var(--primary-600)', fontWeight: 600, fontSize: 13, textDecoration: 'underline' }}>
              Kembali ke Halaman Utama SajiTrace
            </a>
          </div>
        ) : (
          <>
            <div className="verify-card">
              <div className="verify-card-top">
                <div>
                  <span className="batch-code-label" style={{ marginTop: 0 }}>KODE BATCH MASAKAN</span>
                  <h2>{data.code}</h2>
                </div>
                <StatusPill>{data.status}</StatusPill>
              </div>

              <div className="verify-menu">
                <Utensils size={22} color="var(--primary-600)" />
                <div>
                  <small>MENU MAKAN BERGIZI</small>
                  <strong>{data.menu}</strong>
                </div>
              </div>

              <div className="verify-details">
                <div>
                  <span>Tanggal Pengolahan</span>
                  <strong>{fmtDate(data.date)}</strong>
                </div>
                <div>
                  <span>Porsi Diproduksi</span>
                  <strong>{number(data.portions)} Porsi</strong>
                </div>
                <div>
                  <span>Sekolah Penerima</span>
                  <strong>{data.distributions.length} Lokasi</strong>
                </div>
              </div>

              <div className="verify-section">
                <h3>Bahan Baku & Lot Pemasok Terdaftar</h3>
                {data.materials.map((m) => (
                  <div className="verify-material" key={m.supplierLot}>
                    <PackageCheck size={18} color="var(--primary-600)" />
                    <div>
                      <strong>{m.name}</strong>
                      <small>Kode Lot Pemasok: {m.supplierLot}</small>
                    </div>
                    <StatusPill>{m.condition}</StatusPill>
                  </div>
                ))}
              </div>

              <div className="verify-section" style={{ marginTop: 12 }}>
                <h3>Daftar Tujuan Distribusi</h3>
                {data.distributions.length ? (
                  data.distributions.map((d) => (
                    <div className="verify-material" key={d.code}>
                      <MapPin size={18} color="var(--purple-600)" />
                      <div>
                        <strong>{d.destination}</strong>
                        <small>{number(d.portions)} porsi · Jam {d.dispatchTime?.slice(11, 16) || '—'} WIB</small>
                      </div>
                      <StatusPill>{d.status}</StatusPill>
                    </div>
                  ))
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Belum ada rute distribusi yang terdaftar untuk batch ini.</p>
                )}
              </div>

              <div className="verify-disclaimer">
                <ShieldCheck size={20} />
                <p>
                  Data ini dihasilkan secara otomatis oleh sistem SajiTrace. Halaman ini disediakan untuk keterbukaan publik bagi kepala sekolah, guru, dan wali murid dalam memantau kualitas makanan bergizi anak.
                </p>
              </div>
            </div>

            <p className="verify-foot">
              © 2026 SajiTrace · Sistem Ketertelusuran Pangan SPPG
            </p>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
