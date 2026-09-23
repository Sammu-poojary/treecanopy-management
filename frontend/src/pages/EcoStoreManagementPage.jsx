import React, { useState, useEffect, useRef } from 'react';
import { Sun, Moon, Sparkles, Loader2 } from 'lucide-react';
import { Topbar, Sidebar } from './CanopyPages';
import Swal from 'sweetalert2';

const API = 'http://localhost:5000';

const CAT_OPTIONS = ['Organic Compost', 'Bio-Mulch & Woodchips', 'Soil Conditioners', 'Bio-Char', 'Native Saplings', 'Gardening Kits'];

const STAGE_COLOR = {
  'Ingestion & Shredding':      '#fbbf24',
  'Thermophilic Decomposition': '#f87171',
  'Curing & Stabilization':     '#fb923c',
  'Sieving & Refining':         '#60a5fa',
  'Retail Packaging':           '#c084fc',
  'Completed':                  '#34d399',
};

// Convert file to base64
const toBase64 = file => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.onerror = rej;
  r.readAsDataURL(file);
});

// ─── Compost Packaging Image Presets ──────────────────────────────────────────
const COMPOST_IMAGE_PRESETS = [
  {
    label: 'Standard Bag',
    url: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&auto=format&fit=crop&q=80',
    title: 'Eco Compost Bag'
  },
  {
    label: 'Black Gold',
    url: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?w=600&auto=format&fit=crop&q=80',
    title: 'Enriched Compost'
  },
  {
    label: 'Canopy Organic',
    url: 'https://images.unsplash.com/photo-1592417817098-8f3d6910985b?w=600&auto=format&fit=crop&q=80',
    title: 'Municipal Soil Blend'
  },
  {
    label: 'Bio-Mulch',
    url: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=600&auto=format&fit=crop&q=80',
    title: 'Woodchips & Mulch'
  }
];

// ─── Weight Metrics Options ──────────────────────────────────────────────────
const WEIGHT_METRICS = [
  { value: 'kg', label: 'kg (Kilograms)' },
  { value: 'g', label: 'g / grm (Grams)' },
  { value: 'mg', label: 'mg (Milligrams)' },
  { value: 'ton', label: 'ton (Metric Tonnes)' },
  { value: 'L', label: 'L (Litres)' },
  { value: 'ml', label: 'ml (Millilitres)' },
  { value: 'pcs', label: 'pcs / pkts (Pieces / Packets)' }
];

// ─── Empty product form ──────────────────────────────────────────────────────
const emptyForm = () => ({
  name: '', category: 'Organic Compost', description: '',
  unitSize: '5 kg Bag', weightValue: 5, weightUnit: 'kg', weightKg: 5,
  priceInr: 99, priceEcoPoints: 40, stockQuantity: 50,
  usageInstructions: 'Mix 1 part compost with 3 parts soil.',
  benefits: '100% Organic\nEnhances Soil Moisture\nRich in Microbes',
  imageBase64: null, imagePreview: null
});

// Helper for default price by kg
const getDefaultPriceForKg = (kg) => {
  if (kg === 25) return 399;
  if (kg === 10) return 179;
  if (kg === 5)  return 99;
  if (kg === 2)  return 49;
  if (kg === 1)  return 29;
  return Math.round(kg * 16);
};

export default function EcoStoreManagementPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tab, setTab] = useState('store'); // 'store' | 'batches'
  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ─── Theme State & Synchronization ─────────────────────────────────────────
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.getAttribute('data-theme') !== 'light';
  });

  useEffect(() => {
    const sync = () => {
      const dark = document.documentElement.getAttribute('data-theme') !== 'light';
      setIsDark(dark);
    };
    window.addEventListener('themeChange', sync);
    return () => window.removeEventListener('themeChange', sync);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
    window.dispatchEvent(new Event('themeChange'));
  };

  const t = {
    bgPage: isDark ? '#020617' : '#f8fafc',
    bgHeader: isDark ? '#0b1120' : '#ffffff',
    bgCard: isDark ? '#0f172a' : '#ffffff',
    bgCardSubtle: isDark ? 'rgba(2, 6, 23, 0.7)' : '#f8fafc',
    bgCardSubtle2: isDark ? 'rgba(2, 6, 23, 0.5)' : '#f1f5f9',
    border: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
    borderStrong: isDark ? 'rgba(255, 255, 255, 0.15)' : '#cbd5e1',
    bgInput: isDark ? '#020617' : '#ffffff',
    textPrimary: isDark ? '#f8fafc' : '#0f172a',
    textSecondary: isDark ? '#94a3b8' : '#475569',
    textMuted: isDark ? '#64748b' : '#64748b',
    cardShadow: isDark ? '0 10px 25px -5px rgba(0,0,0,0.5)' : '0 2px 10px rgba(0,0,0,0.05)',
    modalBg: isDark ? '#0f172a' : '#ffffff',
    tabActiveBg: '#10b981',
    tabInactiveBg: isDark ? 'rgba(255, 255, 255, 0.07)' : '#f1f5f9',
    tabInactiveText: isDark ? '#94a3b8' : '#64748b',
  };

  const S = {
    panel: { background: t.bgCard, borderRadius: 16, border: `1px solid ${t.border}`, padding: 18, marginBottom: 16, boxShadow: t.cardShadow },
    label: { fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 },
    input: { width: '100%', padding: '8px 10px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: 8, color: t.textPrimary, fontSize: 13, boxSizing: 'border-box', outline: 'none' },
    textarea: { width: '100%', padding: '8px 10px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: 8, color: t.textPrimary, fontSize: 13, boxSizing: 'border-box', outline: 'none', resize: 'vertical', fontFamily: 'inherit' },
    btn: (bg, color='#fff') => ({ padding: '9px 18px', background: bg, border: 'none', borderRadius: 10, color, fontWeight: 700, fontSize: 13, cursor: 'pointer', display:'inline-flex', alignItems:'center', gap: 6, transition: 'all 0.15s ease' }),
  };

  // Product modal (add / edit)
  const [modal, setModal] = useState(null); // null | 'add' | product object
  const [form, setForm] = useState(emptyForm());
  const imgRef = useRef();

  // Dynamic Package-to-store modal
  const [pkgBatch, setPkgBatch] = useState(null);
  const [packetRows, setPacketRows] = useState([]);
  const [mulchKg, setMulchKg] = useState(0);
  const [pricePerKgMulch, setPricePerKgMulch] = useState(15);
  const [pkgGrade, setPkgGrade] = useState('Grade A Premium Organic');
  const [pkgNotes, setPkgNotes] = useState('');
  const [markCompleted, setMarkCompleted] = useState(true);
  const [packaging, setPackaging] = useState(false);
  const [pkgImage, setPkgImage] = useState('https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&auto=format&fit=crop&q=80');
  const pkgImgRef = useRef();

  const handlePkgImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await toBase64(file);
      setPkgImage(b64);
    } catch(err) {
      console.error('Failed to convert image', err);
    }
  };

  // ── fetch data ──
  const load = async () => {
    setLoading(true);
    try {
      const [pr, br] = await Promise.all([
        fetch(`${API}/api/eco-products`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`${API}/api/compost-batches`).then(r => r.ok ? r.json() : []).catch(() => []),
      ]);
      setProducts(pr);
      setBatches(br.filter(b => b.status !== 'Archived'));
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // ── image picker ──
  const pickImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await toBase64(file);
    setForm(f => ({ ...f, imageBase64: b64, imagePreview: b64 }));
  };

  const [aiLoading, setAiLoading] = useState(false);

  // ── AI Auto-Fill Product Details ──
  const handleAiAutofill = async () => {
    if (!form.name.trim() && !form.category) {
      Swal.fire({
        icon: 'info',
        title: 'Enter Product Name',
        text: 'Please type a product name (e.g. "Desi Okra Seeds", "Organic Neem Cake", "Bio-Char") or choose a category so AI can craft tailored details.',
        confirmButtonColor: '#10b981',
        background: isDark ? '#0f172a' : '#ffffff',
        color: isDark ? '#f8fafc' : '#0f172a'
      });
      return;
    }

    setAiLoading(true);
    try {
      const res = await fetch(`${API}/api/eco-products/ai-autofill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          category: form.category,
          unitSize: form.unitSize,
          weightValue: form.weightValue,
          weightUnit: form.weightUnit
        })
      });

      if (!res.ok) throw new Error('AI autofill generation failed');
      const data = await res.json();

      setForm(prev => ({
        ...prev,
        description: data.description || prev.description,
        usageInstructions: data.usageInstructions || prev.usageInstructions,
        benefits: Array.isArray(data.benefits) ? data.benefits.join('\n') : (data.benefits || prev.benefits),
        unitSize: prev.unitSize && prev.unitSize !== '5 kg Bag' ? prev.unitSize : (data.suggestedUnitSize || prev.unitSize),
        weightValue: prev.weightValue && prev.weightValue !== 5 ? prev.weightValue : (data.suggestedWeightValue ?? prev.weightValue),
        weightUnit: prev.weightUnit && prev.weightUnit !== 'kg' ? prev.weightUnit : (data.suggestedWeightUnit || prev.weightUnit),
        priceInr: prev.priceInr && prev.priceInr !== 99 ? prev.priceInr : (data.suggestedPriceInr ?? prev.priceInr),
        priceEcoPoints: prev.priceEcoPoints && prev.priceEcoPoints !== 40 ? prev.priceEcoPoints : (data.suggestedEcoPoints ?? prev.priceEcoPoints),
      }));

      Swal.fire({
        icon: 'success',
        title: '✨ AI Auto-Filled!',
        text: 'Description, application instructions, key benefits, and weight metrics populated.',
        timer: 2000,
        showConfirmButton: false,
        background: isDark ? '#0f172a' : '#ffffff',
        color: isDark ? '#f8fafc' : '#0f172a'
      });
    } catch (err) {
      console.error('AI Auto-Fill error:', err);
      Swal.fire({
        icon: 'error',
        title: 'Generation Failed',
        text: err.message || 'Could not auto-fill product details. Please try again.',
        confirmButtonColor: '#10b981',
        background: isDark ? '#0f172a' : '#ffffff',
        color: isDark ? '#f8fafc' : '#0f172a'
      });
    } finally {
      setAiLoading(false);
    }
  };

  // ── save product (add or edit) ──
  const saveProduct = async () => {
    if (!form.name.trim()) { Swal.fire('Required', 'Product name is required', 'warning'); return; }
    setSaving(true);
    try {
      const isEdit = modal && typeof modal === 'object' && modal._id;
      const wVal = Number(form.weightValue !== undefined ? form.weightValue : form.weightKg) || 0;
      const wUnit = form.weightUnit || 'kg';
      let computedKg = wVal;
      const u = wUnit.toLowerCase();
      if (u === 'g' || u === 'grm' || u === 'gm') computedKg = wVal / 1000;
      else if (u === 'mg') computedKg = wVal / 1000000;
      else if (u === 'ton' || u === 'tonne') computedKg = wVal * 1000;
      else if (u === 'ml') computedKg = wVal / 1000;
      else if (u === 'l' || u === 'ltr') computedKg = wVal;

      const payload = {
        name: form.name, category: form.category, description: form.description,
        unitSize: form.unitSize,
        weightValue: wVal,
        weightUnit: wUnit,
        weightKg: computedKg,
        priceInr: Number(form.priceInr), priceEcoPoints: Number(form.priceEcoPoints),
        stockQuantity: Number(form.stockQuantity),
        usageInstructions: form.usageInstructions,
        benefits: form.benefits.split('\n').map(s => s.trim()).filter(Boolean),
      };
      if (form.imageBase64) payload.imageBase64 = form.imageBase64;

      const url = isEdit ? `${API}/api/eco-products/${modal._id}` : `${API}/api/eco-products`;
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      setModal(null);
      await load();
      Swal.fire({ icon: 'success', title: isEdit ? 'Product Updated ✅' : 'Product Added 🌿', timer: 1800, showConfirmButton: false, background: '#0f172a', color: '#f8fafc' });
    } catch(e) { Swal.fire({ icon: 'error', title: 'Error', text: e.message }); }
    setSaving(false);
  };

  // ── quick stock update ──
  const changeStock = async (id, delta) => {
    const p = products.find(p => p._id === id);
    if (!p) return;
    const newQty = Math.max(0, (p.stockQuantity || 0) + delta);
    await fetch(`${API}/api/eco-products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stockQuantity: newQty }) });
    setProducts(ps => ps.map(p => p._id === id ? { ...p, stockQuantity: newQty } : p));
  };

  // ── toggle visibility ──
  const toggleVisible = async (p) => {
    const updated = !p.isAvailable;
    await fetch(`${API}/api/eco-products/${p._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isAvailable: updated }) });
    setProducts(ps => ps.map(x => x._id === p._id ? { ...x, isAvailable: updated } : x));
  };

  // ── delete product ──
  const deleteProduct = async (p) => {
    const { isConfirmed } = await Swal.fire({ title: `Delete "${p.name}"?`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Delete', background: '#0f172a', color: '#f8fafc' });
    if (!isConfirmed) return;
    await fetch(`${API}/api/eco-products/${p._id}`, { method: 'DELETE' });
    setProducts(ps => ps.filter(x => x._id !== p._id));
  };

  // ── open dynamic package modal ──
  const openPackageModal = (b) => {
    const estTotalYield = Math.round((b.rawBiomassInputKg || 500) * 0.45);
    const alreadyPackaged = b.totalYieldKg || 0;
    const availableKg = Math.max(0, estTotalYield - alreadyPackaged) || estTotalYield;

    // Start with 1 intelligent default packet row matching available weight
    let initialKg = 25;
    if (availableKg < 25 && availableKg >= 10) initialKg = 10;
    else if (availableKg < 10) initialKg = 5;

    const initialQty = Math.max(1, Math.floor(availableKg / initialKg)) || 1;
    const initialPrice = getDefaultPriceForKg(initialKg);

    setPacketRows([
      {
        id: Date.now(),
        weightKg: initialKg,
        quantity: initialQty,
        priceInr: initialPrice,
        priceEcoPoints: Math.round(initialPrice * 0.4)
      }
    ]);
    setMulchKg(0);
    setPricePerKgMulch(15);
    setPkgGrade(b.qualityCertificationGrade || 'Grade A Premium Organic');
    setPkgNotes('');
    setMarkCompleted(true);
    setPkgImage('https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&auto=format&fit=crop&q=80');
    setPkgBatch(b);
  };

  // ── packet row actions ──
  const addPacketRow = () => {
    setPacketRows(rows => [
      ...rows,
      {
        id: Date.now() + Math.random(),
        weightKg: 5,
        quantity: 1,
        priceInr: 99,
        priceEcoPoints: 40
      }
    ]);
  };

  const removePacketRow = (id) => {
    setPacketRows(rows => rows.filter(r => r.id !== id));
  };

  const updatePacketRow = (id, field, value) => {
    setPacketRows(rows => rows.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      // If weight changes, auto-update price & points suggestions
      if (field === 'weightKg') {
        const kg = Number(value) || 1;
        const newPrice = getDefaultPriceForKg(kg);
        updated.priceInr = newPrice;
        updated.priceEcoPoints = Math.round(newPrice * 0.4);
      }
      if (field === 'priceInr') {
        updated.priceEcoPoints = Math.round(Number(value) * 0.4);
      }
      return updated;
    }));
  };

  // ── execute packaging ──
  const doPackage = async () => {
    const totalPackagedWeight = packetRows.reduce((sum, r) => sum + (Number(r.weightKg || 0) * Number(r.quantity || 0)), 0) + Number(mulchKg || 0);
    if (totalPackagedWeight <= 0) {
      Swal.fire('Enter Packet Details', 'Please set at least 1 packet with weight & quantity > 0.', 'warning');
      return;
    }

    setPackaging(true);
    try {
      const payload = {
        packages: packetRows.map(r => ({
          weightKg: Number(r.weightKg),
          quantity: Number(r.quantity),
          priceInr: Number(r.priceInr),
          priceEcoPoints: Number(r.priceEcoPoints),
          name: `CanopyGuard Organic Compost (${r.weightKg} kg ${r.weightKg >= 25 ? 'Sack' : 'Bag'})`,
          image: pkgImage
        })),
        bulkMulchKg: Number(mulchKg || 0),
        pricePerKgMulch: Number(pricePerKgMulch || 15),
        qualityGrade: pkgGrade,
        packagingNotes: pkgNotes,
        markAsCompleted: markCompleted,
        image: pkgImage
      };

      const res = await fetch(`${API}/api/compost-batches/${pkgBatch._id}/package-to-store`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to package batch');

      setPkgBatch(null);
      await load();
      setTab('inventory'); // Seamlessly switches directly to store inventory view!

      // Clear breakdown message
      const summaryText = packetRows
        .filter(r => r.quantity > 0)
        .map(r => `• <b>${r.quantity} × ${r.weightKg}kg</b> packets (₹${r.priceInr} each)`)
        .join('<br/>');

      Swal.fire({
        icon: 'success',
        title: '🌿 Stock Added to Citizen Eco Store!',
        html: `<div style="text-align:left; font-size:13px; margin-top:8px;">
          <b>Total Packaged:</b> ${data.totalKg} kg<br/>
          ${summaryText}
          ${mulchKg > 0 ? `<br/>• <b>${mulchKg} kg</b> Loose Bio-Mulch` : ''}
          <br/><br/>
          <span style="color:#10b981">✓ Products updated with custom packaging photo live in Eco Store!</span>
        </div>`,
        confirmButtonColor: '#10b981',
        background: '#0f172a',
        color: '#f8fafc'
      });
    } catch(e) {
      Swal.fire({ icon: 'error', title: 'Packaging Failed', text: e.message });
    }
    setPackaging(false);
  };

  // ── open edit modal ──
  const openEdit = (p) => {
    setForm({
      name: p.name, category: p.category, description: p.description || '',
      unitSize: p.unitSize,
      weightValue: p.weightValue !== undefined ? p.weightValue : (p.weightKg || 5),
      weightUnit: p.weightUnit || 'kg',
      weightKg: p.weightKg || 5,
      priceInr: p.priceInr, priceEcoPoints: p.priceEcoPoints, stockQuantity: p.stockQuantity,
      usageInstructions: p.usageInstructions || '',
      benefits: Array.isArray(p.benefits) ? p.benefits.join('\n') : (p.benefits || ''),
      imageBase64: null, imagePreview: p.image || null
    });
    setModal(p);
  };

  // Calculations for current package modal
  const estTotalYield = pkgBatch ? Math.round((pkgBatch.rawBiomassInputKg || 500) * 0.45) : 0;
  const alreadyPackaged = pkgBatch ? (pkgBatch.totalYieldKg || 0) : 0;
  const availableToPackage = Math.max(0, estTotalYield - alreadyPackaged);
  const currentTotalPackagedKg = packetRows.reduce((sum, r) => sum + (Number(r.weightKg || 0) * Number(r.quantity || 0)), 0) + Number(mulchKg || 0);
  const remainingAfterKg = availableToPackage - currentTotalPackagedKg;
  const estRevenue = packetRows.reduce((sum, r) => sum + (Number(r.priceInr || 0) * Number(r.quantity || 0)), 0) + (Number(mulchKg || 0) * Number(pricePerKgMulch || 15));

  const readyBatches = batches.filter(b => ['Retail Packaging', 'Completed'].includes(b.currentStage) && ((Math.round((b.rawBiomassInputKg||500)*0.45) - (b.totalYieldKg||0)) > 0 || b.totalYieldKg === 0));

  return (
    <div style={{ display:'flex', minHeight:'100vh', background: t.bgPage, fontFamily:"'Inter',sans-serif", color: t.textPrimary, transition:'background 0.2s, color 0.2s' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
        <Topbar onMenuClick={() => setSidebarOpen(true)} title="Eco Store Manager" />

        <div style={{ flex:1, padding:'20px 24px', overflowY:'auto' }}>
          {/* ── Page Header ── */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:20 }}>
            <div>
              <h1 style={{ margin:0, fontSize:21, fontWeight:800, color: t.textPrimary }}>🌿 Eco Store & Inventory Manager</h1>
              <p style={{ margin:'3px 0 0', color: t.textMuted, fontSize:13 }}>Directly package compost batches into store inventory · Auto-manage weights, packets & stock</p>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              {[{id:'store',label:'🛒 Store Products'},{id:'batches',label:`📦 Compost Batches${readyBatches.length?' ('+readyBatches.length+' ready)':''}`}].map(tabItem => (
                <button
                  key={tabItem.id}
                  onClick={() => setTab(tabItem.id)}
                  style={{
                    ...S.btn(
                      tab === tabItem.id ? t.tabActiveBg : t.tabInactiveBg,
                      tab === tabItem.id ? '#fff' : t.tabInactiveText
                    ),
                    border: tab === tabItem.id ? 'none' : `1px solid ${t.border}`,
                    borderRadius: 10
                  }}
                >
                  {tabItem.label}
                </button>
              ))}
              <button
                onClick={load}
                title="Refresh"
                style={{
                  ...S.btn(t.tabInactiveBg, t.tabInactiveText),
                  border: `1px solid ${t.border}`,
                  padding: '9px 14px'
                }}
              >
                ↻
              </button>
              <button
                onClick={toggleTheme}
                title="Toggle Light/Dark Theme"
                style={{
                  ...S.btn(t.tabInactiveBg, t.textPrimary),
                  border: `1px solid ${t.border}`,
                  padding: '9px 14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                {isDark ? <Sun size={15} color="#fbbf24" /> : <Moon size={15} color="#6366f1" />}
                <span style={{ fontSize: 12 }}>{isDark ? 'Light' : 'Dark'}</span>
              </button>
            </div>
          </div>

          {/* ════════════ STORE PRODUCTS TAB ════════════ */}
          {tab === 'store' && (
            <div>
              {/* Summary stats */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:10, marginBottom:20 }}>
                {[
                  { icon:'🟢', label:'Live Products',  val: products.filter(p=>p.isAvailable).length,        color:'#10b981' },
                  { icon:'📦', label:'Total SKUs',      val: products.length,                                  color:'#3b82f6' },
                  { icon:'⚠️', label:'Low Stock (≤10)', val: products.filter(p=>p.stockQuantity<=10).length,   color:'#f59e0b' },
                  { icon:'👁️', label:'Hidden Items',    val: products.filter(p=>!p.isAvailable).length,        color: t.textMuted },
                ].map(k => (
                  <div key={k.label} style={{ background: t.bgCard, border:`1px solid ${t.border}`, borderRadius:12, padding:'12px 14px', boxShadow: t.cardShadow }}>
                    <div style={{ fontSize:18, marginBottom:4 }}>{k.icon}</div>
                    <div style={{ fontSize:22, fontWeight:800, color:k.color }}>{k.val}</div>
                    <div style={{ fontSize:11, color: t.textMuted }}>{k.label}</div>
                  </div>
                ))}
              </div>

              {/* Add button */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <span style={{ fontSize:13, color: t.textSecondary }}>Products shown here are directly purchasable by citizens via web & mobile app.</span>
                <button onClick={() => { setForm(emptyForm()); setModal('add'); }} style={{ ...S.btn('#10b981') }}>＋ Add Custom Product</button>
              </div>

              {loading ? (
                <div style={{ textAlign:'center', padding:60, color: t.textMuted }}>Loading inventory…</div>
              ) : products.length === 0 ? (
                <div style={{ textAlign:'center', padding:60, color: t.textMuted, background: t.bgCard, borderRadius:16, border: `1px solid ${t.border}`, boxShadow: t.cardShadow }}>
                  <div style={{ fontSize:48, marginBottom:12 }}>🛒</div>
                  <p style={{ color: t.textSecondary }}>No products yet. Switch to the <b>Compost Batches</b> tab to package matured compost into packets, or click <b>Add Custom Product</b>.</p>
                </div>
              ) : (
                /* ── Product Cards ── */
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:16 }}>
                  {products.map(p => {
                    const isLow = p.stockQuantity <= 10;
                    return (
                      <div key={p._id} style={{ background: t.bgCard, border:`1px solid ${p.isAvailable ? t.border : 'rgba(239,68,68,0.3)'}`, borderRadius:16, overflow:'hidden', opacity: p.isAvailable ? 1 : 0.7, boxShadow: t.cardShadow, transition:'box-shadow 0.2s, transform 0.2s' }}>

                        {/* Product image */}
                        <div style={{ position:'relative', height:160, background: t.bgCardSubtle, overflow:'hidden' }}>
                          <img src={p.image || 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&auto=format&fit=crop&q=80'} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover', opacity: isDark ? 0.85 : 1 }} onError={e => { e.target.src='https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&auto=format&fit=crop&q=80'; }} />
                          {/* Badges */}
                          <div style={{ position:'absolute', top:10, left:10, display:'flex', gap:6 }}>
                            <span style={{ background: p.isAvailable ? 'rgba(16,185,129,0.92)':'rgba(239,68,68,0.92)', color:'#fff', borderRadius:6, padding:'2px 9px', fontSize:10.5, fontWeight:700 }}>
                              {p.isAvailable ? '● LIVE' : '● HIDDEN'}
                            </span>
                            {isLow && <span style={{ background:'rgba(245,158,11,0.95)', color:'#000', borderRadius:6, padding:'2px 9px', fontSize:10.5, fontWeight:700 }}>⚠️ LOW STOCK</span>}
                          </div>
                          <div style={{ position:'absolute', top:10, right:10 }}>
                            <span style={{ background: isDark ? 'rgba(2,6,23,0.85)' : 'rgba(255,255,255,0.9)', color: t.textSecondary, borderRadius:6, padding:'3px 9px', fontSize:10.5, fontWeight:600, border: `1px solid ${t.border}`, backdropFilter:'blur(4px)' }}>{p.category}</span>
                          </div>
                        </div>

                        {/* Product details */}
                        <div style={{ padding:'14px 16px' }}>
                          <div style={{ fontSize:15, fontWeight:700, color: t.textPrimary, marginBottom:2 }}>{p.name}</div>
                          <div style={{ fontSize:11.5, color: t.textMuted, marginBottom:10 }}>{p.unitSize} {p.weightValue ? `(${p.weightValue} ${p.weightUnit || 'kg'})` : (p.weightKg ? `(${p.weightKg} kg)` : '')} · SKU: <span style={{ color: t.textSecondary, fontFamily:'monospace', fontWeight:600 }}>{p.sku}</span></div>
                          <div style={{ fontSize:12, color: t.textSecondary, marginBottom:12, lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{p.description}</div>

                          {/* Pricing & Stock row */}
                          <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                            <div style={{ flex:1, background: t.bgCardSubtle, border: `1px solid ${t.border}`, borderRadius:8, padding:'8px 10px', textAlign:'center' }}>
                              <div style={{ fontSize:9.5, color: t.textMuted, fontWeight:700, marginBottom:2 }}>PRICE (INR)</div>
                              <div style={{ fontSize:17, fontWeight:800, color: t.textPrimary }}>₹{p.priceInr}</div>
                            </div>
                            <div style={{ flex:1, background: t.bgCardSubtle, border: `1px solid ${t.border}`, borderRadius:8, padding:'8px 10px', textAlign:'center' }}>
                              <div style={{ fontSize:9.5, color: t.textMuted, fontWeight:700, marginBottom:2 }}>ECO-POINTS</div>
                              <div style={{ fontSize:17, fontWeight:800, color:'#10b981' }}>{p.priceEcoPoints} pts</div>
                            </div>
                            <div style={{ flex:1, background: t.bgCardSubtle, border: `1px solid ${t.border}`, borderRadius:8, padding:'8px 10px', textAlign:'center' }}>
                              <div style={{ fontSize:9.5, color: t.textMuted, fontWeight:700, marginBottom:2 }}>PACKS IN STOCK</div>
                              <div style={{ fontSize:17, fontWeight:800, color: isLow ? '#f59e0b' : '#10b981' }}>{p.stockQuantity}</div>
                            </div>
                          </div>

                          {/* Stock adjuster */}
                          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:12, background: t.bgCardSubtle2, borderRadius:10, padding:'8px 12px', border: `1px solid ${t.border}` }}>
                            <span style={{ fontSize:11, color: t.textMuted, fontWeight:700, flex:1 }}>Stock ±:</span>
                            {[-10,-1,+1,+5,+10,+25].map(d => (
                              <button key={d} onClick={() => changeStock(p._id, d)} style={{ padding:'4px 8px', border:'none', borderRadius:6, fontWeight:700, fontSize:11, cursor:'pointer', background: d<0 ? 'rgba(239,68,68,0.18)':'rgba(16,185,129,0.18)', color: d<0 ? '#ef4444':'#10b981' }}>
                                {d>0?`+${d}`:d}
                              </button>
                            ))}
                          </div>

                          {/* Action buttons */}
                          <div style={{ display:'flex', gap:8 }}>
                            <button onClick={() => toggleVisible(p)} style={{ flex:1, padding:'8px', background: t.bgCardSubtle, border: `1px solid ${t.border}`, borderRadius:9, color: t.textSecondary, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                              {p.isAvailable ? '👁 Hide' : '👁 Show'}
                            </button>
                            <button onClick={() => openEdit(p)} style={{ flex:1, padding:'8px', background:'rgba(59,130,246,0.15)', border:'none', borderRadius:9, color:'#3b82f6', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                              ✏️ Edit
                            </button>
                            <button onClick={() => deleteProduct(p)} style={{ padding:'8px 11px', background:'rgba(239,68,68,0.12)', border:'none', borderRadius:9, color:'#ef4444', cursor:'pointer', fontSize:14 }}>
                              🗑
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ════════════ BATCHES TAB ════════════ */}
          {tab === 'batches' && (
            <div>
              {readyBatches.length > 0 ? (
                <div style={{ background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:12, padding:'12px 18px', marginBottom:18, fontSize:13.5, color: isDark ? '#34d399' : '#047857', fontWeight:600 }}>
                  ✅ <b>{readyBatches.length} batch{readyBatches.length>1?'es':''}</b> ready for retail packaging. Click <b>"📦 Package to Store"</b> to measure weights & stock bags into the citizen store.
                </div>
              ) : (
                <div style={{ background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.25)', borderRadius:12, padding:'12px 18px', marginBottom:18, fontSize:13, color: isDark ? '#93c5fd' : '#1d4ed8' }}>
                  ℹ️ All matured batches are currently packaged into inventory. Ongoing batches are maturing in beds automatically.
                </div>
              )}

              {batches.length === 0 ? (
                <div style={{ textAlign:'center', padding:60, color: t.textMuted, background: t.bgCard, borderRadius:16, border: `1px solid ${t.border}`, boxShadow: t.cardShadow }}>
                  <div style={{ fontSize:48, marginBottom:12 }}>♻️</div>
                  <p style={{ color: t.textSecondary }}>No compost batches found.<br/>Start a new batch from <b>Biomass & Processing Console</b>.</p>
                </div>
              ) : (
                <div style={{ display:'grid', gap:12 }}>
                  {batches.map(b => {
                    const estYield = Math.round((b.rawBiomassInputKg || 500) * 0.45);
                    const packagedKg = b.totalYieldKg || 0;
                    const remainingUnpackaged = Math.max(0, estYield - packagedKg);
                    const isFullyPackaged = b.status === 'Completed' || (packagedKg >= estYield && packagedKg > 0);
                    const isReadyToPackage = ['Retail Packaging', 'Completed'].includes(b.currentStage) && (!isFullyPackaged || remainingUnpackaged > 0);
                    const stageColor = STAGE_COLOR[b.currentStage] || '#94a3b8';
                    const daysIn = Math.floor((Date.now() - new Date(b.startDate||b.createdAt).getTime())/(86400000));

                    return (
                      <div key={b._id} style={{ background: t.bgCard, border:`1px solid ${isFullyPackaged ? 'rgba(52,211,153,0.35)' : isReadyToPackage ? 'rgba(16,185,129,0.35)' : t.border}`, borderRadius:14, padding:18, boxShadow: t.cardShadow }}>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:16, alignItems:'center' }}>

                          {/* Left info */}
                          <div style={{ flex:1, minWidth:220 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6, flexWrap:'wrap' }}>
                              <span style={{ fontSize:15, fontWeight:800, color: t.textPrimary }}>{b.batchNumber}</span>
                              <span style={{ background:`${stageColor}22`, color:stageColor, border:`1px solid ${stageColor}55`, borderRadius:6, padding:'2px 10px', fontSize:11, fontWeight:700 }}>{b.currentStage}</span>
                              {isFullyPackaged ? (
                                <span style={{ background:'rgba(52,211,153,0.15)', color:'#10b981', borderRadius:6, padding:'2px 10px', fontSize:11, fontWeight:700 }}>
                                  ✓ FULLY PACKAGED ({packagedKg} kg)
                                </span>
                              ) : isReadyToPackage ? (
                                <span style={{ background:'rgba(16,185,129,0.15)', color:'#10b981', borderRadius:6, padding:'2px 10px', fontSize:11, fontWeight:700 }}>
                                  📦 {remainingUnpackaged} kg AVAILABLE TO PACKAGE
                                </span>
                              ) : null}
                            </div>
                            <div style={{ fontSize:11.5, color: t.textMuted, marginBottom:8 }}>{b.facilityName}</div>

                            {/* Weight metrics */}
                            <div style={{ display:'flex', flexWrap:'wrap', gap:14 }}>
                              <span style={{ fontSize:12, color: t.textSecondary }}>🌱 Raw Biomass: <b style={{color: t.textPrimary}}>{b.rawBiomassInputKg} kg</b></span>
                              <span style={{ fontSize:12, color: t.textSecondary }}>📅 Day <b style={{color: t.textPrimary}}>{daysIn}</b></span>
                              <span style={{ fontSize:12, color: t.textSecondary }}>🎯 Est. Finished Yield: <b style={{color:'#10b981'}}>{estYield} kg</b></span>
                              <span style={{ fontSize:12, color: t.textSecondary }}>🛒 In Store Stock: <b style={{color: packagedKg>0?'#a855f7': t.textMuted}}>{packagedKg} kg</b></span>
                            </div>

                            {/* Breakdown of bags */}
                            {(b.packaged5KgBags || b.packaged10KgBags || b.packaged25KgBags || b.bulkMulchYieldKg) ? (
                              <div style={{ marginTop:8, display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
                                <span style={{ fontSize:11, color: t.textMuted, fontWeight:600 }}>Store distribution:</span>
                                {b.packaged5KgBags>0&&<span style={{ background:'rgba(16,185,129,0.12)',color: isDark ? '#34d399' : '#059669',borderRadius:6,padding:'2px 8px',fontSize:11,fontWeight:600 }}>{b.packaged5KgBags}× 5kg bags</span>}
                                {b.packaged10KgBags>0&&<span style={{ background:'rgba(59,130,246,0.12)',color: isDark ? '#60a5fa' : '#2563eb',borderRadius:6,padding:'2px 8px',fontSize:11,fontWeight:600 }}>{b.packaged10KgBags}× 10kg bags</span>}
                                {b.packaged25KgBags>0&&<span style={{ background:'rgba(168,85,247,0.12)',color: isDark ? '#c084fc' : '#7e22ce',borderRadius:6,padding:'2px 8px',fontSize:11,fontWeight:600 }}>{b.packaged25KgBags}× 25kg sacks</span>}
                                {b.bulkMulchYieldKg>0&&<span style={{ background:'rgba(245,158,11,0.12)',color: isDark ? '#f59e0b' : '#d97706',borderRadius:6,padding:'2px 8px',fontSize:11,fontWeight:600 }}>{b.bulkMulchYieldKg} kg loose mulch</span>}
                              </div>
                            ) : null}
                          </div>

                          {/* Progress bar */}
                          <div style={{ minWidth:110 }}>
                            <div style={{ fontSize:10, color: t.textMuted, marginBottom:4, textTransform:'uppercase', fontWeight:700 }}>Maturation</div>
                            <div style={{ height:6, borderRadius:99, background: t.bgCardSubtle2, marginBottom:4 }}>
                              <div style={{ height:'100%', borderRadius:99, width:`${b.stageProgress||0}%`, background:stageColor, transition:'width 0.4s' }}/>
                            </div>
                            <div style={{ fontSize:13, fontWeight:700, color:stageColor }}>{b.stageProgress||0}%</div>
                          </div>

                          {/* Action Button */}
                          <div>
                            {isFullyPackaged ? (
                              <div style={{ display:'flex', gap:6 }}>
                                <button
                                  onClick={() => openPackageModal(b)}
                                  style={{ ...S.btn(t.bgCardSubtle, t.textSecondary), fontSize:12, padding:'8px 14px', border: `1px solid ${t.border}` }}
                                  title="Package additional packets if batch had higher surplus yield"
                                >
                                  📦 Package Surplus
                                </button>
                              </div>
                            ) : isReadyToPackage ? (
                              <button
                                onClick={() => openPackageModal(b)}
                                style={{ ...S.btn('linear-gradient(135deg,#10b981,#059669)'), whiteSpace:'nowrap', padding:'10px 20px' }}
                              >
                                📦 Package to Store
                              </button>
                            ) : (
                              <div style={{ background: t.bgCardSubtle, border: `1px solid ${t.border}`, borderRadius:10, padding:'10px 16px', textAlign:'center', minWidth:110 }}>
                                <div style={{ fontSize:10, color: t.textMuted, marginBottom:2 }}>BED MATURATION</div>
                                <div style={{ fontSize:12, color:stageColor, fontWeight:700 }}>{b.currentStage?.split(' ')[0]}</div>
                                <div style={{ fontSize:10, color: t.textMuted, marginTop:2 }}>Auto-advancing</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ════════════════ ADD / EDIT PRODUCT MODAL ════════════════ */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:16, backdropFilter:'blur(4px)' }} onClick={e => { if(e.target===e.currentTarget) setModal(null); }}>
          <div style={{ background: t.modalBg, borderRadius:18, border:`1px solid ${t.borderStrong}`, width:'100%', maxWidth:580, maxHeight:'92vh', overflowY:'auto', padding:24, boxShadow: t.cardShadow }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div>
                <h2 style={{ margin:0, fontSize:18, fontWeight:800, color: t.textPrimary }}>{typeof modal === 'object' && modal._id ? '✏️ Edit Product' : '➕ Add New Product'}</h2>
                <p style={{ margin:'3px 0 0', color: t.textMuted, fontSize:12 }}>Visible in Citizen Eco Store</p>
              </div>
              <button onClick={() => setModal(null)} style={{ background:'transparent', border:'none', color: t.textMuted, cursor:'pointer', fontSize:22 }}>×</button>
            </div>

            {/* Image upload */}
            <div style={{ marginBottom:18 }}>
              <label style={S.label}>Product Image</label>
              <div onClick={() => imgRef.current?.click()} style={{ border:`2px dashed ${t.borderStrong}`, borderRadius:12, height:180, overflow:'hidden', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', background: t.bgCardSubtle, position:'relative' }}>
                {form.imagePreview ? (
                  <img src={form.imagePreview} alt="preview" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                ) : (
                  <div style={{ textAlign:'center', color: t.textMuted }}>
                    <div style={{ fontSize:36, marginBottom:6 }}>📸</div>
                    <div style={{ fontSize:12, color: t.textSecondary, fontWeight:600 }}>Click to upload product image</div>
                    <div style={{ fontSize:11, marginTop:4, color: t.textMuted }}>JPG, PNG, WEBP</div>
                  </div>
                )}
                {form.imagePreview && (
                  <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', opacity:0, transition:'opacity 0.2s' }} onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity=0}>
                    <span style={{ color:'#fff', fontSize:13, fontWeight:600 }}>📸 Change Image</span>
                  </div>
                )}
              </div>
              <input ref={imgRef} type="file" accept="image/*" onChange={pickImage} style={{ display:'none' }}/>
            </div>

            {/* Basic details */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div style={{ gridColumn:'1/-1' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                  <label style={{ ...S.label, margin:0 }}>Product Name *</label>
                  <button
                    type="button"
                    onClick={handleAiAutofill}
                    disabled={aiLoading}
                    title="Auto-fill description, usage guide, benefits, and metrics using AI"
                    style={{
                      background: aiLoading ? (isDark ? '#334155' : '#cbd5e1') : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      border: 'none',
                      color: '#ffffff',
                      padding: '4px 12px',
                      borderRadius: 6,
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: aiLoading ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 size={13} className="spin" /> Generating with AI...
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} /> ✨ AI Auto-Fill Details
                      </>
                    )}
                  </button>
                </div>
                <input
                  style={S.input}
                  placeholder="e.g. Desi Okra Seeds, Organic Neem Cake, Bio-Char..."
                  value={form.name}
                  onChange={e=>setForm(f=>({...f,name:e.target.value}))}
                />
              </div>
              <div>
                <label style={S.label}>Category</label>
                <select style={S.input} value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                  {CAT_OPTIONS.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Unit Size</label>
                <input style={S.input} placeholder="e.g. 500 g Pack, 5 kg Bag" value={form.unitSize} onChange={e=>setForm(f=>({...f,unitSize:e.target.value}))}/>
              </div>
            </div>

            <div style={{ marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                <label style={{ ...S.label, margin:0 }}>Description</label>
                <button
                  type="button"
                  onClick={handleAiAutofill}
                  disabled={aiLoading}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: isDark ? '#34d399' : '#059669',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3
                  }}
                >
                  <Sparkles size={11} /> AI Re-Generate
                </button>
              </div>
              <textarea style={S.textarea} rows={3} placeholder="Describe product details, organic composition, and benefits..." value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/>
            </div>

            {/* Pricing & Stock */}
            <div style={{ ...S.panel, marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#10b981', marginBottom:12 }}>💰 Pricing, Stock & Weight Metrics</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10, marginBottom:12 }}>
                <div>
                  <label style={S.label}>Price (₹) *</label>
                  <input type="number" min="0" style={S.input} value={form.priceInr} onChange={e=>setForm(fd=>({...fd, priceInr:Number(e.target.value)}))}/>
                </div>
                <div>
                  <label style={S.label}>Eco-Points</label>
                  <input type="number" min="0" style={S.input} value={form.priceEcoPoints} onChange={e=>setForm(fd=>({...fd, priceEcoPoints:Number(e.target.value)}))}/>
                </div>
                <div>
                  <label style={S.label}>Stock Qty *</label>
                  <input type="number" min="0" style={S.input} value={form.stockQuantity} onChange={e=>setForm(fd=>({...fd, stockQuantity:Number(e.target.value)}))}/>
                </div>
              </div>

              {/* Weight Metric Selection (kg, grm, mg, ton, L, ml, pcs) */}
              <div style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', border: `1px solid ${t.border}`, borderRadius: 10, padding: 12 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div>
                    <label style={S.label}>Weight / Measure Value *</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="e.g. 5, 250, 500, 1"
                      style={S.input}
                      value={form.weightValue !== undefined ? form.weightValue : form.weightKg}
                      onChange={e => {
                        const val = e.target.value === '' ? '' : Number(e.target.value);
                        setForm(fd => ({ ...fd, weightValue: val, weightKg: Number(val) }));
                      }}
                    />
                  </div>
                  <div>
                    <label style={S.label}>Weight Metric / Unit *</label>
                    <select
                      style={S.input}
                      value={form.weightUnit || 'kg'}
                      onChange={e => setForm(fd => ({ ...fd, weightUnit: e.target.value }))}
                    >
                      {WEIGHT_METRICS.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: t.textMuted, marginTop: 7, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                  <span>Metric selected: <b style={{ color: '#10b981' }}>{form.weightValue || 0} {form.weightUnit || 'kg'}</b></span>
                  <span style={{ color: t.textSecondary }}>(Supports kg, g/grm, mg, ton, L, ml, pcs)</span>
                </div>
              </div>
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={S.label}>Usage Instructions</label>
              <textarea style={S.textarea} rows={2} value={form.usageInstructions} onChange={e=>setForm(f=>({...f,usageInstructions:e.target.value}))}/>
            </div>
            <div style={{ marginBottom:22 }}>
              <label style={S.label}>Key Benefits (one per line)</label>
              <textarea style={S.textarea} rows={3} placeholder={'100% Organic\nEnhances Soil Moisture\nRich in Microbes'} value={form.benefits} onChange={e=>setForm(f=>({...f,benefits:e.target.value}))}/>
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setModal(null)} style={{ ...S.btn(t.tabInactiveBg, t.textSecondary), border: `1px solid ${t.border}`, flex:1 }}>Cancel</button>
              <button onClick={saveProduct} disabled={saving || !form.name.trim()} style={{ ...S.btn((!form.name.trim()||saving)? (isDark ? '#1e293b' : '#cbd5e1') : '#10b981'), flex:2, opacity:(!form.name.trim()||saving)?0.5:1 }}>
                {saving ? '⏳ Saving…' : typeof modal === 'object' && modal._id ? '💾 Save Changes' : '🌿 Add to Store'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ DYNAMIC PACKET PACKAGING MODAL ════════════════ */}
      {pkgBatch && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:16, backdropFilter:'blur(4px)' }} onClick={e => { if(e.target===e.currentTarget) setPkgBatch(null); }}>
          <div style={{ background: t.modalBg, borderRadius:20, border:'1px solid rgba(16,185,129,0.35)', width:'100%', maxWidth:640, maxHeight:'94vh', overflowY:'auto', padding:24, boxShadow: t.cardShadow }}>

            {/* Modal Header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
              <div>
                <h2 style={{ margin:0, fontSize:19, fontWeight:800, color: t.textPrimary, display:'flex', alignItems:'center', gap:8 }}>
                  📦 Package Compost into Packets
                </h2>
                <div style={{ fontSize:12.5, color: t.textMuted, marginTop:4 }}>
                  Batch: <b style={{ color:'#10b981' }}>{pkgBatch.batchNumber}</b> · Facility: {pkgBatch.facilityName}
                </div>
              </div>
              <button onClick={() => setPkgBatch(null)} style={{ background:'transparent', border:'none', color: t.textMuted, cursor:'pointer', fontSize:24, lineHeight:1 }}>×</button>
            </div>

            {/* Live Weight Pool Tracker */}
            <div style={{ background: t.bgCardSubtle, border:`1px solid ${t.border}`, borderRadius:14, padding:'14px 16px', marginBottom:18 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, textAlign:'center', marginBottom:12 }}>
                <div>
                  <div style={{ fontSize:10, color: t.textMuted, textTransform:'uppercase', fontWeight:700 }}>Total Batch Yield</div>
                  <div style={{ fontSize:18, fontWeight:800, color: t.textSecondary, marginTop:2 }}>{estTotalYield} kg</div>
                </div>
                <div>
                  <div style={{ fontSize:10, color: t.textMuted, textTransform:'uppercase', fontWeight:700 }}>Now Packaging</div>
                  <div style={{ fontSize:18, fontWeight:800, color:'#10b981', marginTop:2 }}>{currentTotalPackagedKg} kg</div>
                </div>
                <div>
                  <div style={{ fontSize:10, color: t.textMuted, textTransform:'uppercase', fontWeight:700 }}>Remaining Unpackaged</div>
                  <div style={{ fontSize:18, fontWeight:800, color: remainingAfterKg < 0 ? '#f59e0b' : '#3b82f6', marginTop:2 }}>
                    {remainingAfterKg < 0 ? `+${Math.abs(remainingAfterKg)} kg (Surplus)` : `${remainingAfterKg} kg`}
                  </div>
                </div>
              </div>

              {/* Real-time decrement meter */}
              <div style={{ height:7, borderRadius:99, background: t.bgCardSubtle2, overflow:'hidden', position:'relative' }}>
                <div style={{
                  height:'100%',
                  borderRadius:99,
                  background: remainingAfterKg < 0 ? 'linear-gradient(90deg, #10b981, #f59e0b)' : '#10b981',
                  width: `${Math.min(100, Math.round((currentTotalPackagedKg / (estTotalYield || 1)) * 100))}%`,
                  transition: 'width 0.25s ease'
                }}/>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:10.5, color: t.textMuted, marginTop:4 }}>
                <span>0 kg</span>
                <span>{estTotalYield} kg Batch Capacity</span>
              </div>
            </div>

            {/* Dynamic Packet Rows Builder */}
            <div style={{ ...S.panel, marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <div style={{ fontSize:13, fontWeight:800, color:'#10b981', display:'flex', alignItems:'center', gap:6 }}>
                  🛍️ Packets to Create (e.g. 25kg, 10kg, 5kg...)
                </div>
                <button
                  type="button"
                  onClick={addPacketRow}
                  style={{ ...S.btn('rgba(16,185,129,0.15)', '#10b981'), padding:'5px 12px', fontSize:12, borderRadius:8 }}
                >
                  ➕ Add Another Packet Size
                </button>
              </div>

              <div style={{ display:'grid', gap:12 }}>
                {packetRows.map((row, idx) => {
                  const rowWeight = Number(row.weightKg || 0) * Number(row.quantity || 0);
                  return (
                    <div key={row.id} style={{ background: t.bgCardSubtle, border:`1px solid ${t.border}`, borderRadius:12, padding:12 }}>
                      {/* Presets + Remove */}
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, flexWrap:'wrap', gap:6 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                          <span style={{ fontSize:11, color: t.textMuted, fontWeight:700 }}>Quick weight:</span>
                          {[2, 5, 10, 25, 50].map(w => (
                            <button
                              key={w}
                              type="button"
                              onClick={() => updatePacketRow(row.id, 'weightKg', w)}
                              style={{
                                padding:'2px 7px',
                                border:'none',
                                borderRadius:5,
                                fontSize:11,
                                fontWeight:700,
                                cursor:'pointer',
                                background: row.weightKg === w ? '#10b981' : t.bgCardSubtle2,
                                color: row.weightKg === w ? '#fff' : t.textSecondary
                              }}
                            >
                              {w}kg
                            </button>
                          ))}
                        </div>

                        {packetRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePacketRow(row.id)}
                            style={{ background:'rgba(239,68,68,0.15)', border:'none', color:'#ef4444', borderRadius:6, padding:'2px 8px', fontSize:11, cursor:'pointer' }}
                          >
                            🗑 Remove
                          </button>
                        )}
                      </div>

                      {/* Main row inputs */}
                      <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1.4fr 1.2fr 1fr', gap:10, alignItems:'flex-end' }}>
                        {/* Weight per packet */}
                        <div>
                          <label style={S.label}>Weight / Pack</label>
                          <div style={{ position:'relative' }}>
                            <input
                              type="number"
                              min="0.5"
                              step="0.5"
                              style={{ ...S.input, paddingRight:26 }}
                              value={row.weightKg}
                              onChange={e => updatePacketRow(row.id, 'weightKg', Math.max(0.1, Number(e.target.value)))}
                            />
                            <span style={{ position:'absolute', right:8, top:8, fontSize:11, color: t.textMuted }}>kg</span>
                          </div>
                        </div>

                        {/* Quantity (Number of packets) */}
                        <div>
                          <label style={S.label}>No. of Packets</label>
                          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                            <button
                              type="button"
                              onClick={() => updatePacketRow(row.id, 'quantity', Math.max(1, Number(row.quantity) - 1))}
                              style={{ width:30, height:34, border:'none', borderRadius:7, background:'rgba(239,68,68,0.18)', color:'#ef4444', fontWeight:800, cursor:'pointer', fontSize:15 }}
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min="1"
                              style={{ ...S.input, textAlign:'center', padding:'8px 4px', fontWeight:700, fontSize:14 }}
                              value={row.quantity}
                              onChange={e => updatePacketRow(row.id, 'quantity', Math.max(1, Number(e.target.value)))}
                            />
                            <button
                              type="button"
                              onClick={() => updatePacketRow(row.id, 'quantity', Number(row.quantity) + 1)}
                              style={{ width:30, height:34, border:'none', borderRadius:7, background:'rgba(16,185,129,0.18)', color:'#10b981', fontWeight:800, cursor:'pointer', fontSize:15 }}
                            >
                              ＋
                            </button>
                          </div>
                        </div>

                        {/* Price per packet */}
                        <div>
                          <label style={S.label}>Price / Pack (₹)</label>
                          <input
                            type="number"
                            min="1"
                            style={S.input}
                            value={row.priceInr}
                            onChange={e => updatePacketRow(row.id, 'priceInr', Math.max(1, Number(e.target.value)))}
                          />
                        </div>

                        {/* Subtotal weight badge */}
                        <div style={{ background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:8, padding:'7px 8px', textAlign:'center' }}>
                          <div style={{ fontSize:9, color: t.textMuted, textTransform:'uppercase', fontWeight:700 }}>Subtotal</div>
                          <div style={{ fontSize:14, fontWeight:800, color:'#10b981' }}>{rowWeight} kg</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Optional Loose Bio-Mulch */}
            <div style={{ ...S.panel, marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#f59e0b', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                🌾 Loose Bio-Mulch & Woodchips (Optional bulk kg)
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <label style={S.label}>Mulch Quantity (kg)</label>
                  <input
                    type="number"
                    min="0"
                    style={S.input}
                    value={mulchKg}
                    onChange={e => setMulchKg(Math.max(0, Number(e.target.value)))}
                  />
                </div>
                <div>
                  <label style={S.label}>Price per kg (₹)</label>
                  <input
                    type="number"
                    min="1"
                    style={S.input}
                    value={pricePerKgMulch}
                    onChange={e => setPricePerKgMulch(Math.max(1, Number(e.target.value)))}
                  />
                </div>
              </div>
            </div>

            {/* Store Product Image & Packaging Photo */}
            <div style={{ ...S.panel, marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div style={{ fontSize:13, fontWeight:800, color: t.textPrimary, display:'flex', alignItems:'center', gap:6 }}>
                  📸 Product Image for Citizen Store
                </div>
                <div style={{ fontSize:11, color: t.textMuted }}>
                  Attaches directly to store product card
                </div>
              </div>

              <div style={{ display:'flex', gap:14, alignItems:'center', flexWrap:'wrap' }}>
                {/* Image preview thumbnail */}
                <div style={{ width:84, height:84, borderRadius:12, overflow:'hidden', border:`2px solid ${isDark ? '#10b981' : '#059669'}`, background: t.bgCardSubtle, position:'relative', flexShrink:0, boxShadow:'0 4px 12px rgba(0,0,0,0.2)' }}>
                  <img
                    src={pkgImage}
                    alt="Packaging Preview"
                    style={{ width:'100%', height:'100%', objectFit:'cover' }}
                    onError={e => { e.target.src='https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&auto=format&fit=crop&q=80'; }}
                  />
                  <div style={{ position:'absolute', bottom:0, insetInline:0, background:'rgba(0,0,0,0.65)', color:'#fff', fontSize:9, textAlign:'center', padding:'2px 0', fontWeight:700 }}>
                    STORE IMG
                  </div>
                </div>

                {/* Upload & Preset controls */}
                <div style={{ flex:1, minWidth:200 }}>
                  <input
                    ref={pkgImgRef}
                    type="file"
                    accept="image/*"
                    style={{ display:'none' }}
                    onChange={handlePkgImageUpload}
                  />

                  <div style={{ display:'flex', gap:8, marginBottom:8, flexWrap:'wrap' }}>
                    <button
                      type="button"
                      onClick={() => pkgImgRef.current?.click()}
                      style={{ ...S.btn('linear-gradient(135deg, #10b981, #059669)'), padding:'7px 14px', fontSize:12 }}
                    >
                      📷 Upload Custom Photo
                    </button>
                    {pkgImage && pkgImage.startsWith('data:') && (
                      <button
                        type="button"
                        onClick={() => setPkgImage(COMPOST_IMAGE_PRESETS[0].url)}
                        style={{ ...S.btn('rgba(239,68,68,0.15)', '#ef4444'), padding:'7px 12px', fontSize:11 }}
                      >
                        Reset to Default
                      </button>
                    )}
                  </div>

                  {/* Preset quick buttons */}
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
                    <span style={{ fontSize:10.5, color: t.textMuted, fontWeight:700 }}>Presets:</span>
                    {COMPOST_IMAGE_PRESETS.map(preset => {
                      const isSel = pkgImage === preset.url;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setPkgImage(preset.url)}
                          style={{
                            padding:'3px 9px',
                            borderRadius:6,
                            fontSize:11,
                            fontWeight:700,
                            cursor:'pointer',
                            border: isSel ? '1px solid #10b981' : `1px solid ${t.border}`,
                            background: isSel ? (isDark ? 'rgba(16,185,129,0.2)' : '#d1fae5') : t.bgCardSubtle2,
                            color: isSel ? (isDark ? '#34d399' : '#047857') : t.textSecondary
                          }}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Optional URL input */}
              <div style={{ marginTop:10 }}>
                <input
                  type="text"
                  placeholder="Or paste external image URL (https://...)"
                  value={pkgImage.startsWith('data:') ? 'Custom uploaded image (Base64)' : pkgImage}
                  onChange={e => {
                    if (!e.target.value.startsWith('Custom uploaded')) {
                      setPkgImage(e.target.value);
                    }
                  }}
                  style={{ ...S.input, fontSize:11.5, padding:'6px 10px' }}
                />
              </div>
            </div>

            {/* Summary Banner */}
            <div style={{ background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:12, padding:'14px 18px', marginBottom:18, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
              <div>
                <div style={{ fontSize:11, color: t.textMuted, fontWeight:600 }}>Total Packaged to Store</div>
                <div style={{ fontSize:22, fontWeight:800, color:'#10b981' }}>{currentTotalPackagedKg} kg</div>
              </div>
              <div>
                <div style={{ fontSize:11, color: t.textMuted, fontWeight:600 }}>Estimated Store Value</div>
                <div style={{ fontSize:18, fontWeight:800, color: isDark ? '#60a5fa' : '#2563eb' }}>₹{estRevenue.toLocaleString()}</div>
              </div>
              <div>
                <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color: t.textPrimary, cursor:'pointer', fontWeight:600 }}>
                  <input
                    type="checkbox"
                    checked={markCompleted}
                    onChange={e => setMarkCompleted(e.target.checked)}
                    style={{ accentColor:'#10b981', width:16, height:16 }}
                  />
                  Mark batch as Completed
                </label>
              </div>
            </div>

            {/* Quality Grade & Notes */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1.5fr', gap:10, marginBottom:20 }}>
              <div>
                <label style={S.label}>Quality Certification Grade</label>
                <select style={S.input} value={pkgGrade} onChange={e => setPkgGrade(e.target.value)}>
                  <option>Grade A Premium Organic</option>
                  <option>Grade B Soil Conditioner</option>
                  <option>Bulk Agricultural Grade</option>
                </select>
              </div>
              <div>
                <label style={S.label}>Packaging Notes (Optional)</label>
                <input
                  type="text"
                  style={S.input}
                  placeholder="e.g. Sieved through 4mm mesh, moisture 38%"
                  value={pkgNotes}
                  onChange={e => setPkgNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display:'flex', gap:10 }}>
              <button
                type="button"
                onClick={() => setPkgBatch(null)}
                style={{ ...S.btn(t.tabInactiveBg, t.textSecondary), border: `1px solid ${t.border}`, flex:1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={doPackage}
                disabled={packaging || currentTotalPackagedKg <= 0}
                style={{
                  ...S.btn(packaging || currentTotalPackagedKg <= 0 ? (isDark ? '#1e293b' : '#cbd5e1') : 'linear-gradient(135deg,#10b981,#059669)'),
                  flex:2,
                  opacity: packaging || currentTotalPackagedKg <= 0 ? 0.5 : 1,
                  justifyContent:'center'
                }}
              >
                {packaging ? '⏳ Packaging & Adding Stock…' : `🌿 Add ${currentTotalPackagedKg} kg to Eco Store Inventory`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
