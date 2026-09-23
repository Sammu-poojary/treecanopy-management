import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  Recycle,
  Layers,
  ShoppingBag,
  Gavel,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  QrCode,
  Truck,
  Leaf,
  Thermometer,
  Droplets,
  Package,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Check,
  X,
  Home,
  FileText,
  MapPin,
  ExternalLink,
  Lock,
  Upload,
  Sun,
  Moon,
  Edit,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Camera,
  Sparkles,
  Loader2
} from 'lucide-react';
import { Topbar, Sidebar } from './CanopyPages';

// Base64 file converter
const toBase64 = file => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.onerror = rej;
  r.readAsDataURL(file);
});

// Compost Packaging Image Presets
const COMPOST_IMAGE_PRESETS = [
  {
    label: 'Standard Bag',
    url: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&auto=format&fit=crop&q=80'
  },
  {
    label: 'Black Gold',
    url: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?w=600&auto=format&fit=crop&q=80'
  },
  {
    label: 'Canopy Organic',
    url: 'https://images.unsplash.com/photo-1592417817098-8f3d6910985b?w=600&auto=format&fit=crop&q=80'
  },
  {
    label: 'Bio-Mulch',
    url: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=600&auto=format&fit=crop&q=80'
  }
];

export default function ProcessingConsolePage() {
  const navigate = useNavigate();
  const getEcoStoreUrl = () => {
    try {
      const u = JSON.parse(localStorage.getItem('currentUser'));
      if (u?.role?.toLowerCase().includes('admin')) return '/admin/eco-store';
    } catch(e) {}
    return '/official/eco-store';
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Theme state & sync
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
    window.dispatchEvent(new Event('themeChange'));
  };
  useEffect(() => {
    const sync = () => setIsDark(localStorage.getItem('theme') === 'dark');
    window.addEventListener('themeChange', sync);
    return () => window.removeEventListener('themeChange', sync);
  }, []);

  const t = {
    bgPage: isDark ? '#0b1120' : '#f8fafc',
    bgHeader: isDark 
      ? 'linear-gradient(180deg, rgba(16, 185, 129, 0.15) 0%, rgba(11, 17, 32, 0.95) 100%)' 
      : 'linear-gradient(180deg, rgba(16, 185, 129, 0.10) 0%, rgba(241, 245, 249, 0.95) 100%)',
    bgCard: isDark ? 'rgba(15, 23, 42, 0.85)' : '#ffffff',
    bgCardAlt: isDark ? 'rgba(30, 41, 59, 0.6)' : '#f8fafc',
    bgSubtle: isDark ? 'rgba(255, 255, 255, 0.04)' : '#f1f5f9',
    bgInput: isDark ? 'rgba(2, 6, 23, 0.7)' : '#ffffff',
    border: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
    borderStrong: isDark ? 'rgba(255, 255, 255, 0.15)' : '#cbd5e1',
    textPrimary: isDark ? '#f8fafc' : '#0f172a',
    textSecondary: isDark ? '#94a3b8' : '#475569',
    textMuted: isDark ? '#64748b' : '#94a3b8',
    cardShadow: isDark ? '0 4px 20px rgba(0,0,0,0.25)' : '0 2px 10px rgba(0,0,0,0.05)',
    modalBg: isDark ? '#0f172a' : '#ffffff',
    modalBorder: isDark ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0',
    tableHeadBg: isDark ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc',
    tableRowBorder: isDark ? 'rgba(255, 255, 255, 0.04)' : '#f1f5f9',
    tabActiveBg: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.12)',
    tabActiveText: isDark ? '#34d399' : '#047857',
    tabActiveBorder: '#10b981',
    tabInactiveBg: isDark ? 'rgba(255, 255, 255, 0.03)' : '#ffffff',
    tabInactiveText: isDark ? '#94a3b8' : '#64748b',
    tabInactiveBorder: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
  };

  // Default to 'intake' so official immediately sees cutter submissions
  const [activeTab, setActiveTab] = useState('intake');
  const [intakes, setIntakes] = useState([]);
  const [batches, setBatches] = useState([]);
  const [products, setProducts] = useState([]);
  const [timberLots, setTimberLots] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters for Submissions
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [timberLotFilter, setTimberLotFilter] = useState('LIVE'); // 'LIVE' | 'ALL' | 'CLOSED'

  // Helper: check if timber lot auction is fully closed / awarded
  const isLotClosed = (lot) => {
    if (!lot) return false;
    const s = String(lot?.status || '').toUpperCase();
    return (
      s.includes('SOLD') ||
      s.includes('CLOSED') ||
      s.includes('ENDED') ||
      s.includes('COLLECTED') ||
      s.includes('WINNER') ||
      s.includes('DELIVERED') ||
      s.includes('AWARDED') ||
      s.includes('CERTIFICATE') ||
      s === 'COMPLETED'
    );
  };

  // Preview Proof Image Modal
  const [selectedProof, setSelectedProof] = useState(null);

  // Track per-intake routing state: { [intakeId]: { compostBatchId, timberLotId, ... } }
  const [intakeRouting, setIntakeRouting] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('intake_routing') || '{}');
    } catch {
      return {};
    }
  });

  // Package compost batch modal state
  const [packageCompostModal, setPackageCompostModal] = useState(null); // batch object

  // New Batch Modal State
  const [showNewBatchModal, setShowNewBatchModal] = useState(false);
  const [newBatchForm, setNewBatchForm] = useState({
    batchCode: `CMP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    location: 'Ajjarkadu Municipal Compost Center, Udupi',
    initialWeightKg: 650,
    foliageWeightKg: 450,
    woodchipsWeightKg: 200
  });

  // Advance Batch Modal
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [advanceForm, setAdvanceForm] = useState({
    newStage: '',
    tempC: 58,
    moisturePercent: 55,
    actionTaken: 'Aeration turning performed'
  });

  // Package Batch Modal
  const [packageBatchModal, setPackageBatchModal] = useState(null);
  const [packageForm, setPackageForm] = useState({
    yieldKg: '',
    targetProductId: '',
    newStockQty: ''
  });

  // Dynamic packet packaging state (for the full Package modal)
  const [pkgPacketRows, setPkgPacketRows] = useState([]);
  const [pkgMulchKg, setPkgMulchKg] = useState(0);
  const [pkgPricePerKgMulch, setPkgPricePerKgMulch] = useState(15);
  const [pkgGrade, setPkgGrade] = useState('Grade A Premium Organic');
  const [pkgNotes, setPkgNotes] = useState('');
  const [pkgMarkCompleted, setPkgMarkCompleted] = useState(true);
  const [pkgBusy, setPkgBusy] = useState(false);
  const [pkgImage, setPkgImage] = useState('https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&auto=format&fit=crop&q=80');
  const pkgImgRef = useRef();

  const handlePkgImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await toBase64(file);
      setPkgImage(b64);
    } catch(err) {
      console.error(err);
    }
  };

  const getDefaultPriceForKg = (kg) => {
    if (kg === 25) return 399;
    if (kg === 10) return 179;
    if (kg === 5)  return 99;
    if (kg === 2)  return 49;
    if (kg === 1)  return 29;
    return Math.round(kg * 16);
  };

  const openPackageBatchModal = (b) => {
    const estYield = Math.round((b.rawBiomassInputKg || b.initialWeightKg || 500) * 0.45);
    const alreadyKg = b.totalYieldKg || 0;
    const availableKg = Math.max(estYield - alreadyKg, estYield);
    let initialKg = 25;
    if (availableKg < 25 && availableKg >= 10) initialKg = 10;
    else if (availableKg < 10) initialKg = 5;
    const initialQty = Math.max(1, Math.floor(availableKg / initialKg));
    const initialPrice = getDefaultPriceForKg(initialKg);
    setPkgPacketRows([{ id: Date.now(), weightKg: initialKg, quantity: initialQty, priceInr: initialPrice, priceEcoPoints: Math.round(initialPrice * 0.4) }]);
    setPkgMulchKg(0);
    setPkgPricePerKgMulch(15);
    setPkgGrade(b.qualityCertificationGrade || 'Grade A Premium Organic');
    setPkgNotes('');
    setPkgMarkCompleted(true);
    setPkgImage('https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&auto=format&fit=crop&q=80');
    setPackageBatchModal(b);
  };

  const doPackageBatch = async () => {
    const totalKg = pkgPacketRows.reduce((s, r) => s + Number(r.weightKg || 0) * Number(r.quantity || 0), 0) + Number(pkgMulchKg || 0);
    if (totalKg <= 0) { Swal.fire('Enter Details', 'Set at least 1 packet with weight & quantity > 0.', 'warning'); return; }
    setPkgBusy(true);
    try {
      const payload = {
        packages: pkgPacketRows.map(r => ({
          weightKg: Number(r.weightKg),
          quantity: Number(r.quantity),
          priceInr: Number(r.priceInr),
          priceEcoPoints: Number(r.priceEcoPoints),
          name: `CanopyGuard Organic Compost (${r.weightKg} kg ${Number(r.weightKg) >= 25 ? 'Sack' : 'Bag'})`,
          image: pkgImage
        })),
        bulkMulchKg: Number(pkgMulchKg || 0),
        pricePerKgMulch: Number(pkgPricePerKgMulch || 15),
        qualityGrade: pkgGrade,
        packagingNotes: pkgNotes,
        markAsCompleted: pkgMarkCompleted,
        image: pkgImage
      };
      const res = await fetch(`http://localhost:5000/api/compost-batches/${packageBatchModal._id}/package-to-store`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to package batch');
      setPackageBatchModal(null);
      await fetchData();
      Swal.fire({
        icon: 'success',
        title: '🌿 Stock Added to Citizen Eco Store!',
        html: `<b>Total Packaged:</b> ${data.totalKg || totalKg} kg<br/><span style="color:#10b981">✓ Products updated with custom packaging photo live in Eco Store!</span>`,
        confirmButtonColor: '#10b981',
        showCancelButton: true,
        cancelButtonText: 'Stay Here',
        confirmButtonText: 'Open Eco Store Manager ↗',
        background: '#0f172a',
        color: '#f8fafc'
      }).then(res => {
        if (res.isConfirmed) {
          navigate(getEcoStoreUrl());
        }
      });
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Packaging Failed', text: e.message });
    }
    setPkgBusy(false);
  };

  // New Timber Lot Modal
  const lotImgRef = useRef();
  const [showNewLotModal, setShowNewLotModal] = useState(false);
  const [lotForm, setLotForm] = useState({
    lotNumber: `LOT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    title: '3x Teak Logs (650 kg)',
    species: 'Teak / Hardwood',
    treeSpecies: 'Teak / Hardwood',
    woodGrade: 'Grade A Construction Hardwood',
    logCount: 3,
    estimatedWeightKg: 650,
    totalWeightKg: 650,
    averageDiameterCm: 45,
    approxLengthM: 3.0,
    startingBidInr: 8000,
    reservePrice: 12000,
    reservePriceInr: 12000,
    bidIncrement: 250,
    bidStepIncrementInr: 250,
    auctionDurationHours: 48,
    yardLocation: 'Government Green Waste Yard - Zone A',
    storageYard: 'Government Green Waste Yard - Zone A',
    description: 'Salvaged urban timber logs segregated from municipal tree clearances. Certified pest-free and seasoned.',
    imageBase64: null,
    imagePreview: 'https://images.unsplash.com/photo-1546484396-fb3fc6f95f98?w=800&auto=format&fit=crop&q=80'
  });

  // Product Modal & Edit State
  const productImgRef = useRef();
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    category: 'Organic Compost',
    description: '',
    unitSize: '',
    weightKg: '',
    priceInr: '',
    priceEcoPoints: '',
    stockQuantity: '',
    npkRatio: '',
    usageInstructions: '',
    benefits: '',
    imageBase64: null,
    imagePreview: ''
  });

  // Fetch all console data
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Trigger auto-advance silently (progresses timed-out compost stages)
      try {
        const aaRes = await fetch('http://localhost:5000/api/compost-batches/auto-advance', { method: 'POST' });
        if (aaRes.ok) {
          const aaData = await aaRes.json().catch(() => null);
          if (aaData?.total > 0) {
            console.info(`🌿 Auto-advanced ${aaData.total} compost batch(es):`, aaData.advanced);
          }
        }
      } catch (aaErr) {
        console.warn('Auto-advance notice:', aaErr.message);
      }

      const [intakeRes, batchRes, prodRes, timberRes] = await Promise.all([
        fetch('http://localhost:5000/api/waste-intakes').catch(() => null),
        fetch('http://localhost:5000/api/compost-batches').catch(() => null),
        fetch('http://localhost:5000/api/eco-products').catch(() => null),
        fetch('http://localhost:5000/api/timber-auctions').catch(() => null)
      ]);

      let loadedIntakes = [];
      if (intakeRes && intakeRes.ok) {
        loadedIntakes = await intakeRes.json();
      }

      let loadedBatches = [];
      if (batchRes && batchRes.ok) {
        loadedBatches = await batchRes.json();
        setBatches(loadedBatches);
      }

      if (prodRes && prodRes.ok) setProducts(await prodRes.json());

      let loadedTimber = [];
      if (timberRes && timberRes.ok) {
        loadedTimber = await timberRes.json();
        setTimberLots(loadedTimber);
      }

      // Check local storage tasks for any submissions not yet in DB
      try {
        const localTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
        const cutterTasks = JSON.parse(localStorage.getItem('cutter_tasks') || '[]');
        const allLocal = [...localTasks, ...cutterTasks];

        const localIntakes = allLocal
          .filter(t => t.wasteProofUrl || t.status === 'Waste Disposed' || t.status === 'Work Completed' || t.biomassSpecies)
          .map((t, idx) => ({
            _id: t._id || t.id || `local-${idx}`,
            shipmentId: `WST-2026-${String(idx + 101).padStart(4, '0')}`,
            workOrderTitle: t.title || 'Tree Maintenance & Clearance',
            cutterName: t.cutter || 'Field Cutter',
            disposalYard: t.dumpingLocation || 'Ajjarkadu Municipal Compost Center, Udupi',
            vehicleNumber: t.vehicleNumber || 'KA-20-TR-4821',
            vehicleType: t.vehicleType || 'Mini Tipper Truck',
            biomass: {
              leavesWeightKg: Number(t.biomassLeavesKg || 120),
              branchesWeightKg: Number(t.biomassBranchesKg || 180),
              logsCount: Number(t.biomassLogCount || 2),
              logsWeightKg: Number(t.biomassLogsKg || 400),
              treeSpecies: t.biomassSpecies || t.treeSpecies || 'Neem / Rosewood',
              approxLogDiameterCm: Number(t.biomassDiameterCm || 35),
              approxLogLengthMeters: 2.5,
              isDiseased: Boolean(t.isDiseasedBiomass)
            },
            proofImageUrl: t.wasteProofUrl || t.afterImageUrl || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop&q=80',
            gpsLocation: t.wasteGps || { lat: '13.3409', lng: '74.7421', address: t.dumpingLocation || 'Udupi' },
            status: t.intakeVerified ? 'Verified' : 'Delivered',
            allocatedStream: Number(t.biomassLogsKg || 0) > 200 ? 'Timber Auction' : 'Composting',
            deliveredAt: t.reachedAt || new Date().toISOString()
          }));

        // Merge without duplicating IDs or titles
        const existingIds = new Set(loadedIntakes.map(i => String(i.complaintId || i._id || '')));
        const newOnes = localIntakes.filter(li => !existingIds.has(String(li._id)));
        loadedIntakes = [...loadedIntakes, ...newOnes];
      } catch (e) {
        console.warn('Local tasks intake sync notice:', e);
      }

      setIntakes(loadedIntakes);

      // Reconcile and merge routing state
      try {
        const savedRouting = JSON.parse(localStorage.getItem('intake_routing') || '{}');
        const dynamicRouting = { ...savedRouting };

        loadedIntakes.forEach(intake => {
          const idKey = intake._id || intake.shipmentId;
          if (intake.assignedCompostBatchId) {
            const matchingBatch = (loadedBatches || []).find(b => String(b._id) === String(intake.assignedCompostBatchId) || String(b.batchNumber) === String(intake.assignedCompostBatchId));
            dynamicRouting[idKey] = {
              ...(dynamicRouting[idKey] || {}),
              compostBatchId: intake.assignedCompostBatchId,
              compostBatchCode: matchingBatch ? (matchingBatch.batchNumber || matchingBatch.batchCode) : (dynamicRouting[idKey]?.compostBatchCode || `CMP-BATCH-${String(intake.assignedCompostBatchId).slice(-4)}`),
              compostLocation: matchingBatch?.facilityName || intake.disposalYard,
              compostWeightKg: (intake.biomass?.leavesWeightKg || 0) + (intake.biomass?.branchesWeightKg || 0),
              compostRoutedAt: intake.verifiedAt || dynamicRouting[idKey]?.compostRoutedAt || new Date().toISOString()
            };
          }
          // Check matching timber lot by assignedTimberLotId, intakeShipmentId, or saved lot number
          const matchingLot = (loadedTimber || []).find(l => {
            const lIntake = String(l.intakeShipmentId || '').trim().toUpperCase();
            const sId = String(intake.shipmentId || '').trim().toUpperCase();
            const iId = String(intake._id || '').trim();
            const lId = String(l._id || '');
            const lNum = String(l.lotNumber || '').trim().toUpperCase();
            const aId = String(intake.assignedTimberLotId || '').trim();
            const savedLotNum = String(savedRouting[idKey]?.timberLotNumber || '').trim().toUpperCase();

            return (
              (lIntake && (lIntake === sId || lIntake === iId.toUpperCase())) ||
              (aId && (lId === aId || lNum === aId.toUpperCase())) ||
              (savedLotNum && lNum === savedLotNum)
            );
          });

          if (matchingLot || intake.assignedTimberLotId) {
            dynamicRouting[idKey] = {
              ...(dynamicRouting[idKey] || {}),
              timberLotId: matchingLot?._id || intake.assignedTimberLotId,
              timberLotNumber: matchingLot ? matchingLot.lotNumber : (dynamicRouting[idKey]?.timberLotNumber || `TMB-${String(intake.assignedTimberLotId).slice(-4)}`),
              timberStatus: matchingLot ? matchingLot.status : (dynamicRouting[idKey]?.timberStatus || 'Live Bidding'),
              timberLocation: matchingLot?.storageYard || intake.disposalYard,
              timberSpecies: matchingLot?.treeSpecies || intake.biomass?.treeSpecies,
              timberRoutedAt: intake.verifiedAt || dynamicRouting[idKey]?.timberRoutedAt || new Date().toISOString()
            };
          }
        });

        setIntakeRouting(dynamicRouting);
        localStorage.setItem('intake_routing', JSON.stringify(dynamicRouting));
      } catch (err) {
        console.warn('Routing state reconciliation notice:', err);
      }
    } catch (e) {
      console.error('Failed to load processing console data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handler: Verify Intake
  const handleVerifyIntake = async (intake) => {
    const { value: notes } = await Swal.fire({
      title: `Verify Shipment ${intake.shipmentId || ''}?`,
      html: `
        <div style="text-align: left; font-size: 13px; color: #475569;">
          <p><strong>Cutter:</strong> ${intake.cutterName || 'Field Cutter'}</p>
          <p><strong>Vehicle:</strong> ${intake.vehicleNumber || 'KA-20-TR-4821'} (${intake.vehicleType || 'Tipper'})</p>
          <p><strong>Leaves:</strong> ${((intake.biomass?.leavesWeightKg || intake.foliageWeightKg || 0) / 1000).toFixed(2)} Ton | <strong>Branches:</strong> ${((intake.biomass?.branchesWeightKg || intake.branchWeightKg || 0) / 1000).toFixed(2)} Ton</p>
          <p><strong>Timber:</strong> ${intake.biomass?.logsCount || 0} logs (${intake.biomass?.treeSpecies || 'Mixed'}) ~ ${((intake.biomass?.logsWeightKg || 0) / 1000).toFixed(2)} Ton</p>
        </div>
      `,
      input: 'text',
      inputLabel: 'Official Verification Notes (Optional)',
      inputPlaceholder: 'e.g. Weighbridge load verified and logged at Bay #2',
      showCancelButton: true,
      confirmButtonText: '✓ Verify & Accept Load',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b'
    });

    if (notes !== undefined) {
      try {
        if (intake._id && !String(intake._id).startsWith('local-')) {
          await fetch(`http://localhost:5000/api/waste-intakes/${intake._id}/verify`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'Verified',
              verifiedByName: 'Official Verifier',
              verificationNotes: notes || 'Weighbridge inspection passed'
            })
          });
        }

        // Update local state
        setIntakes(prev => prev.map(i => i._id === intake._id ? { ...i, status: 'Verified', verificationNotes: notes } : i));

        Swal.fire({
          icon: 'success',
          title: 'Shipment Verified! ✓',
          text: `Intake ${intake.shipmentId || ''} marked as verified and accepted into the processing yard.`,
          timer: 2000,
          showConfirmButton: false
        });
      } catch (err) {
        Swal.fire('Error', err.message, 'error');
      }
    }
  };

  // Handler: Quick Route to Timber Lot
  const handleRouteToTimber = (intake) => {
    const isVerified = (intake.status || '').toLowerCase() === 'verified';
    if (!isVerified) {
      Swal.fire({
        icon: 'warning',
        title: 'Weighbridge Verification Required ⚠️',
        text: 'You must first "Verify & Accept Load" to confirm weighbridge inspection and custody before publishing hardwood logs to municipal auction.',
        confirmButtonText: 'Verify Load Now',
        confirmButtonColor: '#10b981',
        showCancelButton: true,
        cancelButtonText: 'Cancel'
      }).then((result) => {
        if (result.isConfirmed) {
          handleVerifyIntake(intake);
        }
      });
      return;
    }

    if (intake.biomass?.isDiseased) {
      Swal.fire({
        icon: 'error',
        title: 'Bio-Quarantine Restriction ☣️',
        text: 'This load is flagged as diseased/pest-infested wood and cannot be auctioned. It is routed for bio-containment & controlled incineration.',
        confirmButtonColor: '#ef4444'
      });
      return;
    }

    const species = intake.biomass?.treeSpecies || intake.timberLogs?.species || intake.species || intake.treeSpecies || 'Teak / Hardwood';
    const logCount = Number(intake.biomass?.logsCount || intake.timberLogs?.logCount || intake.logCount || 1);
    const weightKg = Number(intake.biomass?.logsWeightKg || intake.timberLogs?.weightKg || intake.logsWeightKg || intake.totalWeightKg || 50);
    const diameterCm = Number(intake.biomass?.approxLogDiameterCm || intake.timberLogs?.averageDiameterCm || intake.approxLogDiameterCm || 35);
    const yard = intake.disposalYard || intake.receivingYard || 'Government Green Waste Yard - Zone A';
    const basePrice = Math.max(500, Math.round(weightKg * 25));

    setLotForm({
      lotNumber: `LOT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      species: species,
      treeSpecies: species,
      title: `${logCount}x ${species} Trunk Logs (${weightKg} kg)`,
      logCount: logCount,
      estimatedWeightKg: weightKg,
      totalWeightKg: weightKg,
      averageDiameterCm: diameterCm,
      approxLengthM: 3.0,
      reservePrice: basePrice,
      startingBidInr: basePrice,
      bidIncrement: 250,
      yardLocation: yard,
      storageYard: yard,
      description: `Salvaged ${species} logs (${logCount} logs, ${weightKg} kg) received from Cutter ${intake.cutterName || ''} (${intake.workOrderTitle || ''}). Inspected and certified.`,
      _sourceIntakeId: intake._id || intake.shipmentId,
      intakeShipmentId: intake.shipmentId || ''
    });
    setShowNewLotModal(true);
  };

  // Handler: Quick Route to Compost
  const handleRouteToCompost = (intake) => {
    const isVerified = (intake.status || '').toLowerCase() === 'verified';
    if (!isVerified) {
      Swal.fire({
        icon: 'warning',
        title: 'Weighbridge Verification Required ⚠️',
        text: 'You must first "Verify & Accept Load" to confirm biomass weight before allocating foliage into active compost beds.',
        confirmButtonText: 'Verify Load Now',
        confirmButtonColor: '#10b981',
        showCancelButton: true,
        cancelButtonText: 'Cancel'
      }).then((result) => {
        if (result.isConfirmed) {
          handleVerifyIntake(intake);
        }
      });
      return;
    }

    if (intake.biomass?.isDiseased) {
      Swal.fire({
        icon: 'error',
        title: 'Bio-Quarantine Restriction ☣️',
        text: 'Diseased biomass cannot be used for citizen organic compost. Routed for controlled municipal incineration.',
        confirmButtonColor: '#ef4444'
      });
      return;
    }

    const leaves = Number(intake.biomass?.leavesWeightKg || 150);
    const branches = Number(intake.biomass?.branchesWeightKg || 200);
    const batchCode = `CMP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    setNewBatchForm({
      batchCode,
      location: intake.disposalYard || 'Ajjarkadu Municipal Compost Center, Udupi',
      initialWeightKg: leaves + branches,
      foliageWeightKg: leaves,
      woodchipsWeightKg: branches,
      _sourceIntakeId: intake._id || intake.shipmentId
    });
    setShowNewBatchModal(true);
  };

  // Handler: Create Timber Lot
  const handleCreateTimberLot = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...lotForm };
      const sourceIntakeId = payload._sourceIntakeId;
      delete payload._sourceIntakeId;

      const res = await fetch('http://localhost:5000/api/timber-auctions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData?.error || errData?.message || 'Failed to publish timber lot';
        console.error('Timber lot publish error:', errData);
        throw new Error(errMsg);
      }
      const created = await res.json().catch(() => null);

      if (sourceIntakeId) {
        const updated = {
          ...intakeRouting,
          [sourceIntakeId]: {
            ...(intakeRouting[sourceIntakeId] || {}),
            timberLotId: created?._id || created?.id || payload.lotNumber,
            timberLotNumber: payload.lotNumber,
            timberSpecies: payload.species,
            timberLocation: payload.yardLocation,
            timberWeightKg: payload.estimatedWeightKg,
            timberLogsCount: payload.logCount,
            timberReservePrice: payload.reservePrice,
            timberRoutedAt: new Date().toISOString()
          }
        };
        setIntakeRouting(updated);
        localStorage.setItem('intake_routing', JSON.stringify(updated));

        // Also update backend intake record if possible
        if (!String(sourceIntakeId).startsWith('local-')) {
          fetch(`http://localhost:5000/api/waste-intakes/${sourceIntakeId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              allocatedStream: 'Timber Auction',
              assignedTimberLotId: created?._id || payload.lotNumber
            })
          }).catch(err => console.warn('Intake routing patch err:', err));
        }
      }

      Swal.fire({
        icon: 'success',
        title: 'Timber Lot Published! 🪵',
        text: `${lotForm.lotNumber} (${lotForm.species}) is now live for municipal timber auction.`,
        confirmButtonColor: '#10b981'
      });
      setShowNewLotModal(false);
      fetchData();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
  };

  // Handler: Create New Batch
  const handleCreateBatch = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...newBatchForm };
      const sourceIntakeId = payload._sourceIntakeId;
      delete payload._sourceIntakeId;

      const res = await fetch('http://localhost:5000/api/compost-batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to create new compost batch');
      const created = await res.json().catch(() => null);

      // Link this batch back to the intake so we can show the inline status panel
      if (sourceIntakeId) {
        const updated = {
          ...intakeRouting,
          [sourceIntakeId]: {
            ...(intakeRouting[sourceIntakeId] || {}),
            compostBatchId: created?._id || created?.id || payload.batchCode,
            compostBatchCode: payload.batchCode,
            compostLocation: payload.location,
            compostWeightKg: payload.initialWeightKg,
            compostRoutedAt: new Date().toISOString()
          }
        };
        setIntakeRouting(updated);
        localStorage.setItem('intake_routing', JSON.stringify(updated));

        // Also update backend intake record if possible
        if (!String(sourceIntakeId).startsWith('local-')) {
          fetch(`http://localhost:5000/api/waste-intakes/${sourceIntakeId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              allocatedStream: 'Composting',
              assignedCompostBatchId: created?._id || payload.batchCode
            })
          }).catch(err => console.warn('Intake routing patch err:', err));
        }
      }

      Swal.fire({
        icon: 'success',
        title: 'Compost Batch Started! 🍂',
        text: `Batch ${payload.batchCode} is now active at ${payload.location}. You can track its progress in the Compost Beds tab.`,
        confirmButtonColor: '#10b981'
      });
      setShowNewBatchModal(false);
      fetchData();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
  };

  // Handler: Advance Batch Stage
  const handleAdvanceStage = async () => {
    if (!selectedBatch) return;
    try {
      const res = await fetch(`http://localhost:5000/api/compost-batches/${selectedBatch._id}/advance-stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(advanceForm)
      });
      if (!res.ok) throw new Error('Failed to update maturation stage');

      Swal.fire({
        icon: 'success',
        title: 'Batch Stage Updated ✅',
        text: `Batch advanced to "${advanceForm.newStage || selectedBatch.currentStage}". Temperature and readings saved.`,
        timer: 2500,
        showConfirmButton: false
      });
      setSelectedBatch(null);
      fetchData();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
  };

  // Handler: Package mature batch into Green Store (legacy inline — full UX at /official/eco-store)
  const handlePackageYield = async () => {
    if (!packageBatchModal) return;
    try {
      const res = await fetch(`http://localhost:5000/api/compost-batches/${packageBatchModal._id}/package-to-store`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packaged5KgBags: Math.max(1, Math.floor(Number(packageForm.yieldKg || 0) / 5)),
          pricePer5Kg: 99
        })
      });
      if (!res.ok) throw new Error('Failed to package batch');
      const data = await res.json();
      Swal.fire({
        icon: 'success',
        title: 'Compost Packaged & Transferred! 🌿',
        html: `<b>${data.totalKg} kg</b> stocked into Citizen Eco Store.<br/><small style="color:#94a3b8">For full 5kg/10kg/25kg + pricing control, use <b>Eco Store Manager</b> in the sidebar.</small>`,
        confirmButtonColor: '#10b981'
      });
      setPackageBatchModal(null);
      fetchData();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
  };


  // Handler: Open Add Product Modal (clean empty form)
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      category: 'Organic Compost',
      description: '',
      unitSize: '',
      weightValue: '',
      weightUnit: 'kg',
      weightKg: '',
      priceInr: '',
      priceEcoPoints: '',
      stockQuantity: '',
      usageInstructions: '',
      benefits: '',
      imageBase64: null,
      imagePreview: ''
    });
    setShowProductModal(true);
  };

  // Handler: Open Edit Product Modal
  const handleOpenEditProduct = (prod) => {
    setEditingProduct(prod);
    setProductForm({
      name: prod.name || '',
      category: prod.category || 'Organic Compost',
      description: prod.description || '',
      unitSize: prod.unitSize || prod.packSize || '5 kg Bag',
      weightValue: prod.weightValue !== undefined ? prod.weightValue : (prod.weightKg || 5),
      weightUnit: prod.weightUnit || 'kg',
      weightKg: prod.weightKg || 5,
      priceInr: prod.priceInr || 99,
      priceEcoPoints: prod.priceEcoPoints || 40,
      stockQuantity: prod.stockQuantity || 50,
      usageInstructions: prod.usageInstructions || '',
      benefits: Array.isArray(prod.benefits) ? prod.benefits.join('\n') : (prod.benefits || ''),
      imageBase64: null,
      imagePreview: prod.image || prod.imageUrl || 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&auto=format&fit=crop&q=80'
    });
    setShowProductModal(true);
  };

  // Handler: Product Image Upload
  const handleProductImgChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setProductForm(prev => ({
          ...prev,
          imageBase64: reader.result,
          imagePreview: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const [productAiLoading, setProductAiLoading] = useState(false);

  // Handler: AI Auto-Fill Product Details
  const handleProductAiAutofill = async () => {
    if (!productForm.name.trim() && !productForm.category) {
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

    setProductAiLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/eco-products/ai-autofill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: productForm.name.trim(),
          category: productForm.category,
          unitSize: productForm.unitSize,
          weightValue: productForm.weightValue,
          weightUnit: productForm.weightUnit
        })
      });

      if (!res.ok) throw new Error('AI autofill generation failed');
      const data = await res.json();

      setProductForm(prev => ({
        ...prev,
        description: data.description || prev.description,
        usageInstructions: data.usageInstructions || prev.usageInstructions,
        benefits: Array.isArray(data.benefits) ? data.benefits.join('\n') : (data.benefits || prev.benefits),
        unitSize: prev.unitSize ? prev.unitSize : (data.suggestedUnitSize || prev.unitSize),
        weightValue: prev.weightValue ? prev.weightValue : (data.suggestedWeightValue ?? prev.weightValue),
        weightUnit: prev.weightUnit && prev.weightUnit !== 'kg' ? prev.weightUnit : (data.suggestedWeightUnit || prev.weightUnit),
        priceInr: prev.priceInr ? prev.priceInr : (data.suggestedPriceInr ?? prev.priceInr),
        priceEcoPoints: prev.priceEcoPoints ? prev.priceEcoPoints : (data.suggestedEcoPoints ?? prev.priceEcoPoints),
      }));

      Swal.fire({
        icon: 'success',
        title: '✨ AI Auto-Filled!',
        text: 'Product description, usage guide, benefits, and metrics populated.',
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
      setProductAiLoading(false);
    }
  };

  // Handler: Save Product (Create or Update)
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      const wVal = Number(productForm.weightValue !== undefined && productForm.weightValue !== '' ? productForm.weightValue : (productForm.weightKg || 5));
      const wUnit = productForm.weightUnit || 'kg';
      let computedKg = wVal;
      const u = wUnit.toLowerCase();
      if (u === 'g' || u === 'grm' || u === 'gm') computedKg = wVal / 1000;
      else if (u === 'mg') computedKg = wVal / 1000000;
      else if (u === 'ton' || u === 'tonne') computedKg = wVal * 1000;
      else if (u === 'ml') computedKg = wVal / 1000;
      else if (u === 'l' || u === 'ltr') computedKg = wVal;

      const payload = {
        name: productForm.name,
        category: productForm.category,
        description: productForm.description,
        unitSize: productForm.unitSize,
        weightValue: wVal,
        weightUnit: wUnit,
        weightKg: computedKg,
        priceInr: Number(productForm.priceInr || 99),
        priceEcoPoints: Number(productForm.priceEcoPoints || 40),
        stockQuantity: Number(productForm.stockQuantity || 50),
        usageInstructions: productForm.usageInstructions,
        benefits: typeof productForm.benefits === 'string'
          ? productForm.benefits.split('\n').map(s => s.trim()).filter(Boolean)
          : productForm.benefits
      };

      if (productForm.imageBase64) {
        payload.imageBase64 = productForm.imageBase64;
      } else if (productForm.imagePreview && !productForm.imagePreview.startsWith('data:')) {
        payload.image = productForm.imagePreview;
      }

      if (editingProduct) {
        const res = await fetch(`http://localhost:5000/api/eco-products/${editingProduct._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to update product');
        Swal.fire({
          icon: 'success',
          title: 'Product Updated! 🌿',
          text: `"${productForm.name}" changes have been saved.`,
          confirmButtonColor: '#10b981'
        });
      } else {
        const res = await fetch('http://localhost:5000/api/eco-products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to create new product');
        Swal.fire({
          icon: 'success',
          title: 'Product Added! 🌿',
          text: `"${productForm.name}" is now live in the Citizen Green Store.`,
          confirmButtonColor: '#10b981'
        });
      }

      setShowProductModal(false);
      setEditingProduct(null);
      fetchData();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
  };

  // Handler: Quick Stock Update
  const handleAdjustStock = async (productId, currentStock, delta) => {
    const newStock = Math.max(0, currentStock + delta);
    try {
      await fetch(`http://localhost:5000/api/eco-products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockQuantity: newStock })
      });
      fetchData();
    } catch (e) {
      console.error('Failed to update stock:', e);
    }
  };

  // Handler: Delete Product
  const handleDeleteProduct = async (productId, name) => {
    const result = await Swal.fire({
      title: `Remove "${name}"?`,
      text: 'This will remove the product from the Citizen Green Store.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete product'
    });
    if (result.isConfirmed) {
      try {
        await fetch(`http://localhost:5000/api/eco-products/${productId}`, { method: 'DELETE' });
        Swal.fire('Deleted!', 'Product removed from store catalog.', 'success');
        fetchData();
      } catch (err) {
        Swal.fire('Error', err.message, 'error');
      }
    }
  };

  // Compute Aggregate Stats
  const totalLeavesKg = intakes.reduce((acc, i) => acc + Number(i.biomass?.leavesWeightKg || i.foliageWeightKg || 0), 0);
  const totalBranchesKg = intakes.reduce((acc, i) => acc + Number(i.biomass?.branchesWeightKg || i.branchWeightKg || 0), 0);
  const totalTimberLogsCount = intakes.reduce((acc, i) => acc + Number(i.biomass?.logsCount || i.timberLogs?.logCount || 0), 0);
  const totalTimberKg = intakes.reduce((acc, i) => acc + Number(i.biomass?.logsWeightKg || i.timberLogs?.weightKg || 0), 0);
  const totalBiomassIntake = totalLeavesKg + totalBranchesKg + totalTimberKg;
  const pendingIntakesCount = intakes.filter(i => (i.status || 'Delivered').toLowerCase() !== 'verified').length;

  // Filter Submissions
  const filteredIntakes = intakes.filter(i => {
    const matchSearch =
      (i.cutterName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (i.workOrderTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (i.vehicleNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (i.disposalYard || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (i.biomass?.treeSpecies || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchSearch) return false;

    if (statusFilter === 'PENDING') return (i.status || 'Delivered').toLowerCase() !== 'verified';
    if (statusFilter === 'VERIFIED') return (i.status || '').toLowerCase() === 'verified';
    if (statusFilter === 'DISEASED') return Boolean(i.biomass?.isDiseased);

    return true;
  });

  return (
    <div className="cg-app">
      <Sidebar active="Biomass & Processing" isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
      <div className="cg-workspace" style={{ background: t.bgPage, minHeight: '100vh', color: t.textPrimary }}>
        <Topbar title="Official Waste & Timber Verification Desk" onToggleSidebar={() => setSidebarOpen(true)} />

        {/* Header Banner */}
        <div style={{
          background: t.bgHeader,
          borderBottom: `1px solid ${t.border}`,
          padding: '24px 24px 18px'
        }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '999px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: isDark ? '#34d399' : '#065f46', fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>
                  <ShieldCheck size={14} /> Official Municipal Yard & Verification Console
                </div>
                <h1 style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.5px', color: t.textPrimary }}>
                  Tree Waste & Timber Verification
                </h1>
                <p style={{ margin: 0, color: t.textSecondary, fontSize: '13.5px', maxWidth: '720px' }}>
                  Verify green leaves, twigs, and heavy timber logs submitted by field tree cutters. Confirm weighbridge intake, inspect GPS-tagged photos, and route logs to timber auction or compost processing.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  onClick={toggleTheme}
                  title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
                  style={{
                    background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#ffffff',
                    border: `1px solid ${t.borderStrong}`,
                    color: isDark ? '#fbbf24' : '#0f172a',
                    padding: '9px 14px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: t.cardShadow
                  }}
                >
                  {isDark ? <Sun size={15} color="#fbbf24" /> : <Moon size={15} color="#475569" />}
                  <span>{isDark ? 'Light' : 'Dark'}</span>
                </button>

                <button
                  onClick={fetchData}
                  style={{
                    background: isDark ? 'rgba(255, 255, 255, 0.06)' : '#ffffff',
                    border: `1px solid ${t.borderStrong}`,
                    color: t.textPrimary,
                    padding: '9px 16px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: t.cardShadow
                  }}
                >
                  <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh Data
                </button>
              </div>
            </div>

            {/* Simple, Clear Summary Metric Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '14px',
              marginTop: '20px'
            }}>
              <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '14px 18px', boxShadow: t.cardShadow }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11.5px', color: t.textSecondary, textTransform: 'uppercase', fontWeight: 700 }}>Total Deliveries</span>
                  <Truck size={16} color="#38bdf8" />
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: t.textPrimary, marginTop: '4px' }}>
                  {intakes.length} <span style={{ fontSize: '12px', color: t.textMuted }}>shipments</span>
                </div>
                <div style={{ fontSize: '11px', color: pendingIntakesCount > 0 ? '#d97706' : '#10b981', marginTop: '2px', fontWeight: 600 }}>
                  {pendingIntakesCount > 0 ? `⏳ ${pendingIntakesCount} pending review` : '✓ All verified'}
                </div>
              </div>

              <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '14px 18px', boxShadow: t.cardShadow }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11.5px', color: t.textSecondary, textTransform: 'uppercase', fontWeight: 700 }}>🍃 Leaves & Foliage</span>
                  <Leaf size={16} color="#10b981" />
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: isDark ? '#10b981' : '#059669', marginTop: '4px' }}>
                  {(totalLeavesKg / 1000).toFixed(2)} <span style={{ fontSize: '12px', color: t.textMuted }}>Ton</span>
                </div>
                <div style={{ fontSize: '11px', color: isDark ? '#34d399' : '#047857', marginTop: '2px' }}>→ Routed for Organic Compost</div>
              </div>

              <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '14px 18px', boxShadow: t.cardShadow }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11.5px', color: t.textSecondary, textTransform: 'uppercase', fontWeight: 700 }}>🌿 Branches & Twigs</span>
                  <Layers size={16} color="#60a5fa" />
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: isDark ? '#60a5fa' : '#2563eb', marginTop: '4px' }}>
                  {(totalBranchesKg / 1000).toFixed(2)} <span style={{ fontSize: '12px', color: t.textMuted }}>Ton</span>
                </div>
                <div style={{ fontSize: '11px', color: isDark ? '#93c5fd' : '#1d4ed8', marginTop: '2px' }}>→ Routed for Wood Mulch</div>
              </div>

              <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '14px 18px', boxShadow: t.cardShadow }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11.5px', color: t.textSecondary, textTransform: 'uppercase', fontWeight: 700 }}>🪵 Heavy Timber Logs</span>
                  <Gavel size={16} color="#f59e0b" />
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: isDark ? '#f59e0b' : '#d97706', marginTop: '4px' }}>
                  {totalTimberLogsCount} <span style={{ fontSize: '12px', color: t.textMuted }}>logs</span> ({(totalTimberKg / 1000).toFixed(2)} Ton)
                </div>
                <div style={{ fontSize: '11px', color: isDark ? '#fbbf24' : '#b45309', marginTop: '2px' }}>→ For Municipal Auction</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 24px 64px' }}>
          {/* Simple Tab Bar */}
          <div style={{
            display: 'flex',
            gap: '8px',
            borderBottom: `1px solid ${t.border}`,
            paddingBottom: '12px',
            marginBottom: '24px',
            overflowX: 'auto'
          }}>
            {[
              { id: 'intake', label: '🚚 Tree Cutter Submissions & Verification', count: intakes.length, badgeColor: '#38bdf8' },
              { id: 'timber', label: '🪵 Timber Lots for Auction', count: timberLots.length, badgeColor: '#f59e0b' },
              { id: 'compost', label: '🍂 Compost & Chipping Batches', count: batches.length, badgeColor: '#10b981' },
              { id: 'store', label: '🌿 Eco Store Manager ↗', count: products.length, badgeColor: '#34d399', isRedirect: true }
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.id === 'store') {
                      navigate(getEcoStoreUrl());
                      return;
                    }
                    setActiveTab(tab.id);
                  }}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: isActive ? '1px solid #10b981' : `1px solid ${t.tabInactiveBorder}`,
                    background: isActive ? t.tabActiveBg : t.tabInactiveBg,
                    color: isActive ? t.tabActiveText : t.tabInactiveText,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                    boxShadow: isActive ? t.cardShadow : 'none'
                  }}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 800,
                      background: isActive ? '#10b981' : (isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0'),
                      color: isActive ? '#ffffff' : (isDark ? '#cbd5e1' : '#475569')
                    }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* TAB 1: TREE CUTTER SUBMISSIONS (PRIMARY VERIFICATION TAB) */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'intake' && (
            <div>
              {/* Filter and Search Bar */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px',
                background: t.bgCard,
                padding: '12px 16px',
                borderRadius: '12px',
                border: `1px solid ${t.border}`,
                boxShadow: t.cardShadow
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: '240px' }}>
                  <Search size={16} color={t.textSecondary} />
                  <input
                    type="text"
                    placeholder="Search by Cutter name, Tree species, Vehicle, or Yard..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      color: t.textPrimary,
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: t.textSecondary, cursor: 'pointer' }}>
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'ALL', label: 'All Submissions' },
                    { id: 'PENDING', label: '⏳ Pending Verification' },
                    { id: 'VERIFIED', label: '✓ Verified' },
                    { id: 'DISEASED', label: '☣️ Quarantine' }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setStatusFilter(f.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: statusFilter === f.id ? '1px solid #38bdf8' : `1px solid ${t.border}`,
                        background: statusFilter === f.id ? 'rgba(56, 189, 248, 0.15)' : t.bgSubtle,
                        color: statusFilter === f.id ? (isDark ? '#38bdf8' : '#0284c7') : t.textSecondary
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredIntakes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: t.bgCard, borderRadius: '16px', border: `1px dashed ${t.borderStrong}`, boxShadow: t.cardShadow }}>
                  <Truck size={42} color={t.textMuted} style={{ marginBottom: '12px' }} />
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: t.textPrimary }}>No Submissions Match Your Criteria</h4>
                  <p style={{ color: t.textSecondary, fontSize: '13px', margin: 0 }}>
                    When tree cutters complete tasks and submit biomass & timber, their submissions will appear here.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {filteredIntakes.map(item => {
                    const leavesKg = Number(item.biomass?.leavesWeightKg || item.foliageWeightKg || 0);
                    const branchesKg = Number(item.biomass?.branchesWeightKg || item.branchWeightKg || 0);
                    const logCount = Number(item.biomass?.logsCount || item.timberLogs?.logCount || 0);
                    const logsKg = Number(item.biomass?.logsWeightKg || item.timberLogs?.weightKg || 0);
                    const species = item.biomass?.treeSpecies || item.timberLogs?.species || 'Mixed Municipal Species';
                    const avgDiameter = item.biomass?.approxLogDiameterCm || item.timberLogs?.averageDiameterCm || 35;
                    const isDiseased = Boolean(item.biomass?.isDiseased);
                    const isVerified = (item.status || '').toLowerCase() === 'verified';
                    const photoUrl = item.proofImageUrl || item.proofImageBase64 || '';
                    const totalKg = leavesKg + branchesKg + logsKg;

                    // Routing info for this intake
                    const routing = intakeRouting[item._id] || intakeRouting[item.shipmentId] || {};
                    const isRoutedToCompost = Boolean(routing.compostBatchCode || item.assignedCompostBatchId || (item.allocatedStream === 'Composting' && item.assignedCompostBatchId));
                    const isRoutedToTimber = Boolean(routing.timberLotNumber || item.assignedTimberLotId || item.allocatedStream === 'Timber Auction');

                    // Find linked compost batch (if routed)
                    const linkedBatch = isRoutedToCompost
                      ? batches.find(b => b._id === routing.compostBatchId || b.batchCode === routing.compostBatchCode || b.batchNumber === routing.compostBatchCode) || null
                      : null;
                    const batchIsReady = linkedBatch && (
                      linkedBatch.currentStage === 'READY_FOR_PACKAGING' ||
                      (linkedBatch.maturationProgress || 0) >= 100
                    );
                    const batchProgress = linkedBatch ? (linkedBatch.maturationProgress || 50) : 0;
                    const batchStage = linkedBatch ? (linkedBatch.currentStage || 'ACTIVE').replace(/_/g, ' ') : '';

                    // Find linked timber lot (if routed)
                    const linkedTimberLot = isRoutedToTimber
                      ? timberLots.find(l => {
                          const lIntake = String(l.intakeShipmentId || '').trim().toUpperCase();
                          const sId = String(item.shipmentId || '').trim().toUpperCase();
                          const iId = String(item._id || '').trim();
                          const lId = String(l._id || '');
                          const lNum = String(l.lotNumber || '').trim().toUpperCase();
                          const rId = String(routing.timberLotId || '');
                          const rNum = String(routing.timberLotNumber || '').trim().toUpperCase();
                          const aId = String(item.assignedTimberLotId || '').trim();
                          const aNum = aId.toUpperCase();

                          return (
                            (lIntake && (lIntake === sId || lIntake === iId.toUpperCase())) ||
                            (rId && (lId === rId || lNum === rId.toUpperCase())) ||
                            (rNum && (lId === rNum || lNum === rNum)) ||
                            (aId && (lId === aId || lNum === aNum))
                          );
                        }) || null
                      : null;

                    const timberLotIsClosed = linkedTimberLot 
                      ? isLotClosed(linkedTimberLot) 
                      : (routing.timberStatus ? isLotClosed({ status: routing.timberStatus }) : false);


                    return (
                      <div
                        key={item._id || item.shipmentId}
                        style={{
                          background: t.bgCard,
                          borderRadius: '14px',
                          border: isDiseased ? '1px solid rgba(239, 68, 68, 0.4)' : isVerified ? '1px solid rgba(16, 185, 129, 0.4)' : `1px solid ${t.border}`,
                          padding: '18px 20px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '14px',
                          boxShadow: t.cardShadow
                        }}
                      >
                        {/* Card Header: Who, When, Where, and Status */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '10px',
                              background: 'rgba(56, 189, 248, 0.15)',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: isDark ? '#38bdf8' : '#0284c7',
                              fontWeight: 800,
                              fontSize: '18px'
                            }}>
                              🪵
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '15px', fontWeight: 800, color: t.textPrimary }}>
                                  {item.workOrderTitle || 'Tree Clearance & Pruning Task'}
                                </span>
                                <span style={{ fontSize: '11px', color: t.textSecondary, background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>
                                  {item.shipmentId || 'WST-2026'}
                                </span>
                              </div>
                              <div style={{ fontSize: '12.5px', color: t.textSecondary, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span>Submitted by <strong style={{ color: isDark ? '#38bdf8' : '#0284c7' }}>{item.cutterName || 'Field Cutter'}</strong></span>
                                <span>•</span>
                                <span>🚗 <strong style={{ color: t.textPrimary }}>{item.vehicleNumber || 'KA-20-TR-4821'}</strong> ({item.vehicleType || 'Tipper Truck'})</span>
                                <span>•</span>
                                <span>🕒 {item.deliveredAt ? new Date(item.deliveredAt).toLocaleString('en-IN') : 'Just now'}</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isDiseased && (
                              <span style={{
                                padding: '4px 10px',
                                borderRadius: '999px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#f87171',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                ☣️ Bio-Quarantine Wood
                              </span>
                            )}
                            <span style={{
                              padding: '4px 12px',
                              borderRadius: '999px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              background: isVerified ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              border: isVerified ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                              color: isVerified ? '#34d399' : '#fbbf24',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              {isVerified ? '✓ Verified by Official' : '⏳ Pending Weighbridge Verification'}
                            </span>
                          </div>
                        </div>

                        {/* Breakdown Grid: What was submitted */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                          gap: '12px',
                          background: isDark ? 'rgba(2, 6, 23, 0.5)' : '#f8fafc',
                          padding: '14px',
                          borderRadius: '10px',
                          border: `1px solid ${t.border}`
                        }}>
                          {/* Green Leaves */}
                          <div>
                            <div style={{ fontSize: '11px', color: t.textSecondary, textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              🍃 Green Leaves & Foliage
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: isDark ? '#10b981' : '#059669', marginTop: '2px' }}>
                              {(leavesKg / 1000).toFixed(2)} Ton
                            </div>
                            <div style={{ fontSize: '11px', color: t.textMuted }}>Destination: Organic Compost</div>
                          </div>

                          {/* Branches & Twigs */}
                          <div>
                            <div style={{ fontSize: '11px', color: t.textSecondary, textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              🌿 Branches & Twigs
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: isDark ? '#60a5fa' : '#2563eb', marginTop: '2px' }}>
                              {(branchesKg / 1000).toFixed(2)} Ton
                            </div>
                            <div style={{ fontSize: '11px', color: t.textMuted }}>Destination: Wood Chipping / Mulch</div>
                          </div>

                          {/* Heavy Timber Logs */}
                          <div>
                            <div style={{ fontSize: '11px', color: t.textSecondary, textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              🪵 Heavy Timber Logs
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: isDark ? '#f59e0b' : '#d97706', marginTop: '2px' }}>
                              {logCount > 0 ? `${logCount} logs (${(logsKg / 1000).toFixed(2)} Ton)` : 'None'}
                            </div>
                            <div style={{ fontSize: '11px', color: isDark ? '#fbbf24' : '#b45309', fontWeight: 600 }}>
                              Species: <strong style={{ color: t.textPrimary }}>{species}</strong> {avgDiameter ? `• Ø${(avgDiameter / 30.48).toFixed(1)} ft` : ''}
                            </div>
                          </div>

                          {/* Destination Yard & Geotag */}
                          <div>
                            <div style={{ fontSize: '11px', color: t.textSecondary, textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              📍 Receiving Yard
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: t.textPrimary, marginTop: '2px' }}>
                              {item.disposalYard || 'Central Municipal Yard'}
                            </div>
                            <div style={{ fontSize: '11px', color: isDark ? '#38bdf8' : '#0284c7' }}>
                              GPS: {item.gpsLocation?.lat ? `${item.gpsLocation.lat}, ${item.gpsLocation.lng}` : 'Logged'}
                            </div>
                          </div>
                        </div>

                        {/* Card Footer: Proof Photo Preview & Action Buttons */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', paddingTop: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {photoUrl ? (
                              <button
                                onClick={() => setSelectedProof(item)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  background: isDark ? 'rgba(255, 255, 255, 0.06)' : '#ffffff',
                                  border: `1px solid ${t.borderStrong}`,
                                  color: t.textPrimary,
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  boxShadow: t.cardShadow
                                }}
                              >
                                <Eye size={14} color="#38bdf8" /> View Geotagged Disposal Proof
                              </button>
                            ) : (
                              <span style={{ fontSize: '12px', color: t.textMuted }}>No photo proof attached</span>
                            )}

                            {item.verificationNotes && (
                              <span style={{ fontSize: '12px', color: t.textSecondary, fontStyle: 'italic' }}>
                                Note: "{item.verificationNotes}"
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                            {!isVerified ? (
                              /* ── BEFORE VERIFICATION ── */
                              <button
                                onClick={() => handleVerifyIntake(item)}
                                style={{
                                  background: '#10b981', color: '#ffffff', border: 'none',
                                  borderRadius: '8px', padding: '8px 16px', fontSize: '13px',
                                  fontWeight: 700, cursor: 'pointer', display: 'flex',
                                  alignItems: 'center', gap: '6px',
                                  boxShadow: '0 2px 10px rgba(16, 185, 129, 0.35)'
                                }}
                              >
                                <Check size={15} /> Verify & Accept Load
                              </button>
                            ) : isDiseased ? (
                              /* ── DISEASED: quarantine only ── */
                              <span style={{
                                padding: '6px 12px', borderRadius: '8px', fontSize: '12px',
                                fontWeight: 700, background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171',
                                display: 'flex', alignItems: 'center', gap: '6px'
                              }}>
                                ☣️ Routed for Bio-Incineration & Quarantine
                              </span>
                            ) : (
                              /* ── AFTER VERIFICATION: routing actions ── */
                              <>
                                {/* Timber button — disabled once routed or closed */}
                                {logCount > 0 && (
                                  !isRoutedToTimber ? (
                                    <button
                                      onClick={() => handleRouteToTimber(item)}
                                      style={{
                                        background: 'rgba(245, 158, 11, 0.2)',
                                        border: '1px solid rgba(245, 158, 11, 0.5)',
                                        color: '#f59e0b', borderRadius: '8px',
                                        padding: '7px 14px', fontSize: '12.5px', fontWeight: 700,
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                                      }}
                                    >
                                      <Gavel size={14} /> Move to Timber Auction
                                    </button>
                                  ) : timberLotIsClosed ? (
                                    <span style={{
                                      padding: '6px 12px', borderRadius: '8px', fontSize: '12px',
                                      fontWeight: 700, background: 'rgba(16, 185, 129, 0.12)',
                                      border: '1px solid rgba(16, 185, 129, 0.35)', color: '#34d399',
                                      display: 'flex', alignItems: 'center', gap: '6px'
                                    }}>
                                      ✓ Timber Auction Closed
                                    </span>
                                  ) : (
                                    <span style={{
                                      padding: '6px 12px', borderRadius: '8px', fontSize: '12px',
                                      fontWeight: 700, background: 'rgba(245, 158, 11, 0.1)',
                                      border: '1px dashed rgba(245, 158, 11, 0.35)', color: '#f59e0b',
                                      display: 'flex', alignItems: 'center', gap: '6px'
                                    }}>
                                      <Gavel size={13} /> Routed to Timber Auction
                                    </span>
                                  )
                                )}

                                {/* Compost button — blocked once routed */}
                                {(leavesKg > 0 || branchesKg > 0) && (
                                  !isRoutedToCompost ? (
                                    <button
                                      onClick={() => handleRouteToCompost(item)}
                                      style={{
                                        background: 'rgba(16, 185, 129, 0.2)',
                                        border: '1px solid rgba(16, 185, 129, 0.5)',
                                        color: '#34d399', borderRadius: '8px',
                                        padding: '7px 14px', fontSize: '12.5px', fontWeight: 700,
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                                      }}
                                    >
                                      <Leaf size={14} /> Move to Compost Bed
                                    </button>
                                  ) : (
                                    <span style={{
                                      padding: '6px 12px', borderRadius: '8px', fontSize: '12px',
                                      fontWeight: 700, background: 'rgba(16, 185, 129, 0.1)',
                                      border: '1px dashed rgba(16, 185, 129, 0.35)', color: '#34d399',
                                      display: 'flex', alignItems: 'center', gap: '6px'
                                    }}>
                                      <Leaf size={13} /> Routed to Compost Bed
                                    </span>
                                  )
                                )}
                              </>
                            )}
                          </div>
                        </div>

                          {/* ── INLINE COMPOST BATCH STATUS PANEL (shows after routing) ── */}
                          {isRoutedToCompost && (
                            <div style={{
                              marginTop: '4px',
                              background: batchIsReady
                                ? 'rgba(16, 185, 129, 0.12)'
                                : 'rgba(2, 6, 23, 0.6)',
                              border: batchIsReady
                                ? '1px solid rgba(16, 185, 129, 0.4)'
                                : '1px dashed rgba(255, 255, 255, 0.1)',
                              borderRadius: '10px',
                              padding: '12px 16px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '14px' }}>🍂</span>
                                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                                    Compost Batch: <span style={{ color: '#34d399' }}>{routing.compostBatchCode}</span>
                                  </span>
                                  <span style={{
                                    padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                                    background: batchIsReady ? '#10b981' : 'rgba(245, 158, 11, 0.2)',
                                    color: batchIsReady ? '#fff' : '#fbbf24'
                                  }}>
                                    {batchIsReady ? '✓ READY TO PACKAGE' : (linkedBatch ? batchStage : 'INITIALIZING')}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  {/* Refresh to check latest batch status */}
                                  <button
                                    onClick={fetchData}
                                    style={{
                                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                                      color: '#94a3b8', borderRadius: '6px', padding: '4px 10px',
                                      fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                                      display: 'flex', alignItems: 'center', gap: '4px'
                                    }}
                                  >
                                    <RefreshCw size={11} /> Refresh Status
                                  </button>

                                  {/* Package for Store — only visible when batch is READY */}
                                  {batchIsReady && (
                                    <button
                                      onClick={() => {
                                        setPackageBatchModal(linkedBatch);
                                        setPackageForm({
                                          yieldKg: Math.round((linkedBatch.initialWeightKg || routing.compostWeightKg || 300) * 0.45),
                                          targetProductId: products[0]?._id || '',
                                          newStockQty: 25
                                        });
                                      }}
                                      style={{
                                        background: '#10b981', border: 'none', color: '#ffffff',
                                        borderRadius: '8px', padding: '6px 14px',
                                        fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                                        animation: 'pulse 2s infinite'
                                      }}
                                    >
                                      <Package size={13} /> Package for Citizen Store →
                                    </button>
                                  )}

                                  {/* If batch exists but not ready, show navigate to compost tab */}
                                  {!batchIsReady && (
                                    <button
                                      onClick={() => setActiveTab('compost')}
                                      style={{
                                        background: 'rgba(16, 185, 129, 0.15)',
                                        border: '1px solid rgba(16, 185, 129, 0.3)',
                                        color: '#34d399', borderRadius: '6px',
                                        padding: '4px 12px', fontSize: '11px',
                                        fontWeight: 600, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '4px'
                                      }}
                                    >
                                      <Leaf size={11} /> View in Compost Beds →
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Batch progress metrics — simplified & clean */}
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                                <div>
                                  <div style={{ fontSize: '10.5px', color: '#94a3b8', marginBottom: '2px' }}>Batch Location</div>
                                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#f8fafc' }}>{routing.compostLocation || 'Municipal Compost Yard'}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '10.5px', color: '#94a3b8', marginBottom: '2px' }}>Total Biomass</div>
                                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#10b981' }}>{((routing.compostWeightKg || (leavesKg + branchesKg)) / 1000).toFixed(2)} Ton</div>
                                </div>
                              </div>

                              {!batchIsReady && !linkedBatch && (
                                <div style={{ marginTop: '8px', fontSize: '11.5px', color: '#94a3b8', fontStyle: 'italic' }}>
                                  ⏳ Batch has been created and sent to the composting yard. Switch to <strong style={{ color: '#34d399' }}>Compost Beds</strong> tab to track maturation progress.
                                </div>
                              )}

                              {batchIsReady && (
                                <div style={{ marginTop: '8px', fontSize: '12px', color: '#34d399', fontWeight: 600 }}>
                                  🎉 This compost batch has completed maturation and is ready to be packaged into retail bags for the Citizen Green Store!
                                </div>
                              )}
                            </div>
                          )}

                        {/* ── INLINE TIMBER LOT STATUS PANEL (shows after routing, hidden once auction is closed) ── */}
                        {isRoutedToTimber && !timberLotIsClosed && (
                          <div style={{
                            marginTop: '4px',
                            background: 'rgba(245, 158, 11, 0.08)',
                            border: '1px solid rgba(245, 158, 11, 0.25)',
                            borderRadius: '10px',
                            padding: '12px 16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '10px'
                          }}>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>🪵</span>
                                <span>Timber Lot: <strong style={{ color: '#fbbf24' }}>{linkedTimberLot?.lotNumber || routing.timberLotNumber || item.assignedTimberLotId || 'LOT-LIVE'}</strong></span>
                                <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
                                  {linkedTimberLot ? (linkedTimberLot.status || 'LIVE AUCTION') : 'LIVE AUCTION'}
                                </span>
                              </div>
                              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>
                                {linkedTimberLot?.treeSpecies || routing.timberSpecies || species} • {linkedTimberLot?.logCount || routing.timberLogsCount || logCount} logs ({((linkedTimberLot?.totalWeightKg || routing.timberWeightKg || logsKg) / 1000).toFixed(2)} Ton) at {linkedTimberLot?.storageYard || routing.timberLocation || item.disposalYard}
                              </div>
                            </div>
                            <Link
                              to="/official/timber-management"
                              style={{
                                background: 'rgba(245, 158, 11, 0.18)',
                                color: '#fbbf24',
                                border: '1px solid rgba(245, 158, 11, 0.35)',
                                borderRadius: '8px',
                                padding: '6px 14px',
                                fontSize: '12px',
                                fontWeight: 700,
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <Gavel size={13} /> Manage Timber Lot →
                            </Link>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* TAB 2: TIMBER AUCTION LOTS */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'timber' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px 0', color: t.textPrimary }}>Municipal Timber Salvage Lots</h2>
                  <p style={{ margin: 0, color: t.textSecondary, fontSize: '13px' }}>
                    Hardwood timber logs segregated from tree clearances published for commercial auction.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: '6px', background: isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
                    {[
                      { id: 'LIVE', label: `🟢 Live (${timberLots.filter(l => !isLotClosed(l)).length})` },
                      { id: 'ALL', label: `All (${timberLots.length})` },
                      { id: 'CLOSED', label: `✓ Closed (${timberLots.filter(l => isLotClosed(l)).length})` }
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setTimberLotFilter(f.id)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: 'none',
                          background: timberLotFilter === f.id ? (isDark ? 'rgba(245, 158, 11, 0.25)' : '#ffffff') : 'transparent',
                          color: timberLotFilter === f.id ? '#f59e0b' : t.textSecondary,
                          boxShadow: timberLotFilter === f.id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none'
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      setLotForm({
                        lotNumber: `LOT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
                        species: 'Teak / Hardwood',
                        treeSpecies: 'Teak / Hardwood',
                        title: '2x Teak Logs (400 kg)',
                        logCount: 2,
                        estimatedWeightKg: 400,
                        totalWeightKg: 400,
                        averageDiameterCm: 35,
                        approxLengthM: 3.0,
                        reservePrice: 10000,
                        startingBidInr: 10000,
                        bidIncrement: 500,
                        yardLocation: 'Santhekatte Municipal Timber Depot, Udupi',
                        storageYard: 'Santhekatte Municipal Timber Depot, Udupi',
                        description: 'Hardwood logs salvaged from municipal tree clearance. Debarked and seasoned.'
                      });
                      setShowNewLotModal(true);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      color: '#000',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '9px 16px',
                      fontSize: '13px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)'
                    }}
                  >
                    <Plus size={16} /> + Publish New Timber Lot
                  </button>
                  <Link
                    to="/official/timber-management"
                    style={{
                      background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#ffffff',
                      border: `1px solid ${t.borderStrong}`,
                      color: t.textPrimary,
                      borderRadius: '10px',
                      padding: '9px 16px',
                      fontSize: '13px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      textDecoration: 'none',
                      boxShadow: t.cardShadow
                    }}
                  >
                    <ExternalLink size={14} /> Full Timber Desk
                  </Link>
                </div>
              </div>

              {timberLots.filter(l => {
                if (timberLotFilter === 'LIVE') return !isLotClosed(l);
                if (timberLotFilter === 'CLOSED') return isLotClosed(l);
                return true;
              }).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: t.bgCard, borderRadius: '16px', border: `1px dashed ${t.borderStrong}`, boxShadow: t.cardShadow }}>
                  <Gavel size={40} color={t.textMuted} style={{ marginBottom: '12px' }} />
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: t.textPrimary }}>
                    {timberLotFilter === 'LIVE' ? 'No Active Live Timber Auctions' : timberLotFilter === 'CLOSED' ? 'No Closed Timber Lots' : 'No Timber Lots Published Yet'}
                  </h4>
                  <p style={{ color: t.textSecondary, fontSize: '13px', margin: 0 }}>
                    {timberLotFilter === 'LIVE' ? 'All published timber lots have been closed or completed.' : 'Click "Move to Timber Auction" on any cutter submission above to publish a lot.'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                  {timberLots.filter(l => {
                    if (timberLotFilter === 'LIVE') return !isLotClosed(l);
                    if (timberLotFilter === 'CLOSED') return isLotClosed(l);
                    return true;
                  }).map(lot => {
                    const closed = isLotClosed(lot);
                    const status = (lot.status || 'Active').toUpperCase();
                    const isLive = !closed && (status.includes('LIVE') || status === 'ACTIVE');
                    const lotSpecies = lot.treeSpecies || lot.species || lot.title || 'Teak / Hardwood Logs';
                    const lotYard = lot.storageYard || lot.yardLocation || 'Central Municipal Timber Depot';
                    const logCount = lot.logCount || 1;
                    const lotWeight = lot.totalWeightKg || lot.estimatedWeightKg || 0;
                    const avgDiameter = lot.dimensions?.avgDiameterCm || lot.averageDiameterCm || 35;
                    const currentBid = Number(lot.currentHighestBidInr || 0);
                    const startingPrice = Number(lot.startingBidInr || lot.reservePriceInr || lot.reservePrice || 0);
                    const displayPrice = currentBid > 0 ? currentBid : startingPrice;
                    const priceLabel = currentBid > 0 ? 'Current Highest Bid' : 'Starting Base Price';

                    return (
                      <div
                        key={lot._id || lot.lotNumber}
                        style={{
                          background: t.bgCard,
                          border: `1px solid ${t.border}`,
                          borderRadius: '14px',
                          padding: '18px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          boxShadow: t.cardShadow
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: isDark ? '#38bdf8' : '#0284c7' }}>{lot.lotNumber || 'LOT-2026'}</span>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: isLive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                            color: isLive ? (isDark ? '#34d399' : '#047857') : t.textSecondary
                          }}>
                            {isLive ? '🟢 LIVE AUCTION' : status}
                          </span>
                        </div>

                        <div>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 800, color: t.textPrimary }}>
                            {lotSpecies}
                          </h4>
                          <div style={{ fontSize: '12px', color: t.textSecondary }}>
                            {lotYard}
                          </div>
                        </div>

                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: '8px',
                          background: isDark ? 'rgba(2, 6, 23, 0.5)' : '#f8fafc',
                          padding: '10px',
                          borderRadius: '8px',
                          border: `1px solid ${t.border}`
                        }}>
                          <div>
                            <div style={{ fontSize: '10.5px', color: t.textSecondary }}>Log Count</div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: t.textPrimary }}>{logCount} logs</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10.5px', color: t.textSecondary }}>Weight</div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: isDark ? '#f59e0b' : '#d97706' }}>{(lotWeight > 10 ? (lotWeight / 1000).toFixed(2) : lotWeight)} Ton</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10.5px', color: t.textSecondary }}>Avg Diameter</div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: t.textPrimary }}>Ø {(avgDiameter > 10 ? (avgDiameter / 30.48).toFixed(1) : avgDiameter)} ft</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '10px', borderTop: `1px solid ${t.border}` }}>
                          <div>
                            <div style={{ fontSize: '11px', color: t.textSecondary }}>{priceLabel}</div>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: isDark ? '#34d399' : '#047857' }}>₹{Number(displayPrice).toLocaleString('en-IN')}</div>
                          </div>
                          <Link
                            to="/official/timber-management"
                            style={{
                              background: 'rgba(245, 158, 11, 0.15)',
                              color: isDark ? '#f59e0b' : '#b45309',
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 700,
                              textDecoration: 'none'
                            }}
                          >
                            Manage Lot & Winners →
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* TAB 3: COMPOST & CHIPPING BATCHES */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'compost' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px 0', color: t.textPrimary }}>Compost & Mulch Processing Beds</h2>
                  <p style={{ margin: 0, color: t.textSecondary, fontSize: '13px' }}>
                    Track transformation of green leaves & chipped branches into organic garden compost and bio-mulch.
                  </p>
                </div>

                <button
                  onClick={() => setShowNewBatchModal(true)}
                  style={{
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '9px 16px',
                    fontSize: '13px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                  }}
                >
                  <Plus size={16} /> + Start New Compost Bed
                </button>
              </div>

              {batches.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: t.bgCard, borderRadius: '16px', border: `1px dashed ${t.borderStrong}`, boxShadow: t.cardShadow }}>
                  <Leaf size={40} color={t.textMuted} style={{ marginBottom: '12px' }} />
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: t.textPrimary }}>No Active Compost Batches</h4>
                  <p style={{ color: t.textSecondary, fontSize: '13px', margin: 0 }}>Click "+ Start New Compost Bed" to allocate foliage loads into compost maturation.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                  {batches.map(batch => {
                    const isReady = batch.currentStage === 'Retail Packaging';
                    const isCompleted = batch.currentStage === 'Completed' || batch.status === 'Completed';

                    return (
                      <div
                        key={batch._id || batch.batchCode}
                        style={{
                          background: t.bgCard,
                          border: isReady ? '1px solid #10b981' : `1px solid ${t.border}`,
                          borderRadius: '14px',
                          padding: '18px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          boxShadow: t.cardShadow
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#10b981' }}>{batch.batchCode}</span>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: isCompleted ? 'rgba(16, 185, 129, 0.15)' : isReady ? 'rgba(245, 158, 11, 0.2)' : 'rgba(99, 102, 241, 0.15)',
                            color: isCompleted ? '#34d399' : isReady ? '#fbbf24' : '#a5b4fc'
                          }}>
                            {isCompleted ? '✅ COMPLETED' : isReady ? '📦 READY TO PACKAGE' : (batch.currentStage || 'Active').replace(/_/g, ' ')}
                          </span>
                        </div>

                        <div>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 800, color: t.textPrimary }}>{batch.location || 'Windrow Bed #1'}</h4>
                          <div style={{ fontSize: '12px', color: t.textSecondary }}>Started on {batch.startedAt ? new Date(batch.startedAt).toLocaleDateString() : 'Recent'}</div>
                        </div>

                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: isDark ? 'rgba(2, 6, 23, 0.5)' : '#f8fafc',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: `1px solid ${t.border}`
                        }}>
                          <div>
                            <div style={{ fontSize: '10.5px', color: t.textSecondary }}>Biomass Weight</div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: isDark ? '#10b981' : '#059669' }}>{batch.initialWeightKg || 500} kg</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10.5px', color: t.textSecondary }}>Processing Stage</div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: isDark ? '#38bdf8' : '#0284c7' }}>{(batch.currentStage || 'Active').replace(/_/g, ' ')}</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '10px', borderTop: `1px solid ${t.border}` }}>
                          <button
                            onClick={() => {
                              setSelectedBatch(batch);
                              const stageOrder = ['Ingestion & Shredding', 'Thermophilic Decomposition', 'Curing & Stabilization', 'Sieving & Refining', 'Retail Packaging', 'Completed'];
                              const currIdx = stageOrder.indexOf(batch.currentStage);
                              const nextStage = stageOrder[currIdx + 1] || batch.currentStage;
                              setAdvanceForm({ newStage: nextStage, tempC: batch.avgDecompositionTempC || 56, moisturePercent: 50, actionTaken: 'Progress update logged' });
                            }}
                            style={{
                              flex: 1,
                              background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9',
                              border: `1px solid ${t.borderStrong}`,
                              color: t.textPrimary,
                              padding: '8px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Update Progress
                          </button>

                          {isReady && (
                            <>
                              <button
                                onClick={() => {
                                  setPackageBatchModal(batch);
                                  setPackageForm({
                                    yieldKg: Math.round((batch.initialWeightKg || batch.rawBiomassInputKg || 500) * 0.45),
                                    targetProductId: products[0]?._id || '',
                                    newStockQty: 25
                                  });
                                }}
                                style={{
                                  flex: 1,
                                  background: '#10b981',
                                  border: 'none',
                                  color: '#ffffff',
                                  padding: '8px',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                📦 Package for Store
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    const r = await fetch(`http://localhost:5000/api/compost-batches/${batch._id}/advance-stage`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ newStage: 'Completed', progress: 100, actionTaken: 'Batch marked as completed by processing officer' })
                                    });
                                    if (r.ok) {
                                      setBatches(prev => prev.map(b => b._id === batch._id ? { ...b, currentStage: 'Completed', status: 'Completed', stageProgress: 100 } : b));
                                    }
                                  } catch (e) { console.error(e); }
                                }}
                                style={{
                                  flex: 1,
                                  background: 'rgba(16, 185, 129, 0.15)',
                                  border: '1px solid #10b981',
                                  color: '#34d399',
                                  padding: '8px',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                ✓ Mark Completed
                              </button>
                            </>
                          )}
                          {isCompleted && (
                            <div style={{ flex: 1, textAlign: 'center', fontSize: '12px', fontWeight: 700, color: '#34d399', padding: '8px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                              ✅ Batch Completed & Archived
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* TAB 4: CITIZEN GREEN STORE STOCK */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'store' && (
            <div>
              {/* Centralized Eco Store Manager Banner */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(59, 130, 246, 0.1))',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '16px',
                padding: '24px 28px',
                marginBottom: '24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
                boxShadow: t.cardShadow
              }}>
                <div style={{ maxWidth: '640px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '20px' }}>🌿</span>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: t.textPrimary }}>
                      Citizen Green Store Centralized in Eco Store Manager
                    </h2>
                  </div>
                  <p style={{ margin: 0, color: t.textSecondary, fontSize: '13.5px', lineHeight: 1.5 }}>
                    Product creation, pricing, metric units (kg, g, L...), AI descriptions, and batch packaging are managed exclusively in <b>Eco Store Manager</b> to prevent duplicate records.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => navigate(getEcoStoreUrl())}
                    style={{
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '11px',
                      padding: '11px 22px',
                      fontSize: '14px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    <ShoppingBag size={17} /> Open Eco Store Manager ↗
                  </button>

                  <Link
                    to="/official/orders-delivery"
                    style={{
                      background: 'rgba(2, 132, 199, 0.15)',
                      color: '#38bdf8',
                      border: '1px solid rgba(2, 132, 199, 0.3)',
                      borderRadius: '11px',
                      padding: '11px 18px',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      textDecoration: 'none'
                    }}
                  >
                    <Package size={16} /> 📦 Orders & Delivery
                  </Link>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {products.map(prod => {
                  const img = prod.image || prod.imageUrl || 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&auto=format&fit=crop&q=80';
                  const pack = prod.unitSize || prod.packSize || '5 kg Bag';
                  const price = Number(prod.priceInr || 0);
                  const pts = Number(prod.priceEcoPoints || 0);
                  const qty = Number(prod.stockQuantity || 0);

                  return (
                    <div
                      key={prod._id}
                      style={{
                        background: t.bgCard,
                        border: `1px solid ${t.border}`,
                        borderRadius: '14px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
                        boxShadow: t.cardShadow
                      }}
                    >
                      <div style={{ position: 'relative' }}>
                        <img
                          src={img}
                          alt={prod.name}
                          style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px' }}
                        />
                        {/* Action Buttons: Edit & Delete */}
                        <div style={{ position: 'absolute', top: '6px', right: '6px', display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => handleOpenEditProduct(prod)}
                            title="Edit Product Details & Image"
                            style={{
                              background: 'rgba(15, 23, 42, 0.8)',
                              backdropFilter: 'blur(4px)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              color: '#38bdf8',
                              borderRadius: '6px',
                              padding: '5px 8px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Edit size={12} /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod._id, prod.name)}
                            title="Delete Product"
                            style={{
                              background: 'rgba(239, 68, 68, 0.85)',
                              backdropFilter: 'blur(4px)',
                              border: 'none',
                              color: '#fff',
                              borderRadius: '6px',
                              padding: '5px 8px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 700, color: t.textPrimary }}>{prod.name}</h4>
                      <div style={{ fontSize: '12px', color: isDark ? '#10b981' : '#059669', fontWeight: 600, marginBottom: '6px' }}>{prod.category} • {pack}</div>

                      {prod.description && (
                        <p style={{
                          fontSize: '12px',
                          color: t.textSecondary,
                          margin: '0 0 8px 0',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: '1.4'
                        }}>
                          {prod.description}
                        </p>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '10px', borderTop: `1px solid ${t.border}` }}>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: t.textPrimary }}>₹{price.toLocaleString('en-IN')}</div>
                          <div style={{ fontSize: '11px', color: isDark ? '#fbbf24' : '#d97706', fontWeight: 600 }}>or {pts} Eco-Points</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '11px', color: t.textSecondary }}>Stock</div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: qty > 0 ? (isDark ? '#34d399' : '#059669') : '#ef4444' }}>
                            {qty} units
                          </div>
                        </div>
                      </div>

                      {/* Stock Adjustment Controls */}
                      <div style={{ display: 'flex', gap: '6px', marginTop: '10px', paddingTop: '8px', borderTop: `1px dashed ${t.border}` }}>
                        <button
                          onClick={() => handleAdjustStock(prod._id, qty, -5)}
                          style={{ flex: 1, padding: '5px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#f87171', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          -5
                        </button>
                        <button
                          onClick={() => handleAdjustStock(prod._id, qty, 10)}
                          style={{ flex: 1, padding: '5px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', color: isDark ? '#34d399' : '#059669', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          +10
                        </button>
                        <button
                          onClick={() => handleAdjustStock(prod._id, qty, 50)}
                          style={{ flex: 1, padding: '5px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '6px', color: isDark ? '#60a5fa' : '#2563eb', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          +50
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Package from Completed Compost Batches ── */}
              {batches.filter(b => ['Retail Packaging', 'Completed'].includes(b.currentStage)).length > 0 && (
                <div style={{ marginTop: '28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: t.textPrimary }}>📦 Package Completed Compost into Store</h3>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: t.textSecondary }}>Select a matured compost batch, set packet weights & rates, and add directly to store inventory.</p>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '12px' }}>
                    {batches.filter(b => ['Retail Packaging', 'Completed'].includes(b.currentStage)).map(b => {
                      const estYield = Math.round((b.rawBiomassInputKg || 500) * 0.45);
                      const packagedKg = b.totalYieldKg || 0;
                      const availableKg = Math.max(0, estYield - packagedKg);
                      const isFullyDone = packagedKg >= estYield && packagedKg > 0;
                      return (
                        <div key={b._id} style={{ background: t.bgCard, border: `1px solid ${isFullyDone ? 'rgba(52,211,153,0.3)' : 'rgba(16,185,129,0.4)'}`, borderRadius: '12px', padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'center', boxShadow: t.cardShadow }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: '#10b981', marginBottom: '2px' }}>{b.batchNumber || b.batchCode}</div>
                            <div style={{ fontSize: '11.5px', color: t.textSecondary, marginBottom: '4px' }}>{b.facilityName || b.location || 'Processing Yard'}</div>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '11px', color: t.textMuted }}>🌱 Raw: <b style={{ color: t.textPrimary }}>{b.rawBiomassInputKg || 500} kg</b></span>
                              <span style={{ fontSize: '11px', color: t.textMuted }}>🎯 Est. Yield: <b style={{ color: '#10b981' }}>{estYield} kg</b></span>
                              {availableKg > 0 && <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700 }}>📦 {availableKg} kg available</span>}
                              {isFullyDone && <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 700 }}>✅ Fully packaged</span>}
                            </div>
                          </div>
                          <button
                            onClick={() => openPackageBatchModal(b)}
                            style={{ background: isFullyDone ? 'rgba(16,185,129,0.12)' : 'linear-gradient(135deg,#10b981,#059669)', border: isFullyDone ? '1px solid rgba(16,185,129,0.4)' : 'none', color: isFullyDone ? '#34d399' : '#fff', padding: '8px 14px', borderRadius: '9px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >
                            {isFullyDone ? '+ Add More' : '📦 Package'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* MODALS */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}

        {/* Geotagged Proof Image Preview Modal */}
        {selectedProof && (
          <div style={{ position: 'fixed', inset: 0, background: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
            <div style={{ background: t.modalBg, border: `1px solid ${t.modalBorder}`, borderRadius: '16px', width: '100%', maxWidth: '580px', overflow: 'hidden', boxShadow: isDark ? '0 25px 50px -12px rgba(0,0,0,0.7)' : '0 20px 40px rgba(0,0,0,0.15)' }}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: t.textPrimary }}>
                  📸 Geotagged Waste Disposal Proof
                </h3>
                <button onClick={() => setSelectedProof(null)} style={{ background: 'none', border: 'none', color: t.textSecondary, cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>
              <div style={{ padding: '16px 20px' }}>
                <img
                  src={selectedProof.proofImageUrl || selectedProof.proofImageBase64}
                  alt="Disposal Proof"
                  style={{ width: '100%', maxHeight: '340px', objectFit: 'cover', borderRadius: '10px', marginBottom: '14px', border: `1px solid ${t.border}` }}
                />
                <div style={{ background: isDark ? 'rgba(2, 6, 23, 0.6)' : '#f8fafc', border: `1px solid ${t.border}`, padding: '12px', borderRadius: '8px', fontSize: '12.5px', color: t.textPrimary, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div><strong>Cutter:</strong> {selectedProof.cutterName || 'Field Cutter'}</div>
                  <div><strong>Vehicle:</strong> {selectedProof.vehicleNumber || 'KA-20-TR-4821'} ({selectedProof.vehicleType || 'Tipper Truck'})</div>
                  <div><strong>Receiving Yard:</strong> {selectedProof.disposalYard || 'Udupi Processing Center'}</div>
                  <div><strong>GPS Coordinates:</strong> {selectedProof.gpsLocation?.lat ? `${selectedProof.gpsLocation.lat}, ${selectedProof.gpsLocation.lng}` : '13.3409, 74.7421'}</div>
                </div>
              </div>
              <div style={{ padding: '12px 20px', borderTop: `1px solid ${t.border}`, textAlign: 'right' }}>
                <button
                  onClick={() => setSelectedProof(null)}
                  style={{ background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ Package Compost into Packets Modal ═══ */}
        {packageBatchModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget && !pkgBusy) setPackageBatchModal(null); }}>
            <div style={{ background: t.modalBg, borderRadius: '20px', border: '1px solid rgba(16,185,129,0.35)', width: '100%', maxWidth: '640px', maxHeight: '94vh', overflowY: 'auto', padding: '24px', boxShadow: t.cardShadow }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: t.textPrimary }}>📦 Package Compost into Packets</h2>
                  <div style={{ fontSize: '12.5px', color: t.textMuted, marginTop: '4px' }}>Batch: <b style={{ color: '#10b981' }}>{packageBatchModal.batchNumber || packageBatchModal.batchCode}</b> · {packageBatchModal.facilityName || packageBatchModal.location}</div>
                </div>
                <button onClick={() => setPackageBatchModal(null)} style={{ background: 'transparent', border: 'none', color: t.textSecondary, cursor: 'pointer', fontSize: '22px', lineHeight: 1 }}>×</button>
              </div>

              {/* Available yield summary */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
                {[{ label: 'Raw Biomass', val: `${packageBatchModal.rawBiomassInputKg || packageBatchModal.initialWeightKg || 500} kg`, color: '#94a3b8' }, { label: 'Est. Compost Yield', val: `${Math.round((packageBatchModal.rawBiomassInputKg || packageBatchModal.initialWeightKg || 500) * 0.45)} kg`, color: '#10b981' }, { label: 'Already Packaged', val: `${packageBatchModal.totalYieldKg || 0} kg`, color: '#a855f7' }].map(k => (
                  <div key={k.label} style={{ flex: 1, minWidth: 100, background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', border: `1px solid ${t.border}`, borderRadius: '10px', padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: t.textMuted, fontWeight: 700, marginBottom: '3px' }}>{k.label.toUpperCase()}</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: k.color }}>{k.val}</div>
                  </div>
                ))}
              </div>

              {/* Packet Rows */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: t.textSecondary }}>PACKET CONFIGURATIONS</label>
                  <button onClick={() => setPkgPacketRows(rows => [...rows, { id: Date.now(), weightKg: 5, quantity: 1, priceInr: 99, priceEcoPoints: 40 }])} style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', padding: '5px 12px', borderRadius: '7px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>+ Add Row</button>
                </div>
                {/* Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '80px 70px 90px 90px 36px', gap: '6px', marginBottom: '6px', padding: '0 2px' }}>
                  {['Weight (kg)', 'Qty', 'Price (₹)', 'Eco-Pts', ''].map(h => <div key={h} style={{ fontSize: '10px', fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>{h}</div>)}
                </div>
                {pkgPacketRows.map(row => (
                  <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '80px 70px 90px 90px 36px', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                    <input type="number" min="1" value={row.weightKg} onChange={e => setPkgPacketRows(rows => rows.map(r => { if (r.id !== row.id) return r; const kg = Number(e.target.value) || 1; const price = getDefaultPriceForKg(kg); return { ...r, weightKg: kg, priceInr: price, priceEcoPoints: Math.round(price * 0.4) }; }))} style={{ padding: '7px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '7px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box', width: '100%' }} />
                    <input type="number" min="1" value={row.quantity} onChange={e => setPkgPacketRows(rows => rows.map(r => r.id === row.id ? { ...r, quantity: Number(e.target.value) } : r))} style={{ padding: '7px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '7px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box', width: '100%' }} />
                    <input type="number" min="1" value={row.priceInr} onChange={e => setPkgPacketRows(rows => rows.map(r => r.id === row.id ? { ...r, priceInr: Number(e.target.value), priceEcoPoints: Math.round(Number(e.target.value) * 0.4) } : r))} style={{ padding: '7px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '7px', color: isDark ? '#10b981' : '#059669', fontWeight: 700, fontSize: '13px', boxSizing: 'border-box', width: '100%' }} />
                    <input type="number" min="0" value={row.priceEcoPoints} onChange={e => setPkgPacketRows(rows => rows.map(r => r.id === row.id ? { ...r, priceEcoPoints: Number(e.target.value) } : r))} style={{ padding: '7px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '7px', color: isDark ? '#fbbf24' : '#d97706', fontWeight: 700, fontSize: '13px', boxSizing: 'border-box', width: '100%' }} />
                    <button onClick={() => setPkgPacketRows(rows => rows.filter(r => r.id !== row.id))} style={{ background: 'rgba(239,68,68,0.15)', border: 'none', color: '#f87171', borderRadius: '7px', cursor: 'pointer', fontSize: '16px', fontWeight: 700, padding: '6px 8px' }}>×</button>
                  </div>
                ))}
              </div>

              {/* Bulk Mulch */}
              <div style={{ background: isDark ? 'rgba(245,158,11,0.07)' : '#fffbeb', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24', marginBottom: '8px' }}>🌿 Loose Bio-Mulch (Optional)</div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}><div style={{ fontSize: '10px', color: t.textMuted, fontWeight: 700, marginBottom: '4px' }}>WEIGHT (KG)</div><input type="number" min="0" value={pkgMulchKg} onChange={e => setPkgMulchKg(Number(e.target.value))} style={{ width: '100%', padding: '7px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '7px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }} /></div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: '10px', color: t.textMuted, fontWeight: 700, marginBottom: '4px' }}>PRICE / KG (₹)</div><input type="number" min="1" value={pkgPricePerKgMulch} onChange={e => setPkgPricePerKgMulch(Number(e.target.value))} style={{ width: '100%', padding: '7px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '7px', color: isDark ? '#10b981' : '#059669', fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }} /></div>
                </div>
              </div>

              {/* Grade & Notes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div><div style={{ fontSize: '10px', color: t.textMuted, fontWeight: 700, marginBottom: '4px' }}>QUALITY GRADE</div><select value={pkgGrade} onChange={e => setPkgGrade(e.target.value)} style={{ width: '100%', padding: '8px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '12px' }}><option>Grade A Premium Organic</option><option>Grade B Standard</option><option>Grade C Industrial</option></select></div>
                <div><div style={{ fontSize: '10px', color: t.textMuted, fontWeight: 700, marginBottom: '4px' }}>PACKAGING NOTES</div><input type="text" placeholder="e.g. Bagged on 22 Sep 2026" value={pkgNotes} onChange={e => setPkgNotes(e.target.value)} style={{ width: '100%', padding: '8px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '12px', boxSizing: 'border-box' }} /></div>
              </div>

              {/* Product Image for Store */}
              <div style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc', border: `1px solid ${t.border}`, borderRadius: '10px', padding: '12px 14px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: t.textPrimary }}>📸 PRODUCT IMAGE FOR STORE</div>
                  <div style={{ fontSize: '10.5px', color: t.textMuted }}>Live shelf thumbnail</div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ width: 64, height: 64, borderRadius: 8, overflow: 'hidden', border: '1px solid #10b981', flexShrink: 0, position: 'relative' }}>
                    <img src={pkgImage} alt="Pack" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.src = 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&auto=format&fit=crop&q=80'; }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <input ref={pkgImgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePkgImageUpload} />
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                      <button type="button" onClick={() => pkgImgRef.current?.click()} style={{ background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', color: '#fff', borderRadius: '6px', padding: '5px 12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                        📷 Upload Photo
                      </button>
                      {pkgImage.startsWith('data:') && (
                        <button type="button" onClick={() => setPkgImage(COMPOST_IMAGE_PRESETS[0].url)} style={{ background: 'rgba(239,68,68,0.15)', border: 'none', color: '#ef4444', borderRadius: '6px', padding: '5px 8px', fontSize: '10px', cursor: 'pointer' }}>
                          Reset
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: t.textMuted }}>Presets:</span>
                      {COMPOST_IMAGE_PRESETS.map(preset => (
                        <button key={preset.label} type="button" onClick={() => setPkgImage(preset.url)} style={{ padding: '2px 7px', border: pkgImage === preset.url ? '1px solid #10b981' : `1px solid ${t.border}`, borderRadius: '5px', fontSize: '10px', fontWeight: 600, cursor: 'pointer', background: pkgImage === preset.url ? 'rgba(16,185,129,0.2)' : t.bgCardSubtle, color: pkgImage === preset.url ? '#34d399' : t.textSecondary }}>
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Revenue summary */}
              {pkgPacketRows.length > 0 && (
                <div style={{ background: isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', fontSize: '13px', flexWrap: 'wrap', gap: '8px' }}>
                  <span>📦 Total to Package: <b style={{ color: '#10b981' }}>{pkgPacketRows.reduce((s, r) => s + Number(r.weightKg || 0) * Number(r.quantity || 0), 0) + Number(pkgMulchKg || 0)} kg</b></span>
                  <span>💰 Est. Revenue: <b style={{ color: '#10b981' }}>₹{(pkgPacketRows.reduce((s, r) => s + Number(r.priceInr || 0) * Number(r.quantity || 0), 0) + Number(pkgMulchKg || 0) * Number(pkgPricePerKgMulch || 15)).toLocaleString('en-IN')}</b></span>
                </div>
              )}

              {/* Mark completed checkbox */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', cursor: 'pointer', fontSize: '13px', color: t.textSecondary }}>
                <input type="checkbox" checked={pkgMarkCompleted} onChange={e => setPkgMarkCompleted(e.target.checked)} style={{ accentColor: '#10b981', width: '15px', height: '15px' }} />
                Mark this compost batch as <b style={{ color: '#34d399' }}>Completed</b> after packaging
              </label>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setPackageBatchModal(null)} disabled={pkgBusy} style={{ flex: 1, padding: '11px', background: isDark ? 'rgba(255,255,255,0.07)' : '#e2e8f0', border: 'none', borderRadius: '9px', color: t.textSecondary, cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                <button onClick={doPackageBatch} disabled={pkgBusy} style={{ flex: 2, padding: '11px', background: pkgBusy ? '#334155' : 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: '9px', color: '#fff', fontWeight: 700, cursor: pkgBusy ? 'not-allowed' : 'pointer', fontSize: '14px' }}>
                  {pkgBusy ? '⏳ Packaging…' : '🌿 Package & Add to Store'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ Update Progress / Advance Stage Modal ═══ */}
        {selectedBatch && (
          <div style={{ position: 'fixed', inset: 0, background: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
            <div style={{ background: t.modalBg, border: `1px solid ${isDark ? 'rgba(16,185,129,0.3)' : t.modalBorder}`, borderRadius: '16px', width: '100%', maxWidth: '500px', padding: '24px', boxShadow: isDark ? '0 25px 50px -12px rgba(0,0,0,0.7)' : '0 20px 40px rgba(0,0,0,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: t.textPrimary }}>Update Compost Bed Progress</h3>
                <button onClick={() => setSelectedBatch(null)} style={{ background: 'transparent', border: 'none', color: t.textSecondary, cursor: 'pointer', padding: '4px' }}><X size={20} /></button>
              </div>
              <p style={{ color: t.textSecondary, fontSize: '12.5px', margin: '0 0 18px 0' }}>
                Batch <strong style={{ color: '#10b981' }}>{selectedBatch.batchNumber || selectedBatch.batchCode}</strong> — Currently: <strong style={{ color: '#f59e0b' }}>{selectedBatch.currentStage}</strong>
              </p>

              {/* Next Stage Selector */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: t.textSecondary, marginBottom: '5px' }}>Advance to Stage</label>
                <select
                  value={advanceForm.newStage}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, newStage: e.target.value })}
                  style={{ width: '100%', padding: '10px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px' }}
                >
                  {['Ingestion & Shredding', 'Thermophilic Decomposition', 'Curing & Stabilization', 'Sieving & Refining', 'Retail Packaging', 'Completed'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Temperature & Moisture */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: t.textSecondary, marginBottom: '5px' }}>Temperature (°C)</label>
                  <input
                    type="number"
                    value={advanceForm.tempC}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, tempC: Number(e.target.value) })}
                    style={{ width: '100%', padding: '9px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: t.textSecondary, marginBottom: '5px' }}>Moisture (%)</label>
                  <input
                    type="number"
                    value={advanceForm.moisturePercent}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, moisturePercent: Number(e.target.value) })}
                    style={{ width: '100%', padding: '9px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Action Notes */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: t.textSecondary, marginBottom: '5px' }}>Action / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Aeration turning performed, bio-culture re-inoculated"
                  value={advanceForm.actionTaken}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, actionTaken: e.target.value })}
                  style={{ width: '100%', padding: '9px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setSelectedBatch(null)} style={{ flex: 1, padding: '10px', background: isDark ? 'rgba(255,255,255,0.07)' : '#e2e8f0', border: 'none', borderRadius: '8px', color: t.textSecondary, cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                <button
                  onClick={handleAdvanceStage}
                  style={{ flex: 2, padding: '10px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}
                >
                  💾 Save Progress
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Start New Compost Batch Modal */}
        {showNewBatchModal && (
          <div style={{ position: 'fixed', inset: 0, background: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
            <div style={{ background: t.modalBg, border: `1px solid ${t.modalBorder}`, borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '24px', boxShadow: isDark ? '0 25px 50px -12px rgba(0,0,0,0.7)' : '0 20px 40px rgba(0,0,0,0.15)' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800, color: t.textPrimary }}>Start New Compost Bed</h3>
              <p style={{ color: t.textSecondary, fontSize: '13px', margin: '0 0 16px 0' }}>Allocate green leaves and woodchips into an active compost bed.</p>

              <form onSubmit={handleCreateBatch}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Batch Code</label>
                  <input
                    type="text"
                    required
                    value={newBatchForm.batchCode}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, batchCode: e.target.value })}
                    style={{ width: '100%', padding: '9px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Processing Yard Bed Location</label>
                  <input
                    type="text"
                    required
                    value={newBatchForm.location}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, location: e.target.value })}
                    style={{ width: '100%', padding: '9px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Leaves Weight (Ton)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newBatchForm.foliageWeightKg ? (newBatchForm.foliageWeightKg / 1000).toFixed(2) : ''}
                      onChange={(e) => {
                        const fol = Math.round(Number(e.target.value) * 1000);
                        setNewBatchForm({ ...newBatchForm, foliageWeightKg: fol, initialWeightKg: fol + (newBatchForm.woodchipsWeightKg || 0) });
                      }}
                      style={{ width: '100%', padding: '9px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Branches / Woodchips (Ton)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newBatchForm.woodchipsWeightKg ? (newBatchForm.woodchipsWeightKg / 1000).toFixed(2) : ''}
                      onChange={(e) => {
                        const wc = Math.round(Number(e.target.value) * 1000);
                        setNewBatchForm({ ...newBatchForm, woodchipsWeightKg: wc, initialWeightKg: (newBatchForm.foliageWeightKg || 0) + wc });
                      }}
                      style={{ width: '100%', padding: '9px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => setShowNewBatchModal(false)} style={{ flex: 1, padding: '10px', background: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0', border: 'none', borderRadius: '8px', color: t.textSecondary, cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ flex: 2, padding: '10px', background: '#10b981', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Start Compost Bed</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Publish Timber Lot Modal */}
        {showNewLotModal && (
          <div style={{ position: 'fixed', inset: 0, background: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
            <div style={{ background: t.modalBg, border: `1px solid ${t.modalBorder}`, borderRadius: '16px', width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: isDark ? '0 25px 50px -12px rgba(0,0,0,0.7)' : '0 20px 40px rgba(0,0,0,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                    <Gavel size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: t.textPrimary }}>Publish Salvaged Timber Lot</h3>
                    <p style={{ margin: 0, fontSize: '12px', color: t.textSecondary }}>List verified urban hardwood logs for live municipal auction</p>
                  </div>
                </div>
                <button onClick={() => setShowNewLotModal(false)} style={{ background: 'transparent', border: 'none', color: t.textSecondary, cursor: 'pointer', padding: '4px' }}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateTimberLot} style={{ marginTop: '16px' }}>
                {/* Image Upload Box */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: t.textSecondary, marginBottom: '6px' }}>
                    Timber Lot Photograph (Featured Image)
                  </label>
                  <input
                    type="file"
                    ref={lotImgRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const b64 = await toBase64(file);
                        setLotForm(prev => ({ ...prev, imageBase64: b64, imagePreview: b64 }));
                      }
                    }}
                  />
                  <div
                    onClick={() => lotImgRef.current?.click()}
                    style={{
                      border: '2px dashed rgba(245,158,11,0.35)',
                      borderRadius: '12px',
                      padding: '12px',
                      background: 'rgba(245,158,11,0.03)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ width: '80px', height: '70px', borderRadius: '8px', overflow: 'hidden', background: isDark ? '#020617' : '#f1f5f9', border: `1px solid ${t.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {lotForm.imagePreview ? (
                        <img src={lotForm.imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Camera size={24} color="#f59e0b" />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                        <Upload size={14} /> Click to Upload Real Timber Image
                      </div>
                      <div style={{ fontSize: '11.5px', color: t.textSecondary }}>
                        PNG, JPG or WEBP from weighbridge inspection or depot yard
                      </div>
                      {lotForm.imageBase64 && (
                        <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 600, marginTop: '2px' }}>
                          ✓ Custom image selected for upload
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lot Title */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Listing Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 3x Mature Rosewood Trunk Logs (850 kg)"
                    value={lotForm.title || ''}
                    onChange={(e) => setLotForm({ ...lotForm, title: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Lot Number</label>
                    <input
                      type="text"
                      required
                      value={lotForm.lotNumber}
                      onChange={(e) => setLotForm({ ...lotForm, lotNumber: e.target.value })}
                      style={{ width: '100%', padding: '9px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Tree Species</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Teak (Tectona grandis)"
                      value={lotForm.treeSpecies || lotForm.species || ''}
                      onChange={(e) => setLotForm({ ...lotForm, species: e.target.value, treeSpecies: e.target.value })}
                      style={{ width: '100%', padding: '9px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Wood Grade</label>
                    <select
                      value={lotForm.woodGrade || 'Grade A Construction Hardwood'}
                      onChange={(e) => setLotForm({ ...lotForm, woodGrade: e.target.value })}
                      style={{ width: '100%', padding: '9px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                    >
                      <option value="Grade A Construction Hardwood">Grade A Construction Hardwood</option>
                      <option value="Grade B Furniture / Framing">Grade B Furniture / Framing</option>
                      <option value="Grade C Firewood & Slabs">Grade C Firewood & Slabs</option>
                      <option value="Specialty Craft Wood">Specialty Craft Wood</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Auction Duration</label>
                    <select
                      value={lotForm.auctionDurationHours || 48}
                      onChange={(e) => setLotForm({ ...lotForm, auctionDurationHours: Number(e.target.value) })}
                      style={{ width: '100%', padding: '9px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                    >
                      <option value={24}>24 Hours (1 Day)</option>
                      <option value={48}>48 Hours (2 Days)</option>
                      <option value={72}>72 Hours (3 Days)</option>
                      <option value={168}>7 Days (1 Week)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Log Count</label>
                    <input
                      type="number"
                      value={lotForm.logCount || 1}
                      onChange={(e) => setLotForm({ ...lotForm, logCount: Number(e.target.value) })}
                      style={{ width: '100%', padding: '9px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Weight (Ton)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={lotForm.totalWeightKg ? (lotForm.totalWeightKg / 1000).toFixed(2) : (lotForm.estimatedWeightKg ? (lotForm.estimatedWeightKg / 1000).toFixed(2) : '')}
                      onChange={(e) => {
                        const val = Math.round(Number(e.target.value) * 1000);
                        setLotForm({ ...lotForm, totalWeightKg: val, estimatedWeightKg: val });
                      }}
                      style={{ width: '100%', padding: '9px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Avg Dia (feet)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={lotForm.averageDiameterCm ? (lotForm.averageDiameterCm / 30.48).toFixed(1) : ''}
                      onChange={(e) => setLotForm({ ...lotForm, averageDiameterCm: Math.round(Number(e.target.value) * 30.48) })}
                      style={{ width: '100%', padding: '9px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Length (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={lotForm.approxLengthM || ''}
                      onChange={(e) => setLotForm({ ...lotForm, approxLengthM: Number(e.target.value) })}
                      style={{ width: '100%', padding: '9px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Starting Base Bid (₹)</label>
                    <input
                      type="number"
                      required
                      value={lotForm.startingBidInr || ''}
                      onChange={(e) => setLotForm({ ...lotForm, startingBidInr: Number(e.target.value) })}
                      style={{ width: '100%', padding: '9px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: isDark ? '#10b981' : '#059669', fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Reserve Price (₹)</label>
                    <input
                      type="number"
                      required
                      value={lotForm.reservePriceInr || lotForm.reservePrice || ''}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setLotForm({ ...lotForm, reservePrice: val, reservePriceInr: val });
                      }}
                      style={{ width: '100%', padding: '9px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: isDark ? '#f59e0b' : '#d97706', fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Storage Depot / Yard Location</label>
                  <input
                    type="text"
                    value={lotForm.storageYard || lotForm.yardLocation || ''}
                    onChange={(e) => setLotForm({ ...lotForm, yardLocation: e.target.value, storageYard: e.target.value })}
                    style={{ width: '100%', padding: '9px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Description & Inspection Notes</label>
                  <textarea
                    rows={2}
                    value={lotForm.description || ''}
                    onChange={(e) => setLotForm({ ...lotForm, description: e.target.value, inspectionNotes: e.target.value })}
                    placeholder="e.g. Salvaged mature teak logs, straight grain, debarked and certified pest-free."
                    style={{ width: '100%', padding: '9px 12px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => setShowNewLotModal(false)} style={{ flex: 1, padding: '11px', background: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0', border: 'none', borderRadius: '8px', color: t.textSecondary, cursor: 'pointer', fontWeight: 600 }}>
                    Cancel
                  </button>
                  <button type="submit" style={{ flex: 2, padding: '11px', background: '#f59e0b', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Gavel size={16} /> Publish to Live Auction
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add / Edit Product Modal */}
        {showProductModal && (
          <div style={{ position: 'fixed', inset: 0, background: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
            <div style={{ background: t.modalBg, border: `1px solid ${t.modalBorder}`, borderRadius: '16px', width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: isDark ? '0 25px 50px -12px rgba(0,0,0,0.7)' : '0 20px 40px rgba(0,0,0,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingBag size={20} color="#10b981" />
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: t.textPrimary }}>
                    {editingProduct ? 'Edit Green Store Product' : 'Add New Product to Green Store'}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowProductModal(false);
                    setEditingProduct(null);
                  }}
                  style={{ background: 'transparent', border: 'none', color: t.textSecondary, cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>
              <p style={{ color: t.textSecondary, fontSize: '13px', margin: '0 0 16px 0' }}>
                {editingProduct 
                  ? `Update specifications, pricing, inventory, and photograph for "${editingProduct.name}".`
                  : 'Create a new organic product listing for citizens to purchase using INR or Eco-Points.'}
              </p>

              <form onSubmit={handleSaveProduct}>
                {/* Product Photograph Upload & Preview */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: t.textSecondary, marginBottom: '6px' }}>
                    Product Photograph
                  </label>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                    <div style={{
                      width: '90px',
                      height: '90px',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      border: `1px solid ${t.borderStrong}`,
                      background: isDark ? 'rgba(2, 6, 23, 0.6)' : '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {productForm.imagePreview ? (
                        <img src={productForm.imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <ImageIcon size={30} color={t.textMuted} />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <input
                        type="file"
                        ref={productImgRef}
                        accept="image/*"
                        onChange={handleProductImgChange}
                        style={{ display: 'none' }}
                      />
                      <button
                        type="button"
                        onClick={() => productImgRef.current?.click()}
                        style={{
                          background: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                          border: '1px solid rgba(16, 185, 129, 0.35)',
                          color: isDark ? '#34d399' : '#059669',
                          padding: '7px 14px',
                          borderRadius: '8px',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginBottom: '6px'
                        }}
                      >
                        <Upload size={14} /> Upload / Replace Image
                      </button>
                      <div style={{ fontSize: '11.5px', color: t.textMuted }}>
                        JPG, PNG, or WebP. Cloudinary storage upload supported.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Product Name */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: t.textSecondary, margin: 0 }}>
                      Product Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleProductAiAutofill}
                      disabled={productAiLoading}
                      title="Auto-fill description, usage guide, benefits, and metrics using AI"
                      style={{
                        background: productAiLoading ? (isDark ? '#334155' : '#cbd5e1') : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        border: 'none',
                        color: '#ffffff',
                        padding: '4px 12px',
                        borderRadius: 6,
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: productAiLoading ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {productAiLoading ? (
                        <>
                          <Loader2 size={13} className="spin" /> Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles size={13} /> ✨ AI Auto-Fill Details
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CanopyGuard Organic Compost (25kg Bulk), Desi Okra Seeds..."
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Category, Pack Size, Weight */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Category</label>
                    <select
                      value={productForm.category}
                      onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                      style={{ width: '100%', padding: '9px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px' }}
                    >
                      <option value="Organic Compost">Organic Compost</option>
                      <option value="Bio-Mulch & Woodchips">Bio-Mulch & Woodchips</option>
                      <option value="Soil Conditioners">Soil Conditioners</option>
                      <option value="Bio-Char">Bio-Char</option>
                      <option value="Native Saplings">Native Saplings</option>
                      <option value="Gardening Kits">Gardening Kits</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Pack Size / Unit</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 5 kg Bag, 500 g Pack"
                      value={productForm.unitSize}
                      onChange={(e) => setProductForm({ ...productForm, unitSize: e.target.value })}
                      style={{ width: '100%', padding: '9px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Weight Value</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 5, 250, 500"
                      value={productForm.weightValue !== undefined ? productForm.weightValue : productForm.weightKg}
                      onChange={(e) => setProductForm({ ...productForm, weightValue: e.target.value, weightKg: e.target.value })}
                      style={{ width: '100%', padding: '9px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Weight Metric</label>
                    <select
                      value={productForm.weightUnit || 'kg'}
                      onChange={(e) => setProductForm({ ...productForm, weightUnit: e.target.value })}
                      style={{ width: '100%', padding: '9px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                    >
                      <option value="kg">kg (Kilograms)</option>
                      <option value="g">g / grm (Grams)</option>
                      <option value="mg">mg (Milligrams)</option>
                      <option value="ton">ton (Metric Tonnes)</option>
                      <option value="L">L (Litres)</option>
                      <option value="ml">ml (Millilitres)</option>
                      <option value="pcs">pcs / pkts (Units/Pieces)</option>
                    </select>
                  </div>
                </div>

                {/* Price, Eco-Points, Stock */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Price (₹)</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 99"
                      value={productForm.priceInr}
                      onChange={(e) => setProductForm({ ...productForm, priceInr: e.target.value })}
                      style={{ width: '100%', padding: '9px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: isDark ? '#10b981' : '#059669', fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Eco-Points</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 40"
                      value={productForm.priceEcoPoints}
                      onChange={(e) => setProductForm({ ...productForm, priceEcoPoints: e.target.value })}
                      style={{ width: '100%', padding: '9px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: isDark ? '#fbbf24' : '#d97706', fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Stock Quantity</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 50"
                      value={productForm.stockQuantity}
                      onChange={(e) => setProductForm({ ...productForm, stockQuantity: e.target.value })}
                      style={{ width: '100%', padding: '9px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Product Description */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>
                    Product Description <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Provide a detailed description of the product, composition, origin, and quality..."
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box', resize: 'vertical' }}
                  />
                </div>

                {/* Usage Instructions */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>
                    Usage Instructions / Application Guide
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mix 1 part compost with 3 parts garden soil or apply 2 inches around root zones."
                    value={productForm.usageInstructions}
                    onChange={(e) => setProductForm({ ...productForm, usageInstructions: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Key Benefits */}
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>
                    Key Benefits & Features (one per line)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="100% Organic & Municipal Recycled&#10;Enhances Soil Moisture Retention by 40%&#10;Rich in Microbes & Humic Acid"
                    value={productForm.benefits}
                    onChange={(e) => setProductForm({ ...productForm, benefits: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProductModal(false);
                      setEditingProduct(null);
                    }}
                    style={{ flex: 1, padding: '11px', background: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0', border: 'none', borderRadius: '8px', color: t.textSecondary, cursor: 'pointer', fontWeight: 600 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      flex: 2,
                      padding: '11px',
                      background: '#10b981',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    <Check size={16} /> {editingProduct ? 'Save Product Changes' : 'Add Product to Store'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
  );
}
